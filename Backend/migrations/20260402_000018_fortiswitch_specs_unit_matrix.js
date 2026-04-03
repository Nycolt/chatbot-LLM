/**
 * fortiswitch_specs: clave `unit`, columnas matriz PDF, product_model_id opcional.
 * Alternativa SQL pura: Docs/sql/alter_fortiswitch_specs_pdf_matrix.sql
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

async function addColumnIfMissing(queryInterface, Sequelize, tableName, columnName, definition) {
  const table = await describe(queryInterface, tableName);
  if (!table || tableHasColumn(table, columnName)) return;
  await queryInterface.addColumn(tableName, columnName, definition);
}

async function addUniqueIndexIfMissing(queryInterface, tableName, indexName, columns) {
  const indexes = await queryInterface.showIndex(tableName);
  const exists = (indexes || []).some((idx) => idx.name === indexName);
  if (!exists) {
    await queryInterface.addIndex(tableName, columns, { name: indexName, unique: true });
  }
}

export async function up(queryInterface, Sequelize) {
  const tableName = 'fortiswitch_specs';
  let table = await describe(queryInterface, tableName);

  if (!table) {
    await queryInterface.createTable(tableName, {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      product_model_id: { type: Sequelize.INTEGER, allowNull: true },
      unit: { type: Sequelize.STRING(128), allowNull: false },
      total_network_interfaces: { type: Sequelize.STRING(64), allowNull: true },
      poe_ports: { type: Sequelize.STRING(32), allowNull: true },
      poe_power_budget: { type: Sequelize.STRING(128), allowNull: true },
      switching_capacity: { type: Sequelize.STRING(128), allowNull: true },
      pps_64_bytes: { type: Sequelize.STRING(128), allowNull: true },
      mac_address_storage: { type: Sequelize.STRING(128), allowNull: true },
      vlans_supported: { type: Sequelize.STRING(128), allowNull: true },
      lag_group_size: { type: Sequelize.STRING(64), allowNull: true },
      lag_total_groups: { type: Sequelize.STRING(64), allowNull: true },
      power_consumption: { type: Sequelize.STRING(128), allowNull: true },
      power_supply: { type: Sequelize.STRING(255), allowNull: true },
      heat_dissipation: { type: Sequelize.STRING(128), allowNull: true },
      operating_temp: { type: Sequelize.STRING(255), allowNull: true },
      humidity: { type: Sequelize.STRING(255), allowNull: true },
      form_factor: { type: Sequelize.STRING(255), allowNull: true },
      uplink: { type: Sequelize.STRING(128), allowNull: true },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });
    await addUniqueIndexIfMissing(queryInterface, tableName, 'uq_fortiswitch_specs_unit', ['unit']);
    return;
  }

  try {
    const [fks] = await queryInterface.sequelize.query(
      `SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :t AND CONSTRAINT_TYPE = 'FOREIGN KEY'`,
      { replacements: { t: tableName } },
    );
    for (const row of fks || []) {
      const name = row.CONSTRAINT_NAME;
      if (name) {
        await queryInterface.sequelize.query(`ALTER TABLE \`${tableName}\` DROP FOREIGN KEY \`${name}\``);
      }
    }
  } catch {
    /* noop */
  }

  try {
    const indexes = await queryInterface.showIndex(tableName);
    for (const idx of indexes || []) {
      if (idx.name === 'uq_fsw_specs_pm' || idx.name === 'uq_fortiswitch_specs_unit') {
        await queryInterface.removeIndex(tableName, idx.name);
      }
    }
  } catch {
    /* noop */
  }

  await queryInterface.changeColumn(tableName, 'product_model_id', {
    type: Sequelize.INTEGER,
    allowNull: true,
  });

  await addColumnIfMissing(queryInterface, Sequelize, tableName, 'unit', {
    type: Sequelize.STRING(128),
    allowNull: true,
  });

  const str = (len = 255) => ({ type: Sequelize.STRING(len), allowNull: true });

  await addColumnIfMissing(queryInterface, Sequelize, tableName, 'total_network_interfaces', str(64));
  await addColumnIfMissing(queryInterface, Sequelize, tableName, 'poe_power_budget', str(128));
  await addColumnIfMissing(queryInterface, Sequelize, tableName, 'pps_64_bytes', str(128));
  await addColumnIfMissing(queryInterface, Sequelize, tableName, 'mac_address_storage', str(128));
  await addColumnIfMissing(queryInterface, Sequelize, tableName, 'vlans_supported', str(128));
  await addColumnIfMissing(queryInterface, Sequelize, tableName, 'lag_group_size', str(64));
  await addColumnIfMissing(queryInterface, Sequelize, tableName, 'lag_total_groups', str(64));
  await addColumnIfMissing(queryInterface, Sequelize, tableName, 'power_consumption', str(128));
  await addColumnIfMissing(queryInterface, Sequelize, tableName, 'power_supply', str(255));
  await addColumnIfMissing(queryInterface, Sequelize, tableName, 'heat_dissipation', str(128));
  await addColumnIfMissing(queryInterface, Sequelize, tableName, 'operating_temp', str(255));
  await addColumnIfMissing(queryInterface, Sequelize, tableName, 'humidity', str(255));
  await addColumnIfMissing(queryInterface, Sequelize, tableName, 'form_factor', str(255));

  const t2 = await describe(queryInterface, tableName);
  if (t2 && tableHasColumn(t2, 'unit')) {
    await queryInterface.sequelize.query(`DELETE FROM \`${tableName}\``);
    await queryInterface.changeColumn(tableName, 'unit', {
      type: Sequelize.STRING(128),
      allowNull: false,
    });
  }

  await addUniqueIndexIfMissing(queryInterface, tableName, 'uq_fortiswitch_specs_unit', ['unit']);
}

export async function down() {}

export default { up, down };
