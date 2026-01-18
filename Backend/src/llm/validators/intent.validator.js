import Ajv from 'ajv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import config from '../../config/llm.config.js';
import { DatasheetColumns } from '../../config/columnasAgente.js';

/**
 * Validador de intenciones usando AJV (Another JSON Validator)
 * 
 * Responsabilidades:
 * - Cargar schema JSON
 * - Validar respuestas del LLM contra el schema
 * - Proporcionar mensajes de error claros
 * - Rechazar respuestas inválidas
 * 
 * Por qué AJV:
 * - Rápido y eficiente
 * - Soporta JSON Schema draft-07
 * - Mensajes de error detallados
 * - Ampliamente usado en producción
 */
class IntentValidator {
    
  constructor() {
    // Configurar AJV con opciones estrictas
    this.ajv = new Ajv({
      allErrors: true,        // Reportar todos los errores, no solo el primero
      strict: true,           // Modo estricto para evitar schemas ambiguos
      strictSchema: true,     // Validar que el schema sea válido
      strictTypes: true,      // Validación estricta de tipos
      strictTuples: true,     // Validación estricta de tuplas
      strictRequired: true    // Validación estricta de campos requeridos
    });

    // Cargar y compilar el schema
    this.schema = this._loadSchema();
    this.validate = this.ajv.compile(this.schema);
  }

  /**
   * Carga el schema JSON desde el archivo
   * 
   * @private
   * @returns {Object} - Schema JSON
   */
  _loadSchema() {
    try {
      const schemaPath = path.join(config.paths.schemasDir, 'intent.schema.json');
      const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
      return JSON.parse(schemaContent);
    } catch (error) {
      throw new Error(`Error cargando schema de intenciones: ${error.message}`);
    }
  }

  /**
   * Valida una intención contra el schema
   * 
   * @param {Object} intent - Intención a validar
   * @returns {Object} - { valid: boolean, errors: Array|null, data: Object|null }
   */
  validateIntent(intent) {
    // Ejecutar validación con AJV
    const valid = this.validate(intent);

    if (!valid) {
      // Formatear errores de validación
      const formattedErrors = this._formatErrors(this.validate.errors);

      return {
        valid: false,
        errors: formattedErrors,
        data: null
      };
    }

    // Validación adicional: verificar que los campos existan en Datasheet
    if (intent.fields && intent.fields.length > 0) {
      const invalidFields = intent.fields.filter(field => !DatasheetColumns.includes(field));
      
      if (invalidFields.length > 0) {
        return {
          valid: false,
          errors: [{
            field: 'fields',
            message: `Los siguientes campos no existen en Datasheet: ${invalidFields.join(', ')}. Campos válidos: ${DatasheetColumns.join(', ')}`
          }],
          data: null
        };
      }
    }

    return {
      valid: true,
      errors: null,
      data: intent
    };
  }

  /**
   * Valida y lanza excepción si es inválido
   * 
   * @param {Object} intent - Intención a validar
   * @returns {Object} - Intención validada
   * @throws {Error} - Si la intención es inválida
   */
  validateOrThrow(intent) {
    const result = this.validateIntent(intent);

    if (!result.valid) {
      const errorMessages = result.errors
        .map(err => `  - ${err.field}: ${err.message}`)
        .join('\n');

      throw new Error(
        `La intención recibida del LLM no es válida:\n${errorMessages}\n\n` +
        `Intención recibida: ${JSON.stringify(intent, null, 2)}`
      );
    }

    return result.data;
  }

  /**
   * Formatea los errores de AJV en un formato más legible
   * 
   * @private
   * @param {Array} ajvErrors - Errores de AJV
   * @returns {Array} - Errores formateados
   */
  _formatErrors(ajvErrors) {
    return ajvErrors.map(error => {
      let field = error.instancePath || 'root';
      field = field.replace(/^\//, ''); // Remover / inicial
      field = field.replace(/\//g, '.'); // Convertir / a .

      // Construir mensaje legible según el tipo de error
      let message = error.message;

      switch (error.keyword) {
        case 'enum':
          message = `debe ser uno de: ${error.params.allowedValues.join(', ')}`;
          break;
        case 'type':
          message = `debe ser de tipo ${error.params.type}`;
          break;
        case 'required':
          message = `falta la propiedad requerida: ${error.params.missingProperty}`;
          break;
        case 'additionalProperties':
          message = `no se permiten propiedades adicionales: ${error.params.additionalProperty}`;
          break;
        case 'minItems':
          message = `debe tener al menos ${error.params.limit} elementos`;
          break;
        case 'uniqueItems':
          message = `no debe tener elementos duplicados`;
          break;
        default:
          message = error.message;
      }

      return {
        field: field || 'objeto',
        message,
        keyword: error.keyword,
        params: error.params
      };
    });
  }

  /**
   * Verifica si una entidad es válida
   * 
   * @param {string} entity - Entidad a verificar
   * @returns {boolean}
   */
  isValidEntity(entity) {
    const validEntities = this.schema.properties.entity.enum;
    return validEntities.includes(entity);
  }

  /**
   * Verifica si un campo es válido
   * 
   * @param {string} field - Campo a verificar
   * @returns {boolean}
   */
  isValidField(field) {
    const validFields = this.schema.properties.fields.items.enum;
    return validFields.includes(field);
  }

  /**
   * Obtiene la lista de campos válidos
   * 
   * @returns {Array<string>}
   */
  getValidFields() {
    return [...this.schema.properties.fields.items.enum];
  }

  /**
   * Obtiene la lista de entidades válidas
   * 
   * @returns {Array<string>}
   */
  getValidEntities() {
    return [...this.schema.properties.entity.enum];
  }

  /**
   * Recarga el schema (útil en desarrollo)
   */
  reloadSchema() {
    this.schema = this._loadSchema();
    this.validate = this.ajv.compile(this.schema);
  }
}

// Exportar instancia singleton
const intentValidator = new IntentValidator();
export default intentValidator;
