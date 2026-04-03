-- =============================================================================
-- Solo para bases que YA tienen solution_offers / needs_inbox SIN las columnas nuevas.
-- Ejecutar si NO vas a usar el script destructivo 20260309_fortinet_catalog_layers.sql completo.
-- Requiere: tablas solutions y product_models creadas y pobladas (migración principal o manual).
-- =============================================================================

-- solution_offers (omitir cada ALTER si la columna ya existe)
ALTER TABLE `solution_offers`
  ADD COLUMN `solution_id` INT DEFAULT NULL COMMENT 'FK a solutions' AFTER `batch_id`;

ALTER TABLE `solution_offers`
  ADD COLUMN `product_model_id` INT DEFAULT NULL COMMENT 'FK a product_models' AFTER `solution_id`;

ALTER TABLE `solution_offers`
  ADD COLUMN `offer_subtype` VARCHAR(100) DEFAULT NULL COMMENT 'Ej. renewal, addon' AFTER `offer_type`;

ALTER TABLE `solution_offers`
  ADD KEY `idx_offers_solution_id` (`solution_id`),
  ADD KEY `idx_offers_product_model_id` (`product_model_id`);

ALTER TABLE `solution_offers`
  ADD CONSTRAINT `fk_offers_solution` FOREIGN KEY (`solution_id`) REFERENCES `solutions` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_offers_product_model` FOREIGN KEY (`product_model_id`) REFERENCES `product_models` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- needs_inbox
ALTER TABLE `needs_inbox`
  ADD COLUMN `solution_id` INT DEFAULT NULL COMMENT 'FK' AFTER `confirmed_solution`;

ALTER TABLE `needs_inbox`
  ADD KEY `idx_needs_inbox_solution` (`solution_id`);

ALTER TABLE `needs_inbox`
  ADD CONSTRAINT `fk_needs_inbox_solution` FOREIGN KEY (`solution_id`) REFERENCES `solutions` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;
