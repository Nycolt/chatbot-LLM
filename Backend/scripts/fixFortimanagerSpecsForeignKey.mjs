/**
 * Repara FK de fortimanager_specs → product_models (no backup_*).
 *
 * Uso (desde Backend/):
 *   node scripts/fixFortimanagerSpecsForeignKey.mjs
 *
 * Si el nombre del FK no es fortimanager_specs_ibfk_1:
 *   FK_NAME=tu_nombre node scripts/fixFortimanagerSpecsForeignKey.mjs
 */

import { config as loadEnv } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: join(__dirname, '..', '.env') });

import { sequelize } from '../src/config/database.js';

const DROP_NAME = process.env.FK_NAME || 'fortimanager_specs_ibfk_1';
const ADD_NAME = 'fk_fmg_specs_product_model';

async function main() {
  const qi = sequelize.getQueryInterface();
  const [rows] = await sequelize.query('SHOW CREATE TABLE fortimanager_specs');
  const row0 = Array.isArray(rows) ? rows[0] : rows;
  const createSql = row0?.['Create Table'] || row0?.create_table || '';
  console.log('--- SHOW CREATE (extracto FK) ---');
  console.log(
    createSql
      .split('\n')
      .filter((l) => /CONSTRAINT|FOREIGN KEY|REFERENCES/i.test(l))
      .join('\n') || '(no se pudo leer; revisa permisos)',
  );

  console.log(`\nIntentando DROP FOREIGN KEY \`${DROP_NAME}\`…`);
  try {
    await qi.sequelize.query(
      `ALTER TABLE fortimanager_specs DROP FOREIGN KEY \`${DROP_NAME}\``,
    );
  } catch (e) {
    console.error('DROP falló (¿nombre distinto?). Ajusta FK_NAME=... en .env o variable de entorno.');
    throw e;
  }

  console.log(`Añadiendo FK \`${ADD_NAME}\` → product_models(id)…`);
  await qi.sequelize.query(`
    ALTER TABLE fortimanager_specs
    ADD CONSTRAINT \`${ADD_NAME}\`
    FOREIGN KEY (product_model_id)
    REFERENCES product_models (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
  `);

  console.log('Listo. Reinicia el backend y vuelve a subir el PDF.');
  await sequelize.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
