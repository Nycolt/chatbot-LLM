/**
 * Configuración de la base de datos MySQL con Sequelize
 */

import { Sequelize } from 'sequelize';
import config from './env.js';
import { logger } from './logger.js';

/**
 * Zona horaria para Sequelize/MySQL (createdAt, updatedAt, NOW() en sesión).
 * Por defecto +00:00 en Sequelize; aquí se alinea a tu región o a la del servidor Node.
 * Formatos válidos en DB_TIMEZONE: ±HH:MM (ej. +02:00) o IANA (ej. Europe/Madrid).
 * El dialecto MySQL de Sequelize ya ejecuta SET time_zone en cada conexión del pool.
 */
function resolveSequelizeTimezone() {
  const fromEnv = config.database.timezone;
  if (fromEnv) {
    if (/^[+-]\d{2}:\d{2}$/.test(fromEnv)) return fromEnv;
    if (/^[A-Za-z_]+\/[\w+/\-]+$/.test(fromEnv)) return fromEnv;
    logger.warn(
      `DB_TIMEZONE="${fromEnv}" no es válido (usa ±HH:MM o IANA tipo Europe/Madrid). Se usa la zona local del servidor Node.`
    );
  }
  const offMin = -new Date().getTimezoneOffset();
  const sign = offMin >= 0 ? '+' : '-';
  const abs = Math.abs(offMin);
  const hh = String(Math.floor(abs / 60)).padStart(2, '0');
  const mm = String(abs % 60).padStart(2, '0');
  return `${sign}${hh}:${mm}`;
}

const mysqlTimezone = resolveSequelizeTimezone();

const sequelize = new Sequelize(
  config.database.name,
  config.database.user,
  config.database.password,
  {
    host: config.database.host,
    port: config.database.port,
    dialect: config.database.dialect,
    timezone: mysqlTimezone,
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
    logger.info(`✅ MySQL conectado (zona horaria sesión: ${mysqlTimezone})`);
    
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
