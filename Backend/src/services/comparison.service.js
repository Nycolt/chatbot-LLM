/**
 * Servicio de comparación entre modelos Fortinet (tabla comparativa y EOS/EOL)
 */

import DatasheetService from './Datasheet.service.js';
import ProductService from './product.service.js';
import lifecycleService from './lifecycle.service.js';

const SPEC_FIELDS = [
  'UNIT',
  'SKU',
  'Firewall_Throughput_UDP',
  'NGFW_Throughput_Enterprise_Mix',
  'Threat_Protection_Throughput',
  'Concurrent_Sessions',
  'IPSec_VPN_Throughput',
  'SSL_VPN_Throughput',
  'SSL_Inspection_Throughput',
  'Virtual_Domains',
  'Interfaces',
  'Form_Factor',
];

/**
 * Obtiene fila(s) de Datasheet por UNIT (primera variante o todas)
 */
async function getDatasheetRows(unit) {
  const rows = await DatasheetService.getDatasheetByUnit(unit);
  return Array.isArray(rows) ? rows : [];
}

/**
 * Obtiene productos por UNIT (precios, descripción)
 */
async function getProductRows(unit) {
  const rows = await ProductService.getProductByUnit(unit);
  return Array.isArray(rows) ? rows : [];
}

/**
 * Construye una fila de especificaciones para la tabla (solo campos presentes)
 */
function buildSpecRow(unit, datasheetRow, productRow) {
  const row = { unit, sku: datasheetRow?.SKU || productRow?.SKU || unit };
  for (const field of SPEC_FIELDS) {
    const v = datasheetRow?.[field] ?? productRow?.[field];
    if (v != null && String(v).trim() !== '') row[field] = v;
  }
  if (productRow) {
    if (productRow.Price != null) row.Price = productRow.Price;
    if (productRow.OneYearContract != null) row.OneYearContract = productRow.OneYearContract;
  }
  return row;
}

/**
 * Compara dos o más modelos por UNIT. Incluye lifecycle si se pide.
 * @param {string[]} units - Ej. ['FortiGate-40F', 'FortiGate-50G']
 * @param {boolean} includeLifecycle - Si true, añade status y replacement
 * @returns {Promise<{ comparisonTable: object[], lifecycle?: object[] }>}
 */
async function compareModels(units, includeLifecycle = true) {
  const comparisonTable = [];
  const lifecycleInfo = [];

  for (const unit of units) {
    const normalized = lifecycleService.normalizeUnit(unit) || unit;
    const dsRows = await getDatasheetRows(normalized);
    const prodRows = await getProductRows(normalized);
    const dsRow = dsRows[0] || {};
    const prodRow = prodRows.find(p => p.SKU === dsRow.SKU) || prodRows[0] || {};
    comparisonTable.push(buildSpecRow(normalized, dsRow, prodRow));

    if (includeLifecycle) {
      const lc = await lifecycleService.getLifecycleAndReplacement(normalized);
      lifecycleInfo.push({ unit: normalized, ...lc });
    }
  }

  return {
    comparisonTable,
    lifecycle: includeLifecycle ? lifecycleInfo : undefined,
  };
}

/**
 * Compara un modelo EOS/EOL con su reemplazo sugerido
 * @param {string} unit - UNIT del modelo a consultar
 * @returns {Promise<{ isEosEol: boolean, status: string, replacement?: object, comparison?: object }>}
 */
async function compareWithReplacement(unit) {
  const lc = await lifecycleService.getLifecycleAndReplacement(unit);
  const isEosEol = lc.status === 'EOS' || lc.status === 'EOL';
  const result = { isEosEol, status: lc.status, unit: lc.unit };
  if (lc.replacement) result.replacement = lc.replacement;
  if (isEosEol && lc.replacement?.unit) {
    const comp = await compareModels([unit, lc.replacement.unit], true);
    result.comparison = comp;
  }
  return result;
}

export default {
  compareModels,
  compareWithReplacement,
  SPEC_FIELDS,
};
