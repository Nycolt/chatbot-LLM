/**
 * Configuración principal de Express
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import config from './config/env.js';
import { requestLogger } from './config/logger.js';

// Middlewares personalizados
import errorHandler from './middlewares/errorHandler.js';
import notFound from './middlewares/notFound.js';

// Rutas
import routes from './routes/index.js';

const app = express();

// Middlewares de seguridad
app.use(helmet());
app.use(cors({
  origin: config.cors.origin,
  credentials: true,
}));

// Middlewares de parseo
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logger con Winston (evitar en pruebas)
if (config.nodeEnv !== 'test') {
  app.use(requestLogger);
}

// Ruta de health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  });
});

// Rutas de la API
app.use(`/api/${config.api.version}`, routes);

// Manejo de rutas no encontradas
app.use(notFound);

// Manejo de errores
app.use(errorHandler);

export default app;
