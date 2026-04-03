/**
 * Elimina columnas obsoletas de `fortiwifi_specs` (FK product_model_id + campos Wi‑Fi legacy).
 * Idempotente: ignora si la columna ya no existe.
 */

async function describe(queryInterface, table) {
  try {
    return await queryInterface.describeTable(table);
  } catch {
    return null;
  }
}

async function dropColumnIfExists(queryInterface, tableName, columnName) {
  const table = await describe(queryInterface, tableName);
  if (!table?.[columnName]) return;
  await queryInterface.removeColumn(tableName, columnName);
}

export async function up(queryInterface) {
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

  for (const idx of ['idx_fortiwifi_specs_pm', 'uq_fwifi_specs_pm']) {
    try {
      await queryInterface.removeIndex(tableName, idx);
    } catch {
      /* noop */
    }
  }

  const cols = [
    'product_model_id',
    'wifi_standard',
    'radios',
    'max_wireless_clients',
    'lan_ports',
    'throughput_ngfw',
  ];
  for (const col of cols) {
    await dropColumnIfExists(queryInterface, tableName, col);
  }
}

export async function down() {
  /* no restauramos esquema legacy */
}

export default { up, down };
