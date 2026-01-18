import fs from 'fs/promises';
import path from 'path';
import config from '../config/llm.config.js';

/**
 * Servicio para interactuar con Ollama (o cualquier otro proveedor LLM)
 * 
 * Responsabilidades:
 * - Cargar prompts desde archivos
 * - Enviar peticiones al modelo LLM
 * - Parsear respuestas JSON
 * - Manejar errores y reintentos
 * 
 * Diseño desacoplado: cambiar de LLM solo requiere modificar este servicio
 */
class OllamaService {
  constructor() {
    this.baseUrl = config.ollama.baseUrl;
    this.model = config.ollama.model;
    this.timeout = config.ollama.timeout;
    this.options = config.ollama.options;
    this.promptCache = new Map(); // Cache para prompts cargados
  }

  /**
   * Carga un prompt desde un archivo .prompt.txt
   * 
   * @param {string} promptName - Nombre del prompt (sin extensión)
   * @param {string} version - Versión del prompt (ej: 'v1')
   * @returns {Promise<string>} - Contenido del prompt
   */
  async loadPrompt(promptName, version = 'v1') {
    const cacheKey = `${promptName}.${version}`;
    
    // Retornar desde cache si existe
    if (this.promptCache.has(cacheKey)) {
      return this.promptCache.get(cacheKey);
    }

    try {
      const promptPath = path.join(
        config.paths.promptsDir,
        `${promptName}.${version}.prompt.txt`
      );
      
      const promptContent = await fs.readFile(promptPath, 'utf-8');
      
      // Guardar en cache
      this.promptCache.set(cacheKey, promptContent);
      
      return promptContent;
    } catch (error) {
      throw new Error(`Error cargando prompt ${promptName}.${version}: ${error.message}`);
    }
  }

  /**
   * Genera texto usando el modelo LLM
   * 
   * @param {string} prompt - Prompt completo a enviar
   * @param {Object} options - Opciones adicionales para la generación
   * @returns {Promise<string>} - Respuesta del modelo
   */
  async generate(prompt, options = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          prompt: prompt,
          stream: false, // Deshabilitamos streaming para obtener respuesta completa
          options: {
            ...this.options,
            ...options
          }
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Error HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.response;

    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new Error(`Timeout: El modelo no respondió en ${this.timeout}ms`);
      }
      
      throw new Error(`Error comunicándose con Ollama: ${error.message}`);
    }
  }

  /**
   * Genera texto usando el modelo LLM - version message
   * 
   * @param {Array} messages - Mensajes completos a enviar
   * @param {Object} options - Opciones adicionales para la generación
   * @returns {Promise<string>} - Respuesta del modelo
   */
  async generateMessages(messages, options = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages: messages,
          stream: false, // Deshabilitamos streaming para obtener respuesta completa
          options: {
            ...this.options,
            ...options
          }
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Error HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.message; // En /api/chat la respuesta está en message.content

    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new Error(`Timeout: El modelo no respondió en ${this.timeout}ms`);
      }
      
      throw new Error(`Error comunicándose con Ollama: ${error.message}`);
    }
  }

  /**
   * Genera JSON estructurado a partir de un prompt
   * 
   * Intenta parsear la respuesta del modelo como JSON
   * Maneja casos donde el modelo incluye markdown o texto extra
   * 
   * @param {string} prompt - Prompt que solicita una respuesta JSON
   * @param {Object} options - Opciones adicionales
   * @returns {Promise<Object>} - Objeto JSON parseado
   */
  async generateJSON(prompt, options = {}) {
    const rawResponse = await this.generate(prompt, options);
    
    try {
      // Verificar si la respuesta está vacía
      if (!rawResponse || rawResponse.trim() === '') {
        throw new Error('El modelo devolvió una respuesta vacía');
      }

      // Intentar extraer JSON de la respuesta
      // El modelo podría incluir ```json o texto adicional
      const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
      
      if (!jsonMatch) {
        throw new Error(`No se encontró un objeto JSON válido en la respuesta. Respuesta: "${rawResponse}"`);
      }

      const jsonString = jsonMatch[0];
      const parsedJson = JSON.parse(jsonString);
      
      return parsedJson;

    } catch (error) {
      throw new Error(
        `Error parseando JSON de la respuesta del modelo: ${error.message}\n` +
        `Respuesta raw: ${rawResponse.substring(0, 200)}...`
      );
    }
  }

  /**
   * Extrae intención de una pregunta de usuario
   * 
   * Combina el prompt del sistema con la pregunta del usuario
   * y obtiene una respuesta JSON estructurada
   * 
   * @param {string} userQuestion - Pregunta del usuario
   * @returns {Promise<Object>} - Intención estructurada (sin validar)
   */
  async extractIntent(userQuestion) {
    // Cargar el prompt del sistema (sin cache para desarrollo)
    this.clearPromptCache(); // Forzar recarga del prompt
    
    const systemPrompt = await this.loadPrompt(
      'intent-extraction',
      config.paths.intentPromptVersion
    );

    // Combinar prompt del sistema con pregunta del usuario
    const fullPrompt = `${systemPrompt}\n\n${userQuestion}`;

    // Obtener respuesta JSON del modelo con opciones optimizadas
    const intentJson = await this.generateJSON(fullPrompt, {
      num_predict: 100, // Limitar aún más para respuestas rápidas
      temperature: 0.05 // Más determinista = más rápido
    });

    return intentJson;
  }

  /**
   * Extrae intención con reintentos en caso de error
   * 
   * @param {string} userQuestion - Pregunta del usuario
   * @returns {Promise<Object>} - Intención estructurada (sin validar)
   */
  async extractIntentWithRetry(userQuestion) {
    const { maxAttempts, delayMs, backoffMultiplier } = config.retry;
    let lastError;
    let currentDelay = delayMs;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await this.extractIntent(userQuestion);
      } catch (error) {
        lastError = error;
        
        if (attempt < maxAttempts) {
          // Esperar antes de reintentar (backoff exponencial)
          await new Promise(resolve => setTimeout(resolve, currentDelay));
          currentDelay *= backoffMultiplier;
        }
      }
    }

    throw new Error(
      `Falló extracción de intención después de ${maxAttempts} intentos: ${lastError.message}`
    );
  }

  /**
   * Limpia el cache de prompts
   * Útil en desarrollo cuando se modifican los archivos de prompts
   */
  clearPromptCache() {
    this.promptCache.clear();
  }
}

// Exportar instancia singleton
const ollamaService = new OllamaService();
export default ollamaService;
