/**
 * fortimanager_specs: columna `unit` (denormalizada) para consultas / phpMyAdmin.
 */

async function describe(queryInterface, table) {
  try {
    return await queryInterface.describeTable(table);
  } catch {
    return null;
  }
}

function tableHasColumn(table, columnName) {
  if (!table) return false;
  const want = String(columnName).toLowerCase();
  return Object.keys(table).some((k) => k.toLowerCase() === want);
}

export async function up(queryInterface, Sequelize) {
  const tableName = 'fortimanager_specs';
  const table = await describe(queryInterface, tableName);
  if (!table || tableHasColumn(table, 'unit')) return;
  await queryInterface.addColumn(tableName, 'unit', {
    type: Sequelize.STRING(64),
    allowNull: true,
  });
}

export async function down(queryInterface) {
  const tableName = 'fortimanager_specs';
  const table = await describe(queryInterface, tableName);
  if (!table || !tableHasColumn(table, 'unit')) return;
  try {
    await queryInterface.removeColumn(tableName, 'unit');
  } catch {
    /* noop */
  }
}

export default { up, down };
