-- Estado de procesamiento y auditoría de subidas PDF (datasheet_sources)
-- Ejecutar en chat_db tras backup.

ALTER TABLE `datasheet_sources`
  ADD COLUMN `processing_status` VARCHAR(32) NOT NULL DEFAULT 'uploaded'
    COMMENT 'uploaded | processing | processed | failed' AFTER `source_type`,
  ADD COLUMN `uploaded_by` INT NULL
    COMMENT 'Usuario.id si aplica' AFTER `processing_status`,
  ADD KEY `idx_ds_processing` (`processing_status`);

-- Opcional: FK a Usuario
-- ALTER TABLE `datasheet_sources`
--   ADD CONSTRAINT `fk_ds_uploaded_by` FOREIGN KEY (`uploaded_by`) REFERENCES `Usuario` (`id`)
--   ON DELETE SET NULL ON UPDATE CASCADE;
