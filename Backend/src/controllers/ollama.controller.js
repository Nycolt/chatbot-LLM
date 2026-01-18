/**
 * Controlador de autenticación
 */


import ProductService from '../services/product.service.js';
import DatasheetService from '../services/Datasheet.service.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';
import llmService from '../services/llm.service.js';

/**
 * @desc    Insertar productos masivamente
 * @route   POST /api/v1/products/insert/masivo
 * @access  Public
 */
const askAgent = asyncHandler(async (req, res) => {

  const Messages = req.body;
  const productos = req.productos || null;

  if (productos) {

    //obtener el datasheet del producto si existe
    const datasheet = await DatasheetService.getDatasheetByUnit(productos.unit);

    //obtener el producto
    const productosObtenidos = productos.variant == null ? await ProductService.getProductByUnit(productos.unit) :
      await ProductService.getProductByUnitAndSku(productos.unit, productos.variant);

    // Seleccionar el producto con el ID menor si hay múltiples variantes
    if (productosObtenidos && datasheet) {
      // Si se detectó un producto, agregar contexto al mensaje del agente
      Messages.push({
        role: 'system',
        content: `
          El usuario mencionó el siguiente producto:\nMarca: ${productos.brand}\nUnidad: ${productos.unit}\nVariante: ${productos.variant}\nCampos solicitados: ${productos.fields.join(', ') || 'Ninguno'}
          responde deacuerdo a la siguiente información del producto:\n${JSON.stringify(productosObtenidos)}\nY la siguiente hoja de datos:\n${JSON.stringify(datasheet)} no vuelvas a saludar
        `
      });
    }

  }

  const agentAnswer = await llmService.generateMessages(Messages);

  const responseData = [
    ...Messages,
    agentAnswer
  ]

  ApiResponse.created(res, responseData, `Respuesta generada correctamente`);
});




export {
  askAgent
};
