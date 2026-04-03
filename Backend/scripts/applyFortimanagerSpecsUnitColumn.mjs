/**
 * Añade columna `unit` a fortimanager_specs.
 *   node scripts/applyFortimanagerSpecsUnitColumn.mjs
 */

import { config as loadEnv } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { Sequelize } from 'sequelize';

const __dirname = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: join(__dirname, '..', '.env') });

import { sequelize } from '../src/config/database.js';
import m from '../migrations/20260324_000016_fortimanager_specs_unit_column.js';

async function main() {
  const qi = sequelize.getQueryInterface();
  console.log('Aplicando 20260324_000016_fortimanager_specs_unit_column…');
  await m.up(qi, Sequelize);
  console.log('Listo.');
  await sequelize.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
