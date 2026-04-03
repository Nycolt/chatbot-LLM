/**
 * Carga de datasheet PDF → catálogo + specs + trazabilidad.
 */

import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';
import { ingestPdfDatasheet } from '../services/datasheetPdf/datasheetPdfIngest.service.js';
import {
  isAllowedPdfSolutionType,
  PDF_SOLUTION_TYPE_LIST,
} from '../services/datasheetPdf/pdfConstants.js';

function resolveUploadedBy(user) {
  const u = Array.isArray(user) ? user[0] : user;
  if (!u || typeof u !== 'object') return null;
  return u.id ?? u.Id ?? u.ID ?? null;
}

/**
 * POST /api/v1/datasheet/pdf/upload
 * multipart: file (PDF), solutionType o solution_type, version (opcional), units_override (JSON opcional)
 */
export const uploadDatasheetPdf = asyncHandler(async (req, res) => {
  const file = req.file;
  if (!file?.buffer) {
    return ApiResponse.badRequest(res, 'Adjunte un PDF en el campo "file".');
  }

  const solutionType = String(
    req.body?.solutionType ?? req.body?.solution_type ?? '',
  ).trim();

  if (!solutionType) {
    return ApiResponse.badRequest(
      res,
      'Debes seleccionar la solución: envía solutionType (o solution_type) con uno de los valores permitidos.',
    );
  }

  if (!isAllowedPdfSolutionType(solutionType)) {
    return ApiResponse.badRequest(
      res,
      `solutionType no válido. Permitidos: ${PDF_SOLUTION_TYPE_LIST.join(', ')}.`,
    );
  }

  const version = req.body?.version ? String(req.body.version).trim() : null;

  let unitsOverride = null;
  const rawOverride = req.body?.units_override ?? req.body?.unitsOverride;
  if (rawOverride != null && String(rawOverride).trim() !== '') {
    try {
      const parsed = JSON.parse(String(rawOverride));
      if (Array.isArray(parsed)) unitsOverride = parsed.map((x) => String(x));
      else {
        return ApiResponse.badRequest(res, 'units_override debe ser un JSON array de strings (UNITs).');
      }
    } catch {
      return ApiResponse.badRequest(res, 'units_override no es JSON válido.');
    }
  }

  const uploadedBy = resolveUploadedBy(req.user);

  const includeVm = /^(1|true|yes)$/i.test(
    String(req.body?.include_vm ?? req.body?.includeVirtualModels ?? '').trim(),
  );

  try {
    const out = await ingestPdfDatasheet({
      buffer: file.buffer,
      fileName: file.originalname || 'datasheet.pdf',
      solutionType,
      version,
      unitsOverride,
      uploadedBy,
      fortianalyzerAppliancesOnly:
        solutionType === 'fortianalyzer' ? !includeVm : undefined,
    });
    return ApiResponse.created(res, out, 'Datasheet PDF procesado y catálogo actualizado.');
  } catch (err) {
    const msg = err?.message ?? String(err);
    if (msg.includes('No existe solución') || msg.includes('inválido') || msg.includes('Buffer PDF')) {
      return ApiResponse.badRequest(res, msg);
    }
    throw err;
  }
});
