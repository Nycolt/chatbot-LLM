/**
 * FortiGate: filas en forma “legacy” para `evaluateModel` (claves PascalCase como en `fortigate_specs`).
 * Heurística para detectar filas FortiGate en Excel/API.
 */

import { FORTIGATE_PASCAL_METRIC_KEYS } from '../../models/FortigateSpecs.model.js';

export { FORTIGATE_PASCAL_METRIC_KEYS };

/** Misma heurística que el flujo de sizing para detectar filas FortiGate. */
export function isFortigateUnitOrSkuRow(row) {
  const unit = String(row?.UNIT || '').toLowerCase();
  const sku = String(row?.SKU || row?.sku_base || '').toLowerCase();
  return (
    unit.includes('fortigate-') ||
    unit.startsWith('fg-') ||
    sku.startsWith('fg-') ||
    sku.startsWith('fg/fwf-') ||
    sku.startsWith('fwf-')
  );
}

/**
 * Extrae solo columnas técnicas PascalCase desde una fila (misma forma que `fortigate_specs`).
 * @param {Record<string, unknown>} row
 */
export function pascalDatasheetRowToFortigateSpecColumns(row) {
  const out = {};
  for (const k of FORTIGATE_PASCAL_METRIC_KEYS) {
    const v = row?.[k];
    if (v == null) {
      out[k] = null;
      continue;
    }
    const s = String(v).trim();
    out[k] = s === '' ? null : s.slice(0, 255);
  }
  return out;
}

/**
 * Fila para `evaluateModel`.
 * - Si `spec` ya es fila PascalCase (tabla `fortigate_specs`), normaliza UNIT/SKU con `pm` si hace falta.
 * - Si `spec` es objeto snake_case legado (p. ej. caché), lo convierte a PascalCase.
 *
 * @param {{ unit?: string, sku_base?: string }|null|undefined} pm
 * @param {Record<string, unknown>} spec
 */
export function mapFortigateSpecToLegacyEvalRow(pm, spec) {
  if (!spec || typeof spec !== 'object') return null;

  const snake = spec.firewall_throughput_udp !== undefined && spec.Firewall_Throughput_UDP === undefined;
  if (snake) {
    const unit = String(pm?.unit ?? spec.UNIT ?? '').trim();
    const sku =
      pm?.sku_base != null && String(pm.sku_base).trim() !== '' ? pm.sku_base : unit;
    return {
      UNIT: unit,
      SKU: sku,
      Firewall_Throughput_UDP: spec.firewall_throughput_udp ?? null,
      IPSec_VPN_Throughput: spec.ipsec_vpn_throughput ?? null,
      IPS_Throughput_Enterprise_Mix: spec.ips_throughput_enterprise_mix ?? null,
      NGFW_Throughput_Enterprise_Mix: spec.ngfw_throughput_enterprise_mix ?? null,
      Threat_Protection_Throughput: spec.threat_protection_throughput ?? null,
      Firewall_Latency: spec.firewall_latency ?? null,
      Concurrent_Sessions: spec.concurrent_sessions ?? null,
      New_Sessions_Per_Second: spec.new_sessions_per_second ?? null,
      Firewall_Policies: spec.firewall_policies ?? null,
      Max_Gateway_To_Gateway_IPSec_Tunnels: spec.max_ipsec_gw_tunnels ?? null,
      Max_Client_To_Gateway_IPSec_Tunnels: spec.max_ipsec_client_tunnels ?? null,
      SSL_VPN_Throughput: spec.ssl_vpn_throughput ?? null,
      Concurrent_SSL_VPN_Users: spec.concurrent_ssl_vpn_users ?? null,
      SSL_Inspection_Throughput: spec.ssl_inspection_throughput ?? null,
      Application_Control_Throughput: spec.application_control_throughput ?? null,
      Max_FortiAPs: spec.max_fortiaps ?? null,
      Max_FortiSwitches: spec.max_fortiswitches ?? null,
      Max_FortiTokens: spec.max_fortitokens ?? null,
      Virtual_Domains: spec.virtual_domains ?? null,
      Interfaces: spec.interfaces ?? null,
      Local_Storage: spec.local_storage ?? null,
      Power_Supplies: spec.power_supplies ?? null,
      Form_Factor: spec.form_factor ?? null,
      Variants: spec.variants ?? null,
    };
  }

  const unit = String(spec.UNIT ?? pm?.unit ?? '').trim() || String(pm?.unit ?? '').trim();
  const skuRaw = spec.SKU ?? pm?.sku_base;
  const sku = skuRaw != null && String(skuRaw).trim() !== '' ? String(skuRaw).trim() : unit;
  return { ...spec, UNIT: unit, SKU: sku };
}
