-- Corrige: Data truncated for column 'source_origin' (ENUM antiguo sin 'pdf', etc.)
-- O ejecuta: npm run migrate:fortiwifi-specs-matrix (incluye este paso como migración 011)

ALTER TABLE `product_models`
  MODIFY COLUMN `source_origin`
    ENUM('excel','pdf','manual','datasheet','legacy_migration')
    NOT NULL DEFAULT 'manual';

ALTER TABLE `product_models`
  MODIFY COLUMN `technical_completeness_status`
    ENUM('verified','partial','commercial_only','complete','missing')
    NOT NULL DEFAULT 'commercial_only';
