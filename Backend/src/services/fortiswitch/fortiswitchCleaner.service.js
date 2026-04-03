/**
 * Limpieza y normalización de valores FortiSwitch antes de persistir.
 */

const DASH_ONLY = /^[—–\-–\u2013\u2014\s]+$/;
const NA_ONLY = /^n\/?a$/i;

/** Anchos máximos alineados con fortiswitch_specs (no alterar tabla; respeta VARCHAR del modelo). */
const FIELD_MAX_LEN = {
  unit: 128,
  total_network_interfaces: 512,
  poe_ports: 128,
  poe_power_budget: 128,
  switching_capacity: 128,
  pps_64_bytes: 128,
  mac_address_storage: 128,
  vlans_supported: 128,
  lag_group_size: 64,
  lag_total_groups: 64,
  power_consumption: 128,
  power_supply: 255,
  heat_dissipation: 128,
  operating_temp: 255,
  humidity: 255,
  form_factor: 255,
  uplink: 128,
};

/**
 * @param {unknown} value
 * @param {number} [maxLen=255] tope genérico si no hay clave
 * @param {string} [fieldKey]
 */
export function safeString(value, maxLen = 255, fieldKey) {
  if (value === undefined || value === null) return null;
  let s = String(value).trim().replace(/\s+/g, ' ');
  if (!s) return null;
  if (DASH_ONLY.test(s)) return null;
  if (NA_ONLY.test(s)) return null;
  if (s === '-' || s === '—' || s === '–') return null;
  const cap =
    fieldKey && FIELD_MAX_LEN[fieldKey] != null
      ? Math.min(maxLen, FIELD_MAX_LEN[fieldKey])
      : maxLen;
  if (s.length > cap) s = s.slice(0, cap);
  return s;
}

/**
 * Extrae mención de uplinks desde texto de interfaces (100G, 40G, 25G, 10G).
 * @param {string|null|undefined} interfacesText
 * @returns {string|null} ej. "100G; 40G; 10G"
 */
export function extractUplink(interfacesText) {
  const raw = safeString(interfacesText, 4096);
  if (!raw) return null;
  const t = raw.toUpperCase();
  const found = [];
  const push = (label, re) => {
    if (re.test(t)) found.push(label);
  };
  push('100G', /\b100\s*G\b|\b100G\b/);
  push('40G', /\b40\s*G\b|\b40G\b/);
  push('25G', /\b25\s*G\b|\b25G\b/);
  push('10G', /\b10\s*G\b|\b10G\b/);
  if (found.length === 0) return null;
  return [...new Set(found)].join('; ');
}

/**
 * Normaliza caudal a Mbps para comparaciones (bonus).
 * "10 Gbps" → "10000 Mbps"; si no reconoce unidad, devuelve el string limpio.
 * @param {unknown} value
 * @returns {string|null}
 */
export function normalizeThroughput(value) {
  const s = safeString(value, 512);
  if (!s) return null;
  const m = s.match(/(\d+(?:\.\d+)?)\s*(Tbps|Gbps|Mbps|Kbps|TB\/s|GB\/s|MB\/s)/i);
  if (!m) return s;
  let n = parseFloat(m[1]);
  if (!Number.isFinite(n)) return s;
  const u = m[2].toLowerCase();
  let mbps = n;
  if (u === 'tbps' || u === 'tb/s') mbps = n * 1_000_000;
  else if (u === 'gbps' || u === 'gb/s') mbps = n * 1000;
  else if (u === 'mbps' || u === 'mb/s') mbps = n;
  else if (u === 'kbps') mbps = n / 1000;
  const rounded = Math.round(mbps * 1000) / 1000;
  return `${rounded} Mbps`;
}

const SPEC_FIELDS = [
  'total_network_interfaces',
  'poe_ports',
  'poe_power_budget',
  'switching_capacity',
  'pps_64_bytes',
  'mac_address_storage',
  'vlans_supported',
  'lag_group_size',
  'lag_total_groups',
  'power_consumption',
  'power_supply',
  'heat_dissipation',
  'operating_temp',
  'humidity',
  'form_factor',
  'uplink',
];

/**
 * @param {Record<string, unknown>} row — fila cruda del parser (incluye unit)
 * @returns {Record<string, unknown>}
 */
export function cleanFortiswitchRecord(row) {
  const out = {};
  out.unit = safeString(row.unit, 255, 'unit');
  if (!out.unit) return out;

  for (const key of SPEC_FIELDS) {
    if (key === 'uplink') continue;
    let v = row[key];
    if (v !== undefined && v !== null) {
      v = safeString(v, 255, key);
    } else {
      v = null;
    }
    if (key === 'switching_capacity' && v) {
      v = normalizeThroughput(v);
      v = safeString(v, 255, key);
    }
    out[key] = v;
  }

  const uplinkFromRow = safeString(row.uplink, 255, 'uplink');
  const uplinkFromIfaces = extractUplink(out.total_network_interfaces);
  out.uplink = uplinkFromRow || uplinkFromIfaces || null;

  return out;
}

export default {
  safeString,
  extractUplink,
  normalizeThroughput,
  cleanFortiswitchRecord,
  FIELD_MAX_LEN,
};
