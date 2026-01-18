/**
 * Configuración de la base de datos MySQL con Sequelize
 */

import { Sequelize } from 'sequelize';
import config from './env.js';
import { logger } from './logger.js';

const sequelize = new Sequelize(
  config.database.name,
  config.database.user,
  config.database.password,
  {
    host: config.database.host,
    port: config.database.port,
    dialect: config.database.dialect,
    logging: config.nodeEnv === 'development' ? (msg) => logger.debug(msg) : false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  }
);

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    logger.info('✅ MySQL conectado exitosamente');
    
    // Sincronizar modelos (solo en desarrollo)
    if (config.nodeEnv === 'development') {
      // await sequelize.sync({ alter: true });
      // logger.info('📊 Modelos sincronizados');
    }
  } catch (error) {
    logger.error('❌ Error al conectar a la base de datos:', error.message);
    process.exit(1);
  }
};

export { sequelize, connectDB };
export default connectDB;
