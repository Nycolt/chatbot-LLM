/**
 * FortiAnalyzer: `fortianalyzer_specs` por UNIT (matriz PDF), sin FK a product_models.
 * Reemplaza esquema legacy product_model_id + log_rate_gb_per_day, etc.
 */

async function describe(queryInterface, table) {
  try {
    return await queryInterface.describeTable(table);
  } catch {
    return null;
  }
}

/** Sequelize/MySQL pueden devolver claves de columna en distinto casing. */
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
  const tableName = 'fortianalyzer_specs';
  let table = await describe(queryInterface, tableName);

  if (!table) {
    await queryInterface.createTable(tableName, {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      UNIT: { type: Sequelize.STRING(64), allowNull: false },
      GB_Logs_Per_Day: { type: Sequelize.STRING(255), allowNull: true },
      Analytics_Rate_Logs_Per_Sec: { type: Sequelize.STRING(255), allowNull: true },
      Collector_Rate_Logs_Per_Sec: { type: Sequelize.STRING(255), allowNull: true },
      Total_Interfaces: { type: Sequelize.STRING(255), allowNull: true },
      Storage_Capacity: { type: Sequelize.STRING(255), allowNull: true },
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
    await addUniqueIndexIfMissing(queryInterface, tableName, 'uq_fortianalyzer_specs_unit', ['UNIT']);
    return;
  }

  if (tableHasColumn(table, 'UNIT') && !tableHasColumn(table, 'product_model_id')) {
    await addColumnIfMissing(queryInterface, Sequelize, tableName, 'GB_Logs_Per_Day', {
      type: Sequelize.STRING(255),
      allowNull: true,
    });
    await addColumnIfMissing(queryInterface, Sequelize, tableName, 'Analytics_Rate_Logs_Per_Sec', {
      type: Sequelize.STRING(255),
      allowNull: true,
    });
    await addColumnIfMissing(queryInterface, Sequelize, tableName, 'Collector_Rate_Logs_Per_Sec', {
      type: Sequelize.STRING(255),
      allowNull: true,
    });
    await addColumnIfMissing(queryInterface, Sequelize, tableName, 'Total_Interfaces', {
      type: Sequelize.STRING(255),
      allowNull: true,
    });
    await addColumnIfMissing(queryInterface, Sequelize, tableName, 'Storage_Capacity', {
      type: Sequelize.STRING(255),
      allowNull: true,
    });
    await addUniqueIndexIfMissing(queryInterface, tableName, 'uq_fortianalyzer_specs_unit', ['UNIT']);
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
        await queryInterface.sequelize.query(
          `ALTER TABLE \`${tableName}\` DROP FOREIGN KEY \`${name}\``,
        );
      }
    }
  } catch {
    /* noop */
  }

  try {
    const indexes = await queryInterface.showIndex(tableName);
    for (const idx of indexes || []) {
      if (idx.name === 'uq_faz_specs_pm' || idx.name === 'uq_fortianalyzer_specs_unit') {
        await queryInterface.removeIndex(tableName, idx.name);
      }
    }
  } catch {
    /* noop */
  }

  await queryInterface.sequelize.query(`DELETE FROM \`${tableName}\``);

  const dropIf = async (col) => {
    const t = await describe(queryInterface, tableName);
    if (!t || !tableHasColumn(t, col)) return;
    const key = Object.keys(t).find((k) => k.toLowerCase() === col.toLowerCase());
    if (key) await queryInterface.removeColumn(tableName, key);
  };

  await dropIf('product_model_id');
  await dropIf('log_rate_gb_per_day');
  await dropIf('storage_tb');
  await dropIf('devices_managed');
  await dropIf('form_factor');

  await addColumnIfMissing(queryInterface, Sequelize, tableName, 'UNIT', {
    type: Sequelize.STRING(64),
    allowNull: true,
  });
  await addColumnIfMissing(queryInterface, Sequelize, tableName, 'GB_Logs_Per_Day', {
    type: Sequelize.STRING(255),
    allowNull: true,
  });
  await addColumnIfMissing(queryInterface, Sequelize, tableName, 'Analytics_Rate_Logs_Per_Sec', {
    type: Sequelize.STRING(255),
    allowNull: true,
  });
  await addColumnIfMissing(queryInterface, Sequelize, tableName, 'Collector_Rate_Logs_Per_Sec', {
    type: Sequelize.STRING(255),
    allowNull: true,
  });
  await addColumnIfMissing(queryInterface, Sequelize, tableName, 'Total_Interfaces', {
    type: Sequelize.STRING(255),
    allowNull: true,
  });
  await addColumnIfMissing(queryInterface, Sequelize, tableName, 'Storage_Capacity', {
    type: Sequelize.STRING(255),
    allowNull: true,
  });

  await queryInterface.changeColumn(tableName, 'UNIT', {
    type: Sequelize.STRING(64),
    allowNull: false,
  });

  await addUniqueIndexIfMissing(queryInterface, tableName, 'uq_fortianalyzer_specs_unit', ['UNIT']);
}

export async function down() {
  /* Irreversible sin recrear FK legacy; migración hacia UNIT es la fuente de verdad. */
}

export default { up, down };
