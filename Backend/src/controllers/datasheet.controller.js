/**
 * Datasheets: carga masiva legacy + pipeline PDF auto-detectado.
 */

import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';
import DatasheetService from '../services/Datasheet.service.js';
import NeedsInbox from '../models/NeedsInbox.model.js';
import { detectPdfDatasheetTypeFromBuffer } from '../services/pdfDetector.service.js';
import { runDatasheetPipelineForDetectedType } from '../services/extractorRouter.js';

function resolveUploadedBy(user) {
  const u = Array.isArray(user) ? user[0] : user;
  if (!u || typeof u !== 'object') return null;
  return u.id ?? u.Id ?? u.ID ?? null;
}

/**
 * @desc    Insertar datasheets masivamente
 * @route   POST /api/v1/datasheet/insertar/masivo
 * @access  Public
 */
const insertarDatasheets = asyncHandler(async (req, res) => {
  const datasheets = req.body;

  const result = await DatasheetService.bulkCreateDatasheets(datasheets);
  await DatasheetService.syncDatasheetsFromTemp();

  ApiResponse.created(
    res,
    result,
    `${result.length} registros procesados (FortiGate → upsert fortigate_specs por UNIT; otras → Datasheet)`,
  );
});

/**
 * @desc    Subir PDF → detector de tipo → ingest (FortiManager / FortiGate / FortiAnalyzer)
 * @route   POST /api/v1/datasheets/upload
 * @access  Private (mismo criterio que /datasheet/pdf/upload)
 */
const uploadDatasheetAutoDetect = asyncHandler(async (req, res) => {
  const file = req.file;
  if (!file?.buffer) {
    return ApiResponse.badRequest(res, 'Adjunte un PDF en el campo "file".');
  }

  const { type: detectedType, text } = await detectPdfDatasheetTypeFromBuffer(file.buffer);
  const uploadedBy = resolveUploadedBy(req.user);

  if (detectedType === 'unknown') {
    const snippet = String(text || '').slice(0, 2000);
    const inbox = await NeedsInbox.create({
      user_question: `[Datasheet PDF sin clasificar] ${file.originalname || 'upload.pdf'}\n${snippet}`,
      detected_solutions: [],
      matched_keywords: {},
      detected_scores: [],
      detected_category: null,
      review_status: 'pendiente',
      observations: 'Subido vía POST /datasheets/upload; detector sin coincidencia.',
    });
    console.log({
      detectedType: 'unknown',
      models: [],
      rows: 0,
      needsInboxId: inbox.id,
    });
    return res.status(422).json({
      success: false,
      type: 'unknown',
      rowsProcessed: 0,
      needsInboxId: inbox.id,
      message: 'No se pudo clasificar el PDF; se registró en needs_inbox.',
    });
  }

  try {
    const out = await runDatasheetPipelineForDetectedType({
      buffer: file.buffer,
      fileName: file.originalname || 'datasheet.pdf',
      detectedType,
      uploadedBy,
    });
    const models = out?.report?.units ?? out?.results?.map((r) => r.unit) ?? [];
    const rows = out?.models_processed ?? 0;
    console.log({ detectedType, models, rows });
    return res.status(200).json({
      success: true,
      type: detectedType,
      rowsProcessed: rows,
    });
  } catch (err) {
    const msg = err?.message ?? String(err);
    if (
      msg.includes('No existe solución') ||
      msg.includes('inválido') ||
      msg.includes('Buffer PDF') ||
      msg.includes('no soportado')
    ) {
      return ApiResponse.badRequest(res, msg);
    }
    throw err;
  }
});

export { insertarDatasheets, uploadDatasheetAutoDetect };
