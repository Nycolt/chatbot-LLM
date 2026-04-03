/**
 * Agrega `sku_base` a `product_models` si no existe, para poder asociar modelo → SKU principal.
 */

async function addColumnIfMissing(queryInterface, tableName, columnName, definition) {
  const table = await queryInterface.describeTable(tableName);
  if (!table[columnName]) {
    await queryInterface.addColumn(tableName, columnName, definition);
  }
}

async function addIndexIfMissing(queryInterface, tableName, indexName, columns) {
  const indexes = await queryInterface.showIndex(tableName);
  const exists = (indexes || []).some((idx) => idx.name === indexName);
  if (!exists) {
    await queryInterface.addIndex(tableName, columns, {
      name: indexName,
    });
  }
}

export async function up(queryInterface, Sequelize) {
  await addColumnIfMissing(queryInterface, 'product_models', 'sku_base', {
    type: Sequelize.STRING(250),
    allowNull: true,
  });

  await addIndexIfMissing(queryInterface, 'product_models', 'idx_product_models_sku_base', ['sku_base']);
}

export async function down(queryInterface) {
  const table = await queryInterface.describeTable('product_models');
  if (table.sku_base) {
    const indexes = await queryInterface.showIndex('product_models');
    const hasIndex = (indexes || []).some((idx) => idx.name === 'idx_product_models_sku_base');
    if (hasIndex) {
      await queryInterface.removeIndex('product_models', 'idx_product_models_sku_base');
    }
    await queryInterface.removeColumn('product_models', 'sku_base');
  }
}

export default { up, down };
