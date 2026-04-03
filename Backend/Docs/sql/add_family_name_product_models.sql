-- Si al subir PDF FortiWiFi aparece: Unknown column 'family_name' in 'field list'
-- Ejecuta (o usa: npm run migrate:fortiwifi-specs-matrix desde Backend/)

ALTER TABLE `product_models` ADD COLUMN `family_name` VARCHAR(255) NULL;

-- Si "Duplicate column name 'family_name'" → la columna ya existe, no hace falta.

-- Si luego falla por `deployment_type`, ejecuta add_deployment_type_product_models.sql
