/**
 * Detección heurística del tipo de datasheet Fortinet a partir del texto del PDF.
 * Usa el texto completo del parse (sin recorte a "Specifications") para no perder cabeceras.
 */

import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

/** @typedef {'fortimanager' | 'fortigate' | 'fortianalyzer' | 'unknown'} PdfDatasheetDetectedType */

/**
 * @param {string} text
 * @returns {PdfDatasheetDetectedType}
 */
export function detectPdfDatasheetTypeFromText(text) {
  const u = String(text || '').toUpperCase();

  if (u.includes('FORTIMANAGER APPLIANCES')) return 'fortimanager';
  if (u.includes('FIREWALL THROUGHPUT')) return 'fortigate';
  if (u.includes('LOG RATE')) return 'fortianalyzer';

  return 'unknown';
}

/**
 * @param {Buffer} buffer
 * @returns {Promise<{ type: PdfDatasheetDetectedType; text: string; numpages: number }>}
 */
export async function detectPdfDatasheetTypeFromBuffer(buffer) {
  if (!buffer || !Buffer.isBuffer(buffer)) {
    throw new Error('Se requiere un Buffer PDF válido');
  }
  const data = await pdfParse(buffer);
  const text = typeof data.text === 'string' ? data.text : '';
  const type = detectPdfDatasheetTypeFromText(text);
  return {
    type,
    text,
    numpages: data.numpages ?? 0,
  };
}
