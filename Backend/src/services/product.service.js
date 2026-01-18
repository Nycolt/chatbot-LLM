/**
 * Servicio para lógica de negocio de productos
 */

import ProductTemp from '../models/ProductTemp.model.js';
import Product from '../models/Product.model.js';
import { bulkCreate, bulkCreateInChunks } from '../utils/bulk.utils.js';
import TransactSQL from './TransactSQL.js';

class ProductService {

  /**
   * Crear múltiples productos de forma masiva
   * @param {Array} productos - Array de objetos de producto
   * @param {object} options - Opciones adicionales
   * @returns {Promise<Array>} - Productos creados
   */
  async bulkCreateProducts(productos, options = {}) {

    const { useChunks = false, chunkSize = 500 } = options;
    
    if (useChunks && productos.length > chunkSize) {
      // Usar chunks para grandes volúmenes
      return await bulkCreateInChunks(ProductTemp, productos, chunkSize);
    } else {
      // Inserción masiva directa
      return await bulkCreate(ProductTemp, productos, {
        validate: true
      });
    }

  }

  /**
   * Crear o actualizar múltiples productos (upsert masivo)
   * @param {Array} productos - Array de objetos de producto
   * @param {Array} updateFields - Campos a actualizar si ya existe
   * @returns {Promise<Array>} - Productos procesados
   */
  async bulkUpsertProducts(productos, updateFields) {
    return await bulkCreate(Product, productos, {
      updateOnDuplicate: updateFields,
      validate: true
    });
  }

  /**
   * Sincronizar productos desde ProductoTemporal a Producto
   * Usa el SP DebbugProductos para:
   * 1. Insertar nuevos productos
   * 2. Actualizar productos existentes
   * 3. Limpiar tabla temporal
   * @returns {Promise<object>} - Resultado de la operación
   */
  async syncProductosFromTemp() {
    return await TransactSQL.singleQuery('DebbugProductos');
  }

  /**
   * Obtener productos por UNIT y opcionalmente por SKU
   * Si SKU es null, retorna todos los productos del UNIT
   * Si SKU tiene valor, retorna el producto específico
   * @param {string} unit - UNIT del producto (requerido)
   * @param {string|null} sku - SKU del producto (opcional)
   * @returns {Promise<Array>} - Array de productos encontrados
   */
  async getProductByUnitAndSku(unit, sku = null) {
    if (!unit || typeof unit !== 'string' || unit.trim() === '') {
      throw new Error('El parámetro UNIT es requerido y debe ser una cadena válida');
    }

    // Normalizar SKU (si viene vacío, convertirlo a null)
    const normalizedSku = (sku && sku.trim() !== '') ? sku.trim() : null;

    const result = await TransactSQL.listQuery('GetProductByUnitAndSku', [
      unit.trim(),
      normalizedSku
    ]);
    
    return result || [];
  }

  /**
   * Obtener todos los productos de un UNIT específico
   * Retorna todas las variantes/SKUs de un producto base
   * @param {string} unit - UNIT del producto (requerido)
   * @returns {Promise<Array>} - Array de productos encontrados
   */
  async getProductByUnit(unit) {
    if (!unit || typeof unit !== 'string' || unit.trim() === '') {
      throw new Error('El parámetro UNIT es requerido y debe ser una cadena válida');
    }

    const result = await TransactSQL.listQuery('GetProductByUnit', [unit.trim()]);
    
    return result || [];
  }
  
}

export default new ProductService();