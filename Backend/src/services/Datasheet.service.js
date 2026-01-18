import { Datasheet, DatasheetTemp } from '../models/Datasheet.model.js';
import { bulkCreate, bulkCreateInChunks } from '../utils/bulk.utils.js';
import TransactSQL from './TransactSQL.js';


class DatasheetService {

  /**
   * Crear múltiples productos de forma masiva
   * @param {Array} productos - Array de objetos de producto
   * @param {object} options - Opciones adicionales
   * @returns {Promise<Array>} - Productos creados
   */
  async bulkCreateDatasheets(datasheets, options = {}) {

    const { useChunks = false, chunkSize = 500 } = options;
    
    if (useChunks && datasheets.length > chunkSize) {
      // Usar chunks para grandes volúmenes
      return await bulkCreateInChunks(DatasheetTemp, datasheets, chunkSize);
    } else {
      // Inserción masiva directa
      return await bulkCreate(DatasheetTemp, datasheets, {
        validate: true
      });
    }

  }

  /**
   * Sincronizar productos desde DatasheetTemp a Datasheet
   * Usa el SP DebbugDatasheets para:
   * 1. Insertar nuevas datasheets
   * 2. Actualizar datasheets existentes
   * 3. Limpiar tabla temporal
   * @returns {Promise<object>} - Resultado de la operación
   */
  async syncDatasheetsFromTemp() {
    return await TransactSQL.singleQuery('DebbugDatasheets');
  }

  /**
   * Obtener datasheets de un producto por su UNIT
   * Retorna todas las variantes/SKUs de un producto base
   * @param {string} unit - UNIT del producto (ej: 'FG-60F', 'FG-100F')
   * @returns {Promise<Array>} - Array de datasheets del producto
   */
  async getDatasheetByUnit(unit) {
    if (!unit || typeof unit !== 'string' || unit.trim() === '') {
      throw new Error('El parámetro UNIT es requerido y debe ser una cadena válida');
    }

    const result = await TransactSQL.singleQuery('GetDatasheetByUnit', [unit.trim()]);
    
    // El SP retorna un array de resultados
    // Si está vacío, significa que no se encontró el producto
    if (!result || result.length === 0) {
      return [];
    }

    return result;
  }
  
}

export default new DatasheetService();