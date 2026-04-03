/**
 * Renombra columnas de dimensionamiento en fortimanager_specs (ver migración 20260401_000017).
 *
 * Este repo no usa sequelize-cli; uso típico desde Backend/:
 *   node scripts/applyFortimanagerSpecsSizingColumnNames.mjs
 *
 * O:
 *   npm run migrate:fortimanager-specs-sizing-names
 */

import { config as loadEnv } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: join(__dirname, '..', '.env') });

import { sequelize } from '../src/config/database.js';
import sizingRenameMigration from '../migrations/20260401_000017_rename_fortimanager_specs_sizing_columns.js';

async function main() {
  const qi = sequelize.getQueryInterface();
  console.log('Aplicando 20260401_000017_rename_fortimanager_specs_sizing_columns…');
  await sizingRenameMigration.up(qi);
  console.log('Listo.');
  await sequelize.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
