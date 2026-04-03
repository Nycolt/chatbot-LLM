-- =============================================================================
-- FortiWiFi: esquema matrix (UNIT + métricas PascalCase). Sin product_model_id ni columnas legacy.
--   cd Backend && npm run migrate:fortiwifi-specs-matrix
-- =============================================================================
-- Si un paso falla con "Duplicate column" / "already exists", sigue con el siguiente.

-- Quitar FK/índices antiguos que usaban product_model_id (ajusta el nombre del FK si difiere)
-- SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS
--   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'fortiwifi_specs' AND CONSTRAINT_TYPE = 'FOREIGN KEY';
-- ALTER TABLE `fortiwifi_specs` DROP FOREIGN KEY `fk_fwifi_specs_pm`;

ALTER TABLE `fortiwifi_specs` DROP INDEX `uq_fwifi_specs_pm`;

ALTER TABLE `fortiwifi_specs` ADD COLUMN `UNIT` VARCHAR(64) NULL;
ALTER TABLE `fortiwifi_specs` ADD COLUMN `IPS_Throughput` VARCHAR(255) NULL;
ALTER TABLE `fortiwifi_specs` ADD COLUMN `NGFW_Throughput` VARCHAR(255) NULL;
ALTER TABLE `fortiwifi_specs` ADD COLUMN `Threat_Protection_Throughput` VARCHAR(255) NULL;
ALTER TABLE `fortiwifi_specs` ADD COLUMN `Concurrent_Sessions_TCP` VARCHAR(255) NULL;
ALTER TABLE `fortiwifi_specs` ADD COLUMN `New_Sessions_Per_Second_TCP` VARCHAR(255) NULL;
ALTER TABLE `fortiwifi_specs` ADD COLUMN `IPsec_VPN_Throughput` VARCHAR(255) NULL;
ALTER TABLE `fortiwifi_specs` ADD COLUMN `SSL_Inspection_Throughput` VARCHAR(255) NULL;
ALTER TABLE `fortiwifi_specs` ADD COLUMN `SSL_Inspection_Concurrent_Session` VARCHAR(255) NULL;
ALTER TABLE `fortiwifi_specs` ADD COLUMN `Max_FortiAPs` VARCHAR(255) NULL;
ALTER TABLE `fortiwifi_specs` ADD COLUMN `Max_FortiSwitches` VARCHAR(255) NULL;

ALTER TABLE `fortiwifi_specs` ADD COLUMN `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE `fortiwifi_specs` ADD COLUMN `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

CREATE UNIQUE INDEX `uq_fortiwifi_specs_unit` ON `fortiwifi_specs` (`UNIT`);

-- Tras migrar datos, puedes eliminar columnas viejas (si existen):
-- ALTER TABLE `fortiwifi_specs` DROP COLUMN `product_model_id`;
-- ALTER TABLE `fortiwifi_specs` DROP COLUMN `wifi_standard`;
-- ALTER TABLE `fortiwifi_specs` DROP COLUMN `radios`;
-- ALTER TABLE `fortiwifi_specs` DROP COLUMN `max_wireless_clients`;
-- ALTER TABLE `fortiwifi_specs` DROP COLUMN `lan_ports`;
-- ALTER TABLE `fortiwifi_specs` DROP COLUMN `throughput_ngfw`;
