/**
 * Controlador Buzón de Necesidades (needs_inbox)
 * Endpoints para listar, ver detalle, actualizar revisión y obtener métricas.
 */

import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';
import needsInboxService from '../services/needsInbox.service.js';

/**
 * GET /api/v1/needs-inbox
 * Lista registros con filtros: status, category, solution, search, limit, offset
 */
const list = asyncHandler(async (req, res) => {
  const { status, category, solution, search, limit, offset } = req.query;
  const result = await needsInboxService.findAll({
    status,
    category,
    solution,
    search,
    limit,
    offset,
  });
  return ApiResponse.success(res, result, 'Listado del buzón de necesidades');
});

/**
 * GET /api/v1/needs-inbox/stats
 * Métricas para el dashboard
 */
const getStats = asyncHandler(async (req, res) => {
  const stats = await needsInboxService.getStats();
  return ApiResponse.success(res, stats, 'Métricas del buzón');
});

/**
 * GET /api/v1/needs-inbox/:id
 * Detalle de un registro
 */
const getOne = asyncHandler(async (req, res) => {
  const record = await needsInboxService.findById(req.params.id);
  if (!record) return ApiResponse.notFound(res, 'Registro no encontrado');
  return ApiResponse.success(res, record, 'Detalle del registro');
});

/**
 * PUT /api/v1/needs-inbox/:id/review
 * Actualiza revisión manual: confirmed_solution, review_status, observations
 * Body: { confirmed_solution?, review_status?, observations?, learning_phrase? }
 * learning_phrase: texto opcional para matching (si vacío, se usa la pregunta del usuario normalizada).
 */
const updateReview = asyncHandler(async (req, res) => {
  const record = await needsInboxService.updateReview(req.params.id, req.body);
  if (!record) return ApiResponse.notFound(res, 'Registro no encontrado');
  return ApiResponse.success(res, record, 'Revisión actualizada');
});

/**
 * PUT /api/v1/needs-inbox/:id/status
 * Actualiza solo review_status. Body: { review_status }
 */
const updateStatus = asyncHandler(async (req, res) => {
  const { review_status } = req.body || {};
  const record = await needsInboxService.updateStatus(req.params.id, review_status);
  if (!record) return ApiResponse.notFound(res, 'Registro no encontrado');
  return ApiResponse.success(res, record, 'Estado actualizado');
});

/** PATCH /api/v1/needs-inbox/:id — mismo cuerpo que PUT .../review (clasificación manual + aprendizaje) */
const patchInbox = asyncHandler(async (req, res) => {
  const record = await needsInboxService.updateReview(req.params.id, req.body);
  if (!record) return ApiResponse.notFound(res, 'Registro no encontrado');
  return ApiResponse.success(res, record, 'Registro actualizado');
});

export { list, getStats, getOne, updateReview, updateStatus, patchInbox };
