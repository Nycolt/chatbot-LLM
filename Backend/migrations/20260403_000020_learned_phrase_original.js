/**
 * Texto original de la frase aprendida (auditoría / trazabilidad).
 */

export async function up(queryInterface, Sequelize) {
  await queryInterface.addColumn('learned_solution_keywords', 'phrase_original', {
    type: Sequelize.TEXT,
    allowNull: true,
    comment: 'Texto tal cual o frase elegida por el revisor',
  });
}

export async function down(queryInterface) {
  await queryInterface.removeColumn('learned_solution_keywords', 'phrase_original');
}

export default { up, down };
