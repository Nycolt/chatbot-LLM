import OpenAI from 'openai';
import fs from 'fs/promises';
import path from 'path';
import config from '../../config/llm.config.js';
import { logger } from '../../config/logger.js';

/**
 * Adapter para OpenRouter usando el SDK de OpenAI
 * 
 * OpenRouter es compatible con la API de OpenAI, permitiendo
 * usar modelos de múltiples proveedores (GPT, Claude, Llama, etc.)
 */
class OpenRouterAdapter {
  constructor() {
    const openrouterConfig = config.openrouter;
    
    // Configurar cliente OpenAI con base URL de OpenRouter
    this.client = new OpenAI({
      apiKey: openrouterConfig.apiKey,
      baseURL: openrouterConfig.baseUrl,
      defaultHeaders: {
        ...(openrouterConfig.siteUrl && { 'HTTP-Referer': openrouterConfig.siteUrl }),
        ...(openrouterConfig.appName && { 'X-Title': openrouterConfig.appName }),
      },
      timeout: openrouterConfig.timeout,
    });

    this.model = openrouterConfig.model;
    this.options = openrouterConfig.options;
    this.promptCache = new Map();
    
    logger.info(`OpenRouterAdapter initialized with model: ${this.model}`);
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
   * Genera texto usando OpenRouter
   * 
   * Simula la API de Ollama usando chat completions con un solo mensaje
   */
  async generate(prompt, options = {}) {
    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'user', content: prompt }
        ],
        temperature: options.temperature ?? this.options.temperature,
        top_p: options.top_p ?? this.options.top_p,
        max_tokens: options.num_predict ?? this.options.max_tokens,
        stop: options.stop ?? this.options.stop,
      });

      return response.choices[0].message.content;

    } catch (error) {
      throw new Error(`Error comunicándose con OpenRouter: ${error.message}`);
    }
  }

  /**
   * Genera respuesta usando chat messages (formato OpenAI nativo)
   */
  async generateMessages(messages, options = {}) {
    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: messages,
        temperature: options.temperature ?? this.options.temperature,
        top_p: options.top_p ?? this.options.top_p,
        max_tokens: options.num_predict ?? this.options.max_tokens,
        stop: options.stop ?? this.options.stop,
      });

      // Retornar en formato compatible con Ollama
      return {
        role: response.choices[0].message.role,
        content: response.choices[0].message.content,
      };

    } catch (error) {
      throw new Error(`Error comunicándose con OpenRouter: ${error.message}`);
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

    // Usar menos tokens para modelos más potentes
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

export default OpenRouterAdapter;
