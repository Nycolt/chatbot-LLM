/**
 * Utilidades para sincronización de base de datos
 */

import { sequelize } from '../config/database.js';
import { logger } from '../config/logger.js';
// Modelos — orden: primero tablas base, luego catálogo, luego asociaciones
import '../models/User.model.js';
import '../models/Product.model.js';
import '../models/ProductTemp.model.js';
import '../models/Datasheet.model.js';
import '../models/FortigateSpecs.model.js';
import '../models/ProductLifecycle.model.js';
import '../models/ProductReplacement.model.js';
import '../models/NeedsInbox.model.js';
import '../models/LearnedSolutionKeyword.model.js';
import '../models/PriceUploadBatch.model.js';
import '../models/PriceListStaging.model.js';
import '../models/Solution.model.js';
import '../models/ProductModel.model.js';
import '../models/DatasheetSource.model.js';
import '../models/DatasheetModelMap.model.js';
import '../models/ProductModelAttribute.model.js';
import '../models/SolutionSpecs.models.js';
import '../models/OfferCompatibilityRule.model.js';
import '../models/ModelOfferLink.model.js';
import '../models/NeedInboxTag.model.js';
import '../models/IntentKeyword.model.js';
import '../models/SolutionOffer.model.js';
import { setupCatalogAssociations } from '../models/associations.catalog.js';

setupCatalogAssociations();

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
