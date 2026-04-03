/**
 * Parser del Excel oficial de listas de precios Fortinet (.xlsx).
 * Procesa solo hojas objetivo (FortiGate, FortiGate VM, FortiWiFi, etc.);
 * el resto se ignoran. Mapea columnas UNIT, SKU, Description, Price, 1YrContract, etc.
 * Devuelve un array listo para insertar en price_list_staging (sin batch_id).
 */

import XLSX from 'xlsx';

/** Hojas del Excel Fortinet que se procesan; las demás se ignoran. */
const TARGET_SHEETS = Object.freeze([
  'FortiGate',
  'FortiGate VM',
  'FortiWiFi',
  'FortiAnalyzer',
  'FortiManager',
  'FortiSwitch',
  'Wireless Products',
  'FortiMail',
  'FortiWeb',
]);

/** Nombres de columna esperados en el Excel (se buscan sin importar mayúsculas/espacios) */
const COLUMN_ALIASES = Object.freeze({
  unit: ['unit', 'unit #', 'model', 'modelo'],
  sku: ['sku', 'part number', 'part number ', 'número de parte'],
  description: ['description', 'descripción', 'desc', 'product description'],
  price: ['price', 'precio', 'list price', 'list price ', 'pvp'],
  contract_1y: ['1yrcontract', '1yr contract', '1 year', '1y', 'contract 1y', '1 year contract'],
  contract_3y: ['3yrcontract', '3yr contract', '3 year', '3y', 'contract 3y', '3 year contract'],
  contract_5y: ['5yrcontract', '5yr contract', '5 year', '5y', 'contract 5y', '5 year contract'],
});

/**
 * Normaliza el encabezado de columna para matching: minúsculas, sin espacios extra.
 * @param {string} header
 * @returns {string}
 */
function normalizeHeader(header) {
  if (header == null) return '';
  let s = String(header);
  // Remueve artefactos típicos de Excel (saltos de línea/strings codificados)
  s = s.replace(/\u000d/g, ' ');
  s = s.replace(/_x000d_/gi, ' ');
  s = s.replace(/_x000d/gi, ' ');
  // Remueve el texto "replace dd by XX" que aparece dentro del encabezado
  s = s.replace(/\(replace\s+dd\s+by\s+\d+\)/gi, ' ');
  return s.toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * Encuentra el índice de la primera columna cuyo encabezado coincide con alguno de los alias.
 * @param {string[]} headers - Array de encabezados normalizados
 * @param {string[]} aliases - Posibles nombres (ya en minúsculas)
 * @returns {number} - Índice o -1
 */
function findColumnIndex(headers, aliases) {
  for (let i = 0; i < headers.length; i++) {
    const h = normalizeHeader(headers[i]);
    if (!h) continue;
    for (const alias of aliases) {
      if (h === alias || h.replace(/\s/g, '') === alias.replace(/\s/g, '')) return i;
    }
  }
  return -1;
}

/**
 * Construye el mapa de índices de columna a partir de la primera fila.
 * @param {any[][]} rows - Filas del sheet (primera fila = encabezados)
 * @returns {Record<string, number>} - { unit: 0, sku: 1, ... } o -1 si no se encuentra
 */
function buildColumnMap(rows) {
  if (!rows || rows.length === 0) return {};
  const headerRow = rows[0].map((c) => (c != null ? String(c) : ''));
  return {
    unit: findColumnIndex(headerRow, COLUMN_ALIASES.unit),
    sku: findColumnIndex(headerRow, COLUMN_ALIASES.sku),
    description: findColumnIndex(headerRow, COLUMN_ALIASES.description),
    price: findColumnIndex(headerRow, COLUMN_ALIASES.price),
    contract_1y: findColumnIndex(headerRow, COLUMN_ALIASES.contract_1y),
    contract_3y: findColumnIndex(headerRow, COLUMN_ALIASES.contract_3y),
    contract_5y: findColumnIndex(headerRow, COLUMN_ALIASES.contract_5y),
  };
}

/**
 * Toma el valor de una celda y lo devuelve como string limpio o null si vacío.
 * @param {any} cell
 * @param {number} maxLength - Longitud máxima (opcional)
 * @returns {string|null}
 */
function cleanCell(cell, maxLength = 0) {
  if (cell == null) return null;
  if (typeof cell === 'number' && !Number.isNaN(cell)) return String(cell);
  const s = String(cell).trim();
  if (s === '') return null;
  if (maxLength > 0 && s.length > maxLength) return s.slice(0, maxLength);
  return s;
}

function isRowCompletelyEmpty(rowCells) {
  if (!Array.isArray(rowCells)) return true;
  return rowCells.every((c) => c == null || String(c).trim() === '');
}

function looksLikeExplainingTitleRowWithoutSku(rowCells, colMap) {
  // Heurística conservadora:
  // - Si no hay SKU, y la fila tiene poca información "de producto" y/o coincide con keywords de notas/títulos,
  //   consideramos que terminó el bloque.
  if (!Array.isArray(rowCells)) return true;

  const nonEmpty = rowCells.reduce((acc, c) => {
    const t = c == null ? '' : String(c).trim();
    return acc + (t ? 1 : 0);
  }, 0);

  const desc = colMap?.description >= 0 ? cleanCell(rowCells[colMap.description], 200) : null;
  const price = colMap?.price >= 0 ? cleanCell(rowCells[colMap.price], 50) : null;

  if (nonEmpty <= 2 && desc == null && price == null) return true;
  if (price == null && desc != null) {
    const d = desc.toLowerCase();
    const hasSectionKeyword = /\b(forti|wireless|products|mail|web|manager|switch|analyzer|gate|note|warranty|terms|pricing)\b/.test(d);
    const hasDigits = /\d/.test(d);
    // Si parece "título de sección" sin dígitos/códigos típicos, terminamos el bloque.
    if (hasSectionKeyword && !hasDigits && d.length < 140) return true;
  }
  return false;
}

/**
 * Parsea una hoja ya convertida a filas y devuelve array de objetos para staging.
 * Soporta múltiples bloques por hoja: cabeceras repetidas dentro de la misma hoja.
 *
 * @param {any[][]} rows - Filas del sheet (header puede repetirse)
 * @param {string} sheetName - Nombre de la hoja (se devuelve en cada fila útil)
 * @returns {Array<{ unit, sku, description, price, contract_1y, contract_3y, contract_5y, row_index, sheet_name }>}
 */
function parseSheetRows(rows, sheetName) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return { extractedRows: [], blocksDetected: 0, usefulRows: 0 };
  }

  const maxUnit = 250;
  const maxSku = 250;
  const maxPrice = 50;

  const result = [];
  const requiredKeys = ['unit', 'sku', 'description', 'price'];

  let inBlock = false;
  let columnMap = null;
  let blocksDetected = 0;

  const isValidHeaderMap = (map) => requiredKeys.every((k) => map?.[k] != null && map[k] >= 0);

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!Array.isArray(row)) continue;

    // 1) Detect header row válida dentro de la hoja (cabeceras repetidas)
    if (!inBlock) {
      const headerMap = buildColumnMap([row]);
      if (isValidHeaderMap(headerMap)) {
        inBlock = true;
        columnMap = headerMap;
        blocksDetected += 1;
      }
      continue;
    }

    // 2) End block: fila completamente vacía
    if (isRowCompletelyEmpty(row)) {
      inBlock = false;
      columnMap = null;
      continue;
    }

    // 3) End/start block: nueva cabecera detectada
    const candidateHeaderMap = buildColumnMap([row]);
    if (isValidHeaderMap(candidateHeaderMap)) {
      columnMap = candidateHeaderMap;
      blocksDetected += 1;
      continue; // cabecera no se agrega como fila de datos
    }

    // 4) Data rows: ignorar filas sin SKU real
    const sku = cleanCell(
      columnMap?.sku >= 0 ? row[columnMap.sku] : null,
      maxSku
    );

    if (sku == null) {
      // Si parece un título/nota sin SKU, terminamos el bloque (para no “derivar” a secciones)
      const colMapCompat = {
        description: columnMap?.description ?? -1,
        price: columnMap?.price ?? -1,
      };
      if (looksLikeExplainingTitleRowWithoutSku(row, colMapCompat)) {
        inBlock = false;
        columnMap = null;
      }
      continue;
    }

    // Defensa: si la fila parece repetir encabezado como texto (por ejemplo “SKU”), ignoramos.
    const skuNorm = sku.toLowerCase().replace(/\s+/g, ' ').trim();
    if (
      skuNorm === 'sku' ||
      skuNorm.includes('part number') ||
      skuNorm.includes('número de parte') ||
      skuNorm.includes('numero de parte')
    ) {
      continue;
    }

    const unit = cleanCell(columnMap?.unit >= 0 ? row[columnMap.unit] : null, maxUnit);
    const description = cleanCell(columnMap?.description >= 0 ? row[columnMap.description] : null);
    const price = cleanCell(columnMap?.price >= 0 ? row[columnMap.price] : null, maxPrice);
    const contract_1y = cleanCell(columnMap?.contract_1y >= 0 ? row[columnMap.contract_1y] : null, maxPrice);
    const contract_3y = cleanCell(columnMap?.contract_3y >= 0 ? row[columnMap.contract_3y] : null, maxPrice);
    const contract_5y = cleanCell(columnMap?.contract_5y >= 0 ? row[columnMap.contract_5y] : null, maxPrice);

    result.push({
      unit,
      sku,
      description,
      price,
      contract_1y,
      contract_3y,
      contract_5y,
      row_index: i + 1, // fila real dentro de la hoja (1-based)
      sheet_name: sheetName,
    });
  }

  return {
    extractedRows: result,
    blocksDetected,
    usefulRows: result.length,
  };
}

/**
 * Parsea el Excel (buffer o ruta) y devuelve filas listas para staging.
 * Solo procesa hojas objetivo (FortiGate, FortiGate VM, FortiWiFi, etc.); las demás se ignoran.
 * La primera fila de cada hoja se considera encabezado; el resto son datos.
 *
 * @param {Buffer|string} input - Buffer del archivo .xlsx o ruta al archivo
 * @param {object} options - { debugSummary: {} } para recibir resumen de depuración
 * @returns {Promise<Array<{ unit, sku, description, price, contract_1y, contract_3y, contract_5y, row_index }>>}
 */
export async function parsePriceListExcel(input, options = {}) {
  const { debugSummary } = options;

  const workbook = input instanceof Buffer
    ? XLSX.read(input, { type: 'buffer', cellDates: false })
    : XLSX.readFile(input, { cellDates: false });

  const sheetNames = workbook.SheetNames || [];
  if (sheetNames.length === 0) {
    throw new Error('El archivo Excel no contiene hojas');
  }

  const normSheet = (s) => (s == null ? '' : String(s).trim().toLowerCase().replace(/\s+/g, ' '));

  const normalizedToCanonical = new Map();
  for (const t of TARGET_SHEETS) normalizedToCanonical.set(normSheet(t), t);

  const sheetNameByCanonical = new Map();
  for (const sn of sheetNames) {
    const canonical = normalizedToCanonical.get(normSheet(sn));
    if (canonical) sheetNameByCanonical.set(canonical, sn);
  }

  const sheetsFound = TARGET_SHEETS.filter((t) => sheetNameByCanonical.has(t));
  const sheetsNotFound = TARGET_SHEETS.filter((t) => !sheetNameByCanonical.has(t));

  const result = [];

  if (debugSummary && typeof debugSummary === 'object') {
    debugSummary.hojasProcesadas = [...sheetsFound];
    debugSummary.hojasNoEncontradas = [...sheetsNotFound];
    debugSummary.bloquesDetectadosPorHoja = {};
    debugSummary.filasUtilesExtraidasPorHoja = {};
    debugSummary.totalFinal = 0;
  }

  for (const canonicalSheetName of sheetsFound) {
    const workbookSheetName = sheetNameByCanonical.get(canonicalSheetName);
    const sheet = workbook.Sheets[workbookSheetName];
    if (!sheet) continue;

    const rows = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      raw: false,
      defval: null,
    });

    const parsed = parseSheetRows(rows, canonicalSheetName);
    if (parsed?.extractedRows?.length) result.push(...parsed.extractedRows);

    if (debugSummary && typeof debugSummary === 'object') {
      debugSummary.bloquesDetectadosPorHoja[canonicalSheetName] = parsed.blocksDetected ?? 0;
      debugSummary.filasUtilesExtraidasPorHoja[canonicalSheetName] = parsed.usefulRows ?? 0;
    }
  }

  if (debugSummary && typeof debugSummary === 'object') {
    debugSummary.totalFinal = result.length;
  }

  // Solo lanzar error si después de procesar las hojas objetivo no se extrajo ninguna fila útil.
  if (result.length === 0) {
    throw new Error(
      `No se extrajeron filas útiles a partir de las hojas objetivo. ` +
      `Hojas esperadas: ${TARGET_SHEETS.join(', ')}. ` +
      `Hojas presentes: ${sheetNames.join(', ') || '(ninguna)'}`
    );
  }

  return result;
}

export default {
  parsePriceListExcel,
};
