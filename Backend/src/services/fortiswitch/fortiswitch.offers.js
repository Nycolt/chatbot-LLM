/**
 * SKUs comerciales FortiSwitch desde `solution_offers` (best-effort; confirma en lista de precios).
 */

import { sequelize } from '../../config/database.js';
import { logger } from '../../config/logger.js';
import normalizeUnit from '../../utils/normalizeUnit.js';
import { toFortiSwitchUnitKey } from './fortiswitch.extractor.js';
import { FORTISWITCH_ADDONS } from './fortiswitch.ranges.js';

/**
 * Núcleo del modelo (ej. 124F, T1024E) desde clave FS-* del datasheet.
 * @param {string} fsKey — ej. FS-124F, FS-T1024F-FPOE
 */
function coreModelStemFromFsKey(fsKey) {
  const k = String(fsKey || '')
    .trim()
    .toUpperCase()
    .replace(/^FS-/, '');
  const first = k.split('-')[0] || k;
  return first.replace(/\s/g, '');
}

/**
 * Tokens que suelen aparecer en SKUs FortiCare / licencias Fortinet para este equipo.
 * @param {string|null|undefined} unit — ej. FortiSwitch-124F, FS-448E-FPOE
 * @returns {string[]}
 */
export function fortiswitchLicenseMatchTokens(unit) {
  const key = toFortiSwitchUnitKey(unit);
  if (!key) return [];
  const ku = key.toUpperCase();
  const core = coreModelStemFromFsKey(ku);
  const fullCompact = ku.replace(/-/g, '');
  /** @type {Set<string>} */
  const tokens = new Set();
  if (core.length >= 2) {
    tokens.add(core);
    tokens.add(`R${core}`);
    tokens.add(`FSW${core}`);
    tokens.add(`FS${core}`);
  }
  tokens.add(fullCompact);
  tokens.add(ku.replace(/\s/g, ''));
  return [...tokens].filter((t) => t && t.length >= 3).sort((a, b) => b.length - a.length);
}

/**
 * Filas de licencia que corresponden al modelo recomendado (SKU / descripción / unit contienen el token).
 * @param {string|null|undefined} unit
 * @param {Array<Record<string, unknown>>} rows
 * @returns {Array<Record<string, unknown>>}
 */
export function filterFortiSwitchLicenseRowsForModel(unit, rows) {
  const tokens = fortiswitchLicenseMatchTokens(unit);
  const list = rows || [];
  if (!tokens.length) return list;

  const matches = (row, skuOnly) => {
    const sku = String(row?.sku || '').toUpperCase();
    const desc = String(row?.description || '').toUpperCase();
    const u = String(row?.unit || '').toUpperCase();
    const blob = skuOnly ? sku : `${sku} ${desc} ${u}`;
    return tokens.some((t) => blob.includes(t));
  };

  let out = list.filter((r) => matches(r, false));
  if (!out.length) out = list.filter((r) => matches(r, true));
  const core = coreModelStemFromFsKey(toFortiSwitchUnitKey(unit) || '');
  if (!out.length && core.length >= 3) {
    out = list.filter((r) => String(r?.sku || '').toUpperCase().includes(core));
  }
  return out;
}

export async function loadFortiswitchSpecRowsFromDb() {
  try {
    const [rows] = await sequelize.query(
      `SELECT *
       FROM fortiswitch_specs
       WHERE unit IS NOT NULL AND TRIM(unit) <> ''
       ORDER BY unit ASC
       LIMIT 2000`,
    );
    return rows || [];
  } catch (e) {
    logger.warn({ err: e?.message }, '[fortiswitch.offers] loadFortiswitchSpecRowsFromDb failed');
    return [];
  }
}

/**
 * @param {string} unit
 * @returns {Promise<{ sku: string, description: string|null }|null>}
 */
export async function resolveFortiSwitchHardwareSku(unit) {
  const u = normalizeUnit(unit);
  if (!u) return null;
  try {
    const nu = u.replace(/\s/g, '').replace(/-/g, '').toUpperCase();
    const raw = String(unit || '').trim();
    const safe = raw.toUpperCase().replace(/[%_]/g, '');
    const likeSku = `%${safe}%`;
    const [rows] = await sequelize.query(
      `
      SELECT sku, description, unit
      FROM solution_offers
      WHERE (is_active = 1 OR is_active = true)
        AND offer_type = 'hardware'
        AND LOWER(TRIM(COALESCE(solution_type, ''))) = 'fortiswitch'
        AND (
          UPPER(REPLACE(REPLACE(TRIM(COALESCE(unit,'')), ' ', ''), '-', '')) = :nu
          OR UPPER(TRIM(sku)) LIKE :likeSku
        )
      ORDER BY updatedAt DESC
      LIMIT 8
      `,
      { replacements: { nu, likeSku } },
    );
    const list = rows || [];
    const exact = list.find(
      (r) => normalizeUnit(r.unit) === u || normalizeUnit(r.sku).includes(nu),
    );
    const pick = exact || list[0];
    if (!pick?.sku) return null;
    return { sku: String(pick.sku).trim(), description: pick.description || null };
  } catch (e) {
    logger.warn({ err: e?.message, unit: u }, '[fortiswitch.offers] resolveFortiSwitchHardwareSku failed');
    return null;
  }
}

export async function loadFortiswitchLicenseOffers() {
  try {
    const [rows] = await sequelize.query(
      `
      SELECT id, unit, sku, solution_type, offer_type, description, is_active, updatedAt
      FROM solution_offers
      WHERE (is_active = 1 OR is_active = true)
        AND offer_type = 'license'
        AND LOWER(TRIM(COALESCE(solution_type, ''))) = 'fortiswitch'
      ORDER BY updatedAt DESC
      LIMIT 500
    `,
    );
    return rows || [];
  } catch (e) {
    logger.warn({ err: e?.message }, '[fortiswitch.offers] loadFortiswitchLicenseOffers failed');
    return [];
  }
}

function forticareRowMatchesSupportTier(row, wantElite) {
  const sku = String(row?.sku || '').toUpperCase();
  const desc = String(row?.description || '').toLowerCase();
  const c = `${sku} ${desc}`;
  if (wantElite) {
    return (
      /ELITE/i.test(c) &&
      (/FORTICARE|FC-/.test(c) || /support/i.test(desc)) &&
      !/UPGRADE/i.test(c)
    );
  }
  return (
    /PREMIUM/i.test(c) &&
    (/FORTICARE|FC-/.test(c) || /support/i.test(desc)) &&
    !/ELITE/i.test(c) &&
    !/UPGRADE/i.test(c)
  );
}

function rankSkuByModelTokens(skuStr, tokens) {
  if (!tokens.length) return 0;
  const sku = String(skuStr || '').toUpperCase();
  let score = 0;
  for (const t of tokens) {
    if (sku.includes(t)) score = Math.max(score, t.length);
  }
  return score;
}

/**
 * @param {'FortiCare Premium'|'FortiCare Elite'} supportType
 * @param {Array<Record<string, unknown>>} rows
 * @param {string|null|undefined} modelUnit — modelo recomendado (prioriza FC-* que contengan ese código)
 */
export function selectFortiSwitchSupportSku(supportType, rows, modelUnit = null) {
  const list = rows || [];
  const wantElite = supportType === 'FortiCare Elite';
  const tokens = fortiswitchLicenseMatchTokens(modelUnit);

  const matches = list.filter((row) => forticareRowMatchesSupportTier(row, wantElite));
  if (!matches.length) return null;

  matches.sort((a, b) => {
    const ra = rankSkuByModelTokens(a.sku, tokens);
    const rb = rankSkuByModelTokens(b.sku, tokens);
    if (rb !== ra) return rb - ra;
    return String(b.sku || '').length - String(a.sku || '').length;
  });

  return String(matches[0].sku).trim();
}

/**
 * @param {string[]|null|undefined} rankTokens — priorizar SKUs que incluyan el modelo (tokens largos primero)
 */
export function selectFortiSwitchLicenseByKeywords(rows, keywords, rankTokens = null) {
  const ks = (keywords || []).map((k) => String(k).toLowerCase());
  const tokens = Array.isArray(rankTokens) && rankTokens.length ? rankTokens : [];
  const cands = [];
  for (const row of rows || []) {
    const blob = `${row?.sku || ''} ${row?.description || ''}`.toLowerCase();
    if (ks.every((k) => blob.includes(k))) cands.push(row);
  }
  if (!cands.length) return null;
  if (!tokens.length) return String(cands[0].sku).trim();

  cands.sort((a, b) => {
    const ra = rankSkuByModelTokens(a.sku, tokens);
    const rb = rankSkuByModelTokens(b.sku, tokens);
    if (rb !== ra) return rb - ra;
    return String(b.sku || '').length - String(a.sku || '').length;
  });
  return String(cands[0].sku).trim();
}

/**
 * @param {string[]} addOnLabels
 * @param {string|null|undefined} modelUnit
 */
export function mapAddOnLabelsToSkus(addOnLabels, licenseRows, modelUnit = null) {
  /** @type {Record<string, string|null>} */
  const out = {};
  const rows = licenseRows || [];
  const rankTokens = fortiswitchLicenseMatchTokens(modelUnit);

  const addonDefs = [
    { label: FORTISWITCH_ADDONS[0].label, keys: ['next', 'day', 'nbd', 'rma'] },
    { label: FORTISWITCH_ADDONS[1].label, keys: ['4h', '4 h', 'hardware', 'rma'] },
    { label: FORTISWITCH_ADDONS[2].label, keys: ['onsite', 'engineer', '4h'] },
    { label: FORTISWITCH_ADDONS[3].label, keys: ['secure', 'rma'] },
    { label: FORTISWITCH_ADDONS[4].label, keys: ['upgrade', 'premium', 'elite'] },
  ];

  for (const label of addOnLabels || []) {
    const def = addonDefs.find((d) => d.label === label);
    if (!def) continue;
    const sku = selectFortiSwitchLicenseByKeywords(rows, def.keys, rankTokens);
    out[label] = sku;
  }
  return out;
}
