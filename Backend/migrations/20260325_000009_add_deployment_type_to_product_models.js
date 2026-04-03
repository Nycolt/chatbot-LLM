/**
 * Agrega `deployment_type` a `product_models` si no existe.
 * Usado por ingest PDF (p. ej. FortiWiFi: appliance, FortiGate VM: virtual).
 */

async function addColumnIfMissing(queryInterface, tableName, columnName, definition) {
  const table = await queryInterface.describeTable(tableName);
  if (!table || table[columnName]) return;
  await queryInterface.addColumn(tableName, columnName, definition);
}

export async function up(queryInterface, Sequelize) {
  await addColumnIfMissing(queryInterface, 'product_models', 'deployment_type', {
    type: Sequelize.STRING(100),
    allowNull: true,
  });
}

export async function down(queryInterface) {
  const table = await queryInterface.describeTable('product_models');
  if (table?.deployment_type) {
    await queryInterface.removeColumn('product_models', 'deployment_type');
  }
}

export default { up, down };
