/**
 * Rutas para carga y consulta de listas de precios Fortinet.
 */

import express from 'express';
import { protect } from '../middlewares/auth.js';
import {
  uploadPriceList,
  listBatches,
  getBatchById,
  getBatchOffers,
} from '../controllers/priceList.controller.js';
import { uploadPriceListFileMiddleware } from '../middlewares/priceListUpload.middleware.js';

const router = express.Router();

// Todas las rutas de este módulo requieren autenticación
router.use(protect);

// 1) Subir archivo Excel oficial y procesar
router.post('/upload', uploadPriceListFileMiddleware, uploadPriceList);

// 2) Listar batches
router.get('/batches', listBatches);

// 3) Detalle de un batch
router.get('/batches/:id', getBatchById);

// 4) Ofertas de un batch
router.get('/batches/:id/offers', getBatchOffers);

export default router;

