/**
 * Parseo de datasheet FortiSwitch → filas listas para ETL (sin mock; usa fortiswitch.extractor).
 */

import {
  extractFortiSwitchSpecsFromText,
  matrixToBulkRows,
} from './fortiswitch.extractor.js';
import { extractUplink } from './fortiswitchCleaner.service.js';

const DB_KEYS = [
  'unit',
  'total_network_interfaces',
  'poe_ports',
  'poe_power_budget',
  'switching_capacity',
  'pps_64_bytes',
  'mac_address_storage',
  'vlans_supported',
  'lag_group_size',
  'lag_total_groups',
  'power_consumption',
  'power_supply',
  'heat_dissipation',
  'operating_temp',
  'humidity',
  'form_factor',
  'uplink',
];

/**
 * @param {string} fullPdfText — texto plano devuelto por pdf-parse
 * @returns {{ modelsDetected: string[], rows: Array<Record<string, unknown>> }}
 */
export function parseFortiswitchDatasheetText(fullPdfText) {
  if (!fullPdfText || typeof fullPdfText !== 'string') {
    throw new Error('parseFortiswitchDatasheetText: texto vacío');
  }
  console.log('[fortiswitchParser] iniciando matriz FortiSwitch…');
  const { modelsDetected, matrix } = extractFortiSwitchSpecsFromText(fullPdfText);
  const bulk = matrixToBulkRows(matrix, modelsDetected, { filterExpected: false });
  console.log('[fortiswitchParser] modelos=', modelsDetected.length, 'filas matrix=', bulk.length);

  const rows = bulk.map((r) => {
    const out = {};
    for (const k of DB_KEYS) {
      if (k === 'unit') out.unit = r.unit;
      else if (k === 'uplink') out.uplink = extractUplink(r.total_network_interfaces ?? '') || null;
      else out[k] = r[k] ?? undefined;
    }
    return out;
  });

  return { modelsDetected, rows };
}

/**
 * @param {Buffer} buffer — opcional; si se pasa, se usa solo para API simétrica (el caller suele pasar text ya extraído)
 */
export function parseFortiswitchFromExtractedText(text) {
  return parseFortiswitchDatasheetText(text);
}

export default { parseFortiswitchDatasheetText, parseFortiswitchFromExtractedText };
