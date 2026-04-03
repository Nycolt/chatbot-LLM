import express from 'express';
import { uploadFortianalyzerPdf } from '../controllers/fortianalyzer.controller.js';
import { uploadDatasheetPdfMiddleware } from '../middlewares/datasheetPdfUpload.middleware.js';

const router = express.Router();

router.post('/upload', uploadDatasheetPdfMiddleware, uploadFortianalyzerPdf);

export default router;
