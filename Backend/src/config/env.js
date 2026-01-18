/**
 * Configuración de variables de entorno
 */

import 'dotenv/config';

export default {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Database
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    name: process.env.DB_NAME || 'chat_db',
    user: process.env.DB_USER || 'chat_user',
    password: process.env.DB_PASSWORD || '',
    dialect: process.env.DB_DIALECT || 'mysql',
  },
  
  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'default-secret-key',
    expire: process.env.JWT_EXPIRE || '7d',
  },
  
  // CORS
  cors: {
    origin: process.env.CORS_ORIGIN 
      ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
      : ['http://localhost:3000'],
  },
  
  // API
  api: {
    version: process.env.API_VERSION || 'v1',
  },

  // LLM Configuration
  llm: {
    // Provider selection: 'auto', 'ollama', or 'openrouter'
    provider: process.env.LLM_PROVIDER || 'auto',
    
    // Ollama configuration
    ollama: {
      baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
      model: process.env.OLLAMA_MODEL || 'phi3',
      timeout: process.env.OLLAMA_TIMEOUT || '3600000',
    },
    
    // OpenRouter configuration
    openrouter: {
      apiKey: process.env.OPENROUTER_API_KEY,
      baseUrl: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
      model: process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.3-70b-instruct:free',
      timeout: process.env.OPENROUTER_TIMEOUT || '60000',
      siteUrl: process.env.OPENROUTER_SITE_URL,
      appName: process.env.OPENROUTER_APP_NAME,
    },
  },
};
