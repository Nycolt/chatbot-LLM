/**
 * Middleware para extraer información de productos usando múltiples métodos
 * 
 * Orden de extracción (de más rápido a más lento):
 * 1. Regex - Patrones de SKU/UNIT conocidos (~1ms)
 * 2. Base de Datos - Búsqueda en productos existentes (~100ms)
 * 3. LLM - Análisis inteligente con Ollama (~3-5s)
 * 
 * El resultado se adjunta a req.productIntent
 */

import productExtractor from '../services/productExtractor.service.js';
import { logger } from '../config/logger.js';
/**
 * Middleware que extrae información del producto desde el mensaje del usuario
 * 
 * @param {Object} options - Opciones del middleware
 * @param {boolean} options.required - Si es true, lanza error si no se puede extraer (default: false)
 * @param {boolean} options.skipOnError - Si es true, continúa aunque falle (default: true)
 * @param {boolean} options.skipLLM - Si es true, no usa LLM (solo regex y BD) (default: false)
 * @returns {Function} Middleware de Express
 */
export function extractProductIntent(options = {}) {
  const {
    required = false,
    skipOnError = true,
    skipLLM = false
  } = options;

  return async (req, res, next) => {
    const startTime = Date.now();
    
    try {
      // Obtener el mensaje del usuario desde el body
      const userMessage = req.body || req.body.question || req.body.query;

      if (!userMessage) {
        if (required) {
          return res.status(400).json({
            success: false,
            error: 'Mensaje del usuario es requerido'
          });
        }
        return next();
      }

      //informacion ultimo mensaje
      const msj_info = userMessage[userMessage.length - 1];
      if(msj_info.role === "system"){
        return next();
      }

      // Extraer usando el servicio de extracción en cascada
      const extractedData = await productExtractor.extract(msj_info.content, { skipLLM });

      if (extractedData) {
        // Adjuntar la información extraída al request
        req.productIntent = {
          entity: 'product',
          filters: {
            brand: extractedData.brand,
            unit: extractedData.unit || "No identificado",
            variant: extractedData.variant
          },
          fields: extractedData.fields || [],
          extractionMethod: extractedData.method,
          extractionTime: extractedData.elapsed
        };

        // Agregar parámetro search al body con toda la información extraída
        req.productos = {
          brand: extractedData.brand,
          unit: extractedData.unit || "No identificado",
          variant: extractedData.variant,
          fields: extractedData.fields || [],
          method: extractedData.method,
          elapsed: extractedData.elapsed
        };

        // Log para debugging
        const elapsed = Date.now() - startTime;
        logger.info(`✓ Producto extraído en ${elapsed}ms usando ${extractedData.method}:`, {
          brand: extractedData.brand,
          unit: extractedData.unit || "No identificado",
          variant: extractedData.variant,
          fields: extractedData.fields
        });
      } else {
        req.productIntent = null;
        req.body.search = null;
      }

      next();

    } catch (error) {
      const elapsed = Date.now() - startTime;
      logger.error(`❌ Error extrayendo producto (${elapsed}ms):`, error.message);
 
      // Si skipOnError es true, continuar sin la intención
      if (skipOnError) {
        req.productIntent = null;
        return next();
      }

      // Si required es true, devolver error
      if (required) {
        return res.status(400).json({
          success: false,
          error: 'No se pudo extraer la información del producto',
          details: error.message
        });
      }

      next();
    }
  };
}

/**
 * Middleware que verifica si se extrajo un producto
 * Usar después de extractProductIntent
 */
export function requireProductIntent(req, res, next) {
  if (!req.productIntent) {
    return res.status(400).json({
      success: false,
      error: 'No se pudo identificar el producto en tu pregunta'
    });
  }

  next();
}

/**
 * Middleware que valida que se haya especificado al menos unit o variant
 */
export function requireProductFilters(req, res, next) {
  if (!req.productIntent) {
    return res.status(400).json({
      success: false,
      error: 'No se pudo identificar el producto'
    });
  }

  const { brand, unit, variant } = req.productIntent.filters;

  if (!unit && !variant) {
    return res.status(400).json({
      success: false,
      error: 'Debes especificar al menos el producto (UNIT) o la variante (SKU)'
    });
  }

  next();
}

export default {
  extractProductIntent,
  requireProductIntent,
  requireProductFilters
};
