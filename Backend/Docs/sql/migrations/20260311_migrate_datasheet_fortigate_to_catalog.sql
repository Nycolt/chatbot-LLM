-- =============================================================================
-- Migración: Datasheet (FortiGate) → product_models + fortigate_specs
-- NO elimina ni trunca Datasheet (respaldo legacy).
--
-- Requisitos:
--   - Tabla `solutions` con code='fortigate'
--   - Tablas `product_models`, `fortigate_specs` (script catálogo 20260309_* o equivalente)
--   - `source_origin` usa solo valores del ENUM por defecto del proyecto: excel | pdf | manual
--
-- Estrategia:
--   - Un product_model por UNIT (uq_product_models_solution_unit): representante = fila Datasheet con MAX(id) por UNIT.
--   - fortigate_specs: upsert; rellena columnas vacías en destino, no pisa valores no vacíos.
--   - Si product_model ya existía (p. ej. ETL Excel): solo completa campos vacíos / marca has_datasheet.
--
-- Ejecutar tras BACKUP.
-- =============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 1;

SET @sid := (SELECT id FROM solutions WHERE code = 'fortigate' LIMIT 1);

-- Filtro filas FortiGate en Datasheet (alineado con isFortigateUnitOrSkuRow en backend)
-- Nota: ajusta nombre de tabla si difiere (Datasheet vs datasheet).

-- -----------------------------------------------------------------------------
-- 1) Insertar product_models que no existan (por UNIT)
-- -----------------------------------------------------------------------------
INSERT INTO product_models (
  solution_id,
  solution_type,
  unit,
  sku_base,
  model_name,
  family_name,
  deployment_type,
  has_datasheet,
  source_origin,
  technical_completeness_status,
  is_active,
  created_at,
  updated_at
)
SELECT
  @sid,
  'fortigate',
  d.UNIT,
  NULLIF(TRIM(d.SKU), ''),
  NULLIF(TRIM(d.UNIT), ''),
  'FortiGate',
  'appliance',
  1,
  'manual',
  'verified',
  1,
  NOW(),
  NOW()
FROM Datasheet d
INNER JOIN (
  SELECT UNIT, MAX(id) AS max_id
  FROM Datasheet
  WHERE UNIT IS NOT NULL AND TRIM(UNIT) <> ''
    AND (
      LOWER(UNIT) LIKE '%fortigate-%'
      OR LOWER(UNIT) LIKE 'fg-%'
      OR LOWER(IFNULL(SKU, '')) LIKE 'fg-%'
      OR LOWER(IFNULL(SKU, '')) LIKE 'fg/fw%'
      OR LOWER(IFNULL(SKU, '')) LIKE 'fg/fwf-%'
      OR LOWER(IFNULL(SKU, '')) LIKE 'fwf-%'
    )
  GROUP BY UNIT
) pick ON pick.max_id = d.id AND pick.UNIT = d.UNIT
WHERE @sid IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM product_models pm
    WHERE pm.solution_id = @sid AND pm.unit = d.UNIT
  );

-- -----------------------------------------------------------------------------
-- 2) Actualizar product_models existentes (sin duplicar): campos faltantes
-- -----------------------------------------------------------------------------
UPDATE product_models pm
INNER JOIN Datasheet d ON d.UNIT = pm.unit
INNER JOIN (
  SELECT UNIT, MAX(id) AS max_id
  FROM Datasheet
  WHERE UNIT IS NOT NULL AND TRIM(UNIT) <> ''
    AND (
      LOWER(UNIT) LIKE '%fortigate-%'
      OR LOWER(UNIT) LIKE 'fg-%'
      OR LOWER(IFNULL(SKU, '')) LIKE 'fg-%'
      OR LOWER(IFNULL(SKU, '')) LIKE 'fg/fw%'
      OR LOWER(IFNULL(SKU, '')) LIKE 'fg/fwf-%'
      OR LOWER(IFNULL(SKU, '')) LIKE 'fwf-%'
    )
  GROUP BY UNIT
) pick ON pick.max_id = d.id AND pick.UNIT = d.UNIT
SET
  pm.sku_base = IF(
    (pm.sku_base IS NULL OR TRIM(pm.sku_base) = '') AND d.SKU IS NOT NULL AND TRIM(d.SKU) <> '',
    TRIM(d.SKU),
    pm.sku_base
  ),
  pm.model_name = IF(
    (pm.model_name IS NULL OR TRIM(pm.model_name) = '') AND d.UNIT IS NOT NULL,
    TRIM(d.UNIT),
    pm.model_name
  ),
  pm.has_datasheet = IF(pm.has_datasheet = 0, 1, pm.has_datasheet),
  pm.technical_completeness_status = IF(
    pm.technical_completeness_status = 'commercial_only',
    'verified',
    pm.technical_completeness_status
  ),
  pm.updated_at = NOW()
WHERE pm.solution_id = @sid;

-- -----------------------------------------------------------------------------
-- 3) Insertar / actualizar fortigate_specs (una fila por product_model_id)
-- -----------------------------------------------------------------------------
INSERT INTO fortigate_specs (
  product_model_id,
  firewall_throughput_udp,
  ipsec_vpn_throughput,
  ips_throughput_enterprise_mix,
  ngfw_throughput_enterprise_mix,
  threat_protection_throughput,
  firewall_latency,
  concurrent_sessions,
  new_sessions_per_second,
  firewall_policies,
  max_ipsec_gw_tunnels,
  max_ipsec_client_tunnels,
  ssl_vpn_throughput,
  concurrent_ssl_vpn_users,
  ssl_inspection_throughput,
  application_control_throughput,
  max_fortiaps,
  max_fortiswitches,
  max_fortitokens,
  virtual_domains,
  interfaces,
  local_storage,
  power_supplies,
  form_factor,
  variants,
  created_at,
  updated_at
)
SELECT
  pm.id,
  d.Firewall_Throughput_UDP,
  d.IPSec_VPN_Throughput,
  d.IPS_Throughput_Enterprise_Mix,
  d.NGFW_Throughput_Enterprise_Mix,
  d.Threat_Protection_Throughput,
  d.Firewall_Latency,
  d.Concurrent_Sessions,
  d.New_Sessions_Per_Second,
  d.Firewall_Policies,
  d.Max_Gateway_To_Gateway_IPSec_Tunnels,
  d.Max_Client_To_Gateway_IPSec_Tunnels,
  d.SSL_VPN_Throughput,
  d.Concurrent_SSL_VPN_Users,
  d.SSL_Inspection_Throughput,
  d.Application_Control_Throughput,
  d.Max_FortiAPs,
  d.Max_FortiSwitches,
  d.Max_FortiTokens,
  d.Virtual_Domains,
  d.Interfaces,
  d.Local_Storage,
  d.Power_Supplies,
  d.Form_Factor,
  d.Variants,
  NOW(),
  NOW()
FROM product_models pm
INNER JOIN Datasheet d ON d.UNIT = pm.unit
INNER JOIN (
  SELECT UNIT, MAX(id) AS max_id
  FROM Datasheet
  WHERE UNIT IS NOT NULL AND TRIM(UNIT) <> ''
    AND (
      LOWER(UNIT) LIKE '%fortigate-%'
      OR LOWER(UNIT) LIKE 'fg-%'
      OR LOWER(IFNULL(SKU, '')) LIKE 'fg-%'
      OR LOWER(IFNULL(SKU, '')) LIKE 'fg/fw%'
      OR LOWER(IFNULL(SKU, '')) LIKE 'fg/fwf-%'
      OR LOWER(IFNULL(SKU, '')) LIKE 'fwf-%'
    )
  GROUP BY UNIT
) pick ON pick.max_id = d.id AND pick.UNIT = d.UNIT
WHERE pm.solution_id = @sid
ON DUPLICATE KEY UPDATE
  firewall_throughput_udp = IF(
    NULLIF(TRIM(fortigate_specs.firewall_throughput_udp), '') IS NULL,
    VALUES(firewall_throughput_udp),
    fortigate_specs.firewall_throughput_udp
  ),
  ipsec_vpn_throughput = IF(
    NULLIF(TRIM(fortigate_specs.ipsec_vpn_throughput), '') IS NULL,
    VALUES(ipsec_vpn_throughput),
    fortigate_specs.ipsec_vpn_throughput
  ),
  ips_throughput_enterprise_mix = IF(
    NULLIF(TRIM(fortigate_specs.ips_throughput_enterprise_mix), '') IS NULL,
    VALUES(ips_throughput_enterprise_mix),
    fortigate_specs.ips_throughput_enterprise_mix
  ),
  ngfw_throughput_enterprise_mix = IF(
    NULLIF(TRIM(fortigate_specs.ngfw_throughput_enterprise_mix), '') IS NULL,
    VALUES(ngfw_throughput_enterprise_mix),
    fortigate_specs.ngfw_throughput_enterprise_mix
  ),
  threat_protection_throughput = IF(
    NULLIF(TRIM(fortigate_specs.threat_protection_throughput), '') IS NULL,
    VALUES(threat_protection_throughput),
    fortigate_specs.threat_protection_throughput
  ),
  firewall_latency = IF(
    NULLIF(TRIM(fortigate_specs.firewall_latency), '') IS NULL,
    VALUES(firewall_latency),
    fortigate_specs.firewall_latency
  ),
  concurrent_sessions = IF(
    NULLIF(TRIM(fortigate_specs.concurrent_sessions), '') IS NULL,
    VALUES(concurrent_sessions),
    fortigate_specs.concurrent_sessions
  ),
  new_sessions_per_second = IF(
    NULLIF(TRIM(fortigate_specs.new_sessions_per_second), '') IS NULL,
    VALUES(new_sessions_per_second),
    fortigate_specs.new_sessions_per_second
  ),
  firewall_policies = IF(
    NULLIF(TRIM(fortigate_specs.firewall_policies), '') IS NULL,
    VALUES(firewall_policies),
    fortigate_specs.firewall_policies
  ),
  max_ipsec_gw_tunnels = IF(
    NULLIF(TRIM(fortigate_specs.max_ipsec_gw_tunnels), '') IS NULL,
    VALUES(max_ipsec_gw_tunnels),
    fortigate_specs.max_ipsec_gw_tunnels
  ),
  max_ipsec_client_tunnels = IF(
    NULLIF(TRIM(fortigate_specs.max_ipsec_client_tunnels), '') IS NULL,
    VALUES(max_ipsec_client_tunnels),
    fortigate_specs.max_ipsec_client_tunnels
  ),
  ssl_vpn_throughput = IF(
    NULLIF(TRIM(fortigate_specs.ssl_vpn_throughput), '') IS NULL,
    VALUES(ssl_vpn_throughput),
    fortigate_specs.ssl_vpn_throughput
  ),
  concurrent_ssl_vpn_users = IF(
    NULLIF(TRIM(fortigate_specs.concurrent_ssl_vpn_users), '') IS NULL,
    VALUES(concurrent_ssl_vpn_users),
    fortigate_specs.concurrent_ssl_vpn_users
  ),
  ssl_inspection_throughput = IF(
    NULLIF(TRIM(fortigate_specs.ssl_inspection_throughput), '') IS NULL,
    VALUES(ssl_inspection_throughput),
    fortigate_specs.ssl_inspection_throughput
  ),
  application_control_throughput = IF(
    NULLIF(TRIM(fortigate_specs.application_control_throughput), '') IS NULL,
    VALUES(application_control_throughput),
    fortigate_specs.application_control_throughput
  ),
  max_fortiaps = IF(
    NULLIF(TRIM(fortigate_specs.max_fortiaps), '') IS NULL,
    VALUES(max_fortiaps),
    fortigate_specs.max_fortiaps
  ),
  max_fortiswitches = IF(
    NULLIF(TRIM(fortigate_specs.max_fortiswitches), '') IS NULL,
    VALUES(max_fortiswitches),
    fortigate_specs.max_fortiswitches
  ),
  max_fortitokens = IF(
    NULLIF(TRIM(fortigate_specs.max_fortitokens), '') IS NULL,
    VALUES(max_fortitokens),
    fortigate_specs.max_fortitokens
  ),
  virtual_domains = IF(
    NULLIF(TRIM(fortigate_specs.virtual_domains), '') IS NULL,
    VALUES(virtual_domains),
    fortigate_specs.virtual_domains
  ),
  interfaces = IF(
    NULLIF(TRIM(fortigate_specs.interfaces), '') IS NULL,
    VALUES(interfaces),
    fortigate_specs.interfaces
  ),
  local_storage = IF(
    NULLIF(TRIM(fortigate_specs.local_storage), '') IS NULL,
    VALUES(local_storage),
    fortigate_specs.local_storage
  ),
  power_supplies = IF(
    NULLIF(TRIM(fortigate_specs.power_supplies), '') IS NULL,
    VALUES(power_supplies),
    fortigate_specs.power_supplies
  ),
  form_factor = IF(
    NULLIF(TRIM(fortigate_specs.form_factor), '') IS NULL,
    VALUES(form_factor),
    fortigate_specs.form_factor
  ),
  variants = IF(
    NULLIF(TRIM(fortigate_specs.variants), '') IS NULL,
    VALUES(variants),
    fortigate_specs.variants
  ),
  updated_at = NOW();

-- -----------------------------------------------------------------------------
-- Verificación rápida (comentar si ejecutas en batch)
-- -----------------------------------------------------------------------------
-- SELECT COUNT(*) AS fg_datasheet_units FROM (
--   SELECT DISTINCT UNIT FROM Datasheet WHERE ...
-- ) t;
-- SELECT COUNT(*) FROM fortigate_specs f
--   INNER JOIN product_models pm ON pm.id = f.product_model_id AND pm.solution_id = @sid;
