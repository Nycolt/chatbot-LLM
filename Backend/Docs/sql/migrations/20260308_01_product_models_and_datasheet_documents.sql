-- =============================================================================
-- Migración: maestro de modelos + trazabilidad documental de datasheets
-- Base: chat_db (ajustar schema si aplica)
-- Ejecutar tras backup. Idempotencia: usar IF NOT EXISTS donde el motor lo permita.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) product_models — Catálogo maestro: una fila por modelo lógico (UNIT canónico)
--     No sustituye a Producto (que sigue siendo N filas por SKU/lista de precios).
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `product_models` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `canonical_unit` VARCHAR(250) NOT NULL COMMENT 'Identificador único de modelo, alineado con Datasheet.UNIT / solution_offers.unit',
  `display_name` VARCHAR(255) DEFAULT NULL COMMENT 'Nombre amigable opcional',
  `solution_family` VARCHAR(100) DEFAULT NULL COMMENT 'Ej. fortigate, fortigate_vm, fortiwifi',
  `notes` TEXT DEFAULT NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_product_models_canonical_unit` (`canonical_unit`),
  KEY `idx_product_models_solution_family` (`solution_family`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
COMMENT='Maestro de modelos del chatbot (1 fila por modelo lógico)';

-- Semilla: un modelo por cada UNIT distinto ya presente en Producto (si la tabla existe)
INSERT INTO `product_models` (`canonical_unit`, `display_name`, `solution_family`, `notes`, `createdAt`, `updatedAt`)
SELECT DISTINCT
  p.`UNIT`,
  p.`UNIT`,
  NULL,
  'Semilla automática desde Producto (DISTINCT UNIT)',
  NOW(),
  NOW()
FROM `Producto` p
WHERE NOT EXISTS (
  SELECT 1 FROM `product_models` m WHERE m.`canonical_unit` = p.`UNIT`
);

-- Si no hay tabla Producto aún, puedes insertar modelos manualmente.

-- -----------------------------------------------------------------------------
-- 2) datasheet_documents — Trazabilidad de PDFs / matrices importadas (no specs)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `datasheet_documents` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `title` VARCHAR(500) NOT NULL COMMENT 'Título o nombre lógico del documento',
  `file_name` VARCHAR(500) DEFAULT NULL COMMENT 'Nombre de archivo original',
  `file_hash` CHAR(64) DEFAULT NULL COMMENT 'SHA-256 opcional para deduplicar',
  `source_type` VARCHAR(80) DEFAULT NULL COMMENT 'pdf, excel_matrix, fortinet_portal, etc.',
  `uploaded_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `uploaded_by` INT DEFAULT NULL COMMENT 'Usuario.id si aplica',
  `row_count` INT DEFAULT NULL COMMENT 'Filas importadas asociadas',
  `metadata` JSON DEFAULT NULL COMMENT 'Versión del matrix, URL, notas libres',
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_datasheet_documents_hash` (`file_hash`),
  KEY `idx_datasheet_documents_uploaded` (`uploaded_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
COMMENT='Registro documental de cargas (PDF/matrix); las métricas siguen en Datasheet';

-- Columna opcional en Datasheet para enlazar filas a un documento (MySQL 8+)
-- Descomentar cuando quieras trazabilidad por fila:
-- ALTER TABLE `Datasheet`
--   ADD COLUMN `datasheet_document_id` INT DEFAULT NULL COMMENT 'FK lógica a datasheet_documents.id',
--   ADD KEY `idx_datasheet_document` (`datasheet_document_id`);

-- =============================================================================
-- NO ejecutar sin reemplazar SPs y flujo de carga:
-- DROP TABLE ProductoTemporal;
-- DROP TABLE DatasheetTemporal;
-- =============================================================================

-- =============================================================================
-- OPCIONAL (solo si renombras Producto → otro nombre físico):
-- RENAME TABLE Producto TO commercial_product_lines;
-- Luego recrear DebbugProductos, GetProductByUnit, GetProductByUnitAndSku.
-- NO usar el nombre product_models para la tabla antigua Producto sin normalizar SKUs.
-- =============================================================================
