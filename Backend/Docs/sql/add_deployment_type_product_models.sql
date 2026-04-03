-- Unknown column 'deployment_type' al crear/actualizar product_models (ingest PDF, etc.)
-- O ejecuta: npm run migrate:fortiwifi-specs-matrix (incluye este parche)

ALTER TABLE `product_models` ADD COLUMN `deployment_type` VARCHAR(100) NULL;
