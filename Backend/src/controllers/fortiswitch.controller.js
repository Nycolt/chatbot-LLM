/**
 * Upload PDF FortiSwitch → extracción → parseo → ETL MySQL.
 */

import { extractPdfText } from '../services/fortiswitch/pdfExtractor.service.js';
import { parseFortiswitchDatasheetText } from '../services/fortiswitch/fortiswitchParser.service.js';
import { upsertFortiswitchRecordsFromParsedRows } from '../services/fortiswitch/fortiswitchEtl.service.js';

/**
 * POST /api/v1/fortiswitch/upload
 * multipart field: file (PDF)
 */
export async function uploadFortiswitchPdf(req, res, next) {
  try {
    if (!req.file?.buffer) {
      return res.status(400).json({
        success: false,
        message: 'Adjunte un PDF en el campo "file"',
      });
    }

    console.log('[fortiswitch.controller] upload', req.file.originalname, req.file.size, 'bytes');

    const { text, numpages } = await extractPdfText(req.file.buffer);
    if (!text || text.length < 50) {
      return res.status(422).json({
        success: false,
        message: 'No se pudo extraer texto del PDF (¿solo imagen o escaneado?)',
      });
    }

    const { modelsDetected, rows } = parseFortiswitchDatasheetText(text);

    if (!rows.length) {
      return res.status(422).json({
        success: false,
        message: 'No se detectaron modelos FortiSwitch en el PDF',
        meta: { numpages, textLength: text.length, modelsDetected: modelsDetected.length },
      });
    }

    const etlResults = await upsertFortiswitchRecordsFromParsedRows(rows);

    return res.status(200).json({
      success: true,
      message: `Procesados ${etlResults.length} modelo(s)`,
      meta: {
        fileName: req.file.originalname,
        pages: numpages,
        modelsParsed: rows.length,
        recordsUpserted: etlResults.length,
      },
      data: etlResults,
    });
  } catch (err) {
    console.error('[fortiswitch.controller] error:', err?.message || err);
    next(err);
  }
}

export default { uploadFortiswitchPdf };
