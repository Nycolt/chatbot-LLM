/**
 * Ejemplo de uso del middleware productParser
 * 
 * Demuestra cómo usar el middleware para extraer información de productos
 * desde mensajes del usuario
 */

import express from 'express';
import { extractProductIntent, requireProductIntent, requireProductFilters } from '../middlewares/productParser.js';

const router = express.Router();

// ====================================
// Ejemplo 1: Extracción opcional
// Si no detecta producto, continúa igual
// ====================================
router.post('/chat', 
  extractProductIntent({ skipOnError: true }), 
  async (req, res) => {
    if (req.productIntent) {
      const { brand, model } = req.productIntent.filters;
      const fields = req.productIntent.fields;
      
      return res.json({
        success: true,
        message: 'Producto detectado',
        product: {
          brand,
          model,
          requestedFields: fields
        }
      });
    }
    
    // Si no hay producto, respuesta genérica
    res.json({
      success: true,
      message: 'Hola, ¿en qué puedo ayudarte?'
    });
  }
);

// ====================================
// Ejemplo 2: Extracción requerida
// Si no detecta producto, devuelve error
// ====================================
router.post('/product/info', 
  extractProductIntent({ required: true }), 
  requireProductIntent,
  async (req, res) => {
    const { brand, model } = req.productIntent.filters;
    const fields = req.productIntent.fields;
    
    // Aquí buscarías el producto en la BD
    // const product = await Product.findOne({ where: { brand, model } });
    
    res.json({
      success: true,
      product: {
        brand,
        model,
        requestedFields: fields
      }
    });
  }
);

// ====================================
// Ejemplo 3: Requiere brand o model
// ====================================
router.post('/product/search', 
  extractProductIntent({ required: true }), 
  requireProductFilters,
  async (req, res) => {
    const { brand, model } = req.productIntent.filters;
    
    // Construir query dinámico
    const where = {};
    if (brand) where.brand = brand;
    if (model) where.model = model;
    
    // const products = await Product.findAll({ where });
    
    res.json({
      success: true,
      filters: { brand, model },
      message: `Buscando productos con filtros: ${JSON.stringify(where)}`
    });
  }
);

// ====================================
// Ejemplo 4: Uso completo en controlador
// ====================================
router.post('/ask', 
  extractProductIntent({ skipOnError: true }),
  async (req, res) => {
    const { message } = req.body;
    
    // Si se detectó un producto
    if (req.productIntent) {
      const { brand, model } = req.productIntent.filters;
      const fields = req.productIntent.fields;
      
      console.log('Producto solicitado:', { brand, model, fields });
      
      // Simular búsqueda en BD
      const productData = {
        brand: brand || 'Desconocida',
        model: model || 'Desconocido',
        price: '$1,299',
        stock: 15,
        ports: 24,
        description: 'Switch empresarial de alta velocidad'
      };
      
      // Filtrar solo los campos solicitados
      const response = {};
      fields.forEach(field => {
        if (productData[field]) {
          response[field] = productData[field];
        }
      });
      
      return res.json({
        success: true,
        question: message,
        product: {
          brand,
          model,
          data: response
        }
      });
    }
    
    // Respuesta genérica si no se detectó producto
    res.json({
      success: true,
      message: 'No detecté que estés preguntando por un producto específico. ¿Puedes darme más detalles?'
    });
  }
);

export default router;
