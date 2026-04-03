/**
 * PDF → filas fortiwifi_specs (parsing de texto, sin LLM).
 * Prioridad: tabla (cabecera FWF- + columnas); si no aplica, extracción por etiquetas.
 * UPSERT raw no cambia.
 */

import { createRequire } from 'module';
import { FortiwifiSpec } from '../../models/SolutionSpecs.models.js';
import normalizeUnit from '../../utils/normalizeUnit.js';
import { normalizeFortiWifiSpecRowForStorage } from './fortiwifi.engine.js';

const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

/** Campos matrix (mismo orden que columnas DB / UPSERT). */
const MATRIX_FIELD_KEYS = [
  'IPS_Throughput',
  'NGFW_Throughput',
  'Threat_Protection_Throughput',
  'Concurrent_Sessions_TCP',
  'New_Sessions_Per_Second_TCP',
  'IPsec_VPN_Throughput',
  'SSL_Inspection_Throughput',
  'SSL_Inspection_Concurrent_Session',
  'Max_FortiAPs',
  'Max_FortiSwitches',
];

/**
 * Orden exacto de columnas en INSERT (tabla solo UNIT + matrix PascalCase + timestamps).
 */
const FORTIWIFI_SPECS_MATRIX_COLS = ['UNIT', ...MATRIX_FIELD_KEYS];

function buildFortiwifiSpecsUpsertSql() {
  const quoted = FORTIWIFI_SPECS_MATRIX_COLS.map((c) => `\`${c}\``).join(', ');
  const placeholders = FORTIWIFI_SPECS_MATRIX_COLS.map(() => '?').join(', ');
  const updates = FORTIWIFI_SPECS_MATRIX_COLS.filter((c) => c !== 'UNIT')
    .map((c) => `\`${c}\` = VALUES(\`${c}\`)`)
    .join(', ');
  return `
INSERT INTO \`fortiwifi_specs\` (${quoted}, \`created_at\`, \`updated_at\`)
VALUES (${placeholders}, NOW(), NOW())
ON DUPLICATE KEY UPDATE ${updates}, \`updated_at\` = NOW()
`.trim();
}

const FORTIWIFI_SPECS_UPSERT_SQL = buildFortiwifiSpecsUpsertSql();

function rowToFortiwifiSpecBinds(payload) {
  return FORTIWIFI_SPECS_MATRIX_COLS.map((col) => {
    const v = payload[col];
    return v === undefined ? null : v;
  });
}

function escapeRegExp(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeWhitespace(text) {
  return String(text || '')
    .replace(/\r/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/⃝/g, ' ')
    .replace(/[✓✔☑■]/g, ' Yes ')
    .replace(/[•·]/g, ' ')
    .replace(/[|]/g, ' ')
    .replace(/\t/g, '  ');
}

function sanitizeSpecValue(value) {
  return String(value || '')
    .replace(/⃝/g, ' ')
    .replace(/[✓✔☑■]/g, 'Yes')
    .replace(/[|]/g, ' ')
    .replace(/\s*\/\s*/g, ' / ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Descarta basura de PDF por columna (ej. "1" suelto en sesiones, "/" en FortiAPs).
 * @param {string} field - clave matrix
 * @param {string|null|undefined} raw
 * @returns {string|null}
 */
function finalizeMatrixField(field, raw) {
  if (raw == null) return null;
  const s = sanitizeSpecValue(raw);
  if (!s) return null;

  if (
    field === 'Concurrent_Sessions_TCP' ||
    field === 'New_Sessions_Per_Second_TCP' ||
    field === 'SSL_Inspection_Concurrent_Session'
  ) {
    const digitsOnly = s.replace(/\D/g, '');
    if (!digitsOnly) return null;
    const n = Number(digitsOnly);
    if (!Number.isFinite(n) || n < 1000) return null;
    return s;
  }

  if (field === 'Max_FortiAPs') {
    if (!/\d/.test(s)) return null;
    const t = s.replace(/\s+/g, ' ').trim();
    if (t === '/' || t === ' / ' || /^[\s/–\-]+$/u.test(t)) return null;
    if (t.includes('/')) {
      const sides = t
        .split(/\s*\/\s*/)
        .map((x) => x.trim())
        .filter(Boolean);
      if (sides.length < 2) return null;
      if (!sides.every((side) => /\d/.test(side))) return null;
    }
    return t;
  }

  if (field === 'Max_FortiSwitches') {
    if (!/\d/.test(s)) return null;
    const t = s.replace(/\s+/g, ' ').trim();
    if (t === '/' || t === ' / ' || /^[\s/–\-]+$/u.test(t)) return null;
    return t;
  }

  return s;
}

/**
 * Ventana de especificaciones (menos ruido de marketing que el PDF completo).
 */
function extractSpecsWindow(text) {
  const t = normalizeWhitespace(String(text || ''));
  const anchors = [
    /\bIPS\s+Throughput\b/i,
    /\bNGFW\s+Throughput\b/i,
    /\bSystem\s+Performance\b/i,
    /\bHardware\s+Specifications\b/i,
  ];
  let start = -1;
  for (const re of anchors) {
    const i = t.search(re);
    if (i >= 0) {
      start = i;
      break;
    }
  }
  if (start < 0) return t;
  const endIdx = t.search(/\nDimensions\b/i);
  const end = endIdx > start ? endIdx : start + 18000;
  return t.slice(start, end);
}

/** Etiquetas en PDF suelen partirse en varias líneas. */
function labelPattern(label) {
  return String(label)
    .trim()
    .split(/\s+/)
    .map(escapeRegExp)
    .join('[\\s\\n]+');
}

/**
 * Tras la etiqueta, toma el primer valor útil (sesiones TCP, ratio FortiAP, Gbps/Mbps…).
 */
function extractValue(label, text) {
  const src = String(text || '');
  const head = new RegExp(`${labelPattern(label)}([\\s\\S]{0,1600})`, 'i');
  const m = src.match(head);
  if (!m) return null;
  const block = m[1];
  const L = String(label);

  if (/Concurrent\s+Sessions/i.test(L)) {
    const a =
      block.match(/\(TCP\)\s*([\d\s,]+)/i) ||
      block.match(/TCP\)\s*([\d\s,]+)/i) ||
      block.match(/Sessions[^\d]{0,40}([\d][\d\s,]{4,})/i);
    if (a) return sanitizeSpecValue(a[1]);
  }
  if (/New\s+Sessions/i.test(L)) {
    const a =
      block.match(/\(TCP\)\s*([\d\s,]+)/i) ||
      block.match(/Second[^\d]{0,60}([\d][\d\s,]{2,})/i);
    if (a) return sanitizeSpecValue(a[1]);
  }
  if (/SSL\s+Inspection\s+Concurrent/i.test(L)) {
    const a =
      block.match(/Session[^\d]{0,80}(\d{1,3}\s+\d{3})\b/i) ||
      block.match(/\b(\d{1,3}\s+\d{3})\b/) ||
      block.match(/\b(\d{4,7})\b/);
    if (a) return sanitizeSpecValue(a[1]);
  }
  if (/Maximum\s+Number\s+of\s+FortiAPs/i.test(L)) {
    const ratio = block.match(/([\d\s]+)\s*\/\s*([\d\s]+)/);
    if (ratio) return sanitizeSpecValue(`${ratio[1]} / ${ratio[2]}`);
  }
  if (/Maximum\s+Number\s+of\s+FortiSwitches/i.test(L)) {
    const s = block.match(/Supported[^\d]{0,40}(\d+)/i) || block.match(/\b(\d{1,3})\s*$/m);
    if (s) return sanitizeSpecValue(s[1]);
  }

  const gbps = block.match(/(\d+(?:\.\d+)?\s*Gbps)/i);
  if (gbps) return sanitizeSpecValue(gbps[1]);
  const mbps = block.match(/(\d+(?:\.\d+)?\s*Mbps)/i);
  if (mbps) return sanitizeSpecValue(mbps[1]);
  const mpps = block.match(/(\d+(?:\.\d+)?\s*Mpps)/i);
  if (mpps) return sanitizeSpecValue(mpps[1]);

  const fallback = block.match(/([0-9.,\s\\/]+\s*(?:Gbps|Mbps|Kbps|Mpps)?)/i);
  return fallback ? sanitizeSpecValue(fallback[1]) : null;
}

/** FWF-50G, FWF-51G, FWF-50G-SFP, FWF-50G-5G-II, … */
const FWF_MODEL_REGEX_G = /\bFWF-[0-9]+G(?:-[A-Z0-9]+)*\b/gi;
/** FWF-60F, FWF-61F, FWF-60F-POE, … (series FortiWiFi *F) */
const FWF_MODEL_REGEX_F = /\bFWF-[0-9]+F(?:-[A-Z0-9]+)*\b/gi;

function discoverFwModels(text) {
  const t = String(text || '');
  const seen = new Set();
  for (const re of [FWF_MODEL_REGEX_G, FWF_MODEL_REGEX_F]) {
    re.lastIndex = 0;
    const hits = t.match(re) || [];
    for (const m of hits) {
      const u = normalizeUnit(m);
      if (u) seen.add(u);
    }
  }
  return [...seen];
}

/**
 * Cuando el PDF no repite "FWF-…" pero sí el título de serie:
 * "FortiGate FortiWiFi 60F Series", "FortiWiFi 60F / 61F", etc.
 */
function inferFwModelsFromMarketingText(text) {
  const t = String(text || '');
  const seen = new Set();
  const push = (code) => {
    if (!code) return;
    const u = normalizeUnit(`FWF-${code}`);
    if (u) seen.add(u);
  };
  const reSlash = /\bFortiWiFi\s+(\d{2,4}[A-Za-z](?:-[A-Za-z0-9]+)*)\s*\/\s*(\d{2,4}[A-Za-z](?:-[A-Za-z0-9]+)*)\b/g;
  let m;
  while ((m = reSlash.exec(t)) !== null) {
    push(m[1]);
    push(m[2]);
  }
  const reSingle = /\bFortiWiFi\s+(\d{2,4}[A-Za-z](?:-[A-Za-z0-9]+)*)\b/g;
  while ((m = reSingle.exec(t)) !== null) {
    push(m[1]);
  }
  return [...seen];
}

/**
 * PDF compacto `FG-50G/51GFWF-…`: añade ambos códigos como FWF-*.
 */
function expandModelsFromFgSlashLine(text, models) {
  const t = String(text || '');
  const fg = t.match(
    /\bFG-(\d{2,4}[A-Z](?:-[A-Z0-9]+)?)\/(\d{2,4}[A-Z])(?=FWF|\s|,|\)|$)/i,
  );
  if (!fg) return models;
  const first = normalizeUnit(`FWF-${fg[1].toUpperCase()}`);
  const second = normalizeUnit(`FWF-${fg[2].toUpperCase()}`);
  const out = [...models];
  if (first && !out.includes(first)) out.push(first);
  if (second && !out.includes(second)) out.push(second);
  return [...new Set(out)];
}

/** Celda de tabla: ignora marcadores vacíos. */
function cleanTableValue(val) {
  if (val == null) return null;
  let v = String(val).trim();
  if (!v) return null;
  if (v === '/' || v === '-') return null;
  return v;
}

/**
 * Separa columnas por bloques de 2+ espacios; no parte "600 000" (un solo espacio interno).
 */
function splitTableColumns(line) {
  return String(line || '')
    .replace(/\s{2,}/g, '|')
    .split('|')
    .map((v) => v.trim());
}

/** Primera columna de fila → campo matrix (misma semántica que el datasheet). */
function tableLabelToField(label) {
  const L = String(label || '');
  if (!L) return null;
  if (L.includes('IPS Throughput')) return 'IPS_Throughput';
  if (L.includes('NGFW Throughput')) return 'NGFW_Throughput';
  if (L.includes('Threat Protection')) return 'Threat_Protection_Throughput';
  if (L.includes('Concurrent Sessions')) return 'Concurrent_Sessions_TCP';
  if (L.includes('New Sessions')) return 'New_Sessions_Per_Second_TCP';
  if (L.includes('IPsec VPN')) return 'IPsec_VPN_Throughput';
  if (L.includes('SSL Inspection Throughput')) return 'SSL_Inspection_Throughput';
  if (L.includes('SSL Inspection Concurrent')) return 'SSL_Inspection_Concurrent_Session';
  if (L.includes('FortiAPs')) return 'Max_FortiAPs';
  if (L.includes('FortiSwitches')) return 'Max_FortiSwitches';
  return null;
}

/** Modelos en línea de cabecera (FWF-*G y FWF-*F). */
const FWF_TABLE_HEADER_MODEL_REGEX = /\bFWF-[0-9]+[GF](?:-[A-Z0-9]+)*\b/gi;

function extractModelsFromTableHeaderLine(line) {
  const raw = String(line || '').match(FWF_TABLE_HEADER_MODEL_REGEX) || [];
  const seen = new Set();
  const out = [];
  for (const m of raw) {
    const u = normalizeUnit(m);
    if (u && !seen.has(u)) {
      seen.add(u);
      out.push(u);
    }
  }
  return out;
}

/**
 * Tabla texto: fila con FWF-* como cabecera, filas siguientes = métrica + un valor por modelo.
 * @returns {Array<Record<string, string|null>>}
 */
function extractFortiWifiTable(text) {
  const lines = normalizeWhitespace(String(text || ''))
    .split('\n')
    .map((l) => l.trim());

  const headerIndex = lines.findIndex((l) => l.includes('FWF-'));
  if (headerIndex === -1) return [];

  const models = extractModelsFromTableHeaderLine(lines[headerIndex]);
  if (!models.length) return [];

  /** @type {Record<string, Record<string, string|null>>} */
  const data = {};
  for (const m of models) {
    data[m] = { UNIT: m };
    for (const k of MATRIX_FIELD_KEYS) data[m][k] = null;
  }

  for (let i = headerIndex + 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line || !/[0-9]/.test(line)) continue;

    const cols = splitTableColumns(line);
    if (cols.length < models.length + 1) continue;

    const label = cols[0];
    const field = tableLabelToField(label);
    if (!field) continue;

    models.forEach((model, idx) => {
      const rawValue = cols[idx + 1];
      const clean = cleanTableValue(rawValue);
      if (!clean) return;
      const finalized = finalizeMatrixField(field, clean);
      if (finalized) {
        data[model][field] = finalized;
      }
    });
  }

  return models.map((m) => data[m]);
}

function isWifiTableUsable(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return false;
  return rows.some((r) =>
    MATRIX_FIELD_KEYS.some((k) => {
      const v = r[k];
      return v != null && String(v).trim() !== '';
    }),
  );
}

function buildRecordFromText(model, text) {
  const unit = normalizeUnit(model);
  return {
    UNIT: unit,
    IPS_Throughput: finalizeMatrixField('IPS_Throughput', extractValue('IPS Throughput', text)),
    NGFW_Throughput: finalizeMatrixField('NGFW_Throughput', extractValue('NGFW Throughput', text)),
    Threat_Protection_Throughput: finalizeMatrixField(
      'Threat_Protection_Throughput',
      extractValue('Threat Protection Throughput', text),
    ),
    Concurrent_Sessions_TCP: finalizeMatrixField(
      'Concurrent_Sessions_TCP',
      extractValue('Concurrent Sessions', text),
    ),
    New_Sessions_Per_Second_TCP: finalizeMatrixField(
      'New_Sessions_Per_Second_TCP',
      extractValue('New Sessions', text),
    ),
    IPsec_VPN_Throughput: finalizeMatrixField(
      'IPsec_VPN_Throughput',
      extractValue('IPsec VPN Throughput', text),
    ),
    SSL_Inspection_Throughput: finalizeMatrixField(
      'SSL_Inspection_Throughput',
      extractValue('SSL Inspection Throughput', text),
    ),
    SSL_Inspection_Concurrent_Session: finalizeMatrixField(
      'SSL_Inspection_Concurrent_Session',
      extractValue('SSL Inspection Concurrent Session', text),
    ),
    Max_FortiAPs: finalizeMatrixField(
      'Max_FortiAPs',
      extractValue('Maximum Number of FortiAPs', text),
    ),
    Max_FortiSwitches: finalizeMatrixField(
      'Max_FortiSwitches',
      extractValue('Maximum Number of FortiSwitches', text),
    ),
  };
}

/**
 * Compatibilidad: arma filas desde `models` + `rows` (objeto campo → array por índice).
 * @param {{ models: string[], rows?: Record<string, (string|null)[]> }} tableData
 */
export function mapToFortiWiFiSpecs(tableData) {
  const models = Array.isArray(tableData?.models) ? tableData.models : [];
  const rows = tableData?.rows && typeof tableData.rows === 'object' ? tableData.rows : {};
  if (!models.length) throw new Error('No se detectaron modelos FWF- para fortiwifi_specs.');

  return models.map((unit, index) => {
    const record = {
      UNIT: normalizeUnit(unit),
      IPS_Throughput: null,
      NGFW_Throughput: null,
      Threat_Protection_Throughput: null,
      Concurrent_Sessions_TCP: null,
      New_Sessions_Per_Second_TCP: null,
      IPsec_VPN_Throughput: null,
      SSL_Inspection_Throughput: null,
      SSL_Inspection_Concurrent_Session: null,
      Max_FortiAPs: null,
      Max_FortiSwitches: null,
    };
    for (const key of MATRIX_FIELD_KEYS) {
      const values = Array.isArray(rows[key]) ? rows[key] : [];
      record[key] =
        values[index] != null ? finalizeMatrixField(key, values[index]) : null;
    }
    return record;
  });
}

/**
 * @param {Buffer} fileBuffer
 * @returns {Promise<Array<Record<string, string|null>>>}
 */
export async function extractFortiWiFiSpecsFromPDF(fileBuffer) {
  if (!fileBuffer || !Buffer.isBuffer(fileBuffer)) {
    throw new Error('Se requiere un Buffer PDF válido');
  }

  const data = await pdfParse(fileBuffer);
  const rawText = typeof data.text === 'string' ? data.text : '';
  const fullText = normalizeWhitespace(rawText);
  const specWindow = extractSpecsWindow(fullText);

  let models = discoverFwModels(specWindow);
  models = expandModelsFromFgSlashLine(specWindow, models);
  if (!models.length) {
    models = inferFwModelsFromMarketingText(specWindow);
  }
  if (!models.length) {
    models = discoverFwModels(fullText);
    models = expandModelsFromFgSlashLine(fullText, models);
  }
  if (!models.length) {
    models = inferFwModelsFromMarketingText(fullText);
  }
  if (!models.length) {
    const preview = fullText.slice(0, 400).replace(/\s+/g, ' ').trim();
    throw new Error(
      'No se detectaron modelos FortiWiFi (FWF-* con sufijo G o F, o título "FortiWiFi XXF/XXG"). ' +
        (preview ? `Fragmento: ${preview}…` : ''),
    );
  }

  const tableFromSpec = extractFortiWifiTable(specWindow);
  const tableFromFull = extractFortiWifiTable(fullText);
  const tableRows = isWifiTableUsable(tableFromSpec)
    ? tableFromSpec
    : isWifiTableUsable(tableFromFull)
      ? tableFromFull
      : [];

  if (isWifiTableUsable(tableRows)) {
    return tableRows;
  }

  const metricText = specWindow.length >= 200 ? specWindow : fullText;
  return models.map((model) => buildRecordFromText(model, metricText));
}

/**
 * UPSERT por UNIT (índice único uq_fortiwifi_specs_unit).
 */
export async function upsertFortiWiFiSpecs(records, options = {}) {
  const { transaction } = options;
  const sequelize = FortiwifiSpec.sequelize;
  const list = Array.isArray(records) ? records : [];
  const out = [];
  for (const rec of list) {
    const unit = normalizeUnit(rec.UNIT);
    if (!unit) continue;
    const payload = normalizeFortiWifiSpecRowForStorage({
      ...rec,
      UNIT: unit,
    });
    delete payload.id;
    const replacements = rowToFortiwifiSpecBinds(payload);
    await sequelize.query(FORTIWIFI_SPECS_UPSERT_SQL, {
      replacements,
      transaction,
    });
    console.log({ action: 'UPSERT_RAW', table: 'fortiwifi_specs', unit });
    out.push(payload);
  }
  return out;
}

export default {
  extractFortiWiFiSpecsFromPDF,
  mapToFortiWiFiSpecs,
  upsertFortiWiFiSpecs,
};
