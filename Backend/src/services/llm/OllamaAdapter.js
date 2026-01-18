import fs from 'fs/promises';
import path from 'path';
import config from '../../config/llm.config.js';
import { logger } from '../../config/logger.js';

/**
 * Adapter para Ollama LLM
 * 
 * Implementa la interfaz común de LLM usando la API de Ollama
 */
class OllamaAdapter {
  constructor() {
    this.baseUrl = config.ollama.baseUrl;
    this.model = config.ollama.model;
    this.timeout = config.ollama.timeout;
    this.options = config.ollama.options;
    this.promptCache = new Map();
    
    logger.info(`OllamaAdapter initialized with model: ${this.model}`);
  }

  /**
   * Carga un prompt desde un archivo .prompt.txt
   */
  async loadPrompt(promptName, version = 'v1') {
    const cacheKey = `${promptName}.${version}`;
    
    if (this.promptCache.has(cacheKey)) {
      return this.promptCache.get(cacheKey);
    }

    try {
      const promptPath = path.join(
        config.paths.promptsDir,
        `${promptName}.${version}.prompt.txt`
      );
      
      const promptContent = await fs.readFile(promptPath, 'utf-8');
      this.promptCache.set(cacheKey, promptContent);
      
      return promptContent;
    } catch (error) {
      throw new Error(`Error cargando prompt ${promptName}.${version}: ${error.message}`);
    }
  }

  /**
   * Genera texto usando Ollama
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
          stream: false,
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
        throw new Error(`Timeout: Ollama no respondió en ${this.timeout}ms`);
      }
      
      throw new Error(`Error comunicándose con Ollama: ${error.message}`);
    }
  }

  /**
   * Genera respuesta usando chat messages (formato OpenAI-compatible)
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
          stream: false,
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
      return data.message;

    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new Error(`Timeout: Ollama no respondió en ${this.timeout}ms`);
      }
      
      throw new Error(`Error comunicándose con Ollama: ${error.message}`);
    }
  }

  /**
   * Genera JSON estructurado
   */
  async generateJSON(prompt, options = {}) {
    const rawResponse = await this.generate(prompt, options);
    
    try {
      if (!rawResponse || rawResponse.trim() === '') {
        throw new Error('El modelo devolvió una respuesta vacía');
      }

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
   */
  async extractIntent(userQuestion) {
    this.clearPromptCache();
    
    const systemPrompt = await this.loadPrompt(
      'intent-extraction',
      config.paths.intentPromptVersion
    );

    const fullPrompt = `${systemPrompt}\n\n${userQuestion}`;

    const intentJson = await this.generateJSON(fullPrompt, {
      num_predict: 100,
      temperature: 0.05
    });

    return intentJson;
  }

  /**
   * Extrae intención con reintentos
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
   */
  clearPromptCache() {
    this.promptCache.clear();
  }
}

export default OllamaAdapter;
