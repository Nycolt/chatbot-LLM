/**
 * Agrega `family_name` a `product_models` si no existe.
 * Necesario para linkFortiwifiRecordsToCatalog / ingest PDF (findOrCreate con family_name).
 */

async function addColumnIfMissing(queryInterface, tableName, columnName, definition) {
  const table = await queryInterface.describeTable(tableName);
  if (!table || table[columnName]) return;
  await queryInterface.addColumn(tableName, columnName, definition);
}

export async function up(queryInterface, Sequelize) {
  await addColumnIfMissing(queryInterface, 'product_models', 'family_name', {
    type: Sequelize.STRING(255),
    allowNull: true,
  });
}

export async function down(queryInterface) {
  const table = await queryInterface.describeTable('product_models');
  if (table?.family_name) {
    await queryInterface.removeColumn('product_models', 'family_name');
  }
}

export default { up, down };
