/**
 * Rutas plural /datasheets (pipeline auto-detect PDF).
 */

import express from 'express';
import { uploadDatasheetAutoDetect } from '../controllers/datasheet.controller.js';
import { uploadDatasheetPdfMiddleware } from '../middlewares/datasheetPdfUpload.middleware.js';
import { protect } from '../middlewares/auth.js';

const router = express.Router();

/** POST /api/v1/datasheets/upload — multer memoria, sin guardar disco */
router.post('/upload', protect, uploadDatasheetPdfMiddleware, uploadDatasheetAutoDetect);

export default router;
