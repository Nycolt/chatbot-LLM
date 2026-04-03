/**
 * PDF → filas fortianalyzer_specs (matriz FAZ-* por columna, sin LLM).
 * Alineado al datasheet FortiAnalyzer (p. ej. InDesign): varios bloques "FORTIANALYZER APPLIANCES",
 * etiquetas reales y celdas a menudo sin espacios entre columnas.
 */

import { createRequire } from 'module';
import { logger } from '../../config/logger.js';
import { FortianalyzerSpec } from '../../models/SolutionSpecs.models.js';
import normalizeUnit from '../../utils/normalizeUnit.js';
import { assertFortianalyzerSpecsSchemaReady } from './fortianalyzer.schemaAssert.js';
import { stripVirtualFortianalyzerPdfSection } from '../normalizer.service.js';

const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

/**
 * FAZ-150G … FAZ-3750G, FAZ-VM-GB1 … (texto del PDF; sin inventar modelos).
 * Pegados: FAZ-150GFAZ-300G. Sin lookbehind: "APPLIANCESFAZ-150G" tiene 'S' antes de F.
 */
export const FAZ_MODEL_REGEX = /FAZ-(?:\d{3,4}G|VM-GB\d+)/gi;

const MATRIX_FIELD_KEYS = [
  'GB_Logs_Per_Day',
  'Analytics_Rate_Logs_Per_Sec',
  'Collector_Rate_Logs_Per_Sec',
  'Total_Interfaces',
  'Storage_Capacity',
];

/** Orden: probar primero las cadenas que aparecen en el PDF real. */
const LABELS_GB_LOGS = ['GB/ day of Logs', 'GB Logs/Day'];
const LABELS_ANALYTIC = ['Analytic Sustained Rate'];
const LABELS_COLLECTOR = ['Collector Sustained Rate'];
const LABELS_INTERFACES = ['Total Interfaces'];
const LABELS_STORAGE = ['Storage Capacity'];

const FORTIANALYZER_SPECS_COLS = ['UNIT', ...MATRIX_FIELD_KEYS];

function buildUpsertSql() {
  const quoted = FORTIANALYZER_SPECS_COLS.map((c) => `\`${c}\``).join(', ');
  const placeholders = FORTIANALYZER_SPECS_COLS.map(() => '?').join(', ');
  const updates = FORTIANALYZER_SPECS_COLS.filter((c) => c !== 'UNIT')
    .map((c) => `\`${c}\` = VALUES(\`${c}\`)`)
    .join(', ');
  return `
INSERT INTO \`fortianalyzer_specs\` (${quoted}, \`created_at\`, \`updated_at\`)
VALUES (${placeholders}, NOW(), NOW())
ON DUPLICATE KEY UPDATE ${updates}, \`updated_at\` = NOW()
`.trim();
}

const FORTIANALYZER_SPECS_UPSERT_SQL = buildUpsertSql();

function rowToBinds(payload) {
  return FORTIANALYZER_SPECS_COLS.map((col) => {
    const v = payload[col];
    return v === undefined ? null : v;
  });
}

function normalizeWhitespace(text) {
  return String(text || '')
    .replace(/\r/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/\t/g, '  ');
}

function escapeRegExp(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Parte por 2+ espacios (referencia original).
 * @param {string} line
 * @returns {string[]}
 */
export function extractRowValues(line) {
  return String(line || '')
    .replace(/,/g, '')
    .split(/\s{2,}/)
    .map((v) => v.trim())
    .filter(Boolean);
}

const PARTITION_MAX_LEN = 6;

/**
 * Todas las particiones válidas (trozos 1–PARTITION_MAX_LEN dígitos, sin ceros a la izquierda).
 */
function partitionDigitsAll(digits, n, start = 0, parts = []) {
  if (parts.length === n) return start === digits.length ? [parts] : [];
  if (start >= digits.length) return [];
  const out = [];
  for (let len = 1; len <= Math.min(PARTITION_MAX_LEN, digits.length - start); len++) {
    const piece = digits.slice(start, start + len);
    if (piece.length > 1 && piece[0] === '0') continue;
    out.push(...partitionDigitsAll(digits, n, start + len, parts.concat([piece])));
  }
  return out;
}

/**
 * Elige la partición más plausible cuando hay varias (p. ej. 25100200660 → 25,100,200,660 no 2,5,100,200660).
 * Prioriza menor valor máximo y menor suma entre candidatos con partes ≤ maxReasonable.
 */
function pickPackedDigitPartition(digits, n, maxReasonable = 500000) {
  const all = partitionDigitsAll(digits, n);
  if (!all.length) return null;
  const reasonable = all.filter((parts) =>
    parts.every((p) => Number(p) <= maxReasonable),
  );
  const pool = reasonable.length ? reasonable : all;
  pool.sort((a, b) => {
    const na = a.map(Number);
    const nb = b.map(Number);
    const ma = Math.max(...na);
    const mb = Math.max(...nb);
    if (ma !== mb) return ma - mb;
    const sa = na.reduce((s, x) => s + x, 0);
    const sb = nb.reduce((s, x) => s + x, 0);
    return sa - sb;
  });
  return pool[0];
}

/**
 * Normaliza "20 000" / espacios finos → dígitos para particionar; devuelve valores tal como quedan legibles.
 */
function splitPackedNumericCells(rest, colCount) {
  let trimmed = String(rest || '').trim();
  // VM datasheet: "GB/ day of Logs *+1+5+25+100+500+2000"
  const plusLead = trimmed.replace(/^\*+\s*/, '');
  if (plusLead.includes('+') && /^\+?\d/.test(plusLead.replace(/^\+/, ''))) {
    const cells = plusLead
      .split('+')
      .map((x) => x.trim())
      .filter(Boolean);
    if (cells.length >= colCount) return cells.slice(0, colCount);
  }
  trimmed = trimmed.replace(/\*+$/g, '').trim();
  // Fila numérica pegada (p. ej. Analytic "5002000400020 000" → 16 dígitos). Evita que el paso
  // de "miles con espacio" trocee mal y prioriza pickPackedDigitPartition.
  const digitOnlyEarly = trimmed.replace(/\D/g, '');
  if (
    colCount > 0 &&
    digitOnlyEarly.length >= colCount &&
    digitOnlyEarly.length <= colCount * PARTITION_MAX_LEN
  ) {
    const early = pickPackedDigitPartition(digitOnlyEarly, colCount);
    if (early) return early;
  }
  const spacedThousands = trimmed.match(/\d{1,3}(?:\s+\d{3})+(?=\s|$|\d{4,})?/g) || [];
  let work = trimmed;
  for (const st of spacedThousands) {
    const compact = st.replace(/\s+/g, '');
    work = work.replace(st, ` ${compact} `);
  }
  work = work.replace(/\s+/g, ' ').trim();
  let cells = extractRowValues(work);
  if (cells.length >= colCount) return cells.slice(0, colCount);

  const digitOnly = work.replace(/\D/g, '');
  if (digitOnly.length >= colCount && colCount > 0 && digitOnly.length <= colCount * PARTITION_MAX_LEN) {
    const parted = pickPackedDigitPartition(digitOnly, colCount);
    if (parted) return parted;
  }
  return cells.length ? cells : [];
}

/**
 * El PDF parte "Total Interfaces" en varias líneas (la 4ª columna suele quedar en la siguiente).
 */
function mergeTotalInterfacesLines(lines, startIdx) {
  let s = String(lines[startIdx] || '').trim();
  let j = startIdx + 1;
  while (j < lines.length && j < startIdx + 10) {
    const t = lines[j].trim();
    if (/^Storage\s+Capacity/i.test(t)) break;
    if (/^Usable\s+Storage/i.test(t)) break;
    if (/^Form\s+Factor/i.test(t)) break;
    if (/^\d+x\s/i.test(t)) {
      s += ' ' + t;
      j++;
      continue;
    }
    break;
  }
  return s;
}

/**
 * "Storage Capacity" puede ocupar varias líneas (NVMe, 24x 4TB, 384TB…).
 */
function mergeStorageCapacityLines(lines, startIdx) {
  let s = String(lines[startIdx] || '').trim();
  let j = startIdx + 1;
  while (j < lines.length && j < startIdx + 14) {
    const t = lines[j].trim();
    if (/^Usable\s+Storage/i.test(t)) break;
    if (/^Removable\s+Hard/i.test(t)) break;
    if (/^RAID\s+Levels/i.test(t)) break;
    if (/^RAID\s+Type/i.test(t)) break;
    if (/^Default\s+RAID/i.test(t)) break;
    if (/^Total\s+Interfaces/i.test(t)) break;
    s += ' ' + t;
    j++;
  }
  return s;
}

function lineMatchesInterfaceLabel(line) {
  return LABELS_INTERFACES.some((lab) => {
    const l = line.trimStart();
    if (l.startsWith(lab)) return true;
    return new RegExp(`^\\s*${escapeRegExp(lab)}(?:\\s|$|[0-9(])`).test(line);
  });
}

function lineMatchesStorageLabel(line) {
  return LABELS_STORAGE.some((lab) => {
    const l = line.trimStart();
    if (l.startsWith(lab)) return true;
    return new RegExp(`^\\s*${escapeRegExp(lab)}(?:\\s|$|[0-9(])`).test(line);
  });
}

function findLineIndexForPredicate(lines, pred) {
  for (let i = 0; i < lines.length; i++) {
    if (pred(lines[i])) return i;
  }
  return -1;
}

/** Matriz 4 columnas (150G–1000G): límites reales del datasheet, no cada `2x` interno. */
function splitPackedNxCellsFourCols(rest) {
  const raw = rest
    .replace(/^Total Interfaces\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim();
  const marked = raw
    .replace(/(?<=GE)(?=4x RJ45)/gi, '§|§')
    .replace(/(?<=GE)(?=4x RJ-45)/gi, '§|§')
    .replace(/(?<=SFP)\s*(?=2x\s+2\.5GbE)/gi, '§|§');
  const parts = marked.split('§|§').map((p) => p.trim()).filter(Boolean);
  return parts.length >= 4 ? parts.slice(0, 4) : null;
}

/** Matriz 3 columnas (3100G–3750G): cada celda termina en SFP28 antes de la siguiente `2x 10G…`. */
function splitPackedNxCellsThreeCols(rest) {
  const raw = rest
    .replace(/^Total Interfaces\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim();
  const a = raw.split(/(?<=SFP28)(?=2x\s+10GbE)/i);
  if (a.length < 2) return null;
  const cell1 = a[0].trim();
  const tail = a.slice(1).join('');
  const b = tail.split(/(?<=SFP28)(?=2x\s+10GE)/i);
  if (b.length < 2) return null;
  return [cell1, b[0].trim(), b.slice(1).join('').trim()];
}

/**
 * Celdas tipo "2x RJ45 GE" pegadas (fallback si no coincide el patrón del bloque).
 */
function splitPackedNxCellsLegacy(rest, colCount) {
  const s = rest.trim();
  const starts = [];
  const re = /(?<![0-9])(\d+x\s)/g;
  let m;
  while ((m = re.exec(s)) !== null) starts.push(m.index);
  if (starts.length < colCount) {
    const loose = extractRowValues(s);
    return loose.length >= colCount ? loose.slice(0, colCount) : loose;
  }
  const parts = [];
  for (let i = 0; i < colCount; i++) {
    const a = starts[i];
    const b = i + 1 < colCount ? starts[i + 1] : s.length;
    parts.push(s.slice(a, b).trim());
  }
  return parts;
}

function splitPackedNxCells(rest, colCount) {
  const s = rest.trim();
  if (colCount === 4) {
    const p = splitPackedNxCellsFourCols(rest);
    if (p) return p;
  }
  if (colCount === 3) {
    const p = splitPackedNxCellsThreeCols(rest);
    if (p && p.length === 3) return p;
  }
  return splitPackedNxCellsLegacy(rest, colCount);
}

const STORAGE_SPLIT_MARKER = '|§STO§|';

/** 4 columnas: límites tras `)` antes del siguiente TB principal, o `HDDs`+`32 TB`. */
function splitPackedStorageCellsFourCols(rest) {
  let s = rest
    .replace(/^Storage\s+Capacity\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim();
  s = s.replace(/\)(?=\s*\d+\.?\d*\s*TB|\d{1,4}TB\b)/gi, `)${STORAGE_SPLIT_MARKER}`);
  s = s.replace(/HDDs(?=\d)/gi, `HDDs${STORAGE_SPLIT_MARKER}`);
  s = s.replace(/SED HDD(?=\d)/gi, `SED HDD${STORAGE_SPLIT_MARKER}`);
  const chunks = s.split(STORAGE_SPLIT_MARKER).map((x) => x.trim()).filter(Boolean);
  return chunks.length >= 4 ? chunks.slice(0, 4) : null;
}

/** 3 columnas: NVMe… SSD | 24x…(7.68TB) | 384TB… */
function splitPackedStorageCellsThreeCols(rest) {
  const s = rest
    .replace(/^Storage\s+Capacity\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim();
  const idxSsd = s.search(/SSD\s+(?=24x\b)/i);
  if (idxSsd < 0) return null;
  const cell1 = s.slice(0, idxSsd + 3).trim();
  let tail = s.slice(idxSsd + 3).trim();
  const idx384 = tail.search(/\)\s*(?=384TB\b)/i);
  if (idx384 < 0) return null;
  const cell2 = tail.slice(0, idx384 + 1).trim();
  const cell3 = tail.slice(idx384 + 1).trim();
  return [cell1, cell2, cell3];
}

function splitPackedStorageCellsLegacy(rest, colCount) {
  const s = rest.trim();
  const re = /(?:^|(?<=\)))\s*((?:\d+\s*TB|\d+TB)[\s\S]*?)(?=(?:\d+\s*TB|\d+TB)\b|$)/gi;
  const parts = [];
  let m;
  while ((m = re.exec(s)) !== null) {
    const chunk = m[1].trim();
    if (chunk) parts.push(chunk);
  }
  if (parts.length >= colCount) return parts.slice(0, colCount);
  const loose = extractRowValues(s);
  return loose.length >= colCount ? loose.slice(0, colCount) : loose.length ? loose : parts;
}

function splitPackedStorageCells(rest, colCount) {
  if (colCount === 4) {
    const p = splitPackedStorageCellsFourCols(rest);
    if (p) return p;
  }
  if (colCount === 3) {
    const p = splitPackedStorageCellsThreeCols(rest);
    if (p && p.length === 3) return p;
  }
  return splitPackedStorageCellsLegacy(rest, colCount);
}

function findLineStartingWithLabel(lines, label) {
  for (const raw of lines) {
    const l = raw.trimStart();
    if (l.startsWith(label)) return raw;
    const re = new RegExp(`^\\s*${escapeRegExp(label)}(?:\\s|$|[0-9(])`);
    if (re.test(raw)) return raw;
  }
  return null;
}

function findRowForLabels(lines, labelList) {
  for (const label of labelList) {
    const row = findLineStartingWithLabel(lines, label);
    if (row) return { row, label };
  }
  return null;
}

/**
 * Une "(logs/sec)*" en la línea siguiente si el PDF parte la métrica.
 */
function expandAnalyticCollectorLine(lines, baseIdx, row) {
  let s = row;
  let j = baseIdx + 1;
  while (j < lines.length && j < baseIdx + 4) {
    const n = lines[j].trim();
    if (/^\(logs\/sec\)/i.test(n) || /^\*/.test(n) || (/^\d+$/.test(n) && s.length < 40)) {
      s += n.startsWith('(') ? n : ` ${n}`;
      j++;
      continue;
    }
    if (n.length > 0 && n.length < 60 && !/^[A-Z]/.test(n)) {
      s += ` ${n}`;
      j++;
      continue;
    }
    break;
  }
  return s;
}

function valuesAfterLabel(line, label, colCount, mode) {
  const s = String(line || '');
  const idx = s.indexOf(label);
  if (idx < 0) return [];
  let rest = s.slice(idx + label.length).trimStart();
  rest = rest.replace(/^\(logs\/sec\)\s*\*?\s*/i, '').trimStart();
  if (mode === 'nx') return splitPackedNxCells(rest, colCount);
  if (mode === 'storage') return splitPackedStorageCells(rest, colCount);
  return splitPackedNumericCells(rest, colCount);
}

function fazTokensInLine(line) {
  return [...String(line).matchAll(new RegExp(FAZ_MODEL_REGEX.source, 'gi'))].map((m) => m[0]);
}

export function orderedFazModelsFromLine(line) {
  const seen = new Set();
  const out = [];
  for (const raw of fazTokensInLine(line)) {
    const u = normalizeUnit(raw);
    if (u && !seen.has(u)) {
      seen.add(u);
      out.push(u);
    }
  }
  return out;
}

/**
 * Trozos de texto que contienen una tabla de appliances (cabecera + Capacity and Performance…).
 */
function splitApplianceBlocks(text) {
  const t = normalizeWhitespace(text);
  // Sin \\b tras APPLIANCES: en el PDF suele ir pegado "APPLIANCESFAZ-150G".
  const parts = t.split(/(?=FORTIANALYZER\s+(?:VIRTUAL\s+)?APPLIANCES)/gi);
  const hasHardwareMatrix = /FAZ-\d{3,4}G/i;
  return parts.filter((p) => {
    const hardware =
      hasHardwareMatrix.test(p) && /Capacity\s+and\s+Performance/i.test(p);
    const virtual =
      /FORTIANALYZER\s+VIRTUAL\s+APPLIANCES/i.test(p) &&
      /FAZ-VM-GB\d+/i.test(p) &&
      /GB\/\s*day\s+of\s+Logs/i.test(p);
    return hardware || virtual;
  });
}

function parseApplianceBlock(blockText) {
  const lines = blockText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length);

  let modelsLine = null;
  let best = 0;
  const scanLimit = Math.min(lines.length, 60);
  for (let i = 0; i < scanLimit; i++) {
    const l = lines[i];
    if (!/FAZ-\d{3,4}G/i.test(l) && !/FAZ-VM/i.test(l)) continue;
    const hits = fazTokensInLine(l);
    const n = hits.length;
    if (n > best) {
      best = n;
      modelsLine = l;
    }
  }

  const models = modelsLine ? orderedFazModelsFromLine(modelsLine) : [];
  if (!models.length) return [];

  const colCount = models.length;

  const gbHit = findRowForLabels(lines, LABELS_GB_LOGS);
  const logs = gbHit
    ? valuesAfterLabel(gbHit.row, gbHit.label, colCount, 'numeric')
    : [];

  let analytics = [];
  const anIdx = lines.findIndex((l) => l.includes(LABELS_ANALYTIC[0]));
  if (anIdx >= 0) {
    const merged = expandAnalyticCollectorLine(lines, anIdx, lines[anIdx]);
    analytics = valuesAfterLabel(merged, LABELS_ANALYTIC[0], colCount, 'numeric');
  }

  let collector = [];
  const coIdx = lines.findIndex((l) => l.includes(LABELS_COLLECTOR[0]));
  if (coIdx >= 0) {
    const merged = expandAnalyticCollectorLine(lines, coIdx, lines[coIdx]);
    collector = valuesAfterLabel(merged, LABELS_COLLECTOR[0], colCount, 'numeric');
  }

  const ifIdx = findLineIndexForPredicate(lines, lineMatchesInterfaceLabel);
  const interfacesMerged = ifIdx >= 0 ? mergeTotalInterfacesLines(lines, ifIdx) : null;
  const ifLabel = LABELS_INTERFACES.find((lab) => interfacesMerged && interfacesMerged.includes(lab));
  const interfaces =
    interfacesMerged && ifLabel
      ? valuesAfterLabel(interfacesMerged, ifLabel, colCount, 'nx')
      : [];

  const stIdx = findLineIndexForPredicate(lines, lineMatchesStorageLabel);
  const storageMerged = stIdx >= 0 ? mergeStorageCapacityLines(lines, stIdx) : null;
  const stLabel = LABELS_STORAGE.find((lab) => storageMerged && storageMerged.includes(lab));
  const storage =
    storageMerged && stLabel
      ? valuesAfterLabel(storageMerged, stLabel, colCount, 'storage')
      : [];

  return models.map((model, i) => ({
    UNIT: model,
    GB_Logs_Per_Day: logs[i] ?? null,
    Analytics_Rate_Logs_Per_Sec: analytics[i] ?? null,
    Collector_Rate_Logs_Per_Sec: collector[i] ?? null,
    Total_Interfaces: interfaces[i] ?? null,
    Storage_Capacity: storage[i] ?? null,
  }));
}

const FAZ_APPLIANCE_UNIT_RE = /^FAZ-\d{3,4}G$/i;

/**
 * @param {string} text
 * @param {{ appliancesOnly?: boolean }} [options]
 * @returns {Array<Record<string, string|null>>}
 */
export function extractFortiAnalyzerSpecs(text, options = {}) {
  const appliancesOnly = Boolean(options.appliancesOnly);
  let t = normalizeWhitespace(text);
  if (appliancesOnly) {
    t = normalizeWhitespace(stripVirtualFortianalyzerPdfSection(t));
  }
  if (!/FortiAnalyzer/i.test(t)) return [];

  const blocks = splitApplianceBlocks(t);
  const all = [];
  const seenUnit = new Set();

  if (blocks.length) {
    for (const b of blocks) {
      const rows = parseApplianceBlock(b);
      for (const r of rows) {
        if (!r.UNIT || seenUnit.has(r.UNIT)) continue;
        seenUnit.add(r.UNIT);
        all.push(r);
      }
    }
  } else {
    const startIndex = t.split('\n').findIndex((l) => /FortiAnalyzer/i.test(l));
    if (startIndex < 0) return [];
    const lines = t.split('\n').map((l) => l.trim());
    const blockLines = lines.slice(startIndex, startIndex + 800).join('\n');
    const rows = parseApplianceBlock(blockLines);
    for (const r of rows) {
      if (!r.UNIT || seenUnit.has(r.UNIT)) continue;
      seenUnit.add(r.UNIT);
      all.push(r);
    }
  }

  const logsPreview = all.map((r) => r.GB_Logs_Per_Day);
  const analyticsPreview = all.map((r) => r.Analytics_Rate_Logs_Per_Sec);
  const collectorPreview = all.map((r) => r.Collector_Rate_Logs_Per_Sec);
  const parseDebug = {
    modelsDetected: all.map((r) => r.UNIT),
    logs: logsPreview,
    analytics: analyticsPreview,
    collector: collectorPreview,
  };
  logger.info(parseDebug, '[fortianalyzer.extractor] matrix parse');

  if (appliancesOnly) {
    return all.filter((r) => r.UNIT && FAZ_APPLIANCE_UNIT_RE.test(r.UNIT));
  }
  return all;
}

/**
 * @param {Buffer} fileBuffer
 * @param {{ appliancesOnly?: boolean }} [options] - si true, omite FAZ-VM-* (tabla virtual del PDF)
 */
export async function extractFortiAnalyzerSpecsFromPDF(fileBuffer, options = {}) {
  if (!fileBuffer || !Buffer.isBuffer(fileBuffer)) {
    throw new Error('Se requiere un Buffer PDF válido');
  }
  const data = await pdfParse(fileBuffer);
  const rawText = typeof data.text === 'string' ? data.text : '';
  const rows = extractFortiAnalyzerSpecs(rawText, options);
  if (!rows.length) {
    const preview = normalizeWhitespace(rawText).slice(0, 350).replace(/\s+/g, ' ');
    throw new Error(
      'No se detectó matriz FortiAnalyzer (FAZ-* y etiquetas del datasheet). ' +
        (preview ? `Fragmento: ${preview}…` : ''),
    );
  }
  return rows;
}

export async function upsertFortiAnalyzerSpecs(records, options = {}) {
  const { transaction } = options;
  const sequelize = FortianalyzerSpec.sequelize;
  await assertFortianalyzerSpecsSchemaReady();
  const list = Array.isArray(records) ? records : [];
  const out = [];
  for (const rec of list) {
    const unit = normalizeUnit(rec.UNIT);
    if (!unit) continue;
    const payload = { ...rec, UNIT: unit };
    delete payload.id;
    const replacements = rowToBinds(payload);
    await sequelize.query(FORTIANALYZER_SPECS_UPSERT_SQL, {
      replacements,
      transaction,
    });
    logger.info({ action: 'UPSERT_RAW', table: 'fortianalyzer_specs', unit });
    out.push(payload);
  }
  return out;
}

export default {
  extractFortiAnalyzerSpecs,
  extractFortiAnalyzerSpecsFromPDF,
  upsertFortiAnalyzerSpecs,
  FAZ_MODEL_REGEX,
  extractRowValues,
};
