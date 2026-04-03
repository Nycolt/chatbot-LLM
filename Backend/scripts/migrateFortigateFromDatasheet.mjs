/**
 * Verificación: tabla `fortigate_specs` (esquema PascalCase, equivalente a la antigua `Datasheet` FortiGate).
 * No migra ni transforma datos.
 *
 * Uso (desde Backend/): node scripts/migrateFortigateFromDatasheet.mjs
 */

import { config as loadEnv } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: join(__dirname, '..', '.env') });

import { sequelize } from '../src/config/database.js';
import FortigateSpecs from '../src/models/FortigateSpecs.model.js';
import { isFortigateUnitOrSkuRow } from '../src/services/fortigate/fortigateSpecRowMap.js';

async function main() {
  const [[db]] = await sequelize.query('SELECT DATABASE() AS db');
  console.log('DATABASE():', db?.db);

  const count = await FortigateSpecs.count();
  console.log('Filas en fortigate_specs:', count);

  const sample = await FortigateSpecs.findOne({ raw: true });
  if (sample) {
    console.log('Muestra UNIT/SKU:', sample.UNIT, sample.SKU);
  }

  const all = await FortigateSpecs.findAll({ raw: true });
  const fg = (all || []).filter(isFortigateUnitOrSkuRow);
  console.log('Filas detectadas como FortiGate (heurística):', fg.length);

  await sequelize.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
