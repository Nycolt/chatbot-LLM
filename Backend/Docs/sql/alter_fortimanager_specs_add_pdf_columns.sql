-- fortimanager_specs: columnas para el extractor PDF (FortiManager Appliances matrix).
--
-- Preferible (usa .env del Backend):
--   cd Backend && npm run migrate:fortimanager-specs-pdf
--
-- Este SQL sirve si prefieres hacerlo a mano en MySQL. Si ves:
--   Unknown column 'default_managed_devices' in 'field list'
--
-- Si una línea falla con "Duplicate column name", ignórala (la columna ya existe).

-- Base del catálogo (requeridas por Sequelize / ingest; añádelas si faltan)
ALTER TABLE `fortimanager_specs` ADD COLUMN `max_managed_devices` VARCHAR(64) DEFAULT NULL;
ALTER TABLE `fortimanager_specs` ADD COLUMN `max_adoms` VARCHAR(64) DEFAULT NULL;
ALTER TABLE `fortimanager_specs` ADD COLUMN `form_factor` VARCHAR(128) DEFAULT NULL;

-- Matriz PDF
ALTER TABLE `fortimanager_specs` ADD COLUMN `default_managed_devices` VARCHAR(64) DEFAULT NULL;
ALTER TABLE `fortimanager_specs` ADD COLUMN `default_adoms` VARCHAR(64) DEFAULT NULL;
ALTER TABLE `fortimanager_specs` ADD COLUMN `log_gb_per_day` VARCHAR(64) DEFAULT NULL;
ALTER TABLE `fortimanager_specs` ADD COLUMN `sustained_log_rates` VARCHAR(64) DEFAULT NULL;
ALTER TABLE `fortimanager_specs` ADD COLUMN `storage_capacity` VARCHAR(255) DEFAULT NULL;
ALTER TABLE `fortimanager_specs` ADD COLUMN `usable_storage` VARCHAR(255) DEFAULT NULL;
ALTER TABLE `fortimanager_specs` ADD COLUMN `raid_levels` VARCHAR(128) DEFAULT NULL;
ALTER TABLE `fortimanager_specs` ADD COLUMN `total_interfaces` VARCHAR(255) DEFAULT NULL;
ALTER TABLE `fortimanager_specs` ADD COLUMN `redundant_power` VARCHAR(32) DEFAULT NULL;
ALTER TABLE `fortimanager_specs` ADD COLUMN `removable_disks` VARCHAR(128) DEFAULT NULL;
ALTER TABLE `fortimanager_specs` ADD COLUMN `sed` VARCHAR(128) DEFAULT NULL;

-- Ver modelo en la misma fila (FMG-3100G) sin JOIN
ALTER TABLE `fortimanager_specs` ADD COLUMN `unit` VARCHAR(64) DEFAULT NULL;
