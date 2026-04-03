/**
 * POST /api/v1/fortiwifi/upload — PDF → fortiwifi_specs (UPSERT por UNIT)
 */

import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';
import { sequelize } from '../config/database.js';
import {
  extractFortiWiFiSpecsFromPDF,
  upsertFortiWiFiSpecs,
} from '../services/fortiwifi/fortiwifi.extractor.js';

export const uploadFortiwifiPdf = asyncHandler(async (req, res) => {
  const file = req.file;
  if (!file?.buffer) {
    return ApiResponse.badRequest(res, 'Adjunte un PDF en el campo "file".');
  }

  const records = await extractFortiWiFiSpecsFromPDF(file.buffer);
  const saved = await sequelize.transaction(async (transaction) =>
    upsertFortiWiFiSpecs(records, { transaction }),
  );

  return ApiResponse.created(
    res,
    {
      records_saved: saved.length,
      units: saved.map((r) => r.UNIT),
    },
    'Especificaciones FortiWiFi actualizadas (UPSERT por UNIT).',
  );
});
