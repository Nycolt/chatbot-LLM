/**
 * Agrega defaults a columnas legacy obligatorias para permitir inserts del esquema nuevo.
 */

export async function up(queryInterface, Sequelize) {
  await queryInterface.changeColumn('offer_compatibility_rules', 'rule_name', {
    type: Sequelize.STRING(255),
    allowNull: false,
    defaultValue: 'auto_classified',
  });

  await queryInterface.changeColumn('offer_compatibility_rules', 'from_offer_type', {
    type: Sequelize.ENUM('hardware', 'license', 'bundle'),
    allowNull: false,
    defaultValue: 'bundle',
  });

  await queryInterface.changeColumn('offer_compatibility_rules', 'to_offer_type', {
    type: Sequelize.ENUM('hardware', 'license', 'bundle'),
    allowNull: false,
    defaultValue: 'bundle',
  });

  await queryInterface.changeColumn('offer_compatibility_rules', 'created_at', {
    type: Sequelize.DATE,
    allowNull: false,
    defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
  });

  await queryInterface.changeColumn('offer_compatibility_rules', 'updated_at', {
    type: Sequelize.DATE,
    allowNull: false,
    defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
  });
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.changeColumn('offer_compatibility_rules', 'rule_name', {
    type: Sequelize.STRING(255),
    allowNull: false,
    defaultValue: null,
  });

  await queryInterface.changeColumn('offer_compatibility_rules', 'from_offer_type', {
    type: Sequelize.ENUM('hardware', 'license', 'bundle'),
    allowNull: false,
    defaultValue: null,
  });

  await queryInterface.changeColumn('offer_compatibility_rules', 'to_offer_type', {
    type: Sequelize.ENUM('hardware', 'license', 'bundle'),
    allowNull: false,
    defaultValue: null,
  });

  await queryInterface.changeColumn('offer_compatibility_rules', 'created_at', {
    type: Sequelize.DATE,
    allowNull: false,
    defaultValue: null,
  });

  await queryInterface.changeColumn('offer_compatibility_rules', 'updated_at', {
    type: Sequelize.DATE,
    allowNull: false,
    defaultValue: null,
  });
}

export default { up, down };
