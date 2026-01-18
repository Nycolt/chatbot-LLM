/**
 * Controlador de autenticación
 */

import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';
import DatasheetService from '../services/Datasheet.service.js';

/**
 * @desc    Insertar datasheets masivamente
 * @route   POST /api/v1/datasheets/insert/masivo
 * @access  Public
 */
const insertarDatasheets = asyncHandler(async (req, res) => {
  const datasheets = req.body;
  
  const result = await DatasheetService.bulkCreateDatasheets(datasheets);
  const stats = await DatasheetService.syncDatasheetsFromTemp();

  ApiResponse.created(res, result, `${result.length} datasheets insertadas correctamente`);
});


export {
 insertarDatasheets
};
