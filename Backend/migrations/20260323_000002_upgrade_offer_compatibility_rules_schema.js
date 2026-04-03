/**
 * Adapta una tabla legacy `offer_compatibility_rules` al esquema nuevo basado en SKU.
 * Mantiene columnas antiguas si existen, y agrega las nuevas necesarias para clasificación.
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
  const tableName = 'offer_compatibility_rules';

  await addColumnIfMissing(queryInterface, tableName, 'sku', {
    type: Sequelize.STRING(255),
    allowNull: false,
    defaultValue: '',
  });

  await addColumnIfMissing(queryInterface, tableName, 'bundle_type', {
    type: Sequelize.ENUM('enterprise', 'utp', 'basic'),
    allowNull: false,
    defaultValue: 'basic',
  });

  await addColumnIfMissing(queryInterface, tableName, 'requires_ssl_inspection', {
    type: Sequelize.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  });

  await addColumnIfMissing(queryInterface, tableName, 'requires_ips', {
    type: Sequelize.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  });

  await addColumnIfMissing(queryInterface, tableName, 'requires_advanced_threat', {
    type: Sequelize.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  });

  await addColumnIfMissing(queryInterface, tableName, 'requires_vpn', {
    type: Sequelize.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  });

  await addColumnIfMissing(queryInterface, tableName, 'recommended_for', {
    type: Sequelize.STRING(255),
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

  await addUniqueIndexIfMissing(queryInterface, tableName, 'uq_offer_compatibility_rules_sku', ['sku']);
}

export async function down(queryInterface) {
  const tableName = 'offer_compatibility_rules';
  const table = await queryInterface.describeTable(tableName);

  const dropIfExists = async (columnName) => {
    if (table[columnName]) {
      await queryInterface.removeColumn(tableName, columnName);
    }
  };

  const indexes = await queryInterface.showIndex(tableName);
  const hasSkuIndex = (indexes || []).some((idx) => idx.name === 'uq_offer_compatibility_rules_sku');
  if (hasSkuIndex) {
    await queryInterface.removeIndex(tableName, 'uq_offer_compatibility_rules_sku');
  }

  await dropIfExists('recommended_for');
  await dropIfExists('requires_vpn');
  await dropIfExists('requires_advanced_threat');
  await dropIfExists('requires_ips');
  await dropIfExists('requires_ssl_inspection');
  await dropIfExists('bundle_type');
  await dropIfExists('sku');
  await dropIfExists('updatedAt');
  await dropIfExists('createdAt');
}

export default { up, down };
