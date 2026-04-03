/**
 * Archivo principal del servidor
 */

import 'dotenv/config';
import app from './src/app.js';
import config from './src/config/env.js';
import connectDB from './src/config/database.js';
import { logger } from './src/config/logger.js';
import syncDatabase from './src/utils/database.utils.js';
import { refreshLearnedKeywordsCache } from './src/services/learnedSolutionKeywords.service.js';

const PORT = config.port;

// Función para iniciar el servidor
const startServer = async () => {
  try {
    // Conectar a la base de datos
    await connectDB();
    
    // Sincronizar tablas (solo en desarrollo)
    if (config.nodeEnv === 'development') {
      await syncDatabase({ alter: false, force: false });
    }

    await refreshLearnedKeywordsCache();

    //Pre calentar LLMs u otros servicios si es necesario
    // await prewarmServices();
    
    // Iniciar el servidor en todas las interfaces de red (0.0.0.0)
    // Esto permite conexiones desde otros dispositivos en la red local
    const server = app.listen(PORT, '0.0.0.0', () => {
      logger.info(`
        ╭────────────────────────────────────────────────────────────────╮
        │                                                       
        │   🚀 Servidor iniciado exitosamente                  
        │                                                       
        │   📡 Puerto: ${PORT}                                 
        │   🌍 Entorno: ${config.nodeEnv}                      
        │   📅 Fecha: ${new Date().toLocaleString()}            
        │                                                       
        │   🔗 Local:   http://localhost:${PORT}/health                      
        │   🌐 Red:     http://192.168.2.9:${PORT}/health                   
        │   📚 API:     http://localhost:${PORT}/api/${config.api.version}    
        ║                                                                   
        ╚════════════════════════════════════════════════════════════════╝
      `);
    });

    // Manejo de errores no capturados
    process.on('unhandledRejection', (err) => {
      logger.error('Error no manejado:', err);
      server.close(() => process.exit(1));
    });

    process.on('uncaughtException', (err) => {
      logger.error('Excepción no capturada:', err);
      process.exit(1);
    });

    // Manejo de señales de terminación
    process.on('SIGTERM', () => {
      logger.info('SIGTERM recibido. Cerrando servidor...');
      server.close(() => {
        logger.info('Servidor cerrado');
        process.exit(0);
      });
    });
    
  } catch (error) {
    logger.error('Error al iniciar el servidor:', error);
    process.exit(1);
  }
};

// Iniciar servidor
startServer();
