/**
 * FortiManager: columnas para matriz PDF (datasheet) además de max_managed_devices / max_adoms / form_factor.
 */

async function describe(queryInterface, table) {
  try {
    return await queryInterface.describeTable(table);
  } catch {
    return null;
  }
}

/** MySQL/Sequelize pueden devolver claves en otro casing → evita saltar ADD por error. */
function tableHasColumn(table, columnName) {
  if (!table) return false;
  const want = String(columnName).toLowerCase();
  return Object.keys(table).some((k) => k.toLowerCase() === want);
}

async function addColumnIfMissing(queryInterface, Sequelize, tableName, columnName, definition) {
  const table = await describe(queryInterface, tableName);
  if (!table || tableHasColumn(table, columnName)) return;
  await queryInterface.addColumn(tableName, columnName, definition);
}

const str = (len) => ({ type: Sequelize.STRING(len), allowNull: true });

export async function up(queryInterface, Sequelize) {
  const tableName = 'fortimanager_specs';
  const table = await describe(queryInterface, tableName);
  if (!table) return;

  // Columnas del esquema base del catálogo (si la tabla se creó a mano sin ellas)
  await addColumnIfMissing(queryInterface, Sequelize, tableName, 'max_managed_devices', str(64));
  await addColumnIfMissing(queryInterface, Sequelize, tableName, 'max_adoms', str(64));
  await addColumnIfMissing(queryInterface, Sequelize, tableName, 'form_factor', str(128));

  await addColumnIfMissing(queryInterface, Sequelize, tableName, 'default_managed_devices', str(64));
  await addColumnIfMissing(queryInterface, Sequelize, tableName, 'default_adoms', str(64));
  await addColumnIfMissing(queryInterface, Sequelize, tableName, 'log_gb_per_day', str(64));
  await addColumnIfMissing(queryInterface, Sequelize, tableName, 'sustained_log_rates', str(64));
  await addColumnIfMissing(queryInterface, Sequelize, tableName, 'storage_capacity', str(255));
  await addColumnIfMissing(queryInterface, Sequelize, tableName, 'usable_storage', str(255));
  await addColumnIfMissing(queryInterface, Sequelize, tableName, 'raid_levels', str(128));
  await addColumnIfMissing(queryInterface, Sequelize, tableName, 'total_interfaces', str(255));
  await addColumnIfMissing(queryInterface, Sequelize, tableName, 'redundant_power', str(32));
  await addColumnIfMissing(queryInterface, Sequelize, tableName, 'removable_disks', str(128));
  await addColumnIfMissing(queryInterface, Sequelize, tableName, 'sed', str(128));
}

export async function down(queryInterface) {
  const tableName = 'fortimanager_specs';
  // Orden: primero columnas PDF, luego max_* / form_factor si las añadió este up
  const cols = [
    'sed',
    'removable_disks',
    'redundant_power',
    'total_interfaces',
    'raid_levels',
    'usable_storage',
    'storage_capacity',
    'sustained_log_rates',
    'log_gb_per_day',
    'default_adoms',
    'default_managed_devices',
    'form_factor',
    'max_adoms',
    'max_managed_devices',
  ];
  for (const c of cols) {
    const table = await describe(queryInterface, tableName);
    if (!table || !tableHasColumn(table, c)) continue;
    try {
      await queryInterface.removeColumn(tableName, c);
    } catch {
      /* noop */
    }
  }
}

export default { up, down };
