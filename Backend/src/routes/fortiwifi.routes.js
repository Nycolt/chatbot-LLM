import express from 'express';
import { uploadFortiwifiPdf } from '../controllers/fortiwifi.controller.js';
import { uploadDatasheetPdfMiddleware } from '../middlewares/datasheetPdfUpload.middleware.js';

const router = express.Router();

router.post('/upload', uploadDatasheetPdfMiddleware, uploadFortiwifiPdf);

export default router;
