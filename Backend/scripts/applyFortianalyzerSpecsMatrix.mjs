/**
 * Migración: fortianalyzer_specs por UNIT (matriz PDF).
 *
 * Este repo no usa `sequelize-cli` ni `config/config.json`.
 * Uso (desde carpeta Backend/):
 *   node scripts/applyFortianalyzerSpecsMatrix.mjs
 *
 * O: pnpm run migrate:fortianalyzer-specs-matrix
 */

import { config as loadEnv } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { Sequelize } from 'sequelize';

const __dirname = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: join(__dirname, '..', '.env') });

import { sequelize } from '../src/config/database.js';
import fortianalyzerSpecsMigration from '../migrations/20260328_000013_fortianalyzer_specs_unit_matrix.js';

async function main() {
  const qi = sequelize.getQueryInterface();
  console.log('Aplicando 20260328_000013_fortianalyzer_specs_unit_matrix…');
  await fortianalyzerSpecsMigration.up(qi, Sequelize);
  console.log('Listo. Puedes subir el PDF FortiAnalyzer o usar POST /api/v1/fortianalyzer/upload');
  await sequelize.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
