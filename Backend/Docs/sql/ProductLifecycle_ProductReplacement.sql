-- Tablas para gestión de ciclo de vida (EOS/EOL) y reemplazos de productos Fortinet
-- Ejecutar en la base de datos chat_db

USE chat_db;

-- Estado del producto en su ciclo de vida
CREATE TABLE IF NOT EXISTS ProductLifecycle (
  id INT PRIMARY KEY AUTO_INCREMENT,
  unit VARCHAR(250) NOT NULL COMMENT 'UNIT del producto ej. FortiGate-40F',
  sku VARCHAR(250) DEFAULT NULL COMMENT 'SKU opcional para variantes',
  status ENUM('ACTIVE', 'EOS', 'EOL') NOT NULL DEFAULT 'ACTIVE',
  eos_date DATE DEFAULT NULL COMMENT 'End of Sale',
  eol_date DATE DEFAULT NULL COMMENT 'End of Life',
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_lifecycle_unit (unit),
  INDEX idx_lifecycle_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Mapeo de reemplazo sugerido (modelo EOS/EOL -> modelo vigente)
CREATE TABLE IF NOT EXISTS ProductReplacement (
  id INT PRIMARY KEY AUTO_INCREMENT,
  unit VARCHAR(250) NOT NULL COMMENT 'UNIT del modelo que se reemplaza',
  replacement_unit VARCHAR(250) NOT NULL COMMENT 'UNIT del modelo sugerido como reemplazo',
  replacement_sku VARCHAR(250) DEFAULT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_replacement_unit (unit)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
