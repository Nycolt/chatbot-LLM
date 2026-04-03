/**
 * PDF → matriz FortiManager (FMG-* por columna) → fortimanager_specs vía product_models.
 * En BD solo se persisten columnas de dimensionamiento: devices/VDOMs (default/máx), log rates, GB/día, usable storage.
 */

import { createRequire } from 'module';
import { logger } from '../../config/logger.js';
import { FortimanagerSpec } from '../../models/SolutionSpecs.models.js';
import ProductModel from '../../models/ProductModel.model.js';
import DatasheetModelMap from '../../models/DatasheetModelMap.model.js';
import normalizeUnit from '../../utils/normalizeUnit.js';
import { EXTRACTOR_VERSION } from '../datasheetPdf/pdfConstants.js';
import { stripVirtualFortiManagerPdfSection } from '../normalizer.service.js';

const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

/** Pistas de fila de datos: encima suelen estar los FMG-* (PDF a veces mete >150 líneas de portada). */
const FMG_MATRIX_ROW_HINTS = [
  'devices/vdoms',
  'default devices',
  'max devices',
  'default adom',
  'max adom',
  'gb/ day',
  'storage capacity',
  'sustained log',
  'total interfaces',
  'raid levels',
  'usable storage',
];

/**
 * UNIT canónica para catálogo (alineado con lista de precios / FMG-*).
 * @param {string} raw
 * @returns {string}
 */
export function normalizeFortiManagerUnit(raw) {
  if (raw == null) return '';
  let s = String(raw).trim().replace(/\s+/g, ' ');
  if (!s) return '';
  const up = s.toUpperCase().replace(/\s/g, '');
  if (/^FMG-/i.test(s)) return up;
  if (/^FORTIMANAGER-/i.test(up)) {
    const rest = up.replace(/^FORTIMANAGER-/, '');
    return rest ? `FMG-${rest}` : '';
  }
  if (/^\d{3,4}G$/i.test(up)) return `FMG-${up}`;
  if (up === 'VM') return 'FMG-VM';
  if (up === 'CLOUD') return 'FMG-CLOUD';
  // PDF a veces deja "FMG200G" sin guión
  const glued = /^FMG(\d{3,4}G)$/i.exec(up);
  if (glued) return `FMG-${glued[1].toUpperCase()}`;
  return normalizeUnit(s);
}

/**
 * Unifica guiones raros del PDF para que los regex encuentren FMG-200G.
 * @param {string} line
 */
export function squashPdfHyphens(line) {
  return String(line || '').replace(/[\u2010\u2011\u2012\u2013\u2014\u2015\u2212\uFE58\uFE63\uFF0D]/g, '-');
}

/**
 * Extrae modelos en orden visual (izquierda → derecha), sin duplicados.
 * @param {string} line
 * @returns {string[]}
 */
/**
 * Modelos FMG pegados sin espacio (ej. FMG-200GFMG-410GFMG-1000G). Los \b del regex estándar fallan entre G y F.
 * @param {string} line
 * @returns {string[]}
 */
export function tokenizeGluedFmgModels(line) {
  const s = squashPdfHyphens(String(line || ''));
  // VM: evitar /gi + [A-Z0-9]+ que absorbe "UGFMG" entre códigos pegados (UG + FMG).
  const re = /FMG-(?:\d{3,4}G|VM-\d+-UG|CLOUD)/gi;
  const seen = new Set();
  const ordered = [];
  let m;
  while ((m = re.exec(s)) !== null) {
    const unit = normalizeFortiManagerUnit(m[0]);
    if (!unit || seen.has(unit)) continue;
    seen.add(unit);
    ordered.push(unit);
  }
  return ordered;
}

export function tokenizeFmgModelsFromLine(line) {
  const s = squashPdfHyphens(line).replace(/\s+/g, ' ').trim();
  if (!s) return [];

  const glued = tokenizeGluedFmgModels(s);
  if (glued.length >= 2) return glued;
  if (glued.length === 1 && /appliances|virtual/i.test(s)) return glued;

  /** @type {{ start: number, end: number, unit: string }[]} */
  const spans = [];

  const addMatches = (re, toUnit) => {
    const r = new RegExp(re.source, 'gi');
    let m;
    while ((m = r.exec(s)) !== null) {
      const raw = toUnit(m);
      if (!raw) continue;
      const unit = normalizeFortiManagerUnit(raw);
      if (!unit || unit.length < 6) continue;
      spans.push({ start: m.index, end: m.index + m[0].length, unit });
    }
  };

  addMatches(/\bFMG-(?:\d{3,4}G|VM(?:-[A-Z0-9-]+)?|CLOUD)\b/gi, (m) => m[0]);
  addMatches(/\bFMG\s*[-]?\s*(\d{3,4}G)\b/gi, (m) => `FMG-${m[1]}`);
  addMatches(/\bFMG(\d{3,4}G)\b/gi, (m) => `FMG-${m[1]}`);
  addMatches(/\bFortiManager[-\s]+(\d{3,4}G)\b/gi, (m) => `FMG-${m[1]}`);
  addMatches(/\bFortiManager-([A-Za-z0-9-]+)\b/gi, (m) => `FMG-${m[1]}`);

  spans.sort((a, b) => a.start - b.start);

  // Quitar solapes: quedarse con el match más largo si empiezan casi igual (misma zona)
  const filtered = [];
  for (const sp of spans) {
    const last = filtered[filtered.length - 1];
    if (last && sp.start < last.end && sp.end <= last.end) continue;
    if (last && sp.start < last.end && sp.end > last.end) {
      if (sp.end - sp.start > last.end - last.start) filtered.pop();
      else continue;
    }
    filtered.push(sp);
  }

  const seen = new Set();
  const ordered = [];
  for (const { unit } of filtered) {
    if (seen.has(unit)) continue;
    seen.add(unit);
    ordered.push(unit);
  }

  // Solo "200G  400G" en cabecera (evita falsos positivos en textos tipo "throughput 100Gbps")
  if (ordered.length < 2) {
    const bareHits = s.match(/\b\d{3,4}G\b/gi);
    if (bareHits && bareHits.length >= 2) {
      const reBare = /\b(\d{3,4}G)\b/gi;
      let m;
      while ((m = reBare.exec(s)) !== null) {
        const unit = normalizeFortiManagerUnit(`FMG-${m[1]}`);
        if (!unit || seen.has(unit)) continue;
        seen.add(unit);
        ordered.push(unit);
      }
    }
  }

  return ordered;
}

function normalizeWhitespace(text) {
  return String(text || '')
    .replace(/\r/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/\t/g, '  ');
}

/**
 * Parte columnas por 2+ espacios (como el PDF de referencia).
 * @param {string} row
 * @returns {string[]}
 */
export function splitMatrixRow(row) {
  return String(row || '')
    .split(/\s{2,}/)
    .map((v) => v.trim())
    .filter(Boolean);
}

/**
 * @param {unknown} value
 * @returns {string|null}
 */
export function cleanCell(value) {
  if (value == null) return null;
  const s = String(value).replace(/\s+/g, ' ').trim();
  return s.length ? s : null;
}

/**
 * Normaliza celdas del PDF: em dash / guion largo = ausencia; ✓ = true.
 * @param {string|null} value
 * @returns {string|boolean|null}
 */
export function normalizeMatrixValue(value) {
  const raw = cleanCell(value);
  if (raw == null) return null;
  const compact = raw.replace(/\s/g, '');
  if (
    raw === '—' ||
    raw === '–' ||
    raw === '-' ||
    compact === '—' ||
    /^[\u2014\u2013\u2212\-–—\s]+$/u.test(raw) ||
    /^n\/?a$/i.test(raw)
  ) {
    return null;
  }
  if (/[\u2713\u2714✓]/.test(raw)) return true;
  if (/^yes$/i.test(raw) || /^s[ií]$/i.test(raw)) return true;
  if (/^no$/i.test(raw)) return false;
  return raw;
}

/** Celda solo-guiones del PDF (incl. '-' tras squashPdfHyphens). */
function cellIsDashOnly(value) {
  return isDashOnlyLine(String(value ?? ''));
}

/**
 * Matriz sí/no con ✓/—: — debe persistir como false en SED (evita dejar un Yes obsoleto en BD).
 * @param {string} field
 * @param {string} rawCell
 * @returns {string|boolean|null}
 */
function normalizeGlyphMetricCell(field, rawCell) {
  const v = normalizeMatrixValue(rawCell);
  if (v !== null && v !== undefined) return v;
  if (field === 'SED' && cellIsDashOnly(rawCell)) return false;
  return null;
}

/**
 * Etiquetas PDF → claves internas del registro (antes de mapear a columnas Sequelize).
 * Alineado a datasheets FortiManager tipo matriz (varias columnas FMG-*).
 */
const FIELD_MAP_ENTRIES = [
  {
    keys: [
      'devices/vdoms (default)',
      'default devices/vdoms',
      'default devices / vdoms',
      // Datasheet appliances: "Devices/VDOMs (Default)¹"
    ],
    field: 'Default_Devices_VDOMs',
  },
  {
    keys: [
      'devices/vdoms (maximum)',
      'devices/vdoms (max)',
      'max devices/vdoms',
      'max devices / vdoms',
      'maximum devices/vdoms',
      // "Devices/VDOMs (Maximum)³"
    ],
    field: 'Max_Devices_VDOMs',
  },
  {
    keys: ['default adoms', 'default adom'],
    field: 'Default_ADOMs',
  },
  {
    keys: ['max adoms', 'maximum adoms', 'max adom'],
    field: 'Max_ADOMs',
  },
  {
    keys: [
      'gb/ day of logs',
      'gb/ day',
      'gb/day',
      'gb per day',
      'gb logs/day',
      'gb/day of logs',
    ],
    field: 'Log_GB_per_day',
  },
  {
    keys: ['sustained log rates', 'sustained log rate'],
    field: 'Sustained_Log_Rates',
  },
  {
    keys: ['storage capacity'],
    field: 'Storage_Capacity',
  },
  {
    keys: ['usable storage (after raid)', 'usable storage'],
    field: 'Usable_Storage',
  },
  {
    keys: ['raid levels supported', 'raid levels'],
    field: 'RAID_Levels',
  },
  {
    keys: ['total interfaces'],
    field: 'Total_Interfaces',
  },
  {
    keys: ['hardware form factor', 'form factor'],
    field: 'Form_Factor',
  },
  {
    keys: [
      'redundant hot swap power supplies',
      'redundant hot-swap power',
      'redundant power supplies',
      'redundant power',
    ],
    field: 'Redundant_Power',
  },
  {
    keys: ['removable hard drives', 'removable drives'],
    field: 'Removable_Disks',
  },
  {
    keys: ['self-encrypting drives (sed)', 'self-encrypting drives', 'self encrypting drives'],
    field: 'SED',
  },
];

/**
 * Primera celda de la fila → texto estable para comparar con etiquetas del PDF.
 */
function normalizeMetricLabelCell(cell) {
  let s = squashPdfHyphens(String(cell || '').trim());
  s = s.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]+/g, '');
  s = s.replace(/^\d+[.)]\s*/i, '');
  s = s.replace(/^[•\u2022*\-–—]\s*/u, '');
  return s.replace(/\s+/g, ' ').trim().toLowerCase().replace(/:\s*$/, '');
}

/**
 * Elige la fila de mapa cuya etiqueta coincide al inicio (evita includes() en líneas de licencias).
 */
function pickFieldEntryForLabel(labelNorm) {
  let best = null;
  let bestLen = -1;
  for (const entry of FIELD_MAP_ENTRIES) {
    const sorted = [...entry.keys].sort((a, b) => b.length - a.length);
    for (const k of sorted) {
      if (labelNorm.startsWith(k) && k.length > bestLen) {
        best = entry;
        bestLen = k.length;
      }
    }
  }
  return best;
}

/**
 * Texto tipo licencia/SKU (incl. guiones Unicode del PDF: VM‑5000‑UG).
 */
export function looksLikeCommercialGarbageText(value) {
  if (value == null || typeof value === 'boolean') return false;
  const n = squashPdfHyphens(String(value)).toLowerCase();
  return /license|upgrade|ugupgrade|forticare|subscription|suggested\s*retail|price\s*list|order\s*code|bundle\s*sku|\bfc-\d{2,}|vm[\s\-]*\d+[\s\-]*ug|adding\s+\d+.*fortinet|central\s+log/i.test(
    n,
  );
}

function lineLooksCommercialOrPriceList(lineRaw) {
  const low = squashPdfHyphens(lineRaw).toLowerCase();
  return looksLikeCommercialGarbageText(low) || /part\s*#|part\s*number/i.test(low);
}

/**
 * Rechaza textos tipo descripción de licencia en campos numéricos del datasheet.
 */
function isPlausibleMetricValue(field, value) {
  if (value === true || value === false) return true;
  if (value == null) return false;
  const s = String(value).trim();
  if (!s) return false;
  if (looksLikeCommercialGarbageText(s)) return false;

  const countOrRateFields = new Set([
    'Default_Devices_VDOMs',
    'Max_Devices_VDOMs',
    'Default_ADOMs',
    'Max_ADOMs',
    'Log_GB_per_day',
    'Sustained_Log_Rates',
  ]);

  if (countOrRateFields.has(field)) {
    if (s.length > 28) return false;
    if (!/^[\d\s,.+]+$/u.test(s)) return false;
  }

  return true;
}

/** DB snake_case → clave interna del extractor (para validar valor corrupto en BD). */
const DB_KEY_TO_INTERNAL = {
  devices_vdoms_default: 'Default_Devices_VDOMs',
  devices_vdoms_maximum: 'Max_Devices_VDOMs',
  default_adoms: 'Default_ADOMs',
  max_adoms: 'Max_ADOMs',
  gb_per_day: 'Log_GB_per_day',
  sustained_log_rates: 'Sustained_Log_Rates',
};

function shouldOverwriteSpecColumn(dbKey, currentVal, newVal) {
  if (newVal === undefined || newVal === null) return false;
  const curStr = currentVal == null ? '' : String(currentVal).trim();
  const newStr = String(newVal).trim();
  if (!newStr) return false;
  if (!curStr) return true;
  if (looksLikeCommercialGarbageText(currentVal)) return true;
  const internal = DB_KEY_TO_INTERNAL[dbKey];
  if (internal) {
    const curOk = isPlausibleMetricValue(internal, currentVal);
    const newOk = isPlausibleMetricValue(internal, newVal);
    if (!curOk && newOk) return true;
  }
  return false;
}

/**
 * Busca una fila con FMG-* en las líneas previas a la primera fila de métricas reconocible.
 * @param {string[]} lines
 * @returns {string[]|null}
 */
function detectModelsNearMatrixHints(lines) {
  const lower = lines.map((l) => squashPdfHyphens(l).toLowerCase());
  for (let i = 0; i < lines.length; i++) {
    const low = lower[i];
    const hit = FMG_MATRIX_ROW_HINTS.some((h) => low.includes(h));
    if (!hit) continue;
    const from = Math.max(0, i - 40);
    for (let j = i - 1; j >= from; j--) {
      const tok = tokenizeFmgModelsFromLine(lines[j]);
      if (tok.length >= 1) {
        logger.info(
          { line: lines[j].slice(0, 200), models: tok, nearRow: i },
          '[fortimanager.extractor] header near metric row',
        );
        return tok;
      }
    }
  }
  return null;
}

/**
 * Último recurso: primeras apariciones de códigos FMG en todo el texto (orden de lectura).
 * @param {string[]} lines
 * @returns {string[]|null}
 */
function detectModelsFromGlobalScan(lines) {
  const maxLines = Math.min(lines.length, 800);
  const seen = new Set();
  const ordered = [];
  for (let i = 0; i < maxLines; i++) {
    for (const u of tokenizeFmgModelsFromLine(lines[i])) {
      if (!seen.has(u)) {
        seen.add(u);
        ordered.push(u);
      }
    }
    if (ordered.length >= 6) break;
  }
  if (ordered.length >= 1) {
    logger.warn(
      { models: ordered, mode: 'global_scan' },
      '[fortimanager.extractor] header from global scan (verifica orden de columnas vs PDF)',
    );
    return ordered;
  }
  return null;
}

/**
 * Detecta la lista ordenada de modelos (columnas) desde el encabezado de la matriz.
 * @param {string[]} lines
 * @returns {string[]} UNIT canónicas (ej. FMG-200G)
 */
export function detectFortiManagerModelColumns(lines) {
  const maxScan = Math.min(lines.length, 500);
  /** @type {string[]|null} */
  let fallbackOne = null;
  for (let i = 0; i < maxScan; i++) {
    const line = lines[i];
    if (!line || line.length < 4) continue;

    const ordered = tokenizeFmgModelsFromLine(line);
    if (ordered.length >= 2) {
      logger.info({ line: line.slice(0, 200), models: ordered }, '[fortimanager.extractor] header');
      return ordered;
    }
    if (ordered.length === 1 && /appliances|virtual/i.test(line) && !fallbackOne) {
      fallbackOne = ordered;
    }
  }
  if (fallbackOne?.length) {
    logger.info({ models: fallbackOne }, '[fortimanager.extractor] header (single model + appliances)');
    return fallbackOne;
  }

  const near = detectModelsNearMatrixHints(lines);
  if (near?.length) return near;

  const global = detectModelsFromGlobalScan(lines);
  if (global?.length) return global;

  throw new Error(
    'No se detectó la fila de modelos FortiManager. El PDF debe incluir códigos tipo FMG-200G (con o sin guión), FortiManager-200G o 200G en la tabla de especificaciones. Si el texto del PDF está vacío o es solo imagen, usa un PDF con texto seleccionable.',
  );
}

function normalizeLineForLabelPeel(line) {
  return squashPdfHyphens(String(line || '').replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]+/g, ''));
}

/**
 * @param {string} line
 * @param {number} nModels
 * @returns {{ field: string; rest: string } | null}
 */
function peelMetricLabelFromLine(line, nModels) {
  void nModels;
  const stripped = normalizeLineForLabelPeel(line).trim();
  const low = stripped.toLowerCase();
  let bestEntry = null;
  let bestLen = -1;
  for (const entry of FIELD_MAP_ENTRIES) {
    const sorted = [...entry.keys].sort((a, b) => b.length - a.length);
    for (const k of sorted) {
      if (low.startsWith(k) && k.length > bestLen) {
        bestEntry = entry;
        bestLen = k.length;
      }
    }
  }
  if (!bestEntry) return null;
  const rest = stripped.slice(bestLen).trim();
  return { field: bestEntry.field, rest };
}

function isDashOnlyLine(s) {
  const t = squashPdfHyphens(String(s || '').trim());
  return t.length > 0 && /^[\u2014\u2013\u2212–—\-‐\s]+$/u.test(t);
}

/**
 * Particiona dígitos consecutivos en n trozos (p. ej. 301501000 → 30, 150, 1000).
 * @param {string} digitRun
 * @param {number} n
 * @returns {string[] | null}
 */
export function splitDigitRunsIntoNCols(digitRun, n) {
  const d = String(digitRun || '').replace(/\D/g, '');
  if (!d.length || n < 1) return null;

  /** @type {string[][]} */
  const solutions = [];

  const okPart = (p) => {
    if (p.length > 10) return false;
    if (/^0\d+/.test(p) && p !== '0') return false;
    return true;
  };

  function bt(start, parts) {
    if (parts.length === n - 1) {
      const last = d.slice(start);
      if (!okPart(last) || !last.length) return;
      solutions.push([...parts, last]);
      return;
    }
    const remainingSlots = n - parts.length - 1;
    const maxLen = Math.min(10, d.length - remainingSlots);
    for (let len = 1; len <= maxLen && start + len <= d.length - remainingSlots; len++) {
      const piece = d.slice(start, start + len);
      if (!okPart(piece)) continue;
      if (start + len >= d.length) break;
      bt(start + len, [...parts, piece]);
    }
  }

  bt(0, []);
  if (!solutions.length) return null;

  const score = (parts) =>
    parts.reduce((acc, p) => acc + Math.abs(p.length - 3) * 2 + (p.length > 7 ? 5 : 0), 0);
  solutions.sort((a, b) => score(a) - score(b));
  return solutions[0];
}

function parsePlusSeparatedInts(s, n) {
  const t = String(s || '').trim();
  if (!t.includes('+')) return null;
  const parts = t.split('+').map((x) => x.trim()).filter(Boolean);
  if (parts.length !== n) return null;
  if (!parts.every((p) => /^\d+$/.test(p))) return null;
  return parts;
}

function splitStorageBlobHeuristic(blob, n) {
  const lines = blob
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  if (!lines.length) return null;
  const breaks = [0];
  for (let i = 1; i < lines.length; i++) {
    const ln = lines[i];
    if (/^\d{3,}(?:\.\d+)?\s*TB|^\d{3,}TB/i.test(ln)) breaks.push(i);
  }
  const chunks = [];
  for (let b = 0; b < breaks.length; b++) {
    const from = breaks[b];
    const to = b + 1 < breaks.length ? breaks[b + 1] : lines.length;
    chunks.push(lines.slice(from, to).join(' ').trim());
  }
  if (chunks.length >= n) return chunks.slice(0, n);
  return null;
}

function parseNumericOrDashBlob(blob, n, field) {
  const rawLines = String(blob || '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  if (field === 'Max_Devices_VDOMs' && rawLines.length >= 2) {
    const a = rawLines[0].trim();
    const b = rawLines[1].trim();
    if (/^\d+$/.test(a) && isDashOnlyLine(b)) {
      return [a, ...Array(n - 1).fill('—')];
    }
  }

  const lastDigitish = [...rawLines].reverse().find((l) => {
    const x = l.replace(/\s/g, '');
    return /^[\d+]+$/.test(x) || /^\+\d/.test(l.trim());
  });
  if (
    lastDigitish &&
    (field === 'Default_Devices_VDOMs' ||
      field === 'Max_Devices_VDOMs' ||
      field === 'Default_ADOMs' ||
      field === 'Max_ADOMs' ||
      field === 'Log_GB_per_day' ||
      field === 'Sustained_Log_Rates')
  ) {
    const plus = parsePlusSeparatedInts(lastDigitish.replace(/\s/g, ''), n);
    if (plus) return plus;
    const sd = lastDigitish.replace(/\s/g, '');
    if (/^\d+$/.test(sd)) {
      const spl = splitDigitRunsIntoNCols(sd, n);
      if (spl) return spl;
    }
  }

  const joined = rawLines.join(' ').trim();
  if (isDashOnlyLine(joined)) return Array(n).fill('—');

  if (rawLines.length === 1 && isDashOnlyLine(rawLines[0])) return Array(n).fill('—');

  return null;
}

function parseTextSpecIntoNCols(blob, n, field) {
  const b = String(blob || '').trim();
  if (!b) return null;

  if (field === 'Storage_Capacity' || field === 'Usable_Storage') {
    if (b.includes('\n')) {
      const heur = splitStorageBlobHeuristic(b, n);
      if (heur) return heur;
    }
    const matches = [...b.matchAll(/\d+(?:\.\d+)?\s*TB(?:\s*\([^)]*\))?/gi)].map((m) => m[0].trim());
    if (field === 'Storage_Capacity') {
      const filtered = matches.filter((m) => {
        const num = Number((m.match(/\d+(?:\.\d+)?/) || [])[0]);
        if (!Number.isFinite(num)) return false;
        // Descarta subtotales NVMe (p. ej. 1.92TB/3.84TB) para no desplazar columnas por modelo.
        return num >= 8;
      });
      if (filtered.length >= n) return filtered.slice(0, n);
    }
    if (matches.length >= n) return matches.slice(0, n);
  }

  if (field === 'RAID_Levels') {
    const rest = b.replace(/^raid levels supported\s*/i, '').replace(/^raid levels\s*/i, '');
    const parts = rest.split(/(?=RAID\s)/i).filter((p) => p.trim().length);
    if (parts.length >= n) return parts.slice(0, n).map((p) => p.trim());
  }

  if (field === 'Form_Factor') {
    const parts = [...b.matchAll(/(\d\s*RU\s*Rackmount[^0-9]*)/gi)].map((m) => m[1].trim());
    if (parts.length >= n) return parts.slice(0, n);
  }

  if (field === 'Total_Interfaces') {
    const glued = splitTotalInterfacesGlued(b, n);
    if (glued) return glued;
    const segs = b.split(/(?=\d+\s*x\b|\d+x)/i).filter((x) => x.trim());
    if (segs.length >= n) return segs.slice(0, n).map((s) => s.trim());
  }

  return null;
}

/**
 * PDF pega columnas de interfaces: "...ports2x 25GE..." y "...RJ‑452x 10GbE...".
 */
function splitTotalInterfacesGlued(rest, n) {
  const b = String(rest || '').trim();
  if (!b || n < 2) return null;
  let segs = b.split(/(?<=ports)(?=2x)/i).map((s) => s.trim()).filter(Boolean);
  if (segs.length === 2 && n === 3) {
    const sub = segs[1]
      .split(/(?<=45)(?=2x\s+10GbE)/i)
      .map((s) => s.trim())
      .filter(Boolean);
    if (sub.length === 2) segs = [segs[0], sub[0], sub[1]];
  }
  if (segs.length >= n) return segs.slice(0, n);
  return null;
}

function parseMixedGlyphBlob(blob, n) {
  const b = String(blob || '').trim();
  if (!b) return null;
  if (b.includes('**')) {
    const parts = b.split(/\*\*/).map((s) => s.trim()).filter(Boolean);
    if (parts.length === n) return parts;
  }
  const byCheck = b.split(/(?=[\u2713\u2714✓])/u).filter((p) => p.trim());
  if (byCheck.length >= n) return byCheck.slice(0, n).map((s) => s.trim());
  return null;
}

function parseValueBlobToN(blob, n, field) {
  if (!blob || !n) return null;

  const countLike = new Set([
    'Default_Devices_VDOMs',
    'Max_Devices_VDOMs',
    'Default_ADOMs',
    'Max_ADOMs',
    'Log_GB_per_day',
    'Sustained_Log_Rates',
  ]);

  if (field === 'Redundant_Power' && blob.includes('**')) {
    const parts = blob.split(/\*\*/).map((s) => s.trim()).filter(Boolean);
    if (parts.length === n) return parts;
  }

  if (countLike.has(field)) {
    const num = parseNumericOrDashBlob(blob, n, field);
    if (num && num.length === n) return num;
  }

  const txt = parseTextSpecIntoNCols(blob, n, field);
  if (txt && txt.length === n) return txt;

  if (field === 'SED' && n === 3) {
    // peelMetricLabelFromLine aplica squashPdfHyphens: — → '-' ASCII; hay que contar '-' como columna "no".
    // Sin esto, "✓⃝—✓⃝" → "✓⃝-✓⃝" da solo 2 marcas y el blob se fusiona con la línea siguiente (p. ej. IPMI) → 3× true.
    const sedGlyph = /(\u2713\u20DD|\u2714\u20DD|\u2014|—|-)/gu;
    const tokens = [...blob.matchAll(sedGlyph)].map((m) => m[0]);
    if (tokens.length === 3) {
      // Solo reorder si el primer token es guión tipográfico (no ASCII): evita torcer "—✓✓" ya normalizado a "-✓✓" (200G/410G/1000G).
      const dash = /^[\u2014—]$/.test(tokens[0]);
      const t1Check = /[\u2713\u2714]/.test(tokens[1]);
      const t2Check = /[\u2713\u2714]/.test(tokens[2]);
      // El PDF a veces extrae "—✓✓" en fila SED; el datasheet es ✓ / — / ✓ para 3100G/3700G/3750G.
      if (dash && t1Check && t2Check) {
        return [tokens[1], tokens[0], tokens[2]];
      }
      return tokens;
    }
    const pieces = blob.split(/[\u2014\u2013—–\-]/u);
    if (pieces.length === 2) {
      const left = pieces[0].trim();
      const right = pieces[1].trim();
      if (left && right) return [left, '—', right];
    }
  }

  if (field === 'SED' || field === 'Removable_Disks' || field === 'Redundant_Power') {
    const mix = parseMixedGlyphBlob(blob, n);
    if (mix && mix.length === n) return mix;
  }

  const cols = splitMatrixRow(blob);
  if (cols.length >= n + 1) return cols.slice(1, n + 1);
  if (cols.length === n) return cols;
  return null;
}

/**
 * @param {string[]} lines
 * @param {number} labelLineIndex
 * @param {number} blockEnd
 * @param {number} n
 * @param {string} field
 * @param {string} rest
 * @returns {{ vals: string[] | null; linesConsumed: number }}
 */
function collectBlobAfterLabel(lines, labelLineIndex, blockEnd, n, field, rest) {
  const parts = [];
  if (rest != null && rest !== '') parts.push(rest);
  const shouldDelayParse = field === 'Storage_Capacity';

  let j = labelLineIndex + 1;
  const maxIter = field === 'Storage_Capacity' ? 14 : 6;

  const tryParse = () => {
    const blob = parts.join('\n').trim();
    if (!blob) return null;
    return parseValueBlobToN(blob, n, field);
  };

  let vals = tryParse();
  if (vals && vals.length === n && !shouldDelayParse) return { vals, linesConsumed: j - labelLineIndex - 1 };

  for (let k = 0; k < maxIter && j < blockEnd; k++) {
    const L = lines[j];
    if (lineLooksCommercialOrPriceList(L)) break;
    if (isBlockHeaderLine(L)) break;
    if (parts.length && peelMetricLabelFromLine(L, n)) break;
    parts.push(L);
    j++;
    vals = tryParse();
    if (vals && vals.length === n && !shouldDelayParse) return { vals, linesConsumed: j - labelLineIndex - 1 };
  }
  vals = tryParse();
  if (vals && vals.length === n) return { vals, linesConsumed: j - labelLineIndex - 1 };
  return { vals: null, linesConsumed: 0 };
}

function isBlockHeaderLine(line) {
  const up = squashPdfHyphens(String(line || '')).toUpperCase();
  if (!up.includes('APPLIANCES') || !up.includes('FMG-')) return false;
  return tokenizeGluedFmgModels(line).length >= 2;
}

/**
 * @param {string[]} lines
 * @returns {{ startLine: number; models: string[] }[]}
 */
export function findFortiManagerSpecBlocks(lines) {
  const blocks = [];
  for (let i = 0; i < lines.length; i++) {
    if (!isBlockHeaderLine(lines[i])) continue;
    const models = tokenizeGluedFmgModels(lines[i]);
    blocks.push({ startLine: i, models });
  }
  return blocks;
}

export function mergeSpecsByUnit(rows) {
  /** @type {Record<string, object>} */
  const acc = {};
  for (const row of rows) {
    const u = row?.UNIT;
    if (!u) continue;
    if (!acc[u]) acc[u] = { ...row };
    else acc[u] = { ...acc[u], ...row };
  }
  return Object.values(acc);
}

export function extractFortiManagerBlock(lines, blockStart, blockEnd, models) {
  const result = {};
  for (const unit of models) {
    result[unit] = { UNIT: unit };
  }
  const n = models.length;

  let i = blockStart + 1;
  while (i < blockEnd) {
    const line = lines[i];
    if (lineLooksCommercialOrPriceList(line)) {
      i++;
      continue;
    }

    const peeled = peelMetricLabelFromLine(line, n);
    if (peeled) {
      const { vals, linesConsumed } = collectBlobAfterLabel(lines, i, blockEnd, n, peeled.field, peeled.rest);
      if (vals) {
        const { field } = peeled;
        models.forEach((model, idx) => {
          const v = normalizeGlyphMetricCell(field, vals[idx]);
          if (v === null || v === undefined) return;
          if (!isPlausibleMetricValue(field, v)) return;
          result[model][field] = v;
        });
        logger.debug(
          { field, line: line.slice(0, 180), vals },
          '[fortimanager.extractor] row',
        );
      }
      i += 1 + linesConsumed;
      continue;
    }

    const columns = splitMatrixRow(line);
    if (columns.length >= n + 1) {
      const labelNorm = normalizeMetricLabelCell(columns[0]);
      const entry = pickFieldEntryForLabel(labelNorm);
      if (entry) {
        const values = columns.slice(1);
        const { field } = entry;
        models.forEach((model, idx) => {
          const v = normalizeGlyphMetricCell(field, values[idx]);
          if (v === null || v === undefined) return;
          if (!isPlausibleMetricValue(field, v)) return;
          result[model][field] = v;
        });
      }
    }
    i++;
  }

  return Object.values(result);
}

/**
 * @param {string} pdfText
 * @returns {Array<Record<string, string|null>>}
 */
export function extractFortiManagerSpecs(pdfText) {
  const text = normalizeWhitespace(pdfText || '');
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  if (!lines.length) return [];

  const blocks = findFortiManagerSpecBlocks(lines);
  if (blocks.length) {
    const all = [];
    for (let b = 0; b < blocks.length; b++) {
      const { startLine, models } = blocks[b];
      const endLine = b + 1 < blocks.length ? blocks[b + 1].startLine : lines.length;
      logger.info(
        { models, startLine, endLine },
        '[fortimanager.extractor] spec block',
      );
      all.push(...extractFortiManagerBlock(lines, startLine, endLine, models));
    }
    return mergeSpecsByUnit(all);
  }

  let models;
  try {
    models = detectFortiManagerModelColumns(lines);
  } catch {
    return [];
  }

  if (models.length === 1 && models[0] === 'FMG-CLOUD') {
    for (let li = 0; li < Math.min(lines.length, 500); li++) {
      const tok = tokenizeFmgModelsFromLine(lines[li]);
      const appliances = tok.filter((u) => /^FMG-\d{3,4}G$/i.test(u));
      if (appliances.length >= 2) {
        logger.warn(
          { appliances, note: 'sustituye cabecera CLOUD-only por fila con modelos appliance' },
          '[fortimanager.extractor]',
        );
        models = appliances;
        break;
      }
    }
  }

  const result = {};
  for (const unit of models) {
    result[unit] = { UNIT: unit };
  }

  for (let li = 0; li < lines.length; li++) {
    const line = lines[li];
    if (lineLooksCommercialOrPriceList(line)) continue;

    const columns = splitMatrixRow(line);
    if (columns.length < models.length + 1) continue;

    const labelNorm = normalizeMetricLabelCell(columns[0]);
    const entry = pickFieldEntryForLabel(labelNorm);
    if (!entry) continue;

    const values = columns.slice(1);
    const { field } = entry;
    models.forEach((model, idx) => {
      const v = normalizeGlyphMetricCell(field, values[idx]);
      if (v === null || v === undefined) return;
      if (!isPlausibleMetricValue(field, v)) return;
      result[model][field] = v;
    });

    logger.debug({ field, line: line.slice(0, 180), values }, '[fortimanager.extractor] row');
  }

  return Object.values(result);
}

/**
 * @param {Buffer} fileBuffer
 * @param {{ appliancesOnly?: boolean }} [options] - si true, omite "VIRTUAL APPLIANCES" / FMG-VM-* de la matriz
 * @returns {Promise<object[]>}
 */
export async function extractFortiManagerSpecsFromPDF(fileBuffer, options = {}) {
  if (!fileBuffer || !Buffer.isBuffer(fileBuffer)) {
    throw new Error('Se requiere un Buffer PDF válido');
  }
  const data = await pdfParse(fileBuffer);
  let rawText = typeof data.text === 'string' ? data.text : '';
  if (options.appliancesOnly) {
    rawText = stripVirtualFortiManagerPdfSection(rawText);
  }
  const rows = extractFortiManagerSpecs(rawText);
  if (!rows.length) {
    const preview = normalizeWhitespace(rawText).slice(0, 350).replace(/\s+/g, ' ');
    throw new Error(
      'No se extrajo matriz FortiManager. ' + (preview ? `Fragmento: ${preview}…` : ''),
    );
  }
  return rows;
}

/**
 * @param {object} rec
 * @returns {object}
 */
function sliceStr(v, max) {
  if (v == null || typeof v === 'boolean') return null;
  const s = String(v).trim();
  if (!s) return null;
  return s.slice(0, max);
}

function recordToSpecAttributes(rec) {
  const out = {};

  const u = normalizeFortiManagerUnit(rec.UNIT);
  if (u) out.unit = u.slice(0, 64);

  const putStr = (dbKey, srcKey, max = 255, internalField = null) => {
    const raw = rec[srcKey];
    if (raw === true || raw === false) return;
    const s = sliceStr(raw, max);
    if (!s) return;
    if (internalField && !isPlausibleMetricValue(internalField, s)) return;
    if (looksLikeCommercialGarbageText(s)) return;
    out[dbKey] = s;
  };

  // Columnas BD = etiquetas datasheet (snake_case): devices_vdoms_*, gb_per_day, sustained_log_rates, usable_storage_after_raid.
  putStr('devices_vdoms_default', 'Default_Devices_VDOMs', 64, 'Default_Devices_VDOMs');
  putStr('devices_vdoms_maximum', 'Max_Devices_VDOMs', 64, 'Max_Devices_VDOMs');
  putStr('gb_per_day', 'Log_GB_per_day', 64, 'Log_GB_per_day');
  putStr('sustained_log_rates', 'Sustained_Log_Rates', 64, 'Sustained_Log_Rates');
  putStr('usable_storage_after_raid', 'Usable_Storage', 255);

  return out;
}

/** Columnas que el ingest de dimensionamiento pone explícitamente a NULL al actualizar filas existentes. */
const FORTIMANAGER_SPEC_DB_KEYS_CLEARED_ON_SIZING_INGEST = [
  'default_adoms',
  'max_adoms',
  'storage_capacity',
  'raid_levels',
  'total_interfaces',
  'redundant_power',
  'removable_disks',
  'sed',
  'form_factor',
];

/**
 * Vincula cada fila extraída a product_models + fortimanager_specs (+ datasheet_model_map si hay sourceId).
 * @param {object} params
 * @param {import('../../models/Solution.model.js').default} params.solution
 * @param {number|null} params.sourceId
 * @param {string|null} params.family
 * @param {object[]} params.records
 * @param {import('sequelize').Transaction} params.transaction
 */
export async function linkFortiManagerRecordsToCatalog({
  solution,
  sourceId = null,
  family,
  records,
  transaction,
}) {
  const results = [];
  const list = Array.isArray(records) ? records : [];

  for (const rec of list) {
    const unit = normalizeFortiManagerUnit(rec.UNIT);
    if (!unit) continue;

    const deploymentType = /^FMG-VM/i.test(unit) ? 'virtual' : 'appliance';

    const [pm, created] = await ProductModel.findOrCreate({
      where: { solution_id: solution.id, unit },
      defaults: {
        solution_id: solution.id,
        solution_type: 'fortimanager',
        unit,
        sku_base: null,
        model_name: unit,
        family_name: family || 'FortiManager',
        deployment_type: deploymentType,
        has_datasheet: true,
        source_origin: 'pdf',
        technical_completeness_status: 'verified',
        is_active: 1,
      },
      transaction,
    });

    await pm.update({ has_datasheet: true, deployment_type: deploymentType }, { transaction });

    const specAttrs = recordToSpecAttributes(rec);
    if (Object.keys(specAttrs).length > 0) {
      const [specRow, specCreated] = await FortimanagerSpec.findOrCreate({
        where: { product_model_id: pm.id },
        defaults: {
          product_model_id: pm.id,
          ...specAttrs,
        },
        transaction,
      });

      if (!specCreated) {
        const updates = {};
        for (const [k, v] of Object.entries(specAttrs)) {
          if (k === 'unit') {
            updates.unit = v;
            continue;
          }
          const cur = specRow.get(k);
          if (shouldOverwriteSpecColumn(k, cur, v)) updates[k] = v;
        }
        for (const k of FORTIMANAGER_SPEC_DB_KEYS_CLEARED_ON_SIZING_INGEST) {
          updates[k] = null;
        }
        if (Object.keys(updates).length > 0) {
          await specRow.update(updates, { transaction });
        }
      }
    }

    if (sourceId) {
      try {
        await DatasheetModelMap.findOrCreate({
          where: {
            datasheet_source_id: sourceId,
            product_model_id: pm.id,
          },
          defaults: {
            datasheet_source_id: sourceId,
            product_model_id: pm.id,
            page_reference: null,
            extracted_by: EXTRACTOR_VERSION,
            verified_manually: 0,
          },
          transaction,
        });
      } catch (e) {
        logger.warn(
          '[fortimanager.extractor] datasheet_model_map source=%s unit=%s: %s',
          sourceId,
          unit,
          e?.message || e,
        );
      }
    }

    results.push({ unit, product_model_id: pm.id, created });
  }

  return results;
}

/**
 * Transacción única: extraer no aplica aquí; solo persistir records ya parseados.
 * @param {object[]} records
 * @param {{ solution: object, sourceId?: number|null, family?: string|null, transaction: object }} options
 */
export async function upsertFortiManagerSpecsLinked(records, options = {}) {
  const { solution, sourceId = null, family = 'FortiManager', transaction } = options;
  if (!solution?.id) throw new Error('solution requerido');
  if (!transaction) throw new Error('transaction requerido');
  return linkFortiManagerRecordsToCatalog({
    solution,
    sourceId,
    family,
    records,
    transaction,
  });
}

export default {
  normalizeFortiManagerUnit,
  squashPdfHyphens,
  looksLikeCommercialGarbageText,
  tokenizeGluedFmgModels,
  tokenizeFmgModelsFromLine,
  splitDigitRunsIntoNCols,
  splitMatrixRow,
  cleanCell,
  normalizeMatrixValue,
  detectFortiManagerModelColumns,
  findFortiManagerSpecBlocks,
  extractFortiManagerBlock,
  mergeSpecsByUnit,
  extractFortiManagerSpecs,
  extractFortiManagerSpecsFromPDF,
  linkFortiManagerRecordsToCatalog,
  upsertFortiManagerSpecsLinked,
};
