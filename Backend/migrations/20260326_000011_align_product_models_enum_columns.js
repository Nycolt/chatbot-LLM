/**
 * Alinea ENUM de `product_models` con los valores que usa el código (ingest PDF, legacy SQL).
 * Corrige: Data truncated for column 'source_origin' cuando la columna ya existía con ENUM viejo
 * sin 'pdf' (la migración 010 no hace MODIFY si la columna ya estaba).
 */

async function safeDescribe(queryInterface, table) {
  try {
    return await queryInterface.describeTable(table);
  } catch {
    return null;
  }
}

export async function up(queryInterface) {
  const sq = queryInterface.sequelize;
  const table = await safeDescribe(queryInterface, 'product_models');
  if (!table) return;

  if (table.source_origin) {
    await sq.query(`
      ALTER TABLE \`product_models\`
      MODIFY COLUMN \`source_origin\`
        ENUM('excel','pdf','manual','datasheet','legacy_migration')
        NOT NULL DEFAULT 'manual'
    `);
  }

  if (table.technical_completeness_status) {
    await sq.query(`
      ALTER TABLE \`product_models\`
      MODIFY COLUMN \`technical_completeness_status\`
        ENUM('verified','partial','commercial_only','complete','missing')
        NOT NULL DEFAULT 'commercial_only'
    `);
  }
}

export async function down() {
  /* irreversible sin conocer el ENUM previo */
}

export default { up, down };
