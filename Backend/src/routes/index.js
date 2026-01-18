/**
 * Archivo principal de rutas
 * Aquí se centralizan todas las rutas de la aplicación
 */

import express from 'express';
const router = express.Router();

// Importar rutas
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import productRoutes from './product.routes.js';
import datasheetRoutes from './datasheet.routes.js';
import ollamaRoutes from './ollama.routes.js';

// Registrar rutas
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/product', productRoutes);
router.use('/datasheet', datasheetRoutes);
router.use('/agent', ollamaRoutes);

// Ruta de ejemplo
//router.get('/', (req, res) => {
//  res.json({
//    success: true,
//    message: 'API REST con Express.js',
//    version: '1.0.0',
//    endpoints: {
//      auth: '/api/v1/auth',
//      users: '/api/v1/users',
//    },
//  });
//});

export default router;
