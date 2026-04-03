/**
 * Extiende `fortigate_vm_specs` para soportar carga directa desde PDF matrix.
 * Conserva columnas legacy y agrega el esquema PascalCase solicitado.
 */

async function addColumnIfMissing(queryInterface, tableName, columnName, definition) {
  const table = await queryInterface.describeTable(tableName);
  if (!table[columnName]) {
    await queryInterface.addColumn(tableName, columnName, definition);
  }
}

async function addUniqueIndexIfMissing(queryInterface, tableName, indexName, columns) {
  const indexes = await queryInterface.showIndex(tableName);
  const exists = (indexes || []).some((idx) => idx.name === indexName);
  if (!exists) {
    await queryInterface.addIndex(tableName, columns, {
      name: indexName,
      unique: true,
    });
  }
}

export async function up(queryInterface, Sequelize) {
  const tableName = 'fortigate_vm_specs';

  await queryInterface.changeColumn(tableName, 'product_model_id', {
    type: Sequelize.INTEGER,
    allowNull: true,
  });

  await addColumnIfMissing(queryInterface, tableName, 'UNIT', {
    type: Sequelize.STRING(32),
    allowNull: true,
  });
  await addColumnIfMissing(queryInterface, tableName, 'vCPU_Support', {
    type: Sequelize.STRING(128),
    allowNull: true,
  });
  await addColumnIfMissing(queryInterface, tableName, 'Storage_Support', {
    type: Sequelize.STRING(128),
    allowNull: true,
  });
  await addColumnIfMissing(queryInterface, tableName, 'Firewall_Policies', {
    type: Sequelize.STRING(128),
    allowNull: true,
  });
  await addColumnIfMissing(queryInterface, tableName, 'Virtual_Domains', {
    type: Sequelize.STRING(128),
    allowNull: true,
  });
  await addColumnIfMissing(queryInterface, tableName, 'Max_Wireless_AP', {
    type: Sequelize.STRING(128),
    allowNull: true,
  });
  await addColumnIfMissing(queryInterface, tableName, 'Max_FortiSwitches', {
    type: Sequelize.STRING(128),
    allowNull: true,
  });
  await addColumnIfMissing(queryInterface, tableName, 'Max_Endpoints', {
    type: Sequelize.STRING(128),
    allowNull: true,
  });
  await addColumnIfMissing(queryInterface, tableName, 'Unlimited_User_License', {
    type: Sequelize.STRING(128),
    allowNull: true,
  });
  await addColumnIfMissing(queryInterface, tableName, 'createdAt', {
    type: Sequelize.DATE,
    allowNull: false,
    defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
  });
  await addColumnIfMissing(queryInterface, tableName, 'updatedAt', {
    type: Sequelize.DATE,
    allowNull: false,
    defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
  });

  await queryInterface.sequelize.query(`
    UPDATE fortigate_vm_specs
    SET UNIT = vm_tier_code
    WHERE (UNIT IS NULL OR UNIT = '')
      AND vm_tier_code IS NOT NULL
      AND vm_tier_code <> ''
  `);

  await addUniqueIndexIfMissing(queryInterface, tableName, 'uq_fortigate_vm_specs_unit', ['UNIT']);
}

export async function down(queryInterface, Sequelize) {
  const tableName = 'fortigate_vm_specs';
  const table = await queryInterface.describeTable(tableName);

  const dropIfExists = async (columnName) => {
    if (table[columnName]) {
      await queryInterface.removeColumn(tableName, columnName);
    }
  };

  const indexes = await queryInterface.showIndex(tableName);
  const hasUnitIndex = (indexes || []).some((idx) => idx.name === 'uq_fortigate_vm_specs_unit');
  if (hasUnitIndex) {
    await queryInterface.removeIndex(tableName, 'uq_fortigate_vm_specs_unit');
  }

  await dropIfExists('updatedAt');
  await dropIfExists('createdAt');
  await dropIfExists('Unlimited_User_License');
  await dropIfExists('Max_Endpoints');
  await dropIfExists('Max_FortiSwitches');
  await dropIfExists('Max_Wireless_AP');
  await dropIfExists('Virtual_Domains');
  await dropIfExists('Firewall_Policies');
  await dropIfExists('Storage_Support');
  await dropIfExists('vCPU_Support');
  await dropIfExists('UNIT');

  await queryInterface.changeColumn(tableName, 'product_model_id', {
    type: Sequelize.INTEGER,
    allowNull: false,
  });
}

export default { up, down };
