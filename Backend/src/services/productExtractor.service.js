/**
 * Servicio de extracción de productos con múltiples estrategias
 * 
 * Orden de ejecución (de más rápido a más lento):
 * 1. Regex/Patrones - Busca SKUs y UNITs conocidos (~0.001s)
 * 2. Búsqueda en BD - Busca coincidencias en productos (~0.1s)  
 * 3. LLM - Análisis inteligente con Ollama (~3-5s)
 */

import  Product from '../models/Product.model.js';
import { Op } from 'sequelize';
import llmService from './llm.service.js';
import intentValidator from '../llm/validators/intent.validator.js';
import { DatasheetColumns } from '../config/columnasAgente.js';
import { logger } from '../config/logger.js';

class ProductExtractor {
  
  constructor() {
    // Mapeo de términos comunes a nombres de columnas de Datasheet
    this.fieldMapping = {
      // Throughput
      'throughput': ['Firewall_Throughput_UDP', 'IPSec_VPN_Throughput', 'IPS_Throughput_Enterprise_Mix'],
      'firewall throughput': ['Firewall_Throughput_UDP'],
      'ipsec': ['IPSec_VPN_Throughput', 'Max_Gateway_To_Gateway_IPSec_Tunnels', 'Max_Client_To_Gateway_IPSec_Tunnels'],
      'vpn': ['IPSec_VPN_Throughput', 'SSL_VPN_Throughput', 'Concurrent_SSL_VPN_Users'],
      'ips': ['IPS_Throughput_Enterprise_Mix'],
      'ngfw': ['NGFW_Throughput_Enterprise_Mix'],
      'ssl': ['SSL_VPN_Throughput', 'SSL_Inspection_Throughput'],
      
      // Sesiones
      'sesiones': ['Concurrent_Sessions', 'New_Sessions_Per_Second'],
      'concurrent sessions': ['Concurrent_Sessions'],
      'sessions': ['Concurrent_Sessions', 'New_Sessions_Per_Second'],
      
      // Políticas
      'politicas': ['Firewall_Policies'],
      'policies': ['Firewall_Policies'],
      'latencia': ['Firewall_Latency'],
      'latency': ['Firewall_Latency'],
      
      // Túneles
      'tuneles': ['Max_Gateway_To_Gateway_IPSec_Tunnels', 'Max_Client_To_Gateway_IPSec_Tunnels'],
      'tunnels': ['Max_Gateway_To_Gateway_IPSec_Tunnels', 'Max_Client_To_Gateway_IPSec_Tunnels'],
      
      // Hardware
      'puertos': ['Interfaces'],
      'ports': ['Interfaces'],
      'interfaces': ['Interfaces'],
      'storage': ['Local_Storage'],
      'almacenamiento': ['Local_Storage'],
      'power': ['Power_Supplies'],
      'fuente': ['Power_Supplies'],
      'form factor': ['Form_Factor'],
      'dominios': ['Virtual_Domains'],
      'vdoms': ['Virtual_Domains'],
      
      // FortiAP/Switch
      'fortiap': ['Max_FortiAPs'],
      'ap': ['Max_FortiAPs'],
      'fortiswitch': ['Max_FortiSwitches'],
      'switch': ['Max_FortiSwitches'],
      'token': ['Max_FortiTokens'],
      'variantes': ['Variants'],
      'variants': ['Variants']
    };
  }
  
  /**
   * Extrae campos/características solicitadas del mensaje
   * Mapea términos comunes a nombres de columnas de Datasheet
   * 
   * @param {string} message - Mensaje del usuario
   * @returns {Array<string>} - Array de nombres de columnas
   */
  extractFields(message) {
    const messageLower = message.toLowerCase();
    const detectedFields = new Set();

    // Buscar coincidencias en el mapeo
    for (const [term, columns] of Object.entries(this.fieldMapping)) {
      if (messageLower.includes(term)) {
        columns.forEach(col => detectedFields.add(col));
      }
    }

    // Buscar coincidencias directas con nombres de columnas (case-insensitive)
    DatasheetColumns.forEach(column => {
      const columnLower = column.toLowerCase();
      const columnWords = columnLower.split('_');
      
      // Si el mensaje contiene todas las palabras de la columna
      if (columnWords.every(word => messageLower.includes(word))) {
        detectedFields.add(column);
      }
    });

    return Array.from(detectedFields);
  }
  
  /**
   * MÉTODO 1: Extracción por Regex (MÁS RÁPIDO)
   * Busca patrones conocidos de SKU y UNIT
   * 
   * @param {string} message - Mensaje del usuario
   * @returns {Object|null} - { brand, unit, variant } o null
   */
  extractByRegex(message) {
    const patterns = {
      // Fortinet SKUs completos: FG-XXX-XXX, FC-XX-XXXXX, FortiGate-40F-3G4G, etc
      fortinetSKU: /\b(FG|FC|FWF|FPX|FMG|FAZ|FSW|FAP)-[A-Z0-9]+(?:-[A-Z0-9]+)*\b/gi,
      
      // FortiGate UNIT completo: FortiGate-40F-3G4G o FortiGate-40F
      fortinetUnit: /FortiGate[-\s]?(\d+[A-Z]?)(?:-[A-Z0-9]+)*/gi,
      
      // Cisco SKUs: C9XXX, WS-CXXXX, etc
      ciscoSKU: /\b(C\d{4}|WS-C\d{4}|AIR-[A-Z0-9-]+)\b/gi,
      
      // HP/Aruba SKUs: J9XXX, JL XXX
      hpSKU: /\b(J[9L]\d{3}[A-Z]?|R\d{3})\b/gi,
    };

    let brand = null;
    let unit = null;
    let variant = null;

    // Buscar Fortinet
    const fortinetSKUMatch = message.match(patterns.fortinetSKU);
    const fortinetUnitMatch = message.match(patterns.fortinetUnit);
    
    if (fortinetSKUMatch || fortinetUnitMatch) {
      brand = 'fortinet';
      variant = fortinetSKUMatch ? fortinetSKUMatch[0] : null;
      
      if (fortinetUnitMatch) {
        // Capturar el UNIT completo incluyendo sufijos como 3G4G
        const fullMatch = fortinetUnitMatch[0];
        const baseUnit = fullMatch.match(/\d+[A-Z]?/)[0];
        // Si tiene sufijos adicionales (ej: FortiGate-40F-3G4G), capturarlos
        const suffixMatch = fullMatch.match(/\d+[A-Z]?(-[A-Z0-9]+)*/);
        unit = suffixMatch ? `FortiGate-${suffixMatch[0]}` : `FortiGate-${baseUnit}`;
      } else if (variant) {
        // Intentar inferir UNIT desde SKU (ej: FG-50G-3G4G -> FortiGate-50G-3G4G)
        const unitFromSKU = variant.match(/FG-(\d+[A-Z]?)(?:-[A-Z0-9]+)*/i);
        if (unitFromSKU) {
          unit = `FortiGate-${unitFromSKU[1]}`;
        }
      }
    }

    // Buscar Cisco
    if (!brand) {
      const ciscoMatch = message.match(patterns.ciscoSKU);
      if (ciscoMatch) {
        brand = 'cisco';
        variant = ciscoMatch[0];
        unit = ciscoMatch[0]; // En Cisco, el SKU suele ser el modelo
      }
    }

    // Buscar HP
    if (!brand) {
      const hpMatch = message.match(patterns.hpSKU);
      if (hpMatch) {
        brand = 'hp';
        variant = hpMatch[0];
      }
    }

    if (brand || unit || variant) {
      const fields = this.extractFields(message);
      logger.info('✓ Método 1 (Regex): Producto extraído', { brand, unit, variant, fields });
      return { brand, unit, variant, fields };
    }

    return null;
  }

  /**
   * MÉTODO 2: Búsqueda en Base de Datos (RÁPIDO)
   * Busca coincidencias en productos existentes
   * 
   * @param {string} message - Mensaje del usuario
   * @returns {Promise<Object|null>} - { brand, unit, variant } o null
   */
  async extractByDatabase(message) {
    try {
      // Normalizar mensaje
      const searchText = message.toLowerCase().trim();

      // Buscar en Product por UNIT o SKU
      const product = await Product.findOne({
        where: {
          [Op.or]: [
            { UNIT: { [Op.like]: `%${searchText}%` } },
            { SKU: { [Op.like]: `%${searchText}%` } },
            { Description: { [Op.like]: `%${searchText}%` } }
          ]
        },
        attributes: ['Brand', 'UNIT', 'SKU'],
        limit: 1
      });

      if (product) {
        const fields = this.extractFields(message);
        
        const result = {
          brand: product.Brand?.toLowerCase() || null,
          unit: product.UNIT || null,
          variant: product.SKU || null,
          fields
        };
        
        logger.info('✓ Método 2 (BD): Producto encontrado', result);
        return result;
      }

      return null;
    } catch (error) {
      logger.error('Error en extracción por BD:', error.message);
      return null;
    }
  }

  /**
   * MÉTODO 3: Extracción con LLM (LENTO pero INTELIGENTE)
   * Usa el servicio LLM (Ollama o OpenRouter) para análisis semántico
   * 
   * @param {string} message - Mensaje del usuario
   * @returns {Promise<Object|null>} - { brand, unit, variant, fields } o null
   */
  async extractByLLM(message) {
    try {
      const rawIntent = await llmService.extractIntentWithRetry(message);
      const validatedIntent = intentValidator.validateOrThrow(rawIntent);
      
      logger.info('✓ Método 3 (LLM): Intención extraída', validatedIntent.filters);
      
      return {
        brand: validatedIntent.filters.brand,
        unit: validatedIntent.filters.unit,
        variant: validatedIntent.filters.variant,
        fields: validatedIntent.fields
      };
    } catch (error) {
      logger.error('Error en extracción por LLM:', error.message);
      return null;
    }
  }

  /**
   * Extrae información del producto usando métodos en cascada
   * Intenta primero los métodos rápidos, LLM como último recurso
   * 
   * @param {string} message - Mensaje del usuario
   * @param {Object} options - Opciones de extracción
   * @param {boolean} options.skipLLM - Saltar LLM si métodos rápidos fallan
   * @returns {Promise<Object|null>} - Información extraída o null
   */
  async extract(message, options = {}) {
    const { skipLLM = false } = options;
    const startTime = Date.now();

    // Método 1: Regex (< 1ms)
    logger.info('[1/3] Intentando extracción por Regex...');
    const regexResult = this.extractByRegex(message);
    
    if (regexResult && (regexResult.unit || regexResult.variant)) {
      const elapsed = Date.now() - startTime;
      logger.info(`✅ Extracción completada en ${elapsed}ms (Regex)`);
      return { 
        ...regexResult, 
        fields: regexResult.fields || [], 
        method: 'regex', 
        elapsed 
      };
    }

    // Método 2: Base de Datos (~100ms)
    logger.info('[2/3] Intentando extracción por BD...');
    const dbResult = await this.extractByDatabase(message);
    
    if (dbResult && (dbResult.unit || dbResult.variant)) {
      const elapsed = Date.now() - startTime;
      logger.info(`✅ Extracción completada en ${elapsed}ms (BD)`);
      return { 
        ...dbResult, 
        fields: dbResult.fields || [], 
        method: 'database', 
        elapsed 
      };
    }

    // Método 3: LLM (~3-5s) - Solo si no se saltó
    if (!skipLLM) {
      logger.info('[3/3] Intentando extracción por LLM...');
      const llmResult = await this.extractByLLM(message);
      
      if (llmResult) {
        const elapsed = Date.now() - startTime;
        logger.info(`✅ Extracción completada en ${elapsed}ms (LLM)`);
        return { ...llmResult, method: 'llm', elapsed };
      }
    } else {
      logger.info('[3/3] Extracción por LLM saltada (skipLLM=true)');
    }

    const elapsed = Date.now() - startTime;
    logger.info(`❌ No se pudo extraer producto en ${elapsed}ms`);
    return null;
  }
}

// Exportar instancia singleton
const productExtractor = new ProductExtractor();
export default productExtractor;
