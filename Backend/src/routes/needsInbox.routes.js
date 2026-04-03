/**
 * Rutas Buzón de Necesidades (needs-inbox)
 * Todas las rutas requieren autenticación (protect).
 */

import express from 'express';
import { protect } from '../middlewares/auth.js';
import {
  list,
  getStats,
  getOne,
  updateReview,
  updateStatus,
  patchInbox,
} from '../controllers/needsInbox.controller.js';

const router = express.Router();

router.use(protect);

router.get('/', list);
router.get('/stats', getStats);
router.patch('/:id', patchInbox);
router.get('/:id', getOne);
router.put('/:id/review', updateReview);
router.put('/:id/status', updateStatus);

export default router;
