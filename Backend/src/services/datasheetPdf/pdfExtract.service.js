/**
 * Extracción de texto desde buffer PDF.
 * Tras parsear, el texto se recorta desde la sección "Specifications" para no procesar
 * marketing/legal/portada en ingest de datasheets (Fortinet y similares).
 */

import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

/**
 * Anclas típicas de inicio de tabla de especificaciones en PDFs Fortinet / datasheets.
 * Se usa la primera coincidencia más temprana en el documento.
 */
const SPEC_SECTION_ANCHORS = [
  /\bTechnical\s+Specifications\b/i,
  /\bProduct\s+Specifications\b/i,
  /\bSpecifications\b/i,
];

/**
 * Devuelve el texto desde la primera aparición de una ancla de especificaciones.
 * Si no hay coincidencia, devuelve el texto completo (compatibilidad con PDFs no estándar).
 *
 * @param {string} rawText
 * @returns {{ text: string, specs_anchor_found: boolean, specs_anchor_offset: number }}
 */
export function sliceTextFromSpecificationsSection(rawText) {
  const full = typeof rawText === 'string' ? rawText : '';
  if (!full.length) {
    return { text: '', specs_anchor_found: false, specs_anchor_offset: 0 };
  }

  let bestIdx = -1;
  for (const re of SPEC_SECTION_ANCHORS) {
    const m = re.exec(full);
    if (m && (bestIdx < 0 || m.index < bestIdx)) {
      bestIdx = m.index;
    }
  }

  if (bestIdx < 0) {
    return { text: full, specs_anchor_found: false, specs_anchor_offset: 0 };
  }

  return {
    text: full.slice(bestIdx),
    specs_anchor_found: true,
    specs_anchor_offset: bestIdx,
  };
}

/**
 * @param {Buffer} buffer
 * @param {{ skipSpecificationsSlice?: boolean }} [options] - true = texto completo (p. ej. depuración)
 * @returns {Promise<{ text: string, numpages: number, info?: object, specs_anchor_found?: boolean, specs_anchor_offset?: number }>}
 */
export async function extractTextFromPdfBuffer(buffer, options = {}) {
  if (!buffer || !Buffer.isBuffer(buffer)) {
    throw new Error('Se requiere un Buffer PDF válido');
  }
  const data = await pdfParse(buffer);
  const rawText = typeof data.text === 'string' ? data.text : '';

  if (options.skipSpecificationsSlice) {
    return {
      text: rawText,
      numpages: data.numpages ?? 0,
      info: data.info ?? null,
      specs_anchor_found: false,
      specs_anchor_offset: 0,
    };
  }

  const sliced = sliceTextFromSpecificationsSection(rawText);
  return {
    text: sliced.text,
    numpages: data.numpages ?? 0,
    info: data.info ?? null,
    specs_anchor_found: sliced.specs_anchor_found,
    specs_anchor_offset: sliced.specs_anchor_offset,
  };
}
