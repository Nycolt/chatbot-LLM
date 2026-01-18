/**
 * Utilidades para ejecutar Stored Procedures en MySQL
 */

import { sequelize } from '../config/database.js';
import { QueryTypes } from 'sequelize';

class StoredProcedureHelper {
  /**
   * Ejecutar un stored procedure sin parámetros
   * @param {string} procedureName - Nombre del procedimiento
   * @returns {Promise<Array>} - Resultado del procedimiento
   */
  static async execute(procedureName) {
    try {
      const results = await sequelize.query(`CALL ${procedureName}()`, {
        type: QueryTypes.RAW,
      });
      return results;
    } catch (error) {
      throw new Error(`Error ejecutando SP ${procedureName}: ${error.message}`);
    }
  }

  /**
   * Ejecutar un stored procedure con parámetros
   * @param {string} procedureName - Nombre del procedimiento
   * @param {Array} params - Parámetros del procedimiento
   * @returns {Promise<Array>} - Resultado del procedimiento
   */
  static async executeWithParams(procedureName, params = []) {
    try {
      // Construir placeholders para los parámetros
      const placeholders = params.map(() => '?').join(', ');
      
      const results = await sequelize.query(
        `CALL ${procedureName}(${placeholders})`,
        {
          replacements: params,
          type: QueryTypes.RAW,
        }
      );
      return results;
    } catch (error) {
      throw new Error(`Error ejecutando SP ${procedureName}: ${error.message}`);
    }
  }

  /**
   * Ejecutar un stored procedure y devolver solo el primer resultado
   * @param {string} procedureName - Nombre del procedimiento
   * @param {Array} params - Parámetros del procedimiento
   * @returns {Promise<Array>} - Primera fila del resultado
   */
  static async executeOne(procedureName, params = []) {
    const results = await this.executeWithParams(procedureName, params);
    return results[0] || [];
  }

  /**
   * Ejecutar un stored procedure con parámetros nombrados
   * @param {string} procedureName - Nombre del procedimiento
   * @param {Object} namedParams - Objeto con los parámetros nombrados
   * @returns {Promise<Array>} - Resultado del procedimiento
   * 
   * Ejemplo:
   * await executeWithNamedParams('GetUserByEmail', { email: 'test@test.com' })
   */
  static async executeWithNamedParams(procedureName, namedParams = {}) {
    try {
      const paramNames = Object.keys(namedParams);
      const placeholders = paramNames.map(name => `:${name}`).join(', ');
      
      const results = await sequelize.query(
        `CALL ${procedureName}(${placeholders})`,
        {
          replacements: namedParams,
          type: QueryTypes.RAW,
        }
      );
      return results;
    } catch (error) {
      throw new Error(`Error ejecutando SP ${procedureName}: ${error.message}`);
    }
  }

  /**
   * Ejecutar query SQL personalizado
   * @param {string} query - Query SQL
   * @param {Object} options - Opciones adicionales
   * @returns {Promise<Array>} - Resultado de la query
   */
  static async executeQuery(query, options = {}) {
    try {
      const results = await sequelize.query(query, {
        type: QueryTypes.SELECT,
        ...options,
      });
      return results;
    } catch (error) {
      throw new Error(`Error ejecutando query: ${error.message}`);
    }
  }
}

export default StoredProcedureHelper;
