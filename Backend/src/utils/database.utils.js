/**
 * Utilidades para sincronización de base de datos
 */

import { sequelize } from '../config/database.js';
import { logger } from '../config/logger.js';
// Importar modelos para registrarlos en Sequelize
import '../models/User.model.js';
import '../models/Product.model.js';

/**
 * Sincronizar modelos de Sequelize con la base de datos
 * Solo afecta tablas, NO stored procedures, triggers, views, etc.
 * @param {object} options - Opciones de sincronización
 * @param {boolean} options.alter - Si true, altera tablas existentes para que coincidan con los modelos
 * @param {boolean} options.force - Si true, elimina y recrea todas las tablas (PELIGRO: borra datos)
 */
export const syncDatabase = async (options = {}) => {
  try {
    const { alter = true, force = false } = options;
    
    if (force) {
      logger.warn('⚠️  ADVERTENCIA: sync con force=true eliminará todas las tablas y datos');
    }
    
    await sequelize.sync({ alter, force });
    
    if (force) {
      logger.info('✅ Tablas recreadas (force mode)');
    } else if (alter) {
      logger.info('✅ Tablas actualizadas (alter mode)');
    } else {
      logger.info('✅ Tablas sincronizadas (solo creación de nuevas tablas)');
    }
  } catch (error) {
    logger.error('❌ Error sincronizando base de datos:', error);
    throw error;
  }
};

export default syncDatabase;
