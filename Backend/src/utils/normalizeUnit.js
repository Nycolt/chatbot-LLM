/**
 * Normaliza el identificador de modelo (UNIT) para claves únicas y búsquedas.
 * - trim
 * - mayúsculas
 * - colapsa espacios y los elimina del resultado final
 * - "FortiGate-100F" / "FORTIGATE 100F" → "FG-100F"
 *
 * @param {unknown} unit
 * @returns {string}
 */
export function normalizeUnit(unit) {
  if (unit == null) return '';
  let s = String(unit).trim();
  if (!s) return '';
  s = s.replace(/\s+/g, ' ');
  s = s.toUpperCase();
  // Prefijos habituales en datasheets → FG-
  s = s.replace(/^FORTIGATE[\s\-_]+/i, 'FG-');
  s = s.replace(/^FORTI[\s\-_]*GATE[\s\-_]+/i, 'FG-');
  s = s.replace(/\s/g, '');
  return s;
}

export default normalizeUnit;
