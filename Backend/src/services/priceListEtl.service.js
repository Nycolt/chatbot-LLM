/**
 * ETL: procesa filas de price_list_staging y carga registros válidos en solution_offers.
 * Filtra filas basura, clasifica tipo de oferta, detecta solution_type (solo soluciones del chatbot) y normaliza precios.
 */

import { sequelize } from '../config/database.js';
import { logger } from '../config/logger.js';
import PriceListStaging from '../models/PriceListStaging.model.js';
import Solution from '../models/Solution.model.js';
import SolutionOffer from '../models/SolutionOffer.model.js';
import { classifyOfferType } from '../utils/priceListClassifier.js';
import { upsertProductModelFromOffer } from './productModelUpsert.service.js';

/** Soluciones relevantes para el chatbot; si no se identifica, la fila no se inserta en solution_offers. */
export const SOLUTION_TYPES = Object.freeze({
  FORTIGATE: 'fortigate',
  FORTIGATE_VM: 'fortigate_vm',
  FORTIWIFI: 'fortiwifi',
  FORTIANALYZER: 'fortianalyzer',
  FORTIMANAGER: 'fortimanager',
  FORTISWITCH: 'fortiswitch',
  FORTIAP: 'fortiap',
  FORTIMAIL: 'fortimail',
  FORTIWEB: 'fortiweb',
});

/**
 * Normaliza un valor para búsqueda: string en minúsculas, sin espacios extra; null/undefined => ''.
 * @param {string|null|undefined} value
 * @returns {string}
 */
function norm(value) {
  if (value == null) return '';
  return String(value).toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * Identifica el tipo de solución del portafolio (solo las que el chatbot soporta).
 * Busca coincidencias en unit, sku y description (prefijos FG-, FAZ-, FMG-, FAP-, etc.).
 * Orden: más específico primero (ej. fortigate_vm antes que fortigate).
 *
 * @param {{ unit?: string|null, sku?: string|null, description?: string|null }} row
 * @returns {string|null} solution_type o null si no se identifica
 */
export function detectSolutionType({ unit, sku, description }) {
  const u = norm(unit);
  const s = norm(sku);
  const d = norm(description);
  const combined = [u, s, d].join(' ');

  // Más específico primero: FortiGate VM antes que FortiGate
  if (/\bfortigate\s*vm\b|fg-?vm\b|fortigate\s*-\s*vm/.test(combined)) return SOLUTION_TYPES.FORTIGATE_VM;
  if (/\bfortiwifi\b|fwf-/.test(combined)) return SOLUTION_TYPES.FORTIWIFI;
  if (/\bfaz-|fortianalyzer\b/.test(combined)) return SOLUTION_TYPES.FORTIANALYZER;
  if (/\bfmg-|fortimanager\b/.test(combined)) return SOLUTION_TYPES.FORTIMANAGER;
  if (/\bfsw-|fortiswitch\b|\bfs-\d/.test(combined)) return SOLUTION_TYPES.FORTISWITCH;
  if (/\bfap-|fortiap\b/.test(combined)) return SOLUTION_TYPES.FORTIAP;
  if (/\bfml-|fortimail\b/.test(combined)) return SOLUTION_TYPES.FORTIMAIL;
  if (/\bfwb-|fortiweb\b/.test(combined)) return SOLUTION_TYPES.FORTIWEB;
  if (/\bfg-|fortigate\b/.test(combined)) return SOLUTION_TYPES.FORTIGATE;

  return null;
}

/**
 * Convierte string|number|null|undefined a number o null.
 * Acepta: "1250", "1,250.00", "$1,250", "", null.
 * @param {string|number|null|undefined} value
 * @returns {number|null}
 */
export function normalizePrice(value) {
  if (value == null) return null;
  if (typeof value === 'number') {
    return Number.isNaN(value) ? null : value;
  }
  const s = String(value).trim();
  if (s === '') return null;
  const cleaned = s.replace(/[$,\s]/g, '');
  const num = parseFloat(cleaned);
  return Number.isNaN(num) ? null : num;
}

/**
 * Indica si un valor está "vacío" (null, undefined o string solo espacios).
 * @param {string|null|undefined} value
 * @returns {boolean}
 */
function isEmpty(value) {
  if (value == null) return true;
  return String(value).trim() === '';
}

/**
 * Valida la fila: SKU es obligatorio; si falta SKU o ambos (SKU y descripción) están vacíos, es inválida.
 * No se insertan cadenas vacías falsas: filas sin SKU se rechazan.
 * @param {{ sku?: string|null, description?: string|null }} row
 * @returns {{ valid: boolean, reason?: string }}
 */
export function validateStagingRow(row) {
  const skuEmpty = isEmpty(row?.sku);
  const descEmpty = isEmpty(row?.description);
  if (skuEmpty) {
    return { valid: false, reason: descEmpty ? 'Fila vacía o sin SKU ni descripción' : 'Falta SKU' };
  }
  return { valid: true };
}

/**
 * Transforma una fila de staging al formato de solution_offers.
 * Incluye solution_type (detectSolutionType); si es null, la fila no debe insertarse.
 * Clasifica offer_type, normaliza precios. Unit puede ser null; SKU viene validado (no vacío).
 * @param {{ batch_id: number, unit?: string|null, sku?: string|null, description?: string|null, price?: string|null, contract_1y?: string|null, contract_3y?: string|null, contract_5y?: string|null }} row - Fila de staging con batch_id ya asignado
 * @returns {object} Objeto listo para SolutionOffer.create (solution_type puede ser null => no insertar)
 */
export function transformStagingRow(row) {
  const solution_type = detectSolutionType({ unit: row.unit, sku: row.sku, description: row.description });
  const offer_type = classifyOfferType(row.sku, row.description);
  const unitTrimmed = row.unit != null && String(row.unit).trim() !== '' ? String(row.unit).trim() : null;
  const skuTrimmed = row.sku != null ? String(row.sku).trim() : '';
  return {
    batch_id: row.batch_id,
    unit: unitTrimmed,
    sku: skuTrimmed,
    description: row.description != null ? String(row.description).trim() : null,
    solution_type,
    offer_type,
    price: normalizePrice(row.price),
    price_1y: normalizePrice(row.contract_1y),
    price_3y: normalizePrice(row.contract_3y),
    price_5y: normalizePrice(row.contract_5y),
    is_active: 1,
  };
}

/**
 * Carga mapa code -> id de tabla solutions (activas).
 * @returns {Promise<Record<string, number>>}
 */
async function loadSolutionCodeToId() {
  try {
    const rows = await Solution.findAll({
      where: { is_active: 1 },
      attributes: ['id', 'code'],
      raw: true,
    });
    return Object.fromEntries(rows.map((r) => [r.code, r.id]));
  } catch (e) {
    logger.warn('[priceListEtl] No se pudo leer solutions: %s', e?.message ?? e);
    return {};
  }
}

function emptyCatalogSummary() {
  return {
    product_models_created: 0,
    product_models_updated: 0,
    product_model_attributes_upserted: 0,
    skip_by_reason: /** @type {Record<string, number>} */ ({}),
    warnings: /** @type {Array<{ row_index?: number, code: string, message: string }>} */ ([]),
  };
}

/**
 * Procesa un batch de price_list_staging y carga los resultados en solution_offers.
 * Además enlaza solution_id / product_model_id y hace upsert en product_models para hardware
 * de las soluciones soportadas (ver productModelUpsert.service).
 *
 * @param {number} batchId - ID del batch en price_upload_batches
 * @returns {Promise<{ total_rows: number, inserted_rows: number, failed_rows: number, skipped_rows: number, errors: Array<{ row_index?: number, reason: string }>, catalog: ReturnType<typeof emptyCatalogSummary> }>}
 */
export async function processBatchToSolutionOffers(batchId) {
  const result = {
    total_rows: 0,
    inserted_rows: 0,
    failed_rows: 0,
    skipped_rows: 0,
    errors: [],
    catalog: emptyCatalogSummary(),
  };

  const codeToId = await loadSolutionCodeToId();

  const rows = await PriceListStaging.findAll({
    where: { batch_id: batchId },
    order: [['id', 'ASC']],
    raw: true,
  });

  result.total_rows = rows.length;

  for (const row of rows) {
    const row_index = row.row_index ?? row.id;

    const validation = validateStagingRow(row);
    if (!validation.valid) {
      result.skipped_rows += 1;
      result.errors.push({ row_index, reason: validation.reason });
      continue;
    }

    const payload = transformStagingRow({
      ...row,
      batch_id: batchId,
    });

    if (payload.solution_type == null) {
      result.skipped_rows += 1;
      result.errors.push({ row_index, reason: 'solution_type no identificado (solución no soportada en el chatbot)' });
      if (payload.offer_type === 'hardware') {
        result.catalog.warnings.push({
          row_index,
          code: 'hardware_unmapped_solution',
          message:
            'Hardware detectado pero sin solución reconocida (unit/sku/description); no se inserta oferta ni modelo.',
        });
      }
      continue;
    }

    const solutionId = codeToId[payload.solution_type];
    if (solutionId == null) {
      result.catalog.warnings.push({
        row_index,
        code: 'missing_solution_fk',
        message: `No existe fila activa en solutions para code="${payload.solution_type}"; la oferta se guardará sin solution_id.`,
      });
    }

    try {
      await sequelize.transaction(async (transaction) => {
        const offer = await SolutionOffer.create(payload, { transaction });

        let productModelId = null;
        if (solutionId != null && payload.offer_type === 'hardware') {
          const cat = await upsertProductModelFromOffer({
            offer,
            solutionId,
            transaction,
          });

          if (cat.skipped && cat.skipReason) {
            result.catalog.skip_by_reason[cat.skipReason] =
              (result.catalog.skip_by_reason[cat.skipReason] || 0) + 1;
          }
          if (cat.created) result.catalog.product_models_created += 1;
          if (cat.updated) result.catalog.product_models_updated += 1;
          result.catalog.product_model_attributes_upserted += cat.attributesUpserted;
          productModelId = cat.productModelId;
        } else if (payload.offer_type === 'hardware' && solutionId == null) {
          result.catalog.skip_by_reason.missing_solution_fk =
            (result.catalog.skip_by_reason.missing_solution_fk || 0) + 1;
        }

        await offer.update(
          {
            solution_id: solutionId ?? null,
            product_model_id: productModelId,
          },
          { transaction },
        );
      });
      result.inserted_rows += 1;
    } catch (err) {
      result.failed_rows += 1;
      result.errors.push({
        row_index,
        reason: err?.message ?? String(err),
      });
    }
  }

  logger.info(
    '[priceListEtl] batch=%s insertadas=%s catálogo: modelos +%s ~%s attrs=%s skips=%j warnings=%s',
    batchId,
    result.inserted_rows,
    result.catalog.product_models_created,
    result.catalog.product_models_updated,
    result.catalog.product_model_attributes_upserted,
    result.catalog.skip_by_reason,
    result.catalog.warnings.length,
  );

  return result;
}

export default {
  detectSolutionType,
  normalizePrice,
  validateStagingRow,
  transformStagingRow,
  processBatchToSolutionOffers,
};
