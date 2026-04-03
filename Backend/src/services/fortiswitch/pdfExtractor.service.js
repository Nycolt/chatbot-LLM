/**
 * Extracción de texto desde buffers PDF (pdf-parse).
 */

import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

/**
 * @param {Buffer} buffer
 * @returns {Promise<{ text: string, numpages: number, info?: object }>}
 */
export async function extractPdfText(buffer) {
  if (!buffer || !Buffer.isBuffer(buffer)) {
    throw new Error('extractPdfText: se requiere Buffer PDF');
  }
  console.log('[pdfExtractor] parseando PDF, bytes=', buffer.length);
  const doc = await pdfParse(buffer);
  const text = typeof doc.text === 'string' ? doc.text : '';
  console.log('[pdfExtractor] páginas=', doc.numpages, 'chars=', text.length);
  return {
    text,
    numpages: doc.numpages ?? 0,
    info: doc.info,
  };
}

export default { extractPdfText };
