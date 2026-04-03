/**
 * Alinea needs_inbox con NeedsInbox.model.js (solution_id opcional).
 */

export async function up(queryInterface, Sequelize) {
  const qi = queryInterface;
  const t = await qi.describeTable('needs_inbox').catch(() => null);
  if (!t || t.solution_id) return;
  await qi.addColumn('needs_inbox', 'solution_id', {
    type: Sequelize.INTEGER,
    allowNull: true,
    comment: 'FK opcional a solutions.id',
  });
}

export async function down(queryInterface) {
  await queryInterface.removeColumn('needs_inbox', 'solution_id').catch(() => {});
}

export default { up, down };
