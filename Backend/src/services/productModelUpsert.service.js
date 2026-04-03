/**
 * Upsert de product_models y atributos inferidos desde filas comerciales (lista de precios Excel).
 * Reglas: solo hardware; no duplicar por (solution_id, unit); respetar modelos verified.
 */

import { sequelize } from '../config/database.js';
import { logger } from '../config/logger.js';
import ProductModel from '../models/ProductModel.model.js';
import ProductModelAttribute from '../models/ProductModelAttribute.model.js';

/** Soluciones para las que el catálogo maestro aplica en carga Excel */
export const HARDWARE_CATALOG_SOLUTION_TYPES = new Set([
  'fortigate',
  'fortigate_vm',
  'fortiwifi',
  'fortianalyzer',
  'fortimanager',
  'fortiswitch',
  'fortiap',
  'fortimail',
  'fortiweb',
]);

/** Patrones SKU típicos de appliance (fallback si falta UNIT) */
const APPLIANCE_SKU_PREFIX = /^(FG|FWF|FAZ|FMG|FAP|FML|FWB|FSW|FS)-/i;

function isEmpty(v) {
  return v == null || String(v).trim() === '';
}

/**
 * Resuelve el identificador de modelo (UNIT) para el catálogo.
 * Prioridad: columna unit → SKU si parece appliance.
 *
 * @param {{ unit?: string|null, sku?: string|null, description?: string|null }} row
 * @returns {string|null}
 */
export function resolveModelUnit(row) {
  if (!isEmpty(row?.unit)) return String(row.unit).trim();
  const sku = String(row?.sku || '').trim();
  if (sku && APPLIANCE_SKU_PREFIX.test(sku)) return sku;
  return null;
}

/**
 * Nombre legible corto desde descripción o SKU.
 * @param {string|null} description
 * @param {string} unit
 * @param {string} sku
 */
function deriveModelName(description, unit, sku) {
  if (!isEmpty(description)) {
    const first = String(description).split(/[.\n]/)[0].trim();
    if (first.length > 3 && first.length <= 255) return first.slice(0, 255);
  }
  return unit || sku || null;
}

/**
 * Familia heurística desde texto.
 * @param {string|null} description
 * @param {string} solutionType
 */
function inferFamilyName(description, solutionType) {
  const d = String(description || '').toLowerCase();
  const map = [
    ['fortigate vm', 'FortiGate VM'],
    ['fortigate', 'FortiGate'],
    ['fortiwifi', 'FortiWiFi'],
    ['fortianalyzer', 'FortiAnalyzer'],
    ['fortimanager', 'FortiManager'],
    ['fortiswitch', 'FortiSwitch'],
    ['fortiap', 'FortiAP'],
    ['fortimail', 'FortiMail'],
    ['fortiweb', 'FortiWeb'],
  ];
  for (const [needle, label] of map) {
    if (d.includes(needle)) return label;
  }
  const st = solutionType || '';
  if (st.startsWith('forti')) return st.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  return null;
}

/**
 * Extrae pares clave-valor útiles desde la descripción comercial (heurístico).
 * @param {string|null|undefined} description
 * @returns {Array<{ key: string, value: string, attribute_unit?: string }>}
 */
export function inferAttributesFromDescription(description) {
  if (isEmpty(description)) return [];
  const d = String(description);
  const out = [];

  const ge = d.match(/(\d+)\s*x\s*GE\b/i) || d.match(/(\d+)\s*GE\s*RJ45/i);
  if (ge) out.push({ key: 'ge_ports', value: ge[1] });

  const sfp = d.match(/(\d+)\s*x\s*SFP\+?/i);
  if (sfp) out.push({ key: 'sfp_ports', value: sfp[1] });

  const vdom = d.match(/(\d+)\s*VDOM/i);
  if (vdom) out.push({ key: 'vdom_mentioned', value: vdom[1] });

  const tb = d.match(/(\d+(?:\.\d+)?)\s*TB\b/i);
  if (tb) out.push({ key: 'storage_tb_mentioned', value: tb[1], attribute_unit: 'TB' });

  const gbps =
    d.match(/(\d+(?:\.\d+)?)\s*Gbps/i) || d.match(/(\d+(?:\.\d+)?)\s*Gb\/s/i);
  if (gbps) out.push({ key: 'throughput_mentioned_gbps', value: gbps[1], attribute_unit: 'Gbps' });

  const users = d.match(/(\d+)\s*users?/i);
  if (users) out.push({ key: 'users_mentioned', value: users[1] });

  if (/\bwifi\s*6\b|802\.11ax/i.test(d)) out.push({ key: 'wifi_generation', value: 'Wi‑Fi 6 / 802.11ax' });
  else if (/\bwifi\s*5\b|802\.11ac/i.test(d)) out.push({ key: 'wifi_generation', value: 'Wi‑Fi 5 / 802.11ac' });

  if (/\bPOE\+?\b|PoE\+/i.test(d)) out.push({ key: 'poe', value: 'yes' });

  return out;
}

/**
 * Rellena solo campos vacíos del modelo (nunca pisa valores existentes).
 * @param {import('sequelize').Model} pm
 * @param {Record<string, unknown>} candidates
 * @returns {Record<string, unknown>}
 */
function pickFillOnlyEmpty(pm, candidates) {
  const updates = {};
  for (const [key, val] of Object.entries(candidates)) {
    if (val == null || String(val).trim() === '') continue;
    const cur = pm.get(key);
    if (cur == null || String(cur).trim() === '') updates[key] = val;
  }
  return updates;
}

/**
 * Upsert atributos inferidos; no sobrescribe filas verified.
 *
 * @param {number} productModelId
 * @param {Array<{ key: string, value: string, attribute_unit?: string }>} attrs
 * @param {import('sequelize').Transaction} [transaction]
 * @returns {Promise<number>} filas creadas o actualizadas
 */
async function upsertInferredAttributes(productModelId, attrs, transaction) {
  let n = 0;
  for (const a of attrs) {
    const existing = await ProductModelAttribute.findOne({
      where: {
        product_model_id: productModelId,
        attribute_key: a.key,
        source_type: 'excel_description',
      },
      transaction,
    });

    if (existing) {
      if (existing.confidence_level === 'verified') continue;
      await existing.update(
        {
          attribute_value: a.value,
          attribute_unit: a.attribute_unit ?? existing.attribute_unit,
          confidence_level: 'inferred',
        },
        { transaction },
      );
      n += 1;
      continue;
    }

    await ProductModelAttribute.create(
      {
        product_model_id: productModelId,
        attribute_key: a.key,
        attribute_value: a.value,
        attribute_unit: a.attribute_unit ?? null,
        source_type: 'excel_description',
        confidence_level: 'inferred',
      },
      { transaction },
    );
    n += 1;
  }
  return n;
}

/**
 * Crea o actualiza product_model a partir de una oferta hardware + solution_id.
 *
 * @param {object} params
 * @param {import('../models/SolutionOffer.model.js').default} params.offer - Instancia Sequelize (hardware, con solution_type)
 * @param {number} params.solutionId - FK solutions.id
 * @param {import('sequelize').Transaction} [params.transaction]
 * @returns {Promise<{
 *   productModelId: number|null,
 *   created: boolean,
 *   updated: boolean,
 *   attributesUpserted: number,
 *   skipped: boolean,
 *   skipReason?: string,
 * }>}
 */
export async function upsertProductModelFromOffer({ offer, solutionId, transaction }) {
  if (offer.offer_type !== 'hardware') {
    return {
      productModelId: null,
      created: false,
      updated: false,
      attributesUpserted: 0,
      skipped: true,
      skipReason: 'not_hardware',
    };
  }

  const st = offer.solution_type;
  if (!st || !HARDWARE_CATALOG_SOLUTION_TYPES.has(st)) {
    return {
      productModelId: null,
      created: false,
      updated: false,
      attributesUpserted: 0,
      skipped: true,
      skipReason: 'solution_not_in_catalog',
    };
  }

  const unit = resolveModelUnit({
    unit: offer.unit,
    sku: offer.sku,
    description: offer.description,
  });

  if (!unit) {
    return {
      productModelId: null,
      created: false,
      updated: false,
      attributesUpserted: 0,
      skipped: true,
      skipReason: 'no_resolvable_unit',
    };
  }

  const sku = String(offer.sku || '').trim();
  const desc = offer.description != null ? String(offer.description) : null;
  const modelName = deriveModelName(desc, unit, sku);
  const familyName = inferFamilyName(desc, st);

  const defaults = {
    solution_id: solutionId,
    solution_type: st,
    unit,
    sku_base: sku || null,
    model_name: modelName,
    family_name: familyName,
    deployment_type: null,
    has_datasheet: 0,
    source_origin: 'excel',
    technical_completeness_status: 'commercial_only',
    is_active: 1,
  };

  let pm;
  let created = false;

  try {
    const res = await ProductModel.findOrCreate({
      where: { solution_id: solutionId, unit },
      defaults,
      transaction,
    });
    pm = res[0];
    created = res[1];
  } catch (err) {
    logger.warn('[upsertProductModelFromOffer] findOrCreate falló: %s', err?.message ?? err);
    throw err;
  }

  let updated = false;

  if (!created) {
    if (pm.technical_completeness_status !== 'verified') {
      const candidates = {
        sku_base: sku || null,
        model_name: modelName,
        family_name: familyName,
      };
      const updates = pickFillOnlyEmpty(pm, candidates);
      if (Object.keys(updates).length > 0) {
        await pm.update(updates, { transaction });
        updated = true;
      }
    }
    await pm.reload({ transaction });
  }

  const rawAttrs = inferAttributesFromDescription(desc);
  const attrs = rawAttrs.map((x) => ({ key: x.key, value: x.value, attribute_unit: x.attribute_unit }));

  let attributesUpserted = 0;
  if (attrs.length > 0) {
    try {
      attributesUpserted = await upsertInferredAttributes(pm.id, attrs, transaction);
    } catch (e) {
      logger.warn('[upsertProductModelFromOffer] atributos inferidos omitidos: %s', e?.message ?? e);
    }
  }

  return {
    productModelId: pm.id,
    created,
    updated,
    attributesUpserted,
    skipped: false,
  };
}

export default {
  HARDWARE_CATALOG_SOLUTION_TYPES,
  resolveModelUnit,
  inferAttributesFromDescription,
  upsertProductModelFromOffer,
};
