/**
 * Frases aprendidas desde needs_inbox (clasificación manual) para matching rápido.
 */

export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable('learned_solution_keywords', {
    id: {
      type: Sequelize.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },
    solution: {
      type: Sequelize.STRING(255),
      allowNull: false,
    },
    phrase: {
      type: Sequelize.STRING(512),
      allowNull: false,
    },
    needs_inbox_id: {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'Origen needs_inbox.id (sin FK para compatibilidad)',
    },
    createdAt: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
    },
    updatedAt: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
    },
  });

  await queryInterface.addIndex('learned_solution_keywords', ['solution', 'phrase'], {
    unique: true,
    name: 'uq_learned_solution_phrase',
  });
  await queryInterface.addIndex('learned_solution_keywords', ['needs_inbox_id'], {
    name: 'idx_learned_needs_inbox',
  });
}

export async function down(queryInterface) {
  await queryInterface.dropTable('learned_solution_keywords');
}

export default { up, down };
