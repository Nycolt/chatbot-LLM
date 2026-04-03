-- Añade origen legacy_migration para filas creadas desde Datasheet (MySQL 8+).
-- Si el ENUM ya incluye el valor, este ALTER puede fallar: ignorar o comentar.

ALTER TABLE `product_models`
  MODIFY COLUMN `source_origin` ENUM('excel','pdf','manual','legacy_migration')
    NOT NULL DEFAULT 'manual';
