/**
 * Migración: columnas fortimanager_specs para matriz PDF (FortiManager Appliances).
 *
 * Este repo NO usa `sequelize-cli` ni `config/config.json` (por eso `npx sequelize-cli db:migrate` falla).
 *
 * Uso (desde carpeta Backend/):
 *   node scripts/applyFortimanagerSpecsPdfColumns.mjs
 *
 * O:
 *   npm run migrate:fortimanager-specs-pdf
 */

import { config as loadEnv } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { Sequelize } from 'sequelize';

const __dirname = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: join(__dirname, '..', '.env') });

import { sequelize } from '../src/config/database.js';
import fortimanagerSpecsMigration from '../migrations/20260329_000014_expand_fortimanager_specs_pdf_matrix.js';

async function main() {
  const qi = sequelize.getQueryInterface();
  console.log('Aplicando 20260329_000014_expand_fortimanager_specs_pdf_matrix…');
  await fortimanagerSpecsMigration.up(qi, Sequelize);
  console.log('Listo. Puedes volver a subir el PDF FortiManager.');
  await sequelize.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
