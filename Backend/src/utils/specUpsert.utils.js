/**
 * UPSERT reutilizable por UNIT para tablas *_specs (FortiGate, FortiGate VM, futuras).
 */

import normalizeUnit from './normalizeUnit.js';

/**
 * Detecta UNIT duplicados en una tabla specs (validación post-carga).
 * @param {import('sequelize').Model} Model
 * @param {string} [unitField='UNIT']
 * @returns {Promise<Array<{ unit: string, cnt: number }>>}
 */
export async function findDuplicateSpecUnits(Model, unitField = 'UNIT') {
  const table = Model.tableName;
  const { sequelize } = Model;
  const q = sequelize.getDialect() === 'mysql' ? '`' : '"';
  const col = `${q}${unitField}${q}`;
  const tbl = `${q}${table}${q}`;
  const [rows] = await sequelize.query(
    `SELECT ${col} AS unit, COUNT(*) AS cnt FROM ${tbl} GROUP BY ${col} HAVING cnt > 1`,
  );
  return rows || [];
}

/**
 * Dedupe de filas por UNIT normalizado; la última fila gana.
 * @param {Array<Record<string, unknown>>} records
 * @param {string} [unitField='UNIT']
 * @returns {Array<Record<string, unknown>>}
 */
export function dedupeRecordsByUnit(records, unitField = 'UNIT') {
  if (!Array.isArray(records) || records.length === 0) return [];
  const map = new Map();
  for (const rec of records) {
    if (!rec || typeof rec !== 'object') continue;
    const u = normalizeUnit(rec[unitField]);
    if (!u) continue;
    const prev = map.get(u) || {};
    map.set(u, { ...prev, ...rec, [unitField]: u });
  }
  return [...map.values()];
}

/**
 * Quita `id` y claves undefined para no pisar PK ni enviar basura a Sequelize.
 * @param {Record<string, unknown>} obj
 */
function sanitizePayloadForWrite(obj) {
  const out = { ...obj };
  delete out.id;
  for (const k of Object.keys(out)) {
    if (out[k] === undefined) delete out[k];
  }
  return out;
}

/**
 * UPSERT por campo UNIT (o `unitField`): actualiza si existe, crea si no.
 *
 * @param {import('sequelize').Model} Model - Modelo Sequelize (fortigate_specs, fortigate_vm_specs, …)
 * @param {Array<Record<string, unknown>>} records - Filas con al menos el campo UNIT
 * @param {object} [options]
 * @param {string} [options.unitField='UNIT'] - Nombre del atributo en el modelo
 * @param {import('sequelize').Transaction} [options.transaction]
 * @param {boolean} [options.mergeSku=true] - Si true y SKU viene vacío en el payload de actualización, no pisa SKU existente (FortiGate)
 * @returns {Promise<Array<import('sequelize').Model>>}
 */
export async function upsertSpecs(Model, records, options = {}) {
  const { unitField = 'UNIT', transaction, mergeSku = true } = options;
  const deduped = dedupeRecordsByUnit(records, unitField);
  const out = [];

  for (const raw of deduped) {
    const unit = normalizeUnit(raw[unitField]);
    if (!unit) continue;

    const payload = sanitizePayloadForWrite({ ...raw, [unitField]: unit });

    const existing = await Model.findOne({
      where: { [unitField]: unit },
      transaction,
    });

    if (existing) {
      const updates = { ...payload };
      if (mergeSku && Model.tableName === 'fortigate_specs') {
        const skuEmpty =
          updates.SKU == null ||
          (typeof updates.SKU === 'string' && updates.SKU.trim() === '');
        if (skuEmpty) delete updates.SKU;
      }
      await existing.update(updates, { transaction });
      console.log({
        action: 'UPSERT',
        table: Model.tableName,
        unit,
        operation: 'UPDATE',
      });
      out.push(existing);
    } else {
      const insertPayload = { ...payload };
      if (Model.tableName === 'fortigate_specs') {
        if (insertPayload.SKU == null || String(insertPayload.SKU).trim() === '') {
          insertPayload.SKU = unit;
        }
      }
      const created = await Model.create(insertPayload, { transaction });
      console.log({
        action: 'UPSERT',
        table: Model.tableName,
        unit,
        operation: 'INSERT',
      });
      out.push(created);
    }
  }

  return out;
}

export default { upsertSpecs, dedupeRecordsByUnit, findDuplicateSpecUnits };
