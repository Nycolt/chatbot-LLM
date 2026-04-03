/**
 * Comparación de modelos Fortinet (POST /api/v1/compare)
 */

import {
  compareModelsFromDb,
  listUnitsForSolution,
} from '../services/modelCompare.service.js';
import { generateCompareNarrativeSafe } from '../services/compareNarrative.service.js';
import ApiResponse from '../utils/ApiResponse.js';

export async function postCompare(req, res) {
  const { solution, models } = req.body || {};
  if (!solution || typeof solution !== 'string') {
    return ApiResponse.badRequest(res, 'Se requiere "solution" (string), ej. "fortigate".');
  }
  if (!Array.isArray(models) || models.length < 2) {
    return ApiResponse.badRequest(res, 'Se requiere "models" como array con al menos 2 elementos.');
  }

  const result = await compareModelsFromDb(solution, models);
  if (!result.ok) {
    return ApiResponse.badRequest(res, result.error || 'No se pudo comparar.');
  }

  const { ok: _ok, ...data } = result;
  return ApiResponse.success(res, data, 'Comparación generada');
}

/**
 * GET /api/v1/compare/units/:solution
 * Lista UNIT distintos en la tabla specs (selector en el frontend).
 */
export async function getCompareUnits(req, res) {
  const solution = String(req.params.solution || '')
    .toLowerCase()
    .trim();
  const units = await listUnitsForSolution(solution);
  if (units === null) {
    return ApiResponse.badRequest(res, 'Solución no soportada.');
  }
  return ApiResponse.success(res, { units }, 'Unidades listadas');
}

/**
 * POST /api/v1/compare/narrative
 * Body: mismo objeto `data` devuelto por POST /compare (comparación exitosa con métricas).
 */
export async function postCompareNarrative(req, res) {
  const payload = req.body;
  if (!payload || typeof payload !== 'object') {
    return ApiResponse.badRequest(res, 'Body inválido: se espera el objeto de comparación.');
  }

  const result = await generateCompareNarrativeSafe(payload);
  return ApiResponse.success(
    res,
    {
      narrative: result.narrative,
      source: result.source,
    },
    'Recomendación lista',
  );
}
