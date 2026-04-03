/**
 * Rutas de dimensionamiento: schema de formulario y envío en lote
 */

import express from 'express';
import { getSizingSchema } from '../config/sizingSchemas.js';
import { runSizingFromPayload } from '../services/sizingDispatcher.service.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

const router = express.Router();

/**
 * GET /api/v1/sizing/schema/:solutionType
 * Devuelve el schema de preguntas para el formulario dinámico (FortiGate: 9 técnicos + bundle/add-ons)
 */
router.get('/schema/:solutionType', (req, res) => {
  const schema = getSizingSchema(req.params.solutionType);
  if (!schema) {
    return res.status(404).json({ success: false, message: 'Tipo de solución no válido (1-9)' });
  }
  return ApiResponse.success(res, schema);
});

/**
 * POST /api/v1/sizing/submit
 * Body: { solutionType: number, answers: object }
 * Ejecuta el dimensionamiento con las respuestas del formulario
 */
router.post(
  '/submit',
  asyncHandler(async (req, res) => {
    const { solutionType, answers } = req.body || {};
    if (solutionType == null || !answers || typeof answers !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Se requieren solutionType y answers',
      });
    }
    const result = await runSizingFromPayload({
      solutionType: Number(solutionType),
      answers,
    });
    const responseData = [
      { role: 'assistant', content: result.assistantMessage },
    ];
    return ApiResponse.created(res, responseData, 'Dimensionamiento completado');
  })
);

export default router;
