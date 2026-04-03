/**
 * FortiWiFi: columnas matrix (PascalCase) + UNIT único para UPSERT.
 * Sin product_model_id ni columnas legacy Wi‑Fi en la tabla (enlace al catálogo por UNIT).
 */

async function describe(queryInterface, table) {
  try {
    return await queryInterface.describeTable(table);
  } catch {
    return null;
  }
}

async function addColumnIfMissing(queryInterface, Sequelize, tableName, columnName, definition) {
  const table = await describe(queryInterface, tableName);
  if (!table || table[columnName]) return;
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
  const tableName = 'fortiwifi_specs';
  const table = await describe(queryInterface, tableName);
  if (!table) return;

  try {
    const [fks] = await queryInterface.sequelize.query(
      `SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :t AND CONSTRAINT_TYPE = 'FOREIGN KEY'`,
      { replacements: { t: tableName } },
    );
    for (const row of fks || []) {
      const name = row.CONSTRAINT_NAME;
      if (name)
        await queryInterface.sequelize.query(
          `ALTER TABLE \`${tableName}\` DROP FOREIGN KEY \`${name}\``,
        );
    }
  } catch {
    /* noop */
  }

  try {
    await queryInterface.sequelize.query(`
      ALTER TABLE \`${tableName}\` DROP INDEX \`uq_fwifi_specs_pm\`
    `);
  } catch {
    /* ya eliminado o otro nombre */
  }

  const str = (len = 255) => ({ type: Sequelize.STRING(len), allowNull: true });

  await addColumnIfMissing(queryInterface, Sequelize, tableName, 'UNIT', {
    type: Sequelize.STRING(64),
    allowNull: true,
  });
  await addColumnIfMissing(queryInterface, Sequelize, tableName, 'IPS_Throughput', str());
  await addColumnIfMissing(queryInterface, Sequelize, tableName, 'NGFW_Throughput', str());
  await addColumnIfMissing(queryInterface, Sequelize, tableName, 'Threat_Protection_Throughput', str());
  await addColumnIfMissing(queryInterface, Sequelize, tableName, 'Concurrent_Sessions_TCP', str());
  await addColumnIfMissing(queryInterface, Sequelize, tableName, 'New_Sessions_Per_Second_TCP', str());
  await addColumnIfMissing(queryInterface, Sequelize, tableName, 'IPsec_VPN_Throughput', str());
  await addColumnIfMissing(queryInterface, Sequelize, tableName, 'SSL_Inspection_Throughput', str());
  await addColumnIfMissing(queryInterface, Sequelize, tableName, 'SSL_Inspection_Concurrent_Session', str());
  await addColumnIfMissing(queryInterface, Sequelize, tableName, 'Max_FortiAPs', str());
  await addColumnIfMissing(queryInterface, Sequelize, tableName, 'Max_FortiSwitches', str());

  const tstamp = await describe(queryInterface, tableName);
  if (tstamp && !tstamp.created_at) {
    await queryInterface.sequelize.query(`
      ALTER TABLE \`${tableName}\`
      ADD COLUMN \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    `);
  }
  const tstamp2 = await describe(queryInterface, tableName);
  if (tstamp2 && !tstamp2.updated_at) {
    await queryInterface.sequelize.query(`
      ALTER TABLE \`${tableName}\`
      ADD COLUMN \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    `);
  }

  await addUniqueIndexIfMissing(queryInterface, tableName, 'uq_fortiwifi_specs_unit', ['UNIT']);
}

export async function down(queryInterface) {
  const tableName = 'fortiwifi_specs';
  try {
    const indexes = await queryInterface.showIndex(tableName);
    const has = (indexes || []).some((idx) => idx.name === 'uq_fortiwifi_specs_unit');
    if (has) await queryInterface.removeIndex(tableName, 'uq_fortiwifi_specs_unit');
  } catch {
    /* noop */
  }
}

export default { up, down };
