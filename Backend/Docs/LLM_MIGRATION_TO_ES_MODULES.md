````markdown
# Migración a ES Modules

El módulo LLM ha sido actualizado para usar ES Modules (import/export) en lugar de CommonJS (require/module.exports).

## ✅ Cambios realizados

### 1. **Importaciones y exportaciones**

#### Antes (CommonJS)
```javascript
const ollamaService = require('./services/ollama.service');
const intentValidator = require('./validators/intent.validator');

module.exports = { ... };
```

#### Ahora (ES Modules)
```javascript
import ollamaService from './services/ollama.service.js';
import intentValidator from './validators/intent.validator.js';

export { ... };
export default { ... };
```

### 2. **Rutas de archivos**

#### Antes
```javascript
const config = require('../config/llm.config');
```

#### Ahora
```javascript
import config from '../config/llm.config.js';
```

**Nota importante:** Las extensiones `.js` son **obligatorias** en ES modules.

### 3. **__dirname y __filename**

#### Antes (disponible automáticamente en CommonJS)
```javascript
const promptPath = path.join(__dirname, 'prompts');
```

#### Ahora (se debe crear manualmente)
```javascript
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
```

### 4. **Detección de ejecución directa**

#### Antes
```javascript
if (require.main === module) {
  // código que se ejecuta solo si el archivo se ejecuta directamente
}
```

#### Ahora
```javascript
if (import.meta.url === `file://${process.argv[1]}`) {
  // código que se ejecuta solo si el archivo se ejecuta directamente
}
```

## 📝 Archivos modificados

- ✅ `src/config/llm.config.js` (movido desde `src/llm/config/`)
- ✅ `src/services/ollama.service.js` (movido desde `src/llm/services/`)
- ✅ `src/llm/validators/intent.validator.js`
- ✅ `src/llm/index.js`
- ✅ `src/llm/examples/intent-extraction.example.js`
- ✅ `Docs/LLM_README.md` (ejemplos actualizados)
- ✅ `Docs/LLM_QUICKSTART.md` (ejemplos actualizados)

## 🔧 Prerequisitos

El `package.json` debe incluir:

```json
{
  "type": "module"
}
```

✅ Ya está configurado en el proyecto.

## 📖 Ejemplos de uso actualizados

### Importar el módulo completo
```javascript
import llm from './src/llm/index.js';

const intent = await llm.extractIntent('pregunta del usuario');
```

### Importar funciones específicas
```javascript
import { extractIntent, extractIntentSafe } from './src/llm/index.js';

const intent = await extractIntent('pregunta del usuario');
```

### Importar servicios individuales
```javascript
import ollamaService from './src/services/ollama.service.js';
import intentValidator from './src/llm/validators/intent.validator.js';

const rawIntent = await ollamaService.extractIntent('pregunta');
const validated = intentValidator.validateOrThrow(rawIntent);
```

## 🚀 Ejecución de ejemplos

```bash
node src/llm/examples/intent-extraction.example.js
```

## ⚠️ Compatibilidad

- **Node.js**: Requiere Node.js 14+ (soporte nativo de ES modules)
- **Extensiones**: Las rutas deben incluir `.js`
- **Top-level await**: Disponible en módulos ES (no se necesita función async wrapper)

## 🎯 Ventajas de ES Modules

✅ **Sintaxis moderna y estándar** del ecosistema JavaScript  
✅ **Tree-shaking** automático (menor bundle size)  
✅ **Import estático** verificable en tiempo de compilación  
✅ **Top-level await** sin wrappers  
✅ **Better IDE support** y autocompletado  
✅ **Compatibilidad** con tooling moderno (Vite, esbuild, etc.)

## 📚 Referencias

- [Node.js ES Modules](https://nodejs.org/api/esm.html)
- [MDN: JavaScript modules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules)

````
