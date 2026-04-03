/**
 * Rutas de comparación entre modelos
 */

import express from 'express';
import asyncHandler from '../utils/asyncHandler.js';
import {
  postCompare,
  getCompareUnits,
  postCompareNarrative,
} from '../controllers/compare.controller.js';

const router = express.Router();

/**
 * GET /api/v1/compare/units/:solution
 */
router.get('/units/:solution', asyncHandler(getCompareUnits));

/**
 * POST /api/v1/compare
 * Body: { solution: "fortigate", models: ["FG-100F", "FG-200F"] }
 */
router.post('/', asyncHandler(postCompare));

/**
 * POST /api/v1/compare/narrative
 * Body: payload de comparación (data de POST /compare)
 */
router.post('/narrative', asyncHandler(postCompareNarrative));

export default router;
