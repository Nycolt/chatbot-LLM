/**
 * Resolución de bundles y licencias FortiGate desde `solution_offers` (sin lógica por SKU fijo).
 * Filtrado dinámico por `unit` + coincidencia en `description` y `offer_type`.
 * Reglas opcionales: `offer_compatibility_rules` (condition_json + columnas from/to_offer_type).
 */

import { Op } from 'sequelize';
import { sequelize } from '../../config/database.js';
import SolutionOffer from '../../models/SolutionOffer.model.js';
import OfferCompatibilityRule from '../../models/OfferCompatibilityRule.model.js';
import { logger } from '../../config/logger.js';
import { deriveVpnTypeNumeric } from './fortigate.engine.js';

const VALID_BUNDLE_TYPES = new Set(['hardware', 'basic', 'utp', 'enterprise']);
// Preferencia comercial por defecto: UTP antes que Enterprise,
// salvo cuando el usuario pida explícitamente Enterprise.
const BUNDLE_TYPE_PRIORITY = { utp: 3, enterprise: 2, basic: 1 };

/**
 * Infiere etiquetas técnicas desde el snapshot de dimensionamiento (objetos con id o índices de formulario legacy).
 * @param {object} answers
 * @returns {string[]}
 */
export function deriveTechnicalNeedsFromAnswers(answers) {
  const needs = [];
  if (!answers || typeof answers !== 'object') return needs;

  const slRaw = answers.securityLevel?.id ?? answers.securityLevel;
  if (
    slRaw === 'high' ||
    slRaw === 'max' ||
    slRaw === 3 ||
    slRaw === 4 ||
    answers.securityProfile?.id === 'ngfw' ||
    answers.securityProfile?.id === 'threat'
  ) {
    needs.push('high_security');
  }

  const sslRaw = answers.sslInspection?.id ?? answers.sslInspection;
  if (sslRaw === 'full' || sslRaw === 'yes' || sslRaw === 3) {
    needs.push('ssl_full');
  }

  if (deriveVpnTypeNumeric(answers) !== 1) {
    needs.push('vpn_required');
  }

  const ttRaw = answers.trafficType?.id ?? answers.trafficType;
  if (
    ttRaw === 'heavy' ||
    ttRaw === 'datacenter' ||
    ttRaw === 'streaming' ||
    ttRaw === 3 ||
    ttRaw === 5
  ) {
    needs.push('high_traffic');
  }

  return [...new Set(needs)];
}

function normalizeBundleTypeHint(v) {
  const s = String(v || '')
    .trim()
    .toLowerCase();
  return VALID_BUNDLE_TYPES.has(s) ? s : null;
}

function bundleTypePriority(type) {
  return BUNDLE_TYPE_PRIORITY[type] ?? 0;
}

/**
 * Reglas de compatibilidad cargadas para los SKUs presentes en los offers encontrados.
 */
export async function getCompatibilityRules(skus = []) {
  const normalizedSkus = [...new Set((skus || []).map((sku) => String(sku || '').trim()).filter(Boolean))];
  if (!normalizedSkus.length) return [];

  try {
    return await OfferCompatibilityRule.findAll({
      where: {
        sku: { [Op.in]: normalizedSkus },
      },
      raw: true,
    });
  } catch (e) {
    logger.warn({ err: e, skuCount: normalizedSkus.length }, '[fortigateOffers] offer_compatibility_rules query failed');
    return [];
  }
}

function deriveBundleRequirementsFromAnswers(answers) {
  const sslRaw = answers?.sslInspection?.id ?? answers?.sslInspection;
  const vpnRequired = deriveVpnTypeNumeric(answers) !== 1;
  const highSecurity = isHighSecurityProfile(answers);
  const mediumSecurity = isMediumSecurityProfile(answers);

  return {
    requires_ssl_inspection: sslRaw === 'full' || sslRaw === 'yes' || sslRaw === 3,
    requires_ips: highSecurity || mediumSecurity,
    requires_advanced_threat: highSecurity,
    requires_vpn: vpnRequired,
  };
}

function ruleSatisfiesRequirements(rule, requirements) {
  if (!rule || !requirements) return false;
  if (requirements.requires_ssl_inspection && !rule.requires_ssl_inspection) return false;
  if (requirements.requires_ips && !rule.requires_ips) return false;
  if (requirements.requires_advanced_threat && !rule.requires_advanced_threat) return false;
  if (requirements.requires_vpn && !rule.requires_vpn) return false;
  return true;
}

function selectBundleFallbackBySku(filtered, effectiveType) {
  if (!filtered.length) return null;

  if (effectiveType === 'enterprise') {
    return filtered.find((o) => skuUpperForBundle(o).includes('BDL-809')) || filtered[0] || null;
  }
  if (effectiveType === 'utp') {
    return filtered.find((o) => skuUpperForBundle(o).includes('BDL-950')) || filtered[0] || null;
  }
  if (effectiveType === 'basic') {
    const simple = filtered.find((o) => {
      const s = skuUpperForBundle(o);
      return !s.includes('BDL-809') && !s.includes('BDL-950');
    });
    return simple || filtered[0] || null;
  }
  return filtered[0] || null;
}

/**
 * Selección async de bundle usando offer_compatibility_rules + fallback SKU.
 * @param {object|null} model - fila modelo (p. ej. UNIT/SKU); solo informativo / logs
 * @param {object[]} offers
 * @param {object} answers
 * @param {'hardware'|'basic'|'utp'|'enterprise'|'auto'} bundleType
 */
export async function selectBundleFromOffers(model, offers, answers, bundleType) {
  const derivedNeeds = deriveTechnicalNeedsFromAnswers(answers);
  console.log('Derived Needs:', derivedNeeds);

  logger.debug(
    { derivedNeeds, unit: model?.UNIT },
    '[fortigateOffers] bundle compatibility',
  );

  return await selectBestBundleOffer(offers, bundleType, answers, { derivedNeeds });
}

export function normalizeSkuBase(unit) {
  if (!unit) return null;

  return String(unit)
    .toUpperCase()
    .replace('FORTIGATE-', 'FG-')
    .replace(/\s+/g, '')
    .trim();
}

function buildSkuSearchVariants(unit, skuHint = null) {
  const base = normalizeSkuBase(unit) || normalizeSkuBase(skuHint);
  if (!base) return [];

  const variants = new Set([base]);
  variants.add(base.replace(/^FG-/, 'FG'));
  variants.add(base.replace(/-/g, ''));
  const coreMatch = base.match(/(\d{2,4}[A-Z]{0,3})/i);
  if (coreMatch?.[1]) {
    variants.add(coreMatch[1].toUpperCase());
  }

  return [...variants].filter(Boolean);
}

const ACTIVE_OFFER = { [Op.or]: [{ is_active: 1 }, { is_active: true }] };

/** Imprime el SQL exacto que Sequelize envía a MySQL para esta consulta. */
function logLoadOffersSql(label) {
  return (sql, timingMs) => {
    console.log(`\n========== loadFortigateOffersForUnit SQL (${label}) ==========`);
    console.log(sql);
    if (timingMs != null) console.log(`-- Sequelize timing: ${timingMs}ms`);
    console.log('========== end SQL ==========\n');
  };
}

function normDesc(row) {
  return String(row?.description || row?.sku || '').toLowerCase();
}

function scoreKeywords(descLower, keywords) {
  if (!descLower) return 0;
  let s = 0;
  for (const kw of keywords) {
    if (descLower.includes(kw.toLowerCase())) s += 1;
  }
  return s;
}

/** Perfil "alto": nivel securityLevel alto/máximo o legacy threat/ngfw. */
function isHighSecurityProfile(answers) {
  const sl = answers?.securityLevel?.id;
  if (sl === 'max' || sl === 'high') return true;
  const id = answers?.securityProfile?.id;
  return id === 'threat' || id === 'ngfw';
}

function isMediumSecurityProfile(answers) {
  if (answers?.securityLevel?.id === 'medium') return true;
  return answers?.securityProfile?.id === 'ips';
}

function isSslFullForBundle(answers) {
  const id = answers?.sslInspection?.id;
  return id === 'full' || id === 'yes';
}

/**
 * @param {object} answers - snapshot (securityLevel, sslInspection, securityProfile legacy…)
 * @returns {'enterprise'|'utp'|'basic'}
 */
export function resolveBundleTypeAuto(answers) {
  if (isSslFullForBundle(answers)) return 'enterprise';
  if (isHighSecurityProfile(answers)) return 'enterprise';
  if (isMediumSecurityProfile(answers)) return 'utp';
  return 'basic';
}

/**
 * Carga ofertas para el modelo usando el SKU base normalizado como fuente de verdad.
 * Prioriza prefijo `FG-XXX%` y usa `%FG-XXX%` como fallback.
 */
export async function loadFortigateOffersForUnit(unit, skuHint = null) {
  console.log('ENTRANDO A loadFortigateOffersForUnit');
  const [dbResult] = await sequelize.query('SELECT DATABASE() as db');
  console.log('DB ACTUAL BACKEND:', dbResult);
  const skuBase = normalizeSkuBase(unit) || normalizeSkuBase(skuHint);
  const skuVariants = buildSkuSearchVariants(unit, skuHint);
  console.log('SKU BASE:', skuBase);
  console.log('MATCH PREFIX:', `${skuBase}%`);
  if (!skuBase) {
    console.log('ROWS:', 0);
    console.log('ROWS SEQUELIZE:', 0);
    return [];
  }
  const likeContains = `%${skuBase}%`;
  const [rawRows] = await sequelize.query(
    `
  SELECT sku 
  FROM solution_offers 
  WHERE ${skuVariants.map((_, i) => `sku LIKE :likeSku${i}`).join(' OR ')}
`,
    {
      replacements: Object.fromEntries(skuVariants.map((v, i) => [`likeSku${i}`, `%${v}%`])),
    },
  );
  console.log('QUERY DIRECTA RESULTADOS:', rawRows);

  const matchClause = {
    [Op.or]: [
      { sku: { [Op.like]: `${skuBase}%` } },
      { sku: { [Op.like]: `%${skuBase}%` } },
    ],
  };

  let rows = [];
  try {
    rows = await SolutionOffer.findAll({
      where: {
        [Op.and]: [ACTIVE_OFFER, matchClause],
      },
      order: [['updatedAt', 'DESC']],
      limit: 500,
      raw: true,
      benchmark: true,
      logging: logLoadOffersSql('activas + LIKE core'),
    });

    if (!rows?.length) {
      rows = await SolutionOffer.findAll({
        where: matchClause,
        order: [['updatedAt', 'DESC']],
        limit: 500,
        raw: true,
        benchmark: true,
        logging: logLoadOffersSql('fallback sin filtro is_active'),
      });
      if (rows?.length) {
        logger.warn(
          { unit, skuHint, skuBase, rowCount: rows.length },
          '[fortigateOffers] sin coincidencias activas; usando filas inactivas que matchean el sku base',
        );
      }
    }
  } catch (e) {
    logger.warn({ err: e, unit, skuHint, skuBase }, '[fortigateOffers] loadFortigateOffersForUnit failed');
    rows = [];
  }

  if (!rows?.length && rawRows?.length) {
    const [rawFullRows] = await sequelize.query(
      `
    SELECT *
    FROM solution_offers
    WHERE (is_active = 1 OR is_active = true)
      AND (${skuVariants.map((_, i) => `sku LIKE :rawLikeSku${i}`).join(' OR ')})
    ORDER BY updatedAt DESC
    LIMIT 500
  `,
      {
        replacements: Object.fromEntries(skuVariants.map((v, i) => [`rawLikeSku${i}`, `%${v}%`])),
      },
    );
    console.log('ROWS RAW SQL:', rawFullRows.length);
    rows = rawFullRows || [];
  }

  console.log('ROWS:', rows.length);
  console.log('ROWS SEQUELIZE:', rows.length);

  logger.debug(
    { unit, skuHint, skuBase, rowCount: rows.length },
    '[fortigateOffers] loadFortigateOffersForUnit',
  );

  return rows || [];
}

function dedupeBySku(rows) {
  const seen = new Set();
  const out = [];
  for (const r of rows) {
    const sku = String(r.sku || '').trim();
    const key = sku || `__id_${r.id}__`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out;
}

function skuUpperForBundle(row) {
  return String(row?.sku || '').trim().toUpperCase();
}

function isBdlBundleSkuRow(row) {
  if (!row?.sku) return false;

  const sku = String(row.sku).toUpperCase();

  // Debe detectar BDL en cualquier parte del SKU
  if (!sku.includes('BDL')) return false;

  // Excluir licencias FortiCare (empiezan con FC-)
  if (sku.startsWith('FC-')) return false;

  return true;
}

function isFcLicenseSkuRow(row) {
  if (!row?.sku) return false;
  return skuUpperForBundle(row).startsWith('FC-');
}

/** Licencias VM: FC- o FCI-, excluye BDL (sin bundles hardware) */
function isFortigateVmLicenseCandidateRow(row) {
  if (!row?.sku) return false;
  const s = skuUpperForBundle(row);
  if (s.includes('BDL')) return false;
  return s.startsWith('FC-') || s.startsWith('FCI-');
}

function splitCommercialOffers(offers) {
  const list = dedupeBySku(offers || []);
  return {
    all: list,
    bundles: list.filter(isBdlBundleSkuRow),
    licenses: list.filter(isFcLicenseSkuRow),
  };
}

export function mapAddonTypeToLicensePriority(addonType) {
  const key = String(addonType || '').trim();
  if (key === '1' || key === 'advanced_security' || key === 'protection') return ['928', '100', '577', '108'];
  if (key === '2' || key === 'monitoring' || key === 'visibility') return ['585', '131'];
  if (key === '3' || key === 'support') return ['247', '314', '284', '660', '464'];
  if (key === '4' || key === 'management') return ['585', '131'];
  if (key === '5' || key === 'ztna' || key === 'access') return ['1337', '112', '131', '662', '288'];
  if (key === 'dlp') return ['589'];
  if (key === 'ot') return ['159', '175'];
  return [];
}

function mapAddonTypeToLicenseKeywords(addonType) {
  const key = String(addonType || '').trim();
  if (key === '1' || key === 'advanced_security') {
    return [
      'atp',
      'advanced threat',
      'advanced malware',
      'amp',
      'ai-based malware',
      'malware prevention',
      'sandbox',
      'malware',
      'ips',
    ];
  }
  if (key === '2' || key === 'monitoring') {
    return ['fortianalyzer', 'analy', 'logging', 'analytics', 'log retention', 'cloud standard'];
  }
  if (key === '3' || key === 'support') {
    return ['support', 'forticare', 'premium', 'essential', 'elite', 'managed', 'socaas', '24x7'];
  }
  if (key === '4' || key === 'management') {
    return ['management', 'manager', 'central', 'fortianalyzer', 'cloud standard'];
  }
  if (key === '5' || key === 'ztna' || key === 'access') {
    return ['sd-wan', 'sase', 'remote access', 'zero trust', 'ztna', 'url', 'dns', 'filtering', 'vpn', 'cloud'];
  }
  if (key === 'dlp') {
    return ['dlp', 'data loss', 'loss prevention', 'exfiltration'];
  }
  if (key === 'ot') {
    return ['ot security', 'ot ', 'industrial', 'ics', 'scada', 'iot'];
  }
  return [];
}

function chooseAutoAddonType(answers = {}) {
  const sslHeavy =
    answers?.sslInspection?.id === 'yes' ||
    answers?.sslInspection?.id === 'full' ||
    answers?.sslInspection?.id === 'ssl_unknown';

  if (sslHeavy || isHighSecurityProfile(answers)) return 'advanced_security';
  if (isMediumSecurityProfile(answers)) return 'monitoring';
  if (deriveVpnTypeNumeric(answers) !== 1) return 'ztna';
  return 'support';
}

/**
 * @param {object} [options]
 * @param {boolean} [options.forFortigateVm] - acepta FCI- y excluye BDL (FortiGate VM)
 */
function isFortiWifiLicenseCandidateRow(row) {
  const sku = String(row?.sku || '').toUpperCase();
  const st = String(row?.solution_type || '').toLowerCase();
  const unit = String(row?.unit || '').toUpperCase();
  if (sku.includes('BDL')) return false;
  if (!(sku.startsWith('FC-') || sku.startsWith('FCI-'))) return false;
  return st === 'fortiwifi' || unit.includes('FWF') || sku.includes('FWF');
}

export function selectBestLicense(addonType, licenses, options = {}) {
  const pred = options.forFortigateVm
    ? isFortigateVmLicenseCandidateRow
    : options.forFortiWifi
      ? isFortiWifiLicenseCandidateRow
      : isFcLicenseSkuRow;
  const list = dedupeBySku(licenses || []).filter(pred);
  if (!list.length) return null;

  const priorityCodes = mapAddonTypeToLicensePriority(addonType);
  for (const code of priorityCodes) {
    const match = list.find((l) => String(l.sku || '').toUpperCase().includes(String(code)));
    if (match) return match;
  }

  const keywords = mapAddonTypeToLicenseKeywords(addonType);
  if (keywords.length) {
    let best = null;
    let bestScore = 0;
    for (const license of list) {
      const text = `${license.sku || ''} ${license.description || ''}`.toLowerCase();
      let score = 0;
      for (const kw of keywords) {
        if (text.includes(String(kw).toLowerCase())) score += 1;
      }
      if (score > bestScore) {
        bestScore = score;
        best = license;
      }
    }
    if (best && bestScore > 0) return best;
  }

  return null;
}

/**
 * Selecciona el bundle / hardware más representativo (1 fila).
 * Usa `offer_compatibility_rules` como capa principal y cae a la heurística SKU si faltan reglas.
 * @param {object[]} offers - filas solution_offers
 * @param {'hardware'|'basic'|'utp'|'enterprise'|'auto'} bundleType
 * @param {object} [answersForAuto] - para bundleType === 'auto'
 * @param {{ derivedNeeds?: string[] }} [compatibilityHints]
 */
export async function selectBestBundleOffer(offers, bundleType, answersForAuto = {}, compatibilityHints = null) {
  const { all: list, bundles: bundleCandidates } = splitCommercialOffers(offers || []);
  const totalOffers = list.length;
  if (!totalOffers) {
    console.log({ totalOffers: 0, bundleCandidates: 0, selectedBundle: undefined });
    return null;
  }

  console.log(
    'TODAS LAS OFERTAS:',
    (offers || []).map((o) => o.sku),
  );

  let effectiveType = bundleType;
  if (bundleType === 'auto') {
    effectiveType = normalizeBundleTypeHint(compatibilityHints?.bundleTypeHint) || resolveBundleTypeAuto(answersForAuto);
  }
  if (effectiveType === 'hardware') {
    // Regla comercial global: la recomendación final siempre debe ir acompañada de bundle.
    effectiveType = 'basic';
  }

  const filtered = bundleCandidates;
  console.log('BUNDLES DETECTADOS:', filtered.map((o) => o.sku));
  let selected = null;

  if (filtered.length) {
    const requirements = deriveBundleRequirementsFromAnswers(answersForAuto);
    const ruleRows = await getCompatibilityRules(filtered.map((o) => o.sku));
    const rulesBySku = new Map(
      ruleRows.map((rule) => [String(rule.sku || '').trim().toUpperCase(), rule]),
    );

    console.log('BUNDLE REQUIREMENTS:', requirements);
    console.log('MATCHED RULES:', ruleRows.map((r) => ({ sku: r.sku, bundle_type: r.bundle_type })));

    const candidates = filtered.map((offer) => {
      const sku = skuUpperForBundle(offer);
      const rule = rulesBySku.get(sku) || null;
      return {
        offer,
        rule,
        bundleType: normalizeBundleTypeHint(rule?.bundle_type),
      };
    });

    const satisfying = candidates
      .filter((candidate) => ruleSatisfiesRequirements(candidate.rule, requirements))
      .sort((a, b) => bundleTypePriority(b.bundleType) - bundleTypePriority(a.bundleType));

    const exact = effectiveType
      ? satisfying.filter((candidate) => candidate.bundleType === effectiveType)
      : satisfying;

    if (exact.length) {
      selected = exact[0].offer;
    } else if (satisfying.length) {
      selected = satisfying[0].offer;
    } else {
      const closest = candidates
        .filter((candidate) => candidate.rule)
        .sort((a, b) => bundleTypePriority(b.bundleType) - bundleTypePriority(a.bundleType));

      if (effectiveType) {
        selected = closest.find((candidate) => candidate.bundleType === effectiveType)?.offer || null;
      }
      if (!selected) {
        selected = closest[0]?.offer || null;
      }
    }
  }

  if (!selected) {
    selected = selectBundleFallbackBySku(filtered, effectiveType) || filtered[0] || null;
  }

  console.log({
    totalOffers,
    bundleCandidates: filtered.length,
    selectedBundle: selected?.sku,
  });

  return selected;
}

const ADDON_KEYWORDS = {
  advanced_security: [
    'sandbox',
    'atp',
    'advanced threat',
    'fortisandbox',
    'forti sandbox',
    'ransomware',
    'malware',
  ],
  monitoring: ['fortianalyzer', 'analyzer', 'logging', 'log analytics', 'siem'],
  support: ['forticare', 'support', 'rma', '24x7', '24 x 7'],
  management: ['fortimanager', 'manager', 'centralized management', 'fortimanager'],
  ztna: ['ztna', 'sase', 'zero trust network'],
};

/**
 * @param {object[]} offers
 * @param {'advanced_security'|'monitoring'|'support'|'management'|'ztna'|'auto'} addonType
 * @param {string} [excludeSku] - SKU del bundle base a no repetir
 * @param {object} [answers] - para auto
 * @param {number} [limit=3]
 * @param {{ derivedNeeds?: string[] }} [compatOpts] - refuerzo opcional según deriveTechnicalNeedsFromAnswers
 */
export function selectAddonOffers(offers, addonType, excludeSku = '', answers = {}, limit = 3, compatOpts = {}) {
  const ex = String(excludeSku || '').trim().toLowerCase();
  const { licenses } = splitCommercialOffers(offers || []);
  const availableLicenses = licenses.filter(
    (o) => String(o.sku || '').trim().toLowerCase() !== ex,
  );

  const effectiveAddonType = addonType === 'auto' ? chooseAutoAddonType(answers) : addonType;
  const selected = selectBestLicense(effectiveAddonType, availableLicenses);

  console.log('LICENCIAS DETECTADAS:', availableLicenses.map((o) => o.sku));
  console.log('LICENSE PRIORITY:', mapAddonTypeToLicensePriority(effectiveAddonType));
  console.log('SELECTED LICENSE:', selected?.sku);

  return selected ? [selected].slice(0, Math.max(1, limit)) : [];
}

export function formatOfferLine(o) {
  if (!o) return '';
  const sku = o.sku || 'N/A';
  const desc = o.description ? String(o.description).trim().slice(0, 200) : '';
  return desc ? `${sku} — ${desc}` : String(sku);
}
