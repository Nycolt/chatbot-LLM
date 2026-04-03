/**
 * Índice único en fortigate_specs.UNIT para UPSERT sin duplicados.
 * Si falla por filas duplicadas existentes, limpiar antes:
 *   SELECT UNIT, COUNT(*) FROM fortigate_specs GROUP BY UNIT HAVING COUNT(*) > 1;
 */

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

export async function up(queryInterface) {
  await addUniqueIndexIfMissing(
    queryInterface,
    'fortigate_specs',
    'uq_fortigate_specs_unit',
    ['UNIT'],
  );
}

export async function down(queryInterface) {
  const indexes = await queryInterface.showIndex('fortigate_specs');
  const has = (indexes || []).some((idx) => idx.name === 'uq_fortigate_specs_unit');
  if (has) {
    await queryInterface.removeIndex('fortigate_specs', 'uq_fortigate_specs_unit');
  }
}

export default { up, down };
