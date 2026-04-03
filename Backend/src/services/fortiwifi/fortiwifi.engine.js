/**
 * Motor determinístico FortiWiFi: requisitos desde respuestas del formulario.
 */

import { parseThroughputToMbps, parseSessions } from '../fortigate/fortigate.engine.js';
import { parseSpecCapacityNumber } from '../fortigateVM/fortigateVM.modelSelector.js';

/** Campos de specs que son conteos de sesiones (persistir solo dígitos). */
const SESSION_COUNT_SPEC_FIELDS = [
  'Concurrent_Sessions_TCP',
  'New_Sessions_Per_Second_TCP',
  'SSL_Inspection_Concurrent_Session',
];

/** Por debajo no es un conteo de sesiones creíble en datasheet FortiWiFi → NULL en BD. */
const MIN_SESSION_COUNT_FOR_STORAGE = 1000;

/**
 * Convierte texto de sesiones/conteos a string solo con dígitos (sin espacios, K/M).
 * - "720 000" / "720,000" → "720000"
 * - Sufijo k → ×1000
 * - Sufijo m: millones solo si es decimal (1.5m) o n &lt; 100 (5m); si no, ×1000
 *   para evitar que "720m" por OCR (junto a Mbps/M) se interprete como 720M sesiones.
 *
 * El dimensionamiento sigue usando {@link parseSessions}, que ya entiende dígitos planos.
 *
 * @param {unknown} raw
 * @returns {string|null}
 */
export function normalizeSessionCountToDigitString(raw) {
  if (raw == null) return null;
  let s = String(raw).trim();
  if (!s) return null;

  const spaced = s.replace(/,/g, ' ').replace(/\s+/g, ' ').trim();
  if (/^\d{1,3}(\s\d{3})+$/.test(spaced)) {
    return spaced.replace(/\s/g, '');
  }

  const compact = spaced
    .toLowerCase()
    .replace(/\s/g, '')
    .replace(/million(s)?/g, 'm');

  const m = compact.match(/^(\d+(?:\.\d+)?)([km])?$/);
  if (m) {
    let n = Number(m[1]);
    if (!Number.isFinite(n)) return null;
    const suf = m[2];
    const hasDecimal = m[1].includes('.');
    if (suf === 'k') {
      n = Math.round(n * 1000);
    } else if (suf === 'm') {
      if (hasDecimal || n < 100) {
        n = Math.round(n * 1_000_000);
      } else {
        n = Math.round(n * 1000);
      }
    } else {
      n = Math.round(n);
    }
    if (!Number.isFinite(n) || n < 0) return null;
    return String(n);
  }

  const digitsOnly = compact.replace(/[^\d]/g, '');
  if (!digitsOnly) return null;
  return digitsOnly;
}

/**
 * FortiAPs: ratio "16 / 8" o un solo número; rechaza "/" suelto u hojas de columna mal leídas.
 * @param {unknown} raw
 * @returns {string|null}
 */
function sanitizeMaxFortiApsForStorage(raw) {
  if (raw == null) return null;
  let s = String(raw).trim();
  if (!s) return null;
  s = s.replace(/\s+/g, ' ').replace(/\s*\/\s*/g, ' / ').trim();
  if (!/\d/.test(s)) return null;
  if (s === '/' || s === ' / ' || /^[\s/–\-]+$/u.test(s)) return null;
  if (s.includes('/')) {
    const sides = s
      .split(/\s*\/\s*/)
      .map((x) => x.trim())
      .filter(Boolean);
    if (sides.length < 2 || !sides.every((side) => /\d/.test(side))) return null;
  }
  return s;
}

/**
 * @param {unknown} raw
 * @returns {string|null}
 */
function sanitizeMaxFortiSwitchesForStorage(raw) {
  if (raw == null) return null;
  let s = String(raw).trim();
  if (!s) return null;
  s = s.replace(/\s+/g, ' ').trim();
  if (!/\d/.test(s)) return null;
  if (s === '/' || s === ' / ' || /^[\s/–\-]+$/u.test(s)) return null;
  return s;
}

/**
 * Normaliza fila antes de UPSERT: sesiones solo dígitos y mínimo creíble; FortiAPs/Switches sin basura.
 * Así entradas que se cuelan sin pasar por el extractor (u hojas viejas re-upsert) no guardan "1" o "/".
 *
 * @param {Record<string, unknown>} row
 * @returns {Record<string, unknown>}
 */
export function normalizeFortiWifiSpecRowForStorage(row) {
  const out = { ...row };
  for (const key of SESSION_COUNT_SPEC_FIELDS) {
    if (out[key] == null || out[key] === '') {
      out[key] = null;
      continue;
    }
    const digits = normalizeSessionCountToDigitString(out[key]);
    if (digits == null || digits === '') {
      out[key] = null;
      continue;
    }
    const n = Number(digits);
    if (!Number.isFinite(n) || n < MIN_SESSION_COUNT_FOR_STORAGE) {
      out[key] = null;
      continue;
    }
    out[key] = digits;
  }

  out.Max_FortiAPs = sanitizeMaxFortiApsForStorage(out.Max_FortiAPs);
  out.Max_FortiSwitches = sanitizeMaxFortiSwitchesForStorage(out.Max_FortiSwitches);

  return out;
}

/** Mbps objetivo WAN según respuesta */
const WAN_MBPS = {
  wan_100: 100,
  wan_500: 500,
  wan_1g: 1000,
  wan_gt1g: 2500,
};

/** Sesiones concurrentes (TCP) objetivo según usuarios */
const USER_SESSIONS = {
  u50: 5000,
  u100: 12000,
  u250: 35000,
  u_gt250: 80000,
};

/** FortiAPs mínimos según usuarios WiFi simultáneos */
const WIFI_AP_NEED = {
  w20: 8,
  w50: 16,
  w100: 32,
  w_gt100: 64,
};

/** Switches gestionados */
const SWITCH_NEED = {
  sw0: 0,
  sw3: 3,
  sw8: 8,
  sw_gt8: 16,
};

/** Factor SSL: capacidad efectiva = requerido / factor (más estricto con parcial/alto) */
const SSL_FACTOR = {
  none: 1,
  partial: 0.8,
  high: 0.6,
};

/** Incremento por VPN sobre throughput (fracción) */
const VPN_BUMP = {
  vpn_none: 0,
  vpn_basic: 0.05,
  vpn_s2s: 0.2,
  vpn_high: 0.3,
};

const GROWTH_BUMP = {
  g_none: 0,
  g_mod: 0.2,
  g_high: 0.4,
};

/** Columna de specs a comparar según seguridad */
export function throughputFieldForSecurity(securityId) {
  if (securityId === 'fw_basic') return 'IPS_Throughput';
  if (securityId === 'ngfw') return 'NGFW_Throughput';
  if (securityId === 'threat' || securityId === 'advanced') return 'Threat_Protection_Throughput';
  return 'NGFW_Throughput';
}

/**
 * @param {object} answers - snapshot con objetos { id, label } del formulario
 * @returns {object} requisitos numéricos y metadatos
 */
export function computeRequirements(answers = {}) {
  const wanId = answers.wan?.id;
  const usersId = answers.users?.id;
  const wifiId = answers.wifiUsers?.id;
  const secId = answers.securityLevel?.id;
  const sslId = answers.sslInspection?.id;
  const vpnId = answers.vpnUsage?.id ?? 'vpn_none';
  const swId = answers.fortiSwitch?.id ?? 'sw0';
  const growthId = answers.growth?.id ?? 'g_none';

  const wanMbps = WAN_MBPS[wanId] ?? 100;
  const baseSessions = USER_SESSIONS[usersId] ?? 5000;
  const requiredAp = WIFI_AP_NEED[wifiId] ?? 8;
  const requiredSwitches = SWITCH_NEED[swId] ?? 0;

  const sslFactor = SSL_FACTOR[sslId] ?? 1;
  const vpnBump = VPN_BUMP[vpnId] ?? 0;
  const growthBump = GROWTH_BUMP[growthId] ?? 0;

  let effectiveThroughputMbps = wanMbps;
  effectiveThroughputMbps *= 1 + vpnBump;
  effectiveThroughputMbps *= 1 + growthBump;
  if (sslFactor > 0) effectiveThroughputMbps /= sslFactor;
  if (secId === 'advanced') effectiveThroughputMbps *= 1.3;

  const vpnMbpsRequired = wanMbps * (vpnBump > 0 ? 0.25 + vpnBump : 0);

  const sslThroughputRequired =
    sslId === 'none' ? 0 : wanMbps * (sslId === 'partial' ? 0.4 : sslId === 'high' ? 0.85 : 0);
  const sslSessionsRequired =
    sslId === 'none' ? 0 : baseSessions * (sslId === 'partial' ? 0.15 : 0.35);

  const primaryField = throughputFieldForSecurity(secId);

  return {
    wanMbps,
    effectiveThroughputMbps,
    requiredSessions: baseSessions,
    requiredAp,
    requiredSwitches,
    vpnMbpsRequired,
    sslThroughputRequired,
    sslSessionsRequired,
    primaryField,
    securityId: secId,
    answersSnapshot: answers,
    rulesApplied: [
      `WAN base ${wanMbps} Mbps`,
      `VPN +${Math.round(vpnBump * 100)}%`,
      `Crecimiento +${Math.round(growthBump * 100)}%`,
      `SSL factor ${sslFactor}`,
      secId === 'advanced' ? 'Protección avanzada ×1.3 sobre throughput' : null,
    ].filter(Boolean),
  };
}

/**
 * @param {Record<string, unknown>} row - fila fortiwifi_specs
 * @param {ReturnType<computeRequirements>} req
 */
export function rowMeetsRequirements(row, req) {
  if (!row || !req) return false;

  const primary = parseThroughputToMbps(row[req.primaryField]);
  if (primary == null || primary < req.effectiveThroughputMbps) return false;

  const sessions = parseSessions(row.Concurrent_Sessions_TCP);
  if (sessions == null || sessions < req.requiredSessions) return false;

  if (req.vpnMbpsRequired > 0) {
    const vpnT = parseThroughputToMbps(row.IPsec_VPN_Throughput);
    if (vpnT == null || vpnT < req.vpnMbpsRequired) return false;
  }

  if (req.sslThroughputRequired > 0) {
    const sslT = parseThroughputToMbps(row.SSL_Inspection_Throughput);
    if (sslT == null || sslT < req.sslThroughputRequired) return false;
  }
  if (req.sslSessionsRequired > 0) {
    const sslS = parseSessions(row.SSL_Inspection_Concurrent_Session);
    if (sslS == null || sslS < req.sslSessionsRequired) return false;
  }

  const apNum = parseSpecCapacityNumber(row.Max_FortiAPs);
  if (apNum != null && Number.isFinite(apNum) && req.requiredAp > 0 && apNum < req.requiredAp) {
    return false;
  }

  const swNum = parseSpecCapacityNumber(row.Max_FortiSwitches);
  if (
    req.requiredSwitches > 0 &&
    swNum != null &&
    Number.isFinite(swNum) &&
    swNum < req.requiredSwitches
  ) {
    return false;
  }

  return true;
}

/** Orden de “tamaño” FWF: menor número de modelo primero */
export function rankFortiWifiUnit(unit) {
  const u = String(unit || '').toUpperCase();
  const m = u.match(/FWF-(\d+)([A-Z]*)/);
  if (!m) return 99999;
  const n = Number(m[1]);
  const suf = m[2] || '';
  return n * 100 + suf.charCodeAt(0);
}

/**
 * Bundle BDL según nivel de seguridad (mapeo comercial).
 */
export function bundleTierFromSecurity(securityId) {
  if (securityId === 'fw_basic') return 'basic';
  if (securityId === 'ngfw') return 'utp';
  if (securityId === 'threat') return 'utp';
  if (securityId === 'advanced') return 'enterprise';
  return 'utp';
}
