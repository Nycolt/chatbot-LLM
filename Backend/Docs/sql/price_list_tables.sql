-- Tablas para carga de listas de precios Fortinet (batch + staging + ofertas)
-- Ejecutar en la base de datos del proyecto (ej. chat_db)
-- Uso: mysql -u root -p chat_db < Backend/Docs/sql/price_list_tables.sql

-- 1. Batches de subida (cada archivo = un batch)
CREATE TABLE IF NOT EXISTS price_upload_batches (
  id INT PRIMARY KEY AUTO_INCREMENT,
  file_name VARCHAR(500) NOT NULL COMMENT 'Nombre original del archivo',
  uploaded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  uploaded_by INT DEFAULT NULL COMMENT 'FK Usuario.id, quien subió el archivo',
  status ENUM('uploaded','staging_loaded','processing','completed','failed') NOT NULL DEFAULT 'uploaded',
  is_active TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Solo un batch por source_type suele estar activo',
  source_type VARCHAR(50) NOT NULL DEFAULT 'fortinet_official',
  row_count INT DEFAULT NULL COMMENT 'Filas cargadas en staging (opcional)',
  error_message TEXT DEFAULT NULL COMMENT 'Si status=failed, detalle del error',
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_batches_status (status),
  INDEX idx_batches_active_source (is_active, source_type),
  INDEX idx_batches_uploaded_at (uploaded_at),
  CONSTRAINT fk_batches_uploaded_by FOREIGN KEY (uploaded_by) REFERENCES Usuario(id) ON DELETE SET NULL
) ENGINE  =InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Staging: copia cruda del Excel (una fila por línea del archivo)
CREATE TABLE IF NOT EXISTS price_list_staging (
  id INT PRIMARY KEY AUTO_INCREMENT,
  batch_id INT NOT NULL,
  unit VARCHAR(250) DEFAULT NULL,
  sku VARCHAR(250) DEFAULT NULL,
  description TEXT DEFAULT NULL,
  price VARCHAR(50) DEFAULT NULL COMMENT 'Valor crudo del Excel',
  contract_1y VARCHAR(50) DEFAULT NULL,
  contract_3y VARCHAR(50) DEFAULT NULL,
  contract_5y VARCHAR(50) DEFAULT NULL,
  row_index INT DEFAULT NULL COMMENT 'Número de fila en el Excel (opcional)',
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_staging_batch (batch_id),
  CONSTRAINT fk_staging_batch FOREIGN KEY (batch_id) REFERENCES price_upload_batches(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Ofertas comerciales finales (salida del ETL; se relaciona con Datasheet.UNIT por unit)
CREATE TABLE IF NOT EXISTS solution_offers (
  id INT PRIMARY KEY AUTO_INCREMENT,
  batch_id INT NOT NULL,
  solution_id INT DEFAULT NULL COMMENT 'FK solutions.id (enlace catálogo)',
  product_model_id INT DEFAULT NULL COMMENT 'FK product_models.id',
  unit VARCHAR(250) DEFAULT NULL COMMENT 'Relación lógica con Datasheet.UNIT para hardware; NULL si no aplica',
  sku VARCHAR(250) NOT NULL COMMENT 'Obligatorio; filas sin SKU se rechazan en el ETL',
  description TEXT DEFAULT NULL,
  solution_type VARCHAR(50) DEFAULT NULL COMMENT 'Solución del chatbot: fortigate, fortigate_vm, fortiwifi, fortianalyzer, fortimanager, fortiswitch, fortiap, fortimail, fortiweb',
  offer_type ENUM('hardware','license','bundle') NOT NULL,
  offer_subtype VARCHAR(100) DEFAULT NULL COMMENT 'renewal, addon, ha_pair, etc.',
  price DECIMAL(15,2) DEFAULT NULL,
  price_1y DECIMAL(15,2) DEFAULT NULL,
  price_3y DECIMAL(15,2) DEFAULT NULL,
  price_5y DECIMAL(15,2) DEFAULT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_offers_batch (batch_id),
  INDEX idx_offers_solution_id (solution_id),
  INDEX idx_offers_product_model_id (product_model_id),
  INDEX idx_offers_unit (unit),
  INDEX idx_offers_sku (sku),
  INDEX idx_offers_type_active (offer_type, is_active),
  INDEX idx_offers_solution_type (solution_type),
  CONSTRAINT fk_offers_batch FOREIGN KEY (batch_id) REFERENCES price_upload_batches(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Si la tabla solution_offers ya existía sin solution_type, ejecutar:
-- ALTER TABLE solution_offers ADD COLUMN solution_type VARCHAR(50) DEFAULT NULL COMMENT 'Solución del chatbot' AFTER description;
-- CREATE INDEX idx_offers_solution_type ON solution_offers (solution_type);
