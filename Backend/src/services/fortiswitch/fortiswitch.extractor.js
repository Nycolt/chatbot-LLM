/**
 * Extracción de la matriz "System Specifications" + "Hardware Specifications"
 * desde datasheet FortiSwitch (pdf-parse).
 *
 * Ventana: tras "Specifications" hasta "Ordering Information".
 * Sub-bloque: desde la primera de Hardware/System Specifications hasta antes de Certification/Warranty.
 * La cabecera "FORTISWITCH …" suele estar bajo Hardware; antes solo se leía System → matriz vacía.
 */

import { createRequire } from 'module';
import { logger } from '../../config/logger.js';
import ProductModel from '../../models/ProductModel.model.js';
import DatasheetModelMap from '../../models/DatasheetModelMap.model.js';
import { FortiswitchSpec } from '../../models/SolutionSpecs.models.js';
import normalizeUnit from '../../utils/normalizeUnit.js';
import { EXTRACTOR_VERSION } from '../datasheetPdf/pdfConstants.js';

const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

/** Unidades esperadas en catálogo (filtrado opcional tras parseo). */
export const EXPECTED_FS_UNITS = new Set([
  'FS-1024E',
  'FS-T1024E',
  'FS-T1024F-FPOE',
  'FS-1048E',
  'FS-1048G',
  'FS-2048F',
  'FS-2048F-B2F',
  'FS-3032G',
]);

/** Texto típico datasheet FortiSwitch para fila MAC (varía entre PDFs / revisiones / idioma layout). */
export const MAC_ADDRESS_ROW_RE =
  /\bmac\s+address\s+(?:storage|table(?:\s+size)?|entries)\b|\bmac\s+table(?:\s+size)?\b|\bnumber\s+of\s+mac\s+addresses\b|\btotal\s+mac\s+addresses\b|\bmaximum\s+mac\s+addresses\b|\bmac\s+learning\b|\b(?:layer\s*)?2\s+forwarding\b|\bl2\s+forwarding\b|\bforwarding\s+table\b|\bbridge\s+table\b/i;

/** Orden de filas del PDF → columna SQL (cada regex debe coincidir con la celda de etiqueta completa, con \s*$). */
export const ROW_FIELD_RULES = [
  { col: 'total_network_interfaces', re: /^total\s+network\s+interfaces:?\s*$/i },
  {
    col: 'poe_ports',
    re: /^(?:power\s+over\s+ethernet(?:\s*\([^)]*\))?.*\b(?:poe|PoE)\s+.*\bports?\b|poe\s+ports)\s*$/i,
  },
  { col: 'poe_power_budget', re: /^poe\s+power\s+budget\s*$/i },
  {
    col: 'switching_capacity',
    re: /^switching\s+capacity(?:\s*\([^)]+\))?\s*$/i,
  },
  {
    col: 'pps_64_bytes',
    re: /^packets\s+per\s+second(?:\s*\([^)]+\))?\s+64\s*bytes\s*$/i,
  },
  {
    col: 'mac_address_storage',
    re:
      /^(?:mac\s+address\s+(?:storage|table(?:\s+size)?|entries)|mac\s+table(?:\s+size)?|number\s+of\s+mac\s+addresses|total\s+mac\s+addresses|maximum\s+mac\s+addresses|mac\s+learning|(?:layer\s*)?2\s+forwarding|l2\s+forwarding|forwarding\s+table|bridge\s+table)\s*$/i,
  },
  { col: 'vlans_supported', re: /^vlans?\s+supported\s*$/i },
  { col: 'lag_group_size', re: /^link\s+aggregation\s+group\s+size\s*$/i },
  { col: 'lag_total_groups', re: /^total\s+link\s+aggregation\s+groups\s*$/i },
  {
    col: 'power_consumption',
    re: /^power\s+consumption(?:\s*\([^)]+\))?\s*$/i,
  },
  { col: 'power_supply', re: /^power\s+supply\s*$/i },
  { col: 'heat_dissipation', re: /^heat\s+dissipation\s*$/i },
  { col: 'operating_temp', re: /^operating\s+temperature\s*$/i },
  { col: 'humidity', re: /^humidity\s*$/i },
  { col: 'form_factor', re: /^form\s+factor\s*$/i },
  { col: 'uplink', re: /^uplink\s*$/i },
];

export function normalizePdfText(raw) {
  return String(raw || '')
    .replace(/\r/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/\u00ad/g, '')
    .replace(/\t/g, '  ')
    .replace(/macaddress(es)?\b/gi, 'mac address$1');
}

export function toFortiSwitchUnitKey(rawModelSuffix) {
  let s = String(rawModelSuffix || '').trim();
  if (!s) return null;
  s = s.replace(/^FortiSwitch[-\s]*/i, '').replace(/^FSW[-\s]*/i, '').trim();
  s = s.toUpperCase().replace(/\s+/g, '');
  if (!s) return null;
  return s.startsWith('FS-') ? s : `FS-${s}`;
}

function specificationsSliceHasMatrixHints(s) {
  return /\bswitching\s+capacity\b/i.test(s) && MAC_ADDRESS_ROW_RE.test(s);
}

/**
 * Recorta la zona de especificaciones. El primer "Ordering Information" en el stream de
 * pdf-parse a veces aparece *antes* que la tabla completa → se pierde la fila MAC; por eso
 * se amplía la ventana si faltan pistas de la matriz.
 */
export function clipSpecificationsWindow(text) {
  const t = normalizePdfText(text);
  let iSpec = t.search(/\bSpecifications\b/i);
  if (iSpec < 0) {
    iSpec = t.search(/\bTechnical\s+Specifications\b/i);
  }
  if (iSpec < 0) {
    throw new Error('No se encontró la sección "Specifications" en el PDF.');
  }

  const iOrder = t.search(/\bOrdering Information\b/i);
  let inner = iOrder > iSpec ? t.slice(iSpec, iOrder) : t.slice(iSpec);

  if (!specificationsSliceHasMatrixHints(inner)) {
    inner = t.slice(iSpec);
  }
  if (!specificationsSliceHasMatrixHints(inner)) {
    const iSys = t.search(/\bSystem\s+Specifications\b/i);
    if (iSys >= 0) {
      inner = t.slice(iSys);
    }
  }

  if (!/\bswitching\s+capacity\b/i.test(inner)) {
    throw new Error(
      'Validación: no aparece "Switching Capacity" en la ventana Specifications — revisa el archivo.',
    );
  }
  if (!MAC_ADDRESS_ROW_RE.test(inner)) {
    throw new Error(
      'Validación: no aparece una fila MAC reconocible cerca de la matriz (p. ej. "MAC Address Table", "Forwarding table"). Si el datasheet es solo imagen o escaneado, pdf-parse no verá el texto — use un PDF con capa de texto o pegue un extracto de la fila MAC para ajustar el parser.',
    );
  }
  return inner;
}

/**
 * Tabla de especificaciones: hardware + system + dimensiones + environment (filas tabuladas);
 * corta antes de certificación/garantía para no mezclar texto corrido.
 */
export function clipSystemAndHardwareBlock(inner) {
  const iHw = inner.search(/\bHardware\s+Specifications\b/i);
  const iSys = inner.search(/\bSystem\s+Specifications\b/i);
  if (iHw < 0 && iSys < 0) {
    throw new Error(
      'No se encontró "Hardware Specifications" ni "System Specifications" dentro de Specifications.',
    );
  }
  const from = iHw >= 0 && iSys >= 0 ? Math.min(iHw, iSys) : iHw >= 0 ? iHw : iSys;
  const tail = inner.slice(from);

  const stopRe =
    /\n\s*(?:Certification\s+and\s+Compliance|Warranty(?:\s+Information)?|Compliance\s+and\s+Safety|Ordering\s+Information|Motorized\s+Pin\s+Issue)\b/im;
  const cut = tail.search(stopRe);
  const block = cut >= 0 ? tail.slice(0, cut) : tail;

  return block;
}

function dedupeModelsInOrder(models) {
  const seen = new Set();
  const out = [];
  for (const u of models) {
    const k = String(u || '')
      .trim()
      .toUpperCase()
      .replace(/\s+/g, '');
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(k);
  }
  return out;
}

/**
 * Modelos pegados: "FS-T1024F-FPOEFS-1024E" — cortar antes del siguiente "FS-" o "|".
 */
export function tokenizeGluedFsUnits(text) {
  const s = String(text || '');
  const re =
    /FS-(?:T[0-9]{3,}[A-Z](?:-[A-Z][A-Z0-9]*)*|[0-9]{3,}[A-Z](?:-[A-Z][A-Z0-9]*)*)(?=FS-|\||\s|$)/gi;
  const ordered = [];
  const seen = new Set();
  let m;
  while ((m = re.exec(s)) !== null) {
    const u = (normalizeUnit(m[0]) || m[0]).replace(/\s/g, '').toUpperCase();
    if (!/^FS-/i.test(u) || seen.has(u)) continue;
    seen.add(u);
    ordered.push(u);
  }
  return ordered;
}

/** "FORTISWITCH 1048EFORTISWITCH 1048G" (sin espacio entre celdas). */
function parseGluedFortiswitchBrandLine(line) {
  const raw = String(line || '');
  if (!/FORTISWITCH/i.test(raw)) return [];
  const segments = raw.split(/(?=FORTISWITCH)/i).filter((p) => /FORTISWITCH/i.test(p));
  const models = [];
  for (const seg of segments) {
    const m = seg.match(/FORTISWITCH\s*[-:]?\s*([A-Z0-9-]{2,})/i);
    if (m) {
      const key = toFortiSwitchUnitKey(m[1]);
      if (key) models.push(key);
    }
  }
  return dedupeModelsInOrder(models);
}

/**
 * Catálogo ordenado desde líneas "Features" con FS-* pegados (FortiSwitch Data Center Series).
 */
export function extractFsCatalogOrderedFromInner(inner) {
  const full = String(inner || '');
  const lines = full.split(/\n/).map((l) => l.trim());
  const merged = [];

  const absorb = (chunk) => {
    if (!chunk || !/FS-/i.test(chunk)) return;
    for (const t of tokenizeGluedFsUnits(chunk)) {
      if (!merged.includes(t)) merged.push(t);
    }
  };

  for (let i = 0; i < lines.length; i++) {
    if (!/^features$/i.test(lines[i])) continue;
    absorb(lines[i + 1]);
    absorb(lines[i + 2]);
  }

  for (const line of lines) {
    if (/^features$/i.test(line)) continue;
    if (/FS-.*FS-/i.test(line) && /\|/.test(line)) absorb(line);
  }

  return merged;
}

/**
 * Cabecera de columna: "FORTISWITCH 1024E …", "FortiSwitch-1024E", "FS-1024E FS-T1024E …", etc.
 */
export function parseModelHeaderLine(line) {
  const raw = String(line || '');

  const gluedBrand = parseGluedFortiswitchBrandLine(raw);
  if (gluedBrand.length >= 1) {
    return gluedBrand;
  }

  const found = [];

  const prefixPatterns = [
    /Forti\s*Switch\s*[-:]?\s*([A-Z0-9-]{2,})/gi,
    /FORTISWITCH\s*[-:]?\s*([A-Z0-9-]{2,})/gi,
    /FORTISWITCH([0-9T][A-Z0-9-]{1,})/gi,
  ];

  for (const re of prefixPatterns) {
    let m;
    re.lastIndex = 0;
    while ((m = re.exec(raw)) !== null) {
      const key = toFortiSwitchUnitKey(m[1]);
      if (key) found.push(key);
    }
  }

  if (found.length >= 1) {
    return dedupeModelsInOrder(found);
  }

  const fsToks = tokenizeGluedFsUnits(raw);
  if (fsToks.length >= 1) {
    return dedupeModelsInOrder(fsToks);
  }

  return [];
}

/** Fila siguiente a varias celdas "FORTISWITCH" solo con códigos 1024E, T1024E, … */
function parseModelsFromSuffixLine(line) {
  const raw = String(line || '').trim();
  if (!raw) return [];
  const wide = raw.split(/\s{2,}/).map((s) => s.trim()).filter(Boolean);
  const tokens = wide.length >= 2 ? wide : raw.split(/\s+/).filter(Boolean);
  const models = [];
  for (const t of tokens) {
    const key = toFortiSwitchUnitKey(t.replace(/[,;]+$/, ''));
    if (key) models.push(key);
  }
  return dedupeModelsInOrder(models);
}

export function cleanCell(v) {
  if (v == null) return null;
  let s = String(v).replace(/\u2013|\u2014/g, '-').trim().replace(/\s+/g, ' ');
  if (!s || /^[—–\-n\/a]+$/i.test(s)) return null;
  return s;
}

function matchRowField(labelRaw) {
  const label = String(labelRaw || '').trim();
  if (!label) return null;
  for (const { col, re } of ROW_FIELD_RULES) {
    if (re.test(label)) return col;
  }
  return null;
}

/** Prefijo de etiqueta más largo (evita que PPS/tráfico absorban toda la línea al ir de largo a corto). */
function longestMatrixLabelPrefix(trimmed) {
  let best = null;
  for (let len = 1; len <= trimmed.length; len++) {
    const prefix = trimmed.slice(0, len).trimEnd();
    if (!prefix) continue;
    if (matchRowField(prefix)) best = prefix;
  }
  return best;
}

function inferNumColumnsFromSwitchingLine(line) {
  const trimmed = String(line || '').trim();
  const label = longestMatrixLabelPrefix(trimmed);
  if (!label || !/switching\s+capacity/i.test(label)) return 0;
  const rest = trimmed.slice(label.length).trim();
  const gbps = rest.match(/\d+(?:\.\d+)?\s*Gbps/gi);
  return gbps ? gbps.length : 0;
}

function parseValueCellsFromRest(rest, numModels) {
  const r = String(rest || '').trim();
  const gbps = r.match(/\d+(?:\.\d+)?\s*Gbps/gi);
  if (gbps && gbps.length >= numModels) {
    return gbps.slice(0, numModels);
  }
  const mpps = r.match(/\d+(?:\.\d+)?\s*Mpps/gi);
  if (mpps && mpps.length >= numModels) {
    return mpps.slice(0, numModels);
  }
  const watts = [];
  const wre = /\d+(?:\.\d+)?\s*W|\d+W/gi;
  let wm;
  while ((wm = wre.exec(r)) !== null) {
    watts.push(wm[0].replace(/\s+/g, ' ').trim());
  }
  if (watts.length >= numModels) {
    return watts.slice(0, numModels);
  }
  const kvals = r.match(/\d+\s*K/gi);
  if (kvals && kvals.length >= numModels) {
    return kvals.slice(0, numModels);
  }

  let values = r.split(/\s{2,}/).map((s) => s.trim()).filter(Boolean);
  if (values.length < numModels) {
    values = r.split(/\t/).map((s) => s.trim()).filter(Boolean);
  }
  if (values.length < numModels) {
    const words = r.split(/\s+/).filter(Boolean);
    if (words.length >= numModels && words.length % numModels === 0) {
      const k = words.length / numModels;
      values = [];
      for (let i = 0; i < numModels; i++) {
        values.push(words.slice(i * k, (i + 1) * k).join(' '));
      }
    }
  }
  return values.length >= numModels ? values.slice(0, numModels) : null;
}

/**
 * Separa etiqueta de fila + N valores de modelo. pdf-parse a veces solo deja un espacio entre celdas.
 */
function splitMatrixLineParts(line, numModels) {
  const cols = line.split(/\s{2,}/).map((c) => c.trim()).filter(Boolean);
  if (cols.length >= numModels + 1) {
    return { label: cols[0], values: cols.slice(1, 1 + numModels) };
  }

  const tabCols = line.split(/\t/).map((c) => c.trim()).filter(Boolean);
  if (tabCols.length >= numModels + 1) {
    return { label: tabCols[0], values: tabCols.slice(1, 1 + numModels) };
  }

  const trimmed = line.trim();
  const label = longestMatrixLabelPrefix(trimmed);
  if (!label) return null;
  const rest = trimmed.slice(label.length).trim();
  if (!rest) return null;
  const values = parseValueCellsFromRest(rest, numModels);
  if (!values) return null;
  return { label, values };
}

/**
 * @param {string} block — texto Hardware + System + Environment (tabla comparativa)
 * @param {string} [innerHint] — mismo `inner` que clipSpecificationsWindow; catálogo FS-* desde Features si la tabla no trae cabecera
 */
export function parseFortiSwitchMatrix(block, innerHint = '') {
  const lines = block
    .split(/\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  let models = null;
  let headerLineIndex = -1;

  const stackedBrandOnly = (line) => {
    const s = String(line || '').trim();
    return (
      /^(?:FORTISWITCH|Forti\s*Switch)(\s+(?:FORTISWITCH|Forti\s*Switch))+\s*$/i.test(s) ||
      /^(?:FORTISWITCH|Forti\s*Switch)\s*$/i.test(s)
    );
  };

  const tryFindHeader = (minModels) => {
    for (let i = 0; i < lines.length; i++) {
      if (stackedBrandOnly(lines[i]) && i + 1 < lines.length) {
        const stacked = parseModelsFromSuffixLine(lines[i + 1]);
        if (stacked.length >= minModels) {
          return { models: stacked, headerLineIndex: i };
        }
      }
      let candidate = parseModelHeaderLine(lines[i]);
      if (candidate.length < minModels && i + 1 < lines.length) {
        candidate = parseModelHeaderLine(`${lines[i]} ${lines[i + 1]}`);
      }
      if (candidate.length >= minModels) {
        return { models: candidate, headerLineIndex: i };
      }
    }
    return null;
  };

  const two = tryFindHeader(2);
  const one = two || tryFindHeader(1);
  if (one) {
    models = one.models;
    headerLineIndex = one.headerLineIndex;
  }

  if (!models || models.length === 0) {
    const catalog = extractFsCatalogOrderedFromInner(innerHint);
    const hwIdx = lines.findIndex((l) => /^hardware\s+specifications\b/i.test(l));
    const searchFrom = hwIdx >= 0 ? hwIdx : 0;
    let numCols = 0;
    for (let j = searchFrom; j < lines.length; j++) {
      if (/switching\s+capacity/i.test(lines[j])) {
        numCols = inferNumColumnsFromSwitchingLine(lines[j]);
        if (numCols >= 1) break;
      }
    }
    if (catalog.length >= numCols && numCols >= 1) {
      models = catalog.slice(0, numCols);
      headerLineIndex = searchFrom;
    }
  }

  if (!models || models.length === 0) {
    throw new Error(
      'No se detectó la fila de cabecera con modelos FortiSwitch (FORTISWITCH …, FortiSwitch …, FS-… pegados) ni catálogo Features + fila Switching Capacity. Compruebe texto seleccionable en el PDF.',
    );
  }

  const matrix = {};
  for (const u of models) matrix[u] = {};

  for (let i = headerLineIndex + 1; i < lines.length; i++) {
    const line = lines[i];
    const hdrAgain = parseModelHeaderLine(line);
    if (hdrAgain.length >= 2) {
      const sameAll =
        hdrAgain.length === models.length && hdrAgain.every((u, j) => u === models[j]);
      if (sameAll) continue;
      break;
    }
    if (/^(hardware|system|dimensions|environment)\s+specifications?\b/i.test(line)) continue;
    if (/^(dimensions|environment)\b$/i.test(line)) continue;

    const parts = splitMatrixLineParts(line, models.length);
    if (!parts) continue;

    const field = matchRowField(parts.label);
    if (!field) continue;

    models.forEach((unit, idx) => {
      const v = cleanCell(parts.values[idx]);
      if (v != null) matrix[unit][field] = v;
    });
  }

  return { modelsDetected: models, matrix };
}

/**
 * @param {string} fullPdfText — pdf-parse `.text`
 */
export function extractFortiSwitchSpecsFromText(fullPdfText) {
  const inner = clipSpecificationsWindow(fullPdfText);
  const block = clipSystemAndHardwareBlock(inner);
  return parseFortiSwitchMatrix(block, inner);
}

/**
 * Filtra a las unidades esperadas y construye filas para Sequelize (solo columnas con valor).
 */
export function matrixToBulkRows(matrix, modelsDetected, { filterExpected = true } = {}) {
  const rows = [];
  const allow = filterExpected ? EXPECTED_FS_UNITS : null;

  for (const unit of modelsDetected) {
    if (allow && !allow.has(unit)) continue;
    const cells = matrix[unit] || {};
    const row = { unit };
    for (const [k, v] of Object.entries(cells)) {
      if (v != null && String(v).trim() !== '') row[k] = String(v).trim();
    }
    rows.push(row);
  }
  return rows;
}

const FORTISWITCH_SPEC_TRUNC = {
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
 * @param {Record<string, unknown>} rec — fila de matrixToBulkRows (`unit` + campos specs)
 */
export function fortiswitchRecordToSpecAttrs(rec) {
  const skip = new Set(['unit', 'product_model_id', 'id', 'created_at', 'updated_at']);
  const out = {};
  for (const [k, v] of Object.entries(rec || {})) {
    if (skip.has(k)) continue;
    if (v == null) continue;
    const s = String(v).trim();
    if (!s) continue;
    const max = FORTISWITCH_SPEC_TRUNC[k];
    out[k] = max ? s.slice(0, max) : s.slice(0, 255);
  }
  return out;
}

/**
 * @param {Buffer} buffer
 * @param {{ filterExpected?: boolean }} [options]
 */
export async function extractFortiSwitchSpecRecordsFromPDF(buffer, { filterExpected = false } = {}) {
  const doc = await pdfParse(buffer);
  const { modelsDetected, matrix } = extractFortiSwitchSpecsFromText(doc.text);
  return matrixToBulkRows(matrix, modelsDetected, { filterExpected });
}

/**
 * @param {object} params
 * @param {import('sequelize').Model} params.solution — fila `solutions` (FortiSwitch)
 * @param {number|null} [params.sourceId]
 * @param {string|null} [params.family]
 * @param {Array<Record<string, unknown>>} params.records
 * @param {import('sequelize').Transaction} params.transaction
 */
export async function linkFortiSwitchRecordsToCatalog({
  solution,
  sourceId = null,
  family,
  records,
  transaction,
}) {
  const results = [];
  for (const rec of records || []) {
    const unit = normalizeUnit(rec.unit);
    if (!unit) continue;

    const [pm, created] = await ProductModel.findOrCreate({
      where: { solution_id: solution.id, unit },
      defaults: {
        solution_id: solution.id,
        solution_type: 'fortiswitch',
        unit,
        sku_base: null,
        model_name: unit,
        family_name: family || 'FortiSwitch',
        deployment_type: 'appliance',
        has_datasheet: true,
        source_origin: 'pdf',
        technical_completeness_status: 'verified',
        is_active: 1,
      },
      transaction,
    });

    await pm.update({ has_datasheet: true }, { transaction });

    const specAttrs = fortiswitchRecordToSpecAttrs(rec);
    const [specRow, specCreated] = await FortiswitchSpec.findOrCreate({
      where: { unit },
      defaults: {
        unit,
        product_model_id: pm.id,
        ...specAttrs,
      },
      transaction,
    });

    if (!specCreated) {
      const updates = { product_model_id: pm.id };
      for (const [k, v] of Object.entries(specAttrs)) {
        if (v == null || String(v).trim() === '') continue;
        const cur = specRow.get(k);
        if (cur == null || String(cur).trim() === '') updates[k] = v;
      }
      if (Object.keys(updates).length > 0) {
        await specRow.update(updates, { transaction });
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
          '[fortiswitch] datasheet_model_map omitido source=%s unit=%s: %s',
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
