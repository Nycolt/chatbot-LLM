/**
 * Servicio genérico para ejecutar stored procedures de MySQL
 * Equivalente a Dapper de .NET
 */

import { sequelize } from '../config/database.js';
import { QueryTypes } from 'sequelize';
import { logger } from '../config/logger.js';

class TransactSQL {
  /**
   * Ejecutar SP que retorna un único registro
   * @param {string} procedure - Nombre del stored procedure
   * @param {object|array} parameters - Parámetros del SP (objeto o array)
   * @returns {Promise<object|null>}
   */
  async singleQuery(procedure, parameters = {}) {
    try {
      let query;
      let replacements;

      if (Array.isArray(parameters)) {
        // Si es array, usar placeholders posicionales (?)
        const placeholders = parameters.map(() => '?').join(', ');
        query = placeholders 
          ? `CALL ${procedure}(${placeholders})`
          : `CALL ${procedure}()`;
        replacements = parameters;
      } else {
        // Si es objeto, usar placeholders con nombre (:key)
        const placeholders = Object.keys(parameters)
          .map(key => `:${key}`)
          .join(', ');
        query = placeholders 
          ? `CALL ${procedure}(${placeholders})`
          : `CALL ${procedure}()`;
        replacements = parameters;
      }

      logger.debug(`Ejecutando query: ${query}`, replacements);

      const [results] = await sequelize.query(query, {
        replacements: replacements,
        type: QueryTypes.SELECT,
        raw: true
      });

      return results?.[0] || null;
    } catch (error) {
      logger.error(`Error en singleQuery - ${procedure}:`, {
        message: error.message,
        sql: error.sql,
        parameters: error.parameters
      });
      throw error;
    }
  }

  /**
   * Ejecutar SP sin retornar resultados
   * @param {string} procedure - Nombre del stored procedure
   * @returns {Promise<number>} - Número de filas afectadas
   */
  async singleQueryAsync(procedure) {
    try {
      const [, metadata] = await sequelize.query(`CALL ${procedure}()`, {
        raw: true
      });

      return metadata?.affectedRows || 0;
    } catch (error) {
      logger.error(`Error en singleQueryAsync - ${procedure}:`, error);
      return 0;
    }
  }

  /**
   * Ejecutar SP que retorna múltiples registros
   * @param {string} procedure - Nombre del stored procedure
   * @param {object|array} parameters - Parámetros del SP (objeto o array)
   * @returns {Promise<Array>} - Retorna array de resultados
   */
  async listQuery(procedure, parameters = {}) {
    try {
      let query;
      let replacements;

      if (Array.isArray(parameters)) {
        // Si es array, usar placeholders posicionales (?)
        const placeholders = parameters.map(() => '?').join(', ');
        query = placeholders 
          ? `CALL ${procedure}(${placeholders})`
          : `CALL ${procedure}()`;
        replacements = parameters;
      } else {
        // Si es objeto, usar placeholders con nombre (:key)
        const placeholders = Object.keys(parameters)
          .map(key => `:${key}`)
          .join(', ');
        query = placeholders 
          ? `CALL ${procedure}(${placeholders})`
          : `CALL ${procedure}()`;
        replacements = parameters;
      }

      // Ejecutar sin especificar type para obtener todos los resultados
      const results = await sequelize.query(query, {
        replacements: replacements,
        raw: true
      });

      // results es un array [data, metadata]
      // data puede ser un array de objetos o un objeto indexado
      const data = results[0];
      
      // Si data es un objeto con claves numéricas, convertirlo a array
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        return Object.values(data);
      }
      
      // Si ya es un array, devolverlo
      return Array.isArray(data) ? data : [];
    } catch (error) {
      logger.error(`Error en listQuery - ${procedure}:`, error);
      throw error;
    }
  }

  /**
   * Ejecutar SP sin retornar resultados (INSERT/UPDATE/DELETE)
   * @param {string} procedure - Nombre del stored procedure
   * @param {object|array} parameters - Parámetros del SP (objeto o array)
   * @returns {Promise<void>}
   */
  async executeQuery(procedure, parameters = {}) {
    try {
      let query;
      let replacements;

      if (Array.isArray(parameters)) {
        // Si es array, usar placeholders posicionales (?)
        const placeholders = parameters.map(() => '?').join(', ');
        query = placeholders 
          ? `CALL ${procedure}(${placeholders})`
          : `CALL ${procedure}()`;
        replacements = parameters;
      } else {
        // Si es objeto, usar placeholders con nombre (:key)
        const placeholders = Object.keys(parameters)
          .map(key => `:${key}`)
          .join(', ');
        query = placeholders 
          ? `CALL ${procedure}(${placeholders})`
          : `CALL ${procedure}()`;
        replacements = parameters;
      }

      await sequelize.query(query, {
        replacements: replacements,
        type: QueryTypes.RAW
      });
    } catch (error) {
      logger.error(`Error en executeQuery - ${procedure}:`, error);
      throw error;
    }
  }

  /**
   * Ejecutar query SQL directa
   * @param {string} query - Query SQL
   * @param {object} parameters - Parámetros
   * @param {QueryTypes} type - Tipo de query
   * @returns {Promise<any>}
   */
  async rawQuery(query, parameters = {}, type = QueryTypes.SELECT) {
    try {
      const [results] = await sequelize.query(query, {
        replacements: parameters,
        type: type,
        raw: true
      });

      return results;
    } catch (error) {
      logger.error('Error en rawQuery:', error);
      throw error;
    }
  }
}

export default new TransactSQL();
