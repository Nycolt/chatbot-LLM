/**
 * Servicio de ciclo de vida (EOS/EOL) y reemplazos de productos
 */

import ProductLifecycle from '../models/ProductLifecycle.model.js';
import ProductReplacement from '../models/ProductReplacement.model.js';

/**
 * Normaliza UNIT para búsqueda (ej. "FortiGate 40F" -> "FortiGate-40F")
 */
function normalizeUnit(unit) {
  if (!unit || typeof unit !== 'string') return null;
  return unit.trim().replace(/\s+/g, '-');
}

/**
 * Obtiene el estado de ciclo de vida de un producto por UNIT
 * @param {string} unit - UNIT del producto (ej. FortiGate-40F)
 * @returns {Promise<{ unit, sku, status, eos_date, eol_date } | null>}
 */
async function getLifecycleStatus(unit) {
  const u = normalizeUnit(unit);
  if (!u) return null;
  const row = await ProductLifecycle.findOne({
    where: { unit: u },
    raw: true,
  });
  return row;
}

/**
 * Obtiene el reemplazo sugerido para un UNIT (si está EOS/EOL)
 * @param {string} unit - UNIT del producto
 * @returns {Promise<{ replacement_unit, replacement_sku } | null>}
 */
async function getReplacement(unit) {
  const u = normalizeUnit(unit);
  if (!u) return null;
  const row = await ProductReplacement.findOne({
    where: { unit: u },
    attributes: ['replacement_unit', 'replacement_sku'],
    raw: true,
  });
  return row;
}

/**
 * Obtiene estado de ciclo de vida y reemplazo en una sola llamada
 * @param {string} unit
 * @returns {Promise<{ status: string, eos_date?, eol_date?, replacement?: { unit, sku } }>}
 */
async function getLifecycleAndReplacement(unit) {
  const lifecycle = await getLifecycleStatus(unit);
  const result = {
    status: lifecycle?.status || 'ACTIVE',
    unit: normalizeUnit(unit),
  };
  if (lifecycle?.eos_date) result.eos_date = lifecycle.eos_date;
  if (lifecycle?.eol_date) result.eol_date = lifecycle.eol_date;
  if (lifecycle?.status === 'EOS' || lifecycle?.status === 'EOL') {
    const repl = await getReplacement(unit);
    if (repl) result.replacement = { unit: repl.replacement_unit, sku: repl.replacement_sku };
  }
  return result;
}

export default {
  getLifecycleStatus,
  getReplacement,
  getLifecycleAndReplacement,
  normalizeUnit,
};
