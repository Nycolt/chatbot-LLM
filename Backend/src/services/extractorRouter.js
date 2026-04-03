/**
 * Enruta el buffer PDF al ingest existente según el tipo detectado.
 * No reimplementa extractores: delega en ingestPdfDatasheet.
 */

import { ingestPdfDatasheet } from './datasheetPdf/datasheetPdfIngest.service.js';
import { isAllowedPdfSolutionType } from './datasheetPdf/pdfConstants.js';

/**
 * @param {object} params
 * @param {Buffer} params.buffer
 * @param {string} params.fileName
 * @param {string} params.detectedType - fortimanager | fortigate | fortianalyzer | …
 * @param {number|null} [params.uploadedBy]
 * @returns {Promise<object>} resultado de ingestPdfDatasheet
 */
export async function runDatasheetPipelineForDetectedType(params) {
  const { buffer, fileName, detectedType, uploadedBy } = params;
  const st = String(detectedType || '').trim();
  if (!isAllowedPdfSolutionType(st)) {
    throw new Error(`Tipo de datasheet no soportado para ingest: "${st}"`);
  }

  return ingestPdfDatasheet({
    buffer,
    fileName: fileName || 'datasheet.pdf',
    solutionType: st,
    uploadedBy: uploadedBy ?? null,
    fortimanagerAppliancesOnly: st === 'fortimanager',
    fortianalyzerAppliancesOnly: st === 'fortianalyzer',
  });
}
