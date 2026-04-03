-- =============================================================================
-- Crear `fortigate_specs` solo si no existe (instalaciones que aún no corrieron 20260309_*).
-- Ajustar charset si tu instancia usa otro collation.
-- =============================================================================

CREATE TABLE IF NOT EXISTS `fortigate_specs` (
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
COMMENT='Métricas FortiGate (paridad con Datasheet legacy para sizing)';
