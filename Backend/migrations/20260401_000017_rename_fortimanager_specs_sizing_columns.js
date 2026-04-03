/**
 * fortimanager_specs: columnas de dimensionamiento alineadas al datasheet
 * (Devices/VDOMs Default/Maximum, Sustained Log Rates, GB/day, Usable Storage after RAID).
 * Los identificadores SQL usan snake_case; el texto literal del datasheet va en COMMENT (MySQL).
 */

export async function up(queryInterface) {
  const t = 'fortimanager_specs';
  await queryInterface.renameColumn(t, 'default_managed_devices', 'devices_vdoms_default');
  await queryInterface.renameColumn(t, 'max_managed_devices', 'devices_vdoms_maximum');
  await queryInterface.renameColumn(t, 'log_gb_per_day', 'gb_per_day');
  await queryInterface.renameColumn(t, 'usable_storage', 'usable_storage_after_raid');

  await queryInterface.sequelize.query(
    `ALTER TABLE ${t}
      MODIFY COLUMN devices_vdoms_default VARCHAR(64) DEFAULT NULL COMMENT 'Devices/VDOMs (Default)',
      MODIFY COLUMN devices_vdoms_maximum VARCHAR(64) DEFAULT NULL COMMENT 'Devices/VDOMs (Maximum)',
      MODIFY COLUMN sustained_log_rates VARCHAR(64) DEFAULT NULL COMMENT 'Sustained Log Rates',
      MODIFY COLUMN gb_per_day VARCHAR(64) DEFAULT NULL COMMENT 'GB/day',
      MODIFY COLUMN usable_storage_after_raid VARCHAR(255) DEFAULT NULL COMMENT 'Usable Storage (after RAID)'`,
  );
}

export async function down(queryInterface) {
  const t = 'fortimanager_specs';
  await queryInterface.renameColumn(t, 'devices_vdoms_default', 'default_managed_devices');
  await queryInterface.renameColumn(t, 'devices_vdoms_maximum', 'max_managed_devices');
  await queryInterface.renameColumn(t, 'gb_per_day', 'log_gb_per_day');
  await queryInterface.renameColumn(t, 'usable_storage_after_raid', 'usable_storage');
}

export default { up, down };
