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
import datasheetsRoutes from './datasheets.routes.js';
import ollamaRoutes from './ollama.routes.js';
import sizingRoutes from './sizing.routes.js';
import needsInboxRoutes from './needsInbox.routes.js';
import priceListRoutes from './priceList.routes.js';
import fortiwifiRoutes from './fortiwifi.routes.js';
import fortianalyzerRoutes from './fortianalyzer.routes.js';
import fortiswitchRoutes from './fortiswitch.routes.js';
import compareRoutes from './compare.routes.js';

// Registrar rutas
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/product', productRoutes);
router.use('/datasheet', datasheetRoutes);
router.use('/datasheets', datasheetsRoutes);
router.use('/agent', ollamaRoutes);
router.use('/sizing', sizingRoutes);
router.use('/needs-inbox', needsInboxRoutes);
router.use('/price-list', priceListRoutes);
router.use('/fortiwifi', fortiwifiRoutes);
router.use('/fortianalyzer', fortianalyzerRoutes);
router.use('/fortiswitch', fortiswitchRoutes);
router.use('/compare', compareRoutes);

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
