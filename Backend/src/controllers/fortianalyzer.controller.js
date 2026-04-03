/**
 * POST /api/v1/fortianalyzer/upload — PDF → fortianalyzer_specs (UPSERT por UNIT)
 */

import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';
import { sequelize } from '../config/database.js';
import {
  extractFortiAnalyzerSpecsFromPDF,
  upsertFortiAnalyzerSpecs,
} from '../services/fortianalyzer/fortianalyzer.extractor.js';

export const uploadFortianalyzerPdf = asyncHandler(async (req, res) => {
  const file = req.file;
  if (!file?.buffer) {
    return ApiResponse.badRequest(res, 'Adjunte un PDF en el campo "file".');
  }

  const records = await extractFortiAnalyzerSpecsFromPDF(file.buffer);
  const saved = await sequelize.transaction(async (transaction) =>
    upsertFortiAnalyzerSpecs(records, { transaction }),
  );

  return ApiResponse.created(
    res,
    {
      records_saved: saved.length,
      units: saved.map((r) => r.UNIT),
    },
    'Especificaciones FortiAnalyzer actualizadas (UPSERT por UNIT).',
  );
});
