/**
 * Columnas de catálogo en `product_models` usadas por ingest PDF / Sequelize.
 * Idempotente: solo añade si faltan (evita Unknown column has_datasheet, source_origin, etc.).
 */

async function addColumnIfMissing(queryInterface, tableName, columnName, definition) {
  const table = await queryInterface.describeTable(tableName);
  if (!table || table[columnName]) return;
  await queryInterface.addColumn(tableName, columnName, definition);
}

export async function up(queryInterface, Sequelize) {
  const tableName = 'product_models';

  await addColumnIfMissing(queryInterface, tableName, 'has_datasheet', {
    type: Sequelize.TINYINT,
    allowNull: false,
    defaultValue: 0,
  });

  await addColumnIfMissing(queryInterface, tableName, 'source_origin', {
    type: Sequelize.ENUM('excel', 'pdf', 'manual'),
    allowNull: false,
    defaultValue: 'manual',
  });

  await addColumnIfMissing(queryInterface, tableName, 'technical_completeness_status', {
    type: Sequelize.ENUM('verified', 'partial', 'commercial_only'),
    allowNull: false,
    defaultValue: 'commercial_only',
  });

  await addColumnIfMissing(queryInterface, tableName, 'is_active', {
    type: Sequelize.TINYINT,
    allowNull: false,
    defaultValue: 1,
  });
}

export async function down(queryInterface) {
  const table = await queryInterface.describeTable('product_models');
  if (!table) return;
  for (const col of ['is_active', 'technical_completeness_status', 'source_origin', 'has_datasheet']) {
    if (table[col]) {
      await queryInterface.removeColumn('product_models', col);
    }
  }
}

export default { up, down };
