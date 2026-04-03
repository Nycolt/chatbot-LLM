/**
 * Middleware de subida de archivo para listas de precios.
 * Usa multer con memoryStorage y espera un único archivo en el campo 'file'.
 */

import multer from 'multer';

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20 MB
  },
});

// Middleware listo para usar en la ruta: upload.single('file')
export const uploadPriceListFileMiddleware = upload.single('file');

export default uploadPriceListFileMiddleware;

