/**
 * Crea la tabla complementaria `offer_compatibility_rules`.
 * No modifica `solution_offers`; clasifica SKUs con flags funcionales.
 */

export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable('offer_compatibility_rules', {
    id: {
      type: Sequelize.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },
    sku: {
      type: Sequelize.STRING(255),
      allowNull: false,
      unique: true,
    },
    bundle_type: {
      type: Sequelize.ENUM('enterprise', 'utp', 'basic'),
      allowNull: false,
    },
    requires_ssl_inspection: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    requires_ips: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    requires_advanced_threat: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    requires_vpn: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    recommended_for: {
      type: Sequelize.STRING(255),
      allowNull: true,
    },
    createdAt: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
    },
    updatedAt: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
    },
  });
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.dropTable('offer_compatibility_rules');

  const dialect = queryInterface.sequelize.getDialect();
  if (dialect === 'mysql' || dialect === 'mariadb') {
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS `enum_offer_compatibility_rules_bundle_type`;',
    ).catch(() => {});
  } else if (dialect === 'postgres') {
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_offer_compatibility_rules_bundle_type";',
    ).catch(() => {});
  }
}

export default { up, down };
