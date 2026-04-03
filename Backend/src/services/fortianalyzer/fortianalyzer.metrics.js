/**
 * Normaliza métricas de `fortianalyzer_specs` (strings del PDF) a números para el motor.
 * No inventa valores: si no hay dato parseable, devuelve null.
 */

/**
 * @param {unknown} v
 * @returns {number|null}
 */
export function parseNumericMetric(v) {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s) return null;
  const normalized = s.replace(/\u00a0/g, ' ').replace(/,/g, '');
  const spaced = normalized.replace(/(\d)\s+(?=\d)/g, '$1');
  const m = spaced.match(/-?\d+(?:\.\d+)?/);
  if (!m) return null;
  const n = Number(m[0]);
  return Number.isFinite(n) ? n : null;
}

/**
 * Logs/sec o similar: primer número significativo (p. ej. "500", "20 000").
 * @param {unknown} v
 * @returns {number|null}
 */
export function parseLogsPerSec(v) {
  return parseNumericMetric(v);
}

/**
 * GB/día del datasheet.
 * @param {unknown} v
 * @returns {number|null}
 */
export function parseGbLogsPerDay(v) {
  return parseNumericMetric(v);
}

/**
 * Capacidad en GB: suma TB detectados (1 TB = 1024 GB) y GB explícitos.
 * Toma el máximo razonable si hay varios bloques (p. ej. varios discos en una celda).
 * @param {unknown} v
 * @returns {number|null}
 */
export function parseStorageToGb(v) {
  if (v == null) return null;
  const s = String(v).replace(/\u00a0/g, ' ').trim();
  if (!s) return null;

  const lower = s.toLowerCase();
  let maxGb = 0;
  let any = false;

  const tbRe = /(\d+(?:\.\d+)?)\s*tb\b/gi;
  let m;
  while ((m = tbRe.exec(lower)) !== null) {
    const tb = Number(m[1]);
    if (Number.isFinite(tb)) {
      any = true;
      maxGb = Math.max(maxGb, tb * 1024);
    }
  }

  const gbRe = /(\d+(?:\.\d+)?)\s*gb\b/gi;
  while ((m = gbRe.exec(lower)) !== null) {
    const gb = Number(m[1]);
    if (Number.isFinite(gb)) {
      any = true;
      maxGb = Math.max(maxGb, gb);
    }
  }

  if (any && maxGb > 0) return maxGb;

  const plain = parseNumericMetric(s);
  if (plain != null && plain > 0) {
    if (/tb/i.test(s) && !/gb/i.test(s)) return plain * 1024;
    return plain;
  }

  return null;
}

/**
 * @param {Record<string, unknown>} row - fila fortianalyzer_specs
 * @returns {{
 *   UNIT: string,
 *   gbLogsPerDay: number|null,
 *   analyticsLps: number|null,
 *   collectorLps: number|null,
 *   storageGb: number|null,
 *   isVm: boolean,
 * }}
 */
export function normalizeSpecRow(row) {
  const unit = String(row?.UNIT || '').trim();
  const isVm = /FAZ-VM/i.test(unit);
  return {
    UNIT: unit,
    gbLogsPerDay: parseGbLogsPerDay(row?.GB_Logs_Per_Day),
    analyticsLps: parseLogsPerSec(row?.Analytics_Rate_Logs_Per_Sec),
    collectorLps: parseLogsPerSec(row?.Collector_Rate_Logs_Per_Sec),
    storageGb: parseStorageToGb(row?.Storage_Capacity),
    isVm,
  };
}
