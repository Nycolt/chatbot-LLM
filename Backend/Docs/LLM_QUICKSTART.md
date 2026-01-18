````markdown
# 🚀 Guía Rápida - Módulo LLM Híbrido

## Selección de Proveedor

El sistema **detecta automáticamente** qué proveedor usar:

- 🏠 **Ollama** (local, gratis) - Por defecto
- ☁️ **OpenRouter** (cloud, pago) - Si configuras API key

## Instalación y Setup

### Opción A: Ollama (Recomendado para desarrollo)

#### 1. Instalar Ollama
```bash
# Windows: Descargar desde https://ollama.ai/download
# Linux/Mac:
curl -fsSL https://ollama.ai/install.sh | sh
```

### 2. Descargar modelo Phi-3
```bash
ollama pull phi3
```

### 3. Verificar instalación
```bash
ollama list
# Debe aparecer phi3
```

### 4. Iniciar Ollama (si no está corriendo)
```bash
ollama serve
```

### Opción B: OpenRouter (Recomendado para producción)

#### 1. Obtener API Key
```bash
# Registrarse en https://openrouter.ai
# Obtener clave en https://openrouter.ai/keys
```

#### 2. Configurar en .env
```bash
OPENROUTER_API_KEY=sk-or-v1-tu-clave-aqui
OPENROUTER_MODEL=anthropic/claude-3-sonnet
```

#### 3. El sistema cambiará automáticamente a OpenRouter
```bash
# Logs al iniciar:
# 🤖 LLM Provider: OpenRouter (anthropic/claude-3-sonnet) - OPENROUTER_API_KEY configured
```

## Uso Rápido

### Opción 1: Uso simple
```javascript
import llm from './src/llm/index.js';

const intent = await llm.extractIntent('¿Cuántos puertos tiene el forti32h?');
console.log(intent);
// {
//   "entity": "product",
//   "filters": { "brand": null, "model": "forti32h" },
//   "fields": ["ports"]
// }
```

### Opción 2: Uso seguro (sin excepciones)
```javascript
import llm from './src/llm/index.js';

const result = await llm.extractIntentSafe('¿Cuántos puertos tiene el forti32h?');

if (result.valid) {
  console.log('Intención:', result.data);
} else {
  console.log('Errores:', result.errors);
}
```

## Probar el módulo

```bash
# Ejecutar ejemplos
node src/llm/examples/intent-extraction.example.js
```

## Integración en tu controlador

```javascript
// En tu controlador de productos
import llm from '../llm/index.js';

async function handleUserQuestion(req, res) {
  try {
    const { question } = req.body;
    
    // Extraer intención
    const intent = await llm.extractIntent(question);
    
    // intent.entity -> "product"
    // intent.filters.brand -> "cisco" o null
    // intent.filters.model -> "2960" o null
    // intent.fields -> ["price", "stock"]
    
    // Aquí usarías la intención para consultar tu BD
    // const products = await productService.findByIntent(intent);
    
    res.json({ intent });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}
```

## Troubleshooting

### Error: "fetch failed" o "ECONNREFUSED"
- ✓ Verifica que Ollama esté corriendo: `ollama list`
- ✓ Inicia Ollama si es necesario: `ollama serve`
- ✓ O configura OpenRouter como fallback

### Error: "model not found"
- ✓ Descarga el modelo: `ollama pull phi3`
- ✓ O cambia a OpenRouter configurando API key

### Error: "No LLM provider available"
- ✓ Inicia Ollama: `ollama serve`
- ✓ O configura `OPENROUTER_API_KEY` en `.env`

### Respuestas inválidas del modelo
- ✓ El módulo reintenta automáticamente 3 veces
- ✓ Ajusta la temperatura en `src/config/llm.config.js`

### Timeout
- ✓ Aumenta `OLLAMA_TIMEOUT` en `.env`
- ✓ Verifica recursos del sistema (RAM, CPU)

## Ejemplos de preguntas soportadas

✅ "¿Cuántos puertos tiene el forti32h?"  
✅ "¿Cuál es el precio del Cisco 2960?"  
✅ "Dame información del router Mikrotik RB3011"  
✅ "¿Hay stock de switches HP?"  
✅ "Características del switch Cisco"  
✅ "¿Cuánto cuesta el producto X?"  

## Variables de entorno (.env)

```bash
# Proveedor (auto detecta si no se especifica)
LLM_PROVIDER=auto

# Ollama (local)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=phi3
OLLAMA_TIMEOUT=3600000

# OpenRouter (cloud)
OPENROUTER_API_KEY=sk-or-v1-...  # Descomenta para activar
OPENROUTER_MODEL=anthropic/claude-3-sonnet
```

## Cambiar de modelo

### Ollama
En `.env`:
```bash
OLLAMA_MODEL=llama2
```

Descargar el nuevo modelo:
```bash
ollama pull llama2
```

### OpenRouter
En `.env`:
```bash
OPENROUTER_MODEL=openai/gpt-4-turbo
# o
OPENROUTER_MODEL=meta-llama/llama-3-70b
```

Ver modelos disponibles: https://openrouter.ai/models

## Próximos pasos

1. ✅ El módulo extrae la intención
2. 📝 **Tú implementas**: Usar la intención para consultar la BD
3. 📝 **Tú implementas**: Formatear la respuesta para el usuario

El módulo NO:
- ❌ No genera SQL
- ❌ No consulta la base de datos
- ❌ No formatea respuestas para el usuario

Solo convierte pregunta → intención estructurada y validada.

````
