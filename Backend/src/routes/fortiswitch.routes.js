import express from 'express';
import { uploadFortiswitchPdf } from '../controllers/fortiswitch.controller.js';
import { uploadDatasheetPdfMiddleware } from '../middlewares/datasheetPdfUpload.middleware.js';

const router = express.Router();

router.post('/upload', uploadDatasheetPdfMiddleware, uploadFortiswitchPdf);

export default router;
