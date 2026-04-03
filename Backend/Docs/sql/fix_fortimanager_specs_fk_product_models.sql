-- fortimanager_specs: la FK debe apuntar a `product_models`, no a un backup.
-- Error típico: Cannot add or update a child row ... REFERENCES `product_models_backup_pre_catalog`
--
-- 1) Ver el nombre exacto del constraint:
--    SHOW CREATE TABLE fortimanager_specs\G
--
-- 2) Sustituye el nombre si no es fortimanager_specs_ibfk_1

ALTER TABLE `fortimanager_specs`
  DROP FOREIGN KEY `fortimanager_specs_ibfk_1`;

ALTER TABLE `fortimanager_specs`
  ADD CONSTRAINT `fk_fmg_specs_product_model`
  FOREIGN KEY (`product_model_id`)
  REFERENCES `product_models` (`id`)
  ON DELETE CASCADE
  ON UPDATE CASCADE;
