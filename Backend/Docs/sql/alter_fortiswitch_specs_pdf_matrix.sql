-- =============================================================================
-- fortiswitch_specs — esquema para matriz PDF (Specifications / unit FS-*)
-- Ejecutar en MySQL/MariaDB (usa la misma BD que el backend).
-- =============================================================================

-- 1) Quitar FK hacia product_models (nombre típico en catálogo legacy)
SET @fk := (
  SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'fortiswitch_specs'
    AND CONSTRAINT_TYPE = 'FOREIGN KEY'
  LIMIT 1
);
SET @sql := IF(@fk IS NOT NULL,
  CONCAT('ALTER TABLE `fortiswitch_specs` DROP FOREIGN KEY `', @fk, '`'),
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2) Quitar índice único sobre product_model_id (nombre variable; no asumir uq_fsw_specs_pm)
SET @idx := (
  SELECT INDEX_NAME FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'fortiswitch_specs'
    AND COLUMN_NAME = 'product_model_id'
    AND NON_UNIQUE = 0
    AND INDEX_NAME <> 'PRIMARY'
  LIMIT 1
);
SET @sql := IF(
  @idx IS NOT NULL,
  CONCAT('ALTER TABLE `fortiswitch_specs` DROP INDEX `', @idx, '`'),
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 3) product_model_id pasa a ser opcional
ALTER TABLE `fortiswitch_specs`
  MODIFY COLUMN `product_model_id` INT NULL;

-- 4) Columnas nuevas (añade solo las que falten; si ya existen, MySQL dará error en esa línea — comenta la que corresponda)
ALTER TABLE `fortiswitch_specs`
  ADD COLUMN `unit` VARCHAR(128) NULL AFTER `product_model_id`,
  ADD COLUMN `total_network_interfaces` VARCHAR(64) NULL AFTER `unit`,
  ADD COLUMN `poe_power_budget` VARCHAR(128) NULL AFTER `poe_ports`,
  ADD COLUMN `pps_64_bytes` VARCHAR(128) NULL AFTER `switching_capacity`,
  ADD COLUMN `mac_address_storage` VARCHAR(128) NULL AFTER `pps_64_bytes`,
  ADD COLUMN `vlans_supported` VARCHAR(128) NULL AFTER `mac_address_storage`,
  ADD COLUMN `lag_group_size` VARCHAR(64) NULL AFTER `vlans_supported`,
  ADD COLUMN `lag_total_groups` VARCHAR(64) NULL AFTER `lag_group_size`,
  ADD COLUMN `power_consumption` VARCHAR(128) NULL AFTER `lag_total_groups`,
  ADD COLUMN `power_supply` VARCHAR(255) NULL AFTER `power_consumption`,
  ADD COLUMN `heat_dissipation` VARCHAR(128) NULL AFTER `power_supply`,
  ADD COLUMN `operating_temp` VARCHAR(255) NULL AFTER `heat_dissipation`,
  ADD COLUMN `humidity` VARCHAR(255) NULL AFTER `operating_temp`,
  ADD COLUMN `form_factor` VARCHAR(255) NULL AFTER `humidity`;

-- 5) Vaciar antes de imponer NOT NULL en unit (o rellena unit desde product_models antes)
TRUNCATE TABLE `fortiswitch_specs`;

-- 6) unit obligatorio + índice único
ALTER TABLE `fortiswitch_specs`
  MODIFY COLUMN `unit` VARCHAR(128) NOT NULL;

CREATE UNIQUE INDEX `uq_fortiswitch_specs_unit` ON `fortiswitch_specs` (`unit`);

-- =============================================================================
-- Tabla esperada (columnas relevantes):
-- id, product_model_id (NULL), unit (UNIQUE NOT NULL), total_network_interfaces,
-- poe_ports, poe_power_budget, switching_capacity, pps_64_bytes, mac_address_storage,
-- vlans_supported, lag_group_size, lag_total_groups, power_consumption, power_supply,
-- heat_dissipation, operating_temp, humidity, form_factor, uplink, created_at, updated_at
-- =============================================================================
