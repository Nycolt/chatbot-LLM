/**
 * Normalización ligera de valores extraídos de PDFs (datasheets).
 * Reutilizable por extractores y por el pipeline de upload.
 */

/**
 * Quita el bloque "VIRTUAL APPLIANCES" hasta el siguiente "FORTIMANAGER APPLIANCES"
 * para no mezclar FMG-VM-* con appliances en la misma matriz.
 * @param {string} text
 * @returns {string}
 */
export function stripVirtualFortiManagerPdfSection(text) {
  let t = String(text || '');
  t = t.replace(/VIRTUAL\s+APPLIANCES[\s\S]*?(?=FORTIMANAGER\s+APPLIANCES)/gi, '');
  return t;
}

/**
 * Quita el bloque "FORTIANALYZER VIRTUAL APPLIANCES" hasta la siguiente tabla hardware
 * ("FORTIANALYZER APPLIANCES" sin VIRTUAL), para no poblar FAZ-VM-* con filas mayormente NULL.
 * @param {string} text
 * @returns {string}
 */
export function stripVirtualFortianalyzerPdfSection(text) {
  let t = String(text || '');
  t = t.replace(
    /FORTIANALYZER\s+VIRTUAL\s+APPLIANCES[\s\S]*?(?=FORTIANALYZER\s+APPLIANCES)/gi,
    '',
  );
  return t;
}

/**
 * Normaliza una celda escalar: guiones largos → null, checkmarks → true, trim.
 * @param {unknown} value
 * @returns {string|boolean|null}
 */
export function normalizePdfScalar(value) {
  if (value === true || value === false) return value;
  if (value == null) return null;
  const s = String(value).replace(/\s+/g, ' ').trim();
  if (!s) return null;
  const compact = s.replace(/\s/g, '');
  if (
    s === '—' ||
    s === '–' ||
    s === '-' ||
    compact === '—' ||
    /^[\u2014\u2013\u2212\-–—\s]+$/u.test(s) ||
    /^n\/?a$/i.test(s)
  ) {
    return null;
  }
  if (/[\u2713\u2714✓]/.test(s)) return true;
  if (/^yes$/i.test(s) || /^s[ií]$/i.test(s)) return true;
  if (/^no$/i.test(s)) return false;
  return s;
}

/**
 * Recorre objetos/arrays y aplica normalizePdfScalar a strings.
 * @param {unknown} input
 * @returns {unknown}
 */
export function normalizeDeep(input) {
  if (input == null) return input;
  if (typeof input === 'string') {
    const n = normalizePdfScalar(input);
    return n === true ? 'Yes' : n === false ? 'No' : n;
  }
  if (Array.isArray(input)) return input.map((x) => normalizeDeep(x));
  if (typeof input === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(input)) {
      out[k] = normalizeDeep(v);
    }
    return out;
  }
  return input;
}

/**
 * Opcional: unifica sufijos de capacidad/throughput (no destructivo).
 * @param {string} s
 * @returns {string}
 */
export function normalizeBandwidthSuffix(s) {
  if (s == null || typeof s !== 'string') return s;
  return s
    .replace(/\bgbps\b/gi, 'Gbps')
    .replace(/\bmbps\b/gi, 'Mbps')
    .replace(/\btb\b/gi, 'TB')
    .replace(/\bgb\b/gi, 'GB')
    .trim();
}
