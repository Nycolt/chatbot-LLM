/**
 * Identificación heurística de modelos (UNIT) en texto extraído del PDF.
 */

import { PDF_INGEST_SOLUTION_TYPES } from './pdfConstants.js';
import normalizeUnit from '../../utils/normalizeUnit.js';

/**
 * Alias de `normalizeUnit` para catálogo / PDF (misma clave que fortigate_specs).
 * @param {string} raw
 * @returns {string}
 */
export function normalizeCatalogUnit(raw) {
  return normalizeUnit(raw);
}

/**
 * @param {string} text
 * @param {string} solutionType
 * @returns {Array<{ unit: string, display_label: string }>}
 */
export function identifyModelsInPdfText(text, solutionType) {
  if (!text || !PDF_INGEST_SOLUTION_TYPES.has(solutionType)) return [];

  const t = text;
  const seen = new Map();

  const add = (label) => {
    const u = normalizeUnit(label);
    if (u.length < 3 || u.length > 250) return;
    if (!seen.has(u)) seen.set(u, { unit: u, display_label: label.trim() });
  };

  switch (solutionType) {
    case 'fortigate': {
      const r1 = /\b(FortiGate-[A-Za-z0-9][A-Za-z0-9-]*)\b/g;
      let m;
      while ((m = r1.exec(t))) add(m[1]);
      const r2 = /\b(FG-[A-Z0-9][A-Z0-9-]{2,})\b/g;
      while ((m = r2.exec(t))) add(m[1]);
      break;
    }
    case 'fortigate_vm': {
      const r1 = /\b(FortiGate-VM-[A-Za-z0-9][A-Za-z0-9-]*)\b/gi;
      let m;
      while ((m = r1.exec(t))) add(m[1]);
      const r2 = /\b(VM-[0-9]{2}[A-Z])\b/gi;
      while ((m = r2.exec(t))) add(`FortiGate-${m[1]}`);
      const r3 = /\b(FG-VM-[A-Z0-9-]+)\b/gi;
      while ((m = r3.exec(t))) add(m[1]);
      break;
    }
    case 'fortiwifi': {
      const r1 = /\b(FortiWiFi-[A-Za-z0-9][A-Za-z0-9-]*)\b/gi;
      let m;
      while ((m = r1.exec(t))) add(m[1]);
      const r2 = /\b(FWF-[A-Z0-9][A-Z0-9-]{2,})\b/g;
      while ((m = r2.exec(t))) add(m[1]);
      break;
    }
    case 'fortianalyzer': {
      const r1 = /\b(FortiAnalyzer-[A-Za-z0-9][A-Za-z0-9-]*)\b/gi;
      let m;
      while ((m = r1.exec(t))) add(m[1]);
      // Mismo criterio que fortianalyzer.extractor (p. ej. APPLIANCESFAZ-150G).
      const r2 = /FAZ-(?:\d{3,4}G|VM-GB\d+)/gi;
      while ((m = r2.exec(t))) add(m[0]);
      break;
    }
    case 'fortimanager': {
      const r1 = /\b(FortiManager-[A-Za-z0-9][A-Za-z0-9-]*)\b/gi;
      let m;
      while ((m = r1.exec(t))) add(m[1]);
      const r2 = /\b(FMG-[A-Z0-9][A-Z0-9-]{2,})\b/g;
      while ((m = r2.exec(t))) add(m[1]);
      break;
    }
    case 'fortiswitch': {
      const r1 = /\b(FortiSwitch-[A-Za-z0-9][A-Za-z0-9-]*)\b/gi;
      let m;
      while ((m = r1.exec(t))) add(m[1]);
      const r2 = /\b(FSW-[A-Z0-9][A-Z0-9-]{2,})\b/g;
      while ((m = r2.exec(t))) add(m[1]);
      break;
    }
    case 'fortiap': {
      const r1 = /\b(FortiAP-[A-Za-z0-9][A-Za-z0-9-]*)\b/gi;
      let m;
      while ((m = r1.exec(t))) add(m[1]);
      const r2 = /\b(FAP-[A-Z0-9][A-Z0-9-]{2,})\b/g;
      while ((m = r2.exec(t))) add(m[1]);
      break;
    }
    case 'fortimail': {
      const r1 = /\b(FortiMail-[A-Za-z0-9][A-Za-z0-9-]*)\b/gi;
      let m;
      while ((m = r1.exec(t))) add(m[1]);
      const r2 = /\b(FML-[A-Z0-9][A-Z0-9-]{2,})\b/g;
      while ((m = r2.exec(t))) add(m[1]);
      break;
    }
    case 'fortiweb': {
      const r1 = /\b(FortiWeb-[A-Za-z0-9][A-Za-z0-9-]*)\b/gi;
      let m;
      while ((m = r1.exec(t))) add(m[1]);
      const r2 = /\b(FWB-[A-Z0-9][A-Z0-9-]{2,})\b/g;
      while ((m = r2.exec(t))) add(m[1]);
      break;
    }
    default:
      break;
  }

  return [...seen.values()];
}

/**
 * @param {string} solutionType
 * @returns {string|null}
 */
export function guessFamilyNameFromSolutionType(solutionType) {
  const map = {
    fortigate: 'FortiGate',
    fortigate_vm: 'FortiGate VM',
    fortiwifi: 'FortiWiFi',
    fortianalyzer: 'FortiAnalyzer',
    fortimanager: 'FortiManager',
    fortiswitch: 'FortiSwitch',
    fortiap: 'FortiAP',
    fortimail: 'FortiMail',
    fortiweb: 'FortiWeb',
  };
  return map[solutionType] ?? null;
}
