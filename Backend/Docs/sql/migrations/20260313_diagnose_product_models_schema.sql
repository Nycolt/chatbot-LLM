-- =============================================================================
-- Diagnóstico: columnas reales de `product_models` vs lo que espera Sequelize
-- (migrateFortigateFromDatasheet.mjs / ProductModel.model.js).
--
-- Si falta `solution_id`, verás el error "Unknown column 'solution_id'".
-- Solución: alinear con 20260309_fortinet_catalog_layers.sql (backup + RENAME
-- de la tabla vieja, luego CREATE nuevo) o migración manual de columnas.
-- =============================================================================

SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_KEY
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'product_models'
ORDER BY ORDINAL_POSITION;
