-- Añade solution_type a solution_offers solo si no existe (idempotente).
-- Uso: mysql -h localhost -P 3307 -u chat_user -p chat_db < Backend/Docs/sql/alter_solution_offers_add_solution_type.sql

USE chat_db;

-- Añadir columna solo si no existe
SET @col_exists = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = 'chat_db' AND TABLE_NAME = 'solution_offers' AND COLUMN_NAME = 'solution_type'
);

SET @sql_add_col = IF(@col_exists = 0,
  'ALTER TABLE solution_offers ADD COLUMN solution_type VARCHAR(50) DEFAULT NULL COMMENT ''Solución del chatbot'' AFTER description',
  'SELECT ''Columna solution_type ya existe'' AS msg'
);

PREPARE stmt FROM @sql_add_col;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Crear índice solo si no existe
SET @idx_exists = (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = 'chat_db' AND TABLE_NAME = 'solution_offers' AND INDEX_NAME = 'idx_offers_solution_type'
);

SET @sql_add_idx = IF(@idx_exists = 0,
  'CREATE INDEX idx_offers_solution_type ON solution_offers (solution_type)',
  'SELECT ''Índice idx_offers_solution_type ya existe'' AS msg'
);

PREPARE stmt2 FROM @sql_add_idx;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;
