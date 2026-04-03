-- =============================================================================
-- Migración opcional: volcar filas FortiGate de `Datasheet` → `product_models` + `fortigate_specs`
-- Ejecutar tras BACKUP. Requiere tablas `solutions`, `product_models`, `fortigate_specs` (20260309_*).
-- La app ya prioriza `fortigate_specs` para sizing; esto rellena el catálogo desde datos legacy.
-- =============================================================================

SET NAMES utf8mb4;

SET @sid := (SELECT id FROM solutions WHERE code = 'fortigate' LIMIT 1);

-- 1) Un product_model por UNIT FortiGate aún no existente
INSERT INTO product_models (
  solution_id, solution_type, unit, sku_base, source_origin,
  has_datasheet, technical_completeness_status, is_active, created_at, updated_at
)
SELECT
  @sid,
  'fortigate',
  d.UNIT,
  NULLIF(MIN(d.SKU), ''),
  'manual',
  1,
  'verified',
  1,
  NOW(),
  NOW()
FROM Datasheet d
WHERE @sid IS NOT NULL
  AND d.UNIT IS NOT NULL
  AND TRIM(d.UNIT) <> ''
  AND (
    LOWER(d.UNIT) LIKE '%fortigate-%'
    OR LOWER(d.UNIT) LIKE 'fg-%'
    OR LOWER(d.SKU) LIKE 'fg-%'
    OR LOWER(d.SKU) LIKE 'fg/fw%'
    OR LOWER(d.SKU) LIKE 'fwf-%'
  )
  AND NOT EXISTS (
    SELECT 1 FROM product_models pm
    WHERE pm.solution_id = @sid AND pm.unit = d.UNIT
  )
GROUP BY d.UNIT;

-- 2) Una fila de specs por product_model (toma la fila Datasheet con id máximo por UNIT)
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
JOIN (
  SELECT d1.UNIT, MAX(d1.id) AS max_id
  FROM Datasheet d1
  GROUP BY d1.UNIT
) pick ON pick.UNIT = pm.unit
JOIN Datasheet d ON d.id = pick.max_id
WHERE pm.solution_id = @sid
ON DUPLICATE KEY UPDATE
  firewall_throughput_udp = VALUES(firewall_throughput_udp),
  ipsec_vpn_throughput = VALUES(ipsec_vpn_throughput),
  ips_throughput_enterprise_mix = VALUES(ips_throughput_enterprise_mix),
  ngfw_throughput_enterprise_mix = VALUES(ngfw_throughput_enterprise_mix),
  threat_protection_throughput = VALUES(threat_protection_throughput),
  firewall_latency = VALUES(firewall_latency),
  concurrent_sessions = VALUES(concurrent_sessions),
  new_sessions_per_second = VALUES(new_sessions_per_second),
  firewall_policies = VALUES(firewall_policies),
  max_ipsec_gw_tunnels = VALUES(max_ipsec_gw_tunnels),
  max_ipsec_client_tunnels = VALUES(max_ipsec_client_tunnels),
  ssl_vpn_throughput = VALUES(ssl_vpn_throughput),
  concurrent_ssl_vpn_users = VALUES(concurrent_ssl_vpn_users),
  ssl_inspection_throughput = VALUES(ssl_inspection_throughput),
  application_control_throughput = VALUES(application_control_throughput),
  max_fortiaps = VALUES(max_fortiaps),
  max_fortiswitches = VALUES(max_fortiswitches),
  max_fortitokens = VALUES(max_fortitokens),
  virtual_domains = VALUES(virtual_domains),
  interfaces = VALUES(interfaces),
  local_storage = VALUES(local_storage),
  power_supplies = VALUES(power_supplies),
  form_factor = VALUES(form_factor),
  variants = VALUES(variants),
  updated_at = VALUES(updated_at);

-- 3) Opcional: eliminar staging y SP obsoletos (solo si ningún otro proceso los usa)
-- DROP PROCEDURE IF EXISTS DebbugDatasheets;
-- DROP TABLE IF EXISTS DatasheetTemporal;
