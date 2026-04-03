/**
 * Parches BD para ingest PDF FortiWiFi:
 * 1) fortiwifi_specs: UNIT + matrix PascalCase (Unknown column 'UNIT')
 * 2) product_models: family_name
 * 3) product_models: deployment_type
 * 4) product_models: has_datasheet, source_origin, technical_completeness_status, is_active
 * 5) product_models: alinear ENUM source_origin / technical_completeness (evita Data truncated)
 * 6) fortiwifi_specs: quitar product_model_id + columnas Wi‑Fi legacy
 *
 * Uso (desde carpeta Backend/):
 *   node scripts/applyFortiwifiSpecsMatrix.mjs
 *
 * O: npm run migrate:fortiwifi-specs-matrix
 */

import { config as loadEnv } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { Sequelize } from 'sequelize';

const __dirname = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: join(__dirname, '..', '.env') });

import { sequelize } from '../src/config/database.js';
import fortiwifiSpecsMigration from '../migrations/20260325_000007_expand_fortiwifi_specs_matrix.js';
import familyNameMigration from '../migrations/20260325_000008_add_family_name_to_product_models.js';
import deploymentTypeMigration from '../migrations/20260325_000009_add_deployment_type_to_product_models.js';
import productModelsStatusMigration from '../migrations/20260325_000010_add_product_models_datasheet_status_columns.js';
import alignProductModelsEnumsMigration from '../migrations/20260326_000011_align_product_models_enum_columns.js';
import dropFortiwifiLegacyMigration from '../migrations/20260326_000012_drop_fortiwifi_specs_legacy_columns.js';

async function main() {
  const qi = sequelize.getQueryInterface();
  console.log('1/6 expand_fortiwifi_specs_matrix…');
  await fortiwifiSpecsMigration.up(qi, Sequelize);
  console.log('2/6 add_family_name_to_product_models…');
  await familyNameMigration.up(qi, Sequelize);
  console.log('3/6 add_deployment_type_to_product_models…');
  await deploymentTypeMigration.up(qi, Sequelize);
  console.log('4/6 add_product_models_datasheet_status_columns…');
  await productModelsStatusMigration.up(qi, Sequelize);
  console.log('5/6 align_product_models_enum_columns…');
  await alignProductModelsEnumsMigration.up(qi, Sequelize);
  console.log('6/6 drop_fortiwifi_specs_legacy_columns…');
  await dropFortiwifiLegacyMigration.up(qi, Sequelize);
  console.log('Listo. Vuelve a subir el PDF FortiWiFi.');
  await sequelize.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
