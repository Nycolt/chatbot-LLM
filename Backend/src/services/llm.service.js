import config from '../config/llm.config.js';
import { logger } from '../config/logger.js';
import OllamaAdapter from './llm/OllamaAdapter.js';
import OpenRouterAdapter from './llm/OpenRouterAdapter.js';

/**
 * Servicio LLM Unificado con Auto-Detección
 * 
 * Selecciona automáticamente entre Ollama y OpenRouter basado en:
 * 1. Si OPENROUTER_API_KEY está configurado → usa OpenRouter
 * 2. Si Ollama está disponible (health check) → usa Ollama
 * 3. Si Ollama falla y hay OPENROUTER_API_KEY → fallback a OpenRouter
 * 4. Si nada funciona → lanza error
 * 
 * Mantiene la misma interfaz que ollamaService para compatibilidad
 */
class LLMService {
  constructor() {
    this.provider = null;
    this.adapter = null;
    this.providerCheckCache = null;
    this.providerCheckTimestamp = null;
    this.CACHE_DURATION = 60000; // 60 segundos
  }

  /**
   * Verifica si Ollama está disponible
   */
  async isOllamaAvailable() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 segundos timeout

      const response = await fetch(`${config.ollama.baseUrl}/api/tags`, {
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Detecta qué proveedor usar basado en configuración y disponibilidad
   */
  async detectProvider() {
    const now = Date.now();
    
    // Retornar del cache si es reciente
    if (this.providerCheckCache && 
        this.providerCheckTimestamp && 
        (now - this.providerCheckTimestamp) < this.CACHE_DURATION) {
      return this.providerCheckCache;
    }

    let detectedProvider = null;
    let reason = '';

    // Prioridad 1: Si hay API key de OpenRouter configurada, usarla directamente
    if (config.openrouter.apiKey) {
      detectedProvider = 'openrouter';
      reason = 'OPENROUTER_API_KEY configured';
      logger.info(`🤖 LLM Provider: OpenRouter (${config.openrouter.model}) - ${reason}`);
    }
    // Prioridad 2: Intentar Ollama si no hay API key
    else {
      const ollamaAvailable = await this.isOllamaAvailable();
      
      if (ollamaAvailable) {
        detectedProvider = 'ollama';
        reason = 'local instance available';
        logger.info(`🤖 LLM Provider: Ollama (${config.ollama.model}) - ${reason}`);
      }
      // Prioridad 3: Fallback a OpenRouter si Ollama no está disponible
      else if (config.openrouter.apiKey) {
        detectedProvider = 'openrouter';
        reason = 'Ollama unavailable, fallback to OpenRouter';
        logger.warn(`⚠️ Ollama not available at ${config.ollama.baseUrl}`);
        logger.info(`🤖 LLM Provider: OpenRouter (${config.openrouter.model}) - ${reason}`);
      }
      // Sin opciones disponibles
      else {
        logger.error('❌ No LLM provider available');
        logger.error(`   - Ollama not responding at ${config.ollama.baseUrl}`);
        logger.error(`   - OPENROUTER_API_KEY not configured`);
        throw new Error(
          'No LLM provider available. Please start Ollama or configure OPENROUTER_API_KEY.'
        );
      }
    }

    // Cachear resultado
    this.providerCheckCache = detectedProvider;
    this.providerCheckTimestamp = now;

    return detectedProvider;
  }

  /**
   * Inicializa el adapter apropiado
   */
  async initialize() {
    if (this.adapter) {
      return; // Ya inicializado
    }

    this.provider = await this.detectProvider();

    if (this.provider === 'ollama') {
      this.adapter = new OllamaAdapter();
    } else if (this.provider === 'openrouter') {
      this.adapter = new OpenRouterAdapter();
    }

    logger.info(`✅ LLM Service initialized with ${this.provider} provider`);
  }

  /**
   * Fuerza re-detección del proveedor (útil para testing/desarrollo)
   */
  async resetProvider() {
    this.provider = null;
    this.adapter = null;
    this.providerCheckCache = null;
    this.providerCheckTimestamp = null;
    logger.info('🔄 LLM Provider reset - will re-detect on next request');
  }

  /**
   * Carga un prompt desde archivo
   */
  async loadPrompt(promptName, version = 'v1') {
    await this.initialize();
    return this.adapter.loadPrompt(promptName, version);
  }

  /**
   * Genera texto usando el proveedor activo
   */
  async generate(prompt, options = {}) {
    await this.initialize();
    return this.adapter.generate(prompt, options);
  }

  /**
   * Genera respuesta usando chat messages
   */
  async generateMessages(messages, options = {}) {
    await this.initialize();
    return this.adapter.generateMessages(messages, options);
  }

  /**
   * Genera JSON estructurado
   */
  async generateJSON(prompt, options = {}) {
    await this.initialize();
    return this.adapter.generateJSON(prompt, options);
  }

  /**
   * Extrae intención de pregunta de usuario
   */
  async extractIntent(userQuestion) {
    await this.initialize();
    return this.adapter.extractIntent(userQuestion);
  }

  /**
   * Extrae intención con reintentos
   */
  async extractIntentWithRetry(userQuestion) {
    await this.initialize();
    return this.adapter.extractIntentWithRetry(userQuestion);
  }

  /**
   * Limpia cache de prompts
   */
  clearPromptCache() {
    if (this.adapter) {
      this.adapter.clearPromptCache();
    }
  }

  /**
   * Obtiene información del proveedor activo
   */
  async getProviderInfo() {
    await this.initialize();
    return {
      provider: this.provider,
      model: this.provider === 'ollama' ? config.ollama.model : config.openrouter.model,
      baseUrl: this.provider === 'ollama' ? config.ollama.baseUrl : config.openrouter.baseUrl,
    };
  }
}

// Exportar instancia singleton
const llmService = new LLMService();
export default llmService;
