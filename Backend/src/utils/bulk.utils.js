/**
 * Utilidades para operaciones bulk (masivas) en base de datos
 */

import { sequelize } from '../config/database.js';
import { logger } from '../config/logger.js';
import TransactSQL from '../services/TransactSQL.js';

/**
 * Inserción masiva usando Sequelize ORM
 * @param {Model} Model - Modelo de Sequelize
 * @param {Array} data - Array de objetos a insertar
 * @param {object} options - Opciones adicionales
 * @returns {Promise<Array>} - Registros insertados
 */
export const bulkCreate = async (Model, data, options = {}) => {
  try {
    const {
      validate = true,
      ignoreDuplicates = false,
      updateOnDuplicate = null,
      transaction = null
    } = options;

    // Construir opciones solo con valores válidos
    const bulkOptions = {
      validate,
      transaction
    };

    // Solo agregar ignoreDuplicates si es true
    if (ignoreDuplicates) {
      bulkOptions.ignoreDuplicates = true;
    }

    // Solo agregar updateOnDuplicate si es un array válido
    if (updateOnDuplicate && Array.isArray(updateOnDuplicate) && updateOnDuplicate.length > 0) {
      bulkOptions.updateOnDuplicate = updateOnDuplicate;
    }

    const records = await Model.bulkCreate(data, bulkOptions);

    logger.info(`✅ Bulk insert completado: ${records.length} registros insertados en ${Model.name}`);
    return records;
  } catch (error) {
    logger.error(`❌ Error en bulk insert para ${Model.name}:`, error);
    throw error;
  }
};

/**
 * Actualización masiva usando Sequelize ORM
 * @param {Model} Model - Modelo de Sequelize
 * @param {object} values - Valores a actualizar
 * @param {object} where - Condición WHERE
 * @param {object} options - Opciones adicionales
 * @returns {Promise<number>} - Número de registros actualizados
 */
export const bulkUpdate = async (Model, values, where, options = {}) => {
  try {
    const { transaction = null } = options;

    const [affectedRows] = await Model.update(values, {
      where,
      transaction
    });

    logger.info(`✅ Bulk update completado: ${affectedRows} registros actualizados en ${Model.name}`);
    return affectedRows;
  } catch (error) {
    logger.error(`❌ Error en bulk update para ${Model.name}:`, error);
    throw error;
  }
};

/**
 * Eliminación masiva usando Sequelize ORM
 * @param {Model} Model - Modelo de Sequelize
 * @param {object} where - Condición WHERE
 * @param {object} options - Opciones adicionales
 * @returns {Promise<number>} - Número de registros eliminados
 */
export const bulkDelete = async (Model, where, options = {}) => {
  try {
    const { transaction = null, force = false } = options;

    const affectedRows = await Model.destroy({
      where,
      force,
      transaction
    });

    logger.info(`✅ Bulk delete completado: ${affectedRows} registros eliminados en ${Model.name}`);
    return affectedRows;
  } catch (error) {
    logger.error(`❌ Error en bulk delete para ${Model.name}:`, error);
    throw error;
  }
};

/**
 * Inserción masiva usando stored procedure
 * @param {string} procedure - Nombre del stored procedure
 * @param {Array} dataArray - Array de objetos con parámetros
 * @returns {Promise<Array>} - Resultados de cada ejecución
 */
export const bulkCreateWithSP = async (procedure, dataArray) => {
  try {
    const results = [];
    
    for (const data of dataArray) {
      const result = await TransactSQL.singleQuery(procedure, data);
      results.push(result);
    }

    logger.info(`✅ Bulk insert con SP completado: ${results.length} registros procesados`);
    return results;
  } catch (error) {
    logger.error(`❌ Error en bulk insert con SP ${procedure}:`, error);
    throw error;
  }
};

/**
 * Ejecutar operaciones bulk dentro de una transacción
 * @param {Function} operations - Función con las operaciones a ejecutar
 * @returns {Promise<any>} - Resultado de las operaciones
 */
export const bulkTransaction = async (operations) => {
  const transaction = await sequelize.transaction();
  
  try {
    const result = await operations(transaction);
    await transaction.commit();
    logger.info('✅ Transacción bulk completada exitosamente');
    return result;
  } catch (error) {
    await transaction.rollback();
    logger.error('❌ Error en transacción bulk, rollback ejecutado:', error);
    throw error;
  }
};

/**
 * Inserción masiva optimizada con chunks (lotes)
 * @param {Model} Model - Modelo de Sequelize
 * @param {Array} data - Array de objetos a insertar
 * @param {number} chunkSize - Tamaño de cada lote (default: 500)
 * @returns {Promise<Array>} - Todos los registros insertados
 */
export const bulkCreateInChunks = async (Model, data, chunkSize = 500) => {
  try {
    const results = [];
    
    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.slice(i, i + chunkSize);
      const records = await Model.bulkCreate(chunk, { validate: true });
      results.push(...records);
      
      logger.info(`Procesado chunk ${Math.floor(i / chunkSize) + 1}: ${records.length} registros`);
    }

    logger.info(`✅ Bulk insert en chunks completado: ${results.length} registros totales`);
    return results;
  } catch (error) {
    logger.error(`❌ Error en bulk insert por chunks para ${Model.name}:`, error);
    throw error;
  }
};

/**
 * Upsert masivo (Insert or Update)
 * @param {Model} Model - Modelo de Sequelize
 * @param {Array} data - Array de objetos
 * @param {Array} updateFields - Campos a actualizar si ya existe
 * @returns {Promise<Array>} - Registros procesados
 */
export const bulkUpsert = async (Model, data, updateFields) => {
  try {
    const records = await Model.bulkCreate(data, {
      updateOnDuplicate: updateFields,
      validate: true
    });

    logger.info(`✅ Bulk upsert completado: ${records.length} registros procesados en ${Model.name}`);
    return records;
  } catch (error) {
    logger.error(`❌ Error en bulk upsert para ${Model.name}:`, error);
    throw error;
  }
};

export default {
  bulkCreate,
  bulkUpdate,
  bulkDelete,
  bulkCreateWithSP,
  bulkTransaction,
  bulkCreateInChunks,
  bulkUpsert
};
