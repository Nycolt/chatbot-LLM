/**
 * Controlador para carga y consulta de listas de precios Fortinet.
 */

import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';
import { uploadPriceListFile } from '../services/priceListUpload.service.js';
import PriceUploadBatch from '../models/PriceUploadBatch.model.js';
import SolutionOffer from '../models/SolutionOffer.model.js';

/**
 * POST /api/v1/price-list/upload
 * Sube un archivo .xlsx oficial y ejecuta el flujo completo (batch + staging + ETL).
 * Espera un archivo en el campo 'file' (multipart/form-data).
 */
export const uploadPriceList = asyncHandler(async (req, res) => {
  const file = req.file;

  if (!file || !file.buffer) {
    return ApiResponse.badRequest(res, 'No se recibió el archivo de lista de precios (campo \"file\").');
  }

  const uploadedBy = req.user?.id ?? null;

  const summary = await uploadPriceListFile({
    fileBuffer: file.buffer,
    fileName: file.originalname || 'lista_precios.xlsx',
    uploadedBy,
    sourceType: 'fortinet_official',
  });

  if (summary.status === 'failed') {
    return ApiResponse.error(res, summary.error_message || 'Error procesando la lista de precios');
  }

  return ApiResponse.created(res, summary, 'Lista de precios cargada y procesada correctamente');
});

/**
 * GET /api/v1/price-list/batches
 * Lista de batches ordenados por fecha de subida (desc).
 */
export const listBatches = asyncHandler(async (req, res) => {
  const batches = await PriceUploadBatch.findAll({
    order: [['uploaded_at', 'DESC']],
  });

  return ApiResponse.success(res, batches, 'Listado de batches de listas de precios');
});

/**
 * GET /api/v1/price-list/batches/:id
 * Detalle de un batch específico.
 */
export const getBatchById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const batch = await PriceUploadBatch.findByPk(id);
  if (!batch) {
    return ApiResponse.notFound(res, 'Batch no encontrado');
  }

  return ApiResponse.success(res, batch, 'Detalle del batch de lista de precios');
});

/**
 * GET /api/v1/price-list/batches/:id/offers
 * Ofertas (solution_offers) asociadas a un batch.
 */
export const getBatchOffers = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const batch = await PriceUploadBatch.findByPk(id);
  if (!batch) {
    return ApiResponse.notFound(res, 'Batch no encontrado');
  }

  const offers = await SolutionOffer.findAll({
    where: { batch_id: id },
    order: [['sku', 'ASC']],
  });

  return ApiResponse.success(res, offers, 'Ofertas asociadas al batch');
});

