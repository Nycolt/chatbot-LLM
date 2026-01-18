/**
 * Controlador de autenticación
 */

import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';
import ProductService from '../services/product.service.js';
/**
 * @desc    Insertar productos masivamente
 * @route   POST /api/v1/products/insert/masivo
 * @access  Public
 */
const insertarProductos = asyncHandler(async (req, res) => {
  const Productos = req.body;
  
  const result = await ProductService.bulkCreateProducts(Productos);
  const stats = await ProductService.syncProductosFromTemp();

  ApiResponse.created(res, result, `${result.length} productos insertados correctamente`);
});




export {
 insertarProductos
};
