-- =============================================================================
-- Fortinet chatbot — estructura por capas (catálogo, trazabilidad, comercial,
-- atributos inferidos, specs por solución, compatibilidad, semántica).
-- Ejecutar en MySQL tras BACKUP. Revisar sección 0 si ya tenías tablas previas.
-- =============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- -----------------------------------------------------------------------------
-- 0) Retirar tablas previas de migración piloto (opcional; descomentar si aplica)
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `datasheet_documents`;

-- Eliminar catálogo nuevo en orden de dependencias (si re-ejecutas el script completo)
DROP TABLE IF EXISTS `model_offer_links`;
DROP TABLE IF EXISTS `offer_compatibility_rules`;
DROP TABLE IF EXISTS `fortiweb_specs`;
DROP TABLE IF EXISTS `fortimail_specs`;
DROP TABLE IF EXISTS `fortiap_specs`;
DROP TABLE IF EXISTS `fortiswitch_specs`;
DROP TABLE IF EXISTS `fortimanager_specs`;
DROP TABLE IF EXISTS `fortianalyzer_specs`;
DROP TABLE IF EXISTS `fortiwifi_specs`;
DROP TABLE IF EXISTS `fortigate_vm_specs`;
DROP TABLE IF EXISTS `fortigate_specs`;
DROP TABLE IF EXISTS `product_model_attributes`;
DROP TABLE IF EXISTS `datasheet_model_map`;
DROP TABLE IF EXISTS `datasheet_sources`;
DROP TABLE IF EXISTS `need_inbox_tags`;
DROP TABLE IF EXISTS `intent_keywords`;
DROP TABLE IF EXISTS `product_models`;

-- Si product_models ya existía con otro esquema y NO quieres perder datos:
-- 1) RENAME TABLE product_models TO product_models_backup_pre_20260309;
-- 2) No ejecutes el DROP de product_models arriba; crea las tablas nuevas a mano
--    y migra datos antes de enlazar FKs.

DROP TABLE IF EXISTS `solutions`;

SET FOREIGN_KEY_CHECKS = 1;

-- =============================================================================
-- CAPA 1 — Catálogo base
-- =============================================================================

CREATE TABLE `solutions` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(64) NOT NULL COMMENT 'Clave estable: fortigate, fortigate_vm, ...',
  `name` VARCHAR(255) NOT NULL,
  `category` VARCHAR(100) NOT NULL DEFAULT 'security' COMMENT 'Agrupación UI o informes',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_solutions_code` (`code`),
  KEY `idx_solutions_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Portafolio Fortinet soportado por el chatbot (referencia para modelos y ofertas)';

INSERT INTO `solutions` (`code`, `name`, `category`, `is_active`) VALUES
('fortigate', 'FortiGate', 'firewall', 1),
('fortigate_vm', 'FortiGate VM', 'firewall', 1),
('fortiwifi', 'FortiWiFi', 'wireless', 1),
('fortianalyzer', 'FortiAnalyzer', 'management', 1),
('fortimanager', 'FortiManager', 'management', 1),
('fortiswitch', 'FortiSwitch', 'switching', 1),
('fortiap', 'FortiAP', 'wireless', 1),
('fortimail', 'FortiMail', 'email_security', 1),
('fortiweb', 'FortiWeb', 'app_security', 1);

CREATE TABLE `product_models` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `solution_id` INT NOT NULL,
  `solution_type` VARCHAR(50) NOT NULL COMMENT 'Redundancia con solutions.code para consultas rápidas / ETL',
  `unit` VARCHAR(250) NOT NULL COMMENT 'Identificador de modelo (alineado con Datasheet.UNIT / solution_offers.unit)',
  `sku_base` VARCHAR(250) DEFAULT NULL COMMENT 'SKU hardware base o referencia principal',
  `model_name` VARCHAR(255) DEFAULT NULL,
  `family_name` VARCHAR(255) DEFAULT NULL,
  `deployment_type` VARCHAR(100) DEFAULT NULL COMMENT 'appliance, vm, cloud, saas, ...',
  `has_datasheet` TINYINT(1) NOT NULL DEFAULT 0,
  `source_origin` ENUM('excel','pdf','manual') NOT NULL DEFAULT 'manual',
  `technical_completeness_status` ENUM('verified','partial','commercial_only') NOT NULL DEFAULT 'commercial_only',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_product_models_solution_unit` (`solution_id`, `unit`),
  KEY `idx_product_models_solution_type` (`solution_type`),
  KEY `idx_product_models_sku_base` (`sku_base`(100)),
  KEY `idx_product_models_active` (`is_active`),
  CONSTRAINT `fk_pm_solution` FOREIGN KEY (`solution_id`) REFERENCES `solutions` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Una fila por modelo lógico; puede crearse desde Excel, PDF o manual';

-- =============================================================================
-- CAPA 2 — Trazabilidad documental
-- =============================================================================

CREATE TABLE `datasheet_sources` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `solution_id` INT NOT NULL,
  `solution_type` VARCHAR(50) DEFAULT NULL,
  `file_name` VARCHAR(500) NOT NULL,
  `version` VARCHAR(100) DEFAULT NULL,
  `uploaded_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `source_type` VARCHAR(80) NOT NULL DEFAULT 'pdf' COMMENT 'pdf, excel_matrix, portal, etc.',
  `notes` TEXT DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_ds_solution` (`solution_id`),
  KEY `idx_ds_uploaded` (`uploaded_at`),
  CONSTRAINT `fk_ds_solution` FOREIGN KEY (`solution_id`) REFERENCES `solutions` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Registro de cada PDF/matrix/archivo fuente de especificaciones';

CREATE TABLE `datasheet_model_map` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `datasheet_source_id` INT NOT NULL,
  `product_model_id` INT NOT NULL,
  `page_reference` VARCHAR(100) DEFAULT NULL COMMENT 'Página o sección del documento',
  `extracted_by` VARCHAR(100) DEFAULT NULL COMMENT 'parser, llm, manual',
  `verified_manually` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_dmm_source_model` (`datasheet_source_id`, `product_model_id`),
  KEY `idx_dmm_product_model` (`product_model_id`),
  CONSTRAINT `fk_dmm_source` FOREIGN KEY (`datasheet_source_id`) REFERENCES `datasheet_sources` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_dmm_product_model` FOREIGN KEY (`product_model_id`) REFERENCES `product_models` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Vincula un documento fuente con modelos concretos extraídos';

-- =============================================================================
-- CAPA 3 — Comercial (ALTER sobre tablas existentes)
-- price_upload_batches, price_list_staging: sin cambios obligatorios
-- =============================================================================

-- Añade columnas a solution_offers (ejecutar una sola vez; error si ya existen)
ALTER TABLE `solution_offers`
  ADD COLUMN `solution_id` INT DEFAULT NULL COMMENT 'FK a solutions' AFTER `batch_id`,
  ADD COLUMN `product_model_id` INT DEFAULT NULL COMMENT 'FK a product_models' AFTER `solution_id`,
  ADD COLUMN `offer_subtype` VARCHAR(100) DEFAULT NULL COMMENT 'Ej. renewal, addon, ha_pair' AFTER `offer_type`;

ALTER TABLE `solution_offers`
  ADD KEY `idx_offers_solution_id` (`solution_id`),
  ADD KEY `idx_offers_product_model_id` (`product_model_id`);

ALTER TABLE `solution_offers`
  ADD CONSTRAINT `fk_offers_solution` FOREIGN KEY (`solution_id`) REFERENCES `solutions` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_offers_product_model` FOREIGN KEY (`product_model_id`) REFERENCES `product_models` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- =============================================================================
-- CAPA 4 — Atributos inferidos
-- =============================================================================

CREATE TABLE `product_model_attributes` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `product_model_id` INT NOT NULL,
  `attribute_key` VARCHAR(128) NOT NULL,
  `attribute_value` TEXT NOT NULL,
  `attribute_unit` VARCHAR(32) DEFAULT NULL,
  `source_type` ENUM('excel_description','pdf','manual') NOT NULL,
  `confidence_level` ENUM('verified','inferred','unknown') NOT NULL DEFAULT 'unknown',
  `notes` TEXT DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_pma_model` (`product_model_id`),
  KEY `idx_pma_key` (`attribute_key`),
  KEY `idx_pma_confidence` (`confidence_level`),
  CONSTRAINT `fk_pma_product_model` FOREIGN KEY (`product_model_id`) REFERENCES `product_models` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Pares clave-valor inferidos o verificados (no sustituye tablas specs tipadas)';

-- =============================================================================
-- CAPA 5 — Especificaciones técnicas por solución (1 fila por product_model_id)
-- =============================================================================

CREATE TABLE `fortigate_specs` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `product_model_id` INT NOT NULL,
  `firewall_throughput_udp` VARCHAR(255) DEFAULT NULL,
  `ipsec_vpn_throughput` VARCHAR(255) DEFAULT NULL,
  `ips_throughput_enterprise_mix` VARCHAR(255) DEFAULT NULL,
  `ngfw_throughput_enterprise_mix` VARCHAR(255) DEFAULT NULL,
  `threat_protection_throughput` VARCHAR(255) DEFAULT NULL,
  `firewall_latency` VARCHAR(255) DEFAULT NULL,
  `concurrent_sessions` VARCHAR(255) DEFAULT NULL,
  `new_sessions_per_second` VARCHAR(255) DEFAULT NULL,
  `firewall_policies` VARCHAR(255) DEFAULT NULL,
  `max_ipsec_gw_tunnels` VARCHAR(255) DEFAULT NULL,
  `max_ipsec_client_tunnels` VARCHAR(255) DEFAULT NULL,
  `ssl_vpn_throughput` VARCHAR(255) DEFAULT NULL,
  `concurrent_ssl_vpn_users` VARCHAR(255) DEFAULT NULL,
  `ssl_inspection_throughput` VARCHAR(255) DEFAULT NULL,
  `application_control_throughput` VARCHAR(255) DEFAULT NULL,
  `max_fortiaps` VARCHAR(255) DEFAULT NULL,
  `max_fortiswitches` VARCHAR(255) DEFAULT NULL,
  `max_fortitokens` VARCHAR(255) DEFAULT NULL,
  `virtual_domains` VARCHAR(255) DEFAULT NULL,
  `interfaces` VARCHAR(255) DEFAULT NULL,
  `local_storage` VARCHAR(255) DEFAULT NULL,
  `power_supplies` VARCHAR(255) DEFAULT NULL,
  `form_factor` VARCHAR(255) DEFAULT NULL,
  `variants` VARCHAR(255) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_fg_specs_pm` (`product_model_id`),
  CONSTRAINT `fk_fg_specs_pm` FOREIGN KEY (`product_model_id`) REFERENCES `product_models` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Métricas FortiGate appliance (alineadas conceptualmente con tabla Datasheet legacy)';

CREATE TABLE `fortigate_vm_specs` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `product_model_id` INT NOT NULL,
  `vm_tier_code` VARCHAR(32) DEFAULT NULL COMMENT 'VM-04S, VM-ULS, ...',
  `vcpu_profile` VARCHAR(128) DEFAULT NULL,
  `max_vdoms` VARCHAR(64) DEFAULT NULL,
  `max_tokens` VARCHAR(64) DEFAULT NULL,
  `throughput_notes` VARCHAR(512) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_fgvm_specs_pm` (`product_model_id`),
  CONSTRAINT `fk_fgvm_specs_pm` FOREIGN KEY (`product_model_id`) REFERENCES `product_models` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `fortiwifi_specs` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `UNIT` VARCHAR(64) DEFAULT NULL,
  `IPS_Throughput` VARCHAR(255) DEFAULT NULL,
  `NGFW_Throughput` VARCHAR(255) DEFAULT NULL,
  `Threat_Protection_Throughput` VARCHAR(255) DEFAULT NULL,
  `Concurrent_Sessions_TCP` VARCHAR(255) DEFAULT NULL,
  `New_Sessions_Per_Second_TCP` VARCHAR(255) DEFAULT NULL,
  `IPsec_VPN_Throughput` VARCHAR(255) DEFAULT NULL,
  `SSL_Inspection_Throughput` VARCHAR(255) DEFAULT NULL,
  `SSL_Inspection_Concurrent_Session` VARCHAR(255) DEFAULT NULL,
  `Max_FortiAPs` VARCHAR(255) DEFAULT NULL,
  `Max_FortiSwitches` VARCHAR(255) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_fortiwifi_specs_unit` (`UNIT`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Especificaciones FortiWiFi por UNIT; catálogo en product_models + datasheet_model_map';

CREATE TABLE `fortianalyzer_specs` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `product_model_id` INT NOT NULL,
  `log_rate_gb_per_day` VARCHAR(64) DEFAULT NULL,
  `storage_tb` VARCHAR(64) DEFAULT NULL,
  `devices_managed` VARCHAR(64) DEFAULT NULL,
  `form_factor` VARCHAR(128) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_faz_specs_pm` (`product_model_id`),
  CONSTRAINT `fk_faz_specs_pm` FOREIGN KEY (`product_model_id`) REFERENCES `product_models` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `fortimanager_specs` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `product_model_id` INT NOT NULL,
  `max_managed_devices` VARCHAR(64) DEFAULT NULL,
  `max_adoms` VARCHAR(64) DEFAULT NULL,
  `form_factor` VARCHAR(128) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_fmg_specs_pm` (`product_model_id`),
  CONSTRAINT `fk_fmg_specs_pm` FOREIGN KEY (`product_model_id`) REFERENCES `product_models` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `fortiswitch_specs` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `product_model_id` INT NOT NULL,
  `port_count` VARCHAR(32) DEFAULT NULL,
  `poe_ports` VARCHAR(32) DEFAULT NULL,
  `switching_capacity` VARCHAR(128) DEFAULT NULL,
  `uplink` VARCHAR(128) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_fsw_specs_pm` (`product_model_id`),
  CONSTRAINT `fk_fsw_specs_pm` FOREIGN KEY (`product_model_id`) REFERENCES `product_models` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `fortiap_specs` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `product_model_id` INT NOT NULL,
  `wifi_generation` VARCHAR(32) DEFAULT NULL,
  `mimo_streams` VARCHAR(32) DEFAULT NULL,
  `max_clients` VARCHAR(64) DEFAULT NULL,
  `antennas` VARCHAR(128) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_fap_specs_pm` (`product_model_id`),
  CONSTRAINT `fk_fap_specs_pm` FOREIGN KEY (`product_model_id`) REFERENCES `product_models` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `fortimail_specs` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `product_model_id` INT NOT NULL,
  `max_domains` VARCHAR(64) DEFAULT NULL,
  `max_mailboxes` VARCHAR(64) DEFAULT NULL,
  `throughput_email` VARCHAR(128) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_fml_specs_pm` (`product_model_id`),
  CONSTRAINT `fk_fml_specs_pm` FOREIGN KEY (`product_model_id`) REFERENCES `product_models` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `fortiweb_specs` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `product_model_id` INT NOT NULL,
  `http_throughput` VARCHAR(128) DEFAULT NULL,
  `max_applications` VARCHAR(64) DEFAULT NULL,
  `form_factor` VARCHAR(128) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_fwb_specs_pm` (`product_model_id`),
  CONSTRAINT `fk_fwb_specs_pm` FOREIGN KEY (`product_model_id`) REFERENCES `product_models` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- CAPA 6 — Compatibilidad comercial
-- =============================================================================

CREATE TABLE `offer_compatibility_rules` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `solution_id` INT DEFAULT NULL,
  `rule_name` VARCHAR(255) NOT NULL,
  `from_offer_type` ENUM('hardware','license','bundle') NOT NULL,
  `to_offer_type` ENUM('hardware','license','bundle') NOT NULL,
  `condition_json` JSON DEFAULT NULL COMMENT 'Reglas estructuradas (SKU prefix, bundle codes, etc.)',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `notes` TEXT DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_ocr_solution` (`solution_id`),
  KEY `idx_ocr_from_to` (`from_offer_type`, `to_offer_type`),
  CONSTRAINT `fk_ocr_solution` FOREIGN KEY (`solution_id`) REFERENCES `solutions` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Reglas de qué ofertas pueden combinarse o sustituirse';

CREATE TABLE `model_offer_links` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `product_model_id` INT NOT NULL,
  `solution_offer_id` INT NOT NULL,
  `link_type` VARCHAR(64) NOT NULL DEFAULT 'primary_sku' COMMENT 'primary_sku, compatible_license, bundle_contains, ...',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_mol_model_offer_type` (`product_model_id`, `solution_offer_id`, `link_type`),
  KEY `idx_mol_offer` (`solution_offer_id`),
  CONSTRAINT `fk_mol_product_model` FOREIGN KEY (`product_model_id`) REFERENCES `product_models` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_mol_solution_offer` FOREIGN KEY (`solution_offer_id`) REFERENCES `solution_offers` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Enlaces explícitos modelo ↔ fila comercial';

-- =============================================================================
-- CAPA 7 — Semántico y buzón
-- =============================================================================

CREATE TABLE `need_inbox_tags` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `needs_inbox_id` INT NOT NULL,
  `tag` VARCHAR(128) NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_nit_inbox` (`needs_inbox_id`),
  KEY `idx_nit_tag` (`tag`),
  CONSTRAINT `fk_nit_needs_inbox` FOREIGN KEY (`needs_inbox_id`) REFERENCES `needs_inbox` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Etiquetas para clasificar entradas del buzón';

CREATE TABLE `intent_keywords` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `solution_id` INT DEFAULT NULL,
  `keyword` VARCHAR(255) NOT NULL,
  `intent_label` VARCHAR(128) DEFAULT NULL COMMENT 'sizing, compare, price, lifecycle, ...',
  `weight` DECIMAL(5,2) NOT NULL DEFAULT 1.00,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_ik_keyword` (`keyword`(100)),
  KEY `idx_ik_solution` (`solution_id`),
  KEY `idx_ik_intent` (`intent_label`),
  CONSTRAINT `fk_ik_solution` FOREIGN KEY (`solution_id`) REFERENCES `solutions` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Palabras clave para detección de intención / solución';

-- needs_inbox: columna opcional para alinear con catálogo
ALTER TABLE `needs_inbox`
  ADD COLUMN `solution_id` INT DEFAULT NULL COMMENT 'Solución confirmada o sugerida (FK)' AFTER `confirmed_solution`;

ALTER TABLE `needs_inbox`
  ADD KEY `idx_needs_inbox_solution` (`solution_id`);

ALTER TABLE `needs_inbox`
  ADD CONSTRAINT `fk_needs_inbox_solution` FOREIGN KEY (`solution_id`) REFERENCES `solutions` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- =============================================================================
-- Fin. Verificar: SHOW CREATE TABLE solution_offers;
-- =============================================================================
