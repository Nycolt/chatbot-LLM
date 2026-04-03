/**
 * Comprueba que fortianalyzer_specs tenga el esquema matrix (UNIT + columnas PDF).
 * Evita error críptico "Unknown column 'UNIT'".
 */

import { sequelize } from '../../config/database.js';

/**
 * @returns {Promise<string[]>} nombres de columna en minúsculas
 */
async function listColumnsLower() {
  const [rows] = await sequelize.query(
    `SELECT COLUMN_NAME AS c FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'fortianalyzer_specs'`,
  );
  return (rows || []).map((r) => String(r.c || '').toLowerCase()).filter(Boolean);
}

/**
 * @throws {Error} mensaje accionable si falta UNIT o sigue el esquema legacy
 */
export async function assertFortianalyzerSpecsSchemaReady() {
  const [tables] = await sequelize.query(
    `SELECT TABLE_NAME FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'fortianalyzer_specs'`,
  );
  if (!tables?.length) {
    throw new Error(
      'No existe la tabla fortianalyzer_specs. En la carpeta Backend ejecuta: pnpm run migrate:fortianalyzer-specs-matrix',
    );
  }

  const cols = await listColumnsLower();
  const hasUnit = cols.includes('unit');
  const hasPm = cols.includes('product_model_id');

  if (hasPm && !hasUnit) {
    throw new Error(
      'La tabla fortianalyzer_specs está en formato antiguo (product_model_id) y no tiene UNIT. ' +
        'En la carpeta Backend ejecuta: pnpm run migrate:fortianalyzer-specs-matrix',
    );
  }

  if (!hasUnit) {
    throw new Error(
      'Falta la columna UNIT en fortianalyzer_specs. Ejecuta: pnpm run migrate:fortianalyzer-specs-matrix',
    );
  }

  const required = [
    'gb_logs_per_day',
    'analytics_rate_logs_per_sec',
    'collector_rate_logs_per_sec',
    'total_interfaces',
    'storage_capacity',
  ];
  const missing = required.filter((c) => !cols.includes(c));
  if (missing.length) {
    throw new Error(
      `Faltan columnas en fortianalyzer_specs: ${missing.join(', ')}. ` +
        'Ejecuta: pnpm run migrate:fortianalyzer-specs-matrix',
    );
  }
}
