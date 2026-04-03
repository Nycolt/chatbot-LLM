-- Columnas que el backend espera en `product_models` para ingest PDF / catálogo.
-- Si falta alguna, MySQL devuelve "Unknown column '…' in 'field list'".
-- Recomendado: desde Backend/ → npm run migrate:fortiwifi-specs-matrix (aplica migraciones JS).
-- O ejecuta solo las líneas que necesites (ignora "Duplicate column").

ALTER TABLE `product_models` ADD COLUMN `sku_base` VARCHAR(250) NULL;
ALTER TABLE `product_models` ADD COLUMN `model_name` VARCHAR(255) NULL;
ALTER TABLE `product_models` ADD COLUMN `family_name` VARCHAR(255) NULL;
ALTER TABLE `product_models` ADD COLUMN `deployment_type` VARCHAR(100) NULL;
ALTER TABLE `product_models` ADD COLUMN `has_datasheet` TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE `product_models` ADD COLUMN `source_origin` ENUM('excel','pdf','manual') NOT NULL DEFAULT 'manual';
ALTER TABLE `product_models` ADD COLUMN `technical_completeness_status` ENUM('verified','partial','commercial_only') NOT NULL DEFAULT 'commercial_only';
ALTER TABLE `product_models` ADD COLUMN `is_active` TINYINT(1) NOT NULL DEFAULT 1;
