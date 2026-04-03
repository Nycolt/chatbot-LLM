# ⚙️ Backend - Chatbot Fortinet

API REST desarrollada con Node.js y Express para la gestión de lógica de negocio, dimensionamiento técnico, procesamiento de datos y orquestación de inteligencia artificial (LLM).

---

## 📁 Estructura del Proyecto

```
Backend/
├── src/
│   ├── config/                    # Configuración (DB, env, logger, LLM, sizing, keywords)
│   │   ├── database.js            # Sequelize + MySQL
│   │   ├── env.js                 # Variables de entorno centralizadas
│   │   ├── logger.js              # Winston + express-winston
│   │   ├── llm.config.js          # Ollama / OpenRouter
│   │   ├── columnasAgente.js      # Columnas / contexto del agente
│   │   ├── sizingSchemas.js       # Schemas de formularios de dimensionamiento
│   │   ├── solutionKeywords.js    # Keywords de soluciones Fortinet
│   │   └── recommendationLearning.js
│   │
│   ├── controllers/               # Capa HTTP (req/res)
│   │   ├── auth.controller.js
│   │   ├── user.controller.js
│   │   ├── product.controller.js
│   │   ├── datasheet.controller.js
│   │   ├── datasheetPdf.controller.js
│   │   ├── ollama.controller.js   # Agente conversacional (orquestación)
│   │   ├── priceList.controller.js
│   │   ├── needsInbox.controller.js
│   │   ├── fortiwifi.controller.js
│   │   ├── fortianalyzer.controller.js
│   │   ├── fortiswitch.controller.js
│   │   └── compare.controller.js
│   │
│   ├── middlewares/
│   │   ├── auth.js                # JWT (protect / authorize)
│   │   ├── validate.js            # express-validator → errores unificados
│   │   ├── errorHandler.js
│   │   ├── notFound.js
│   │   ├── productParser.js       # Intención producto en /agent/ask
│   │   ├── datasheetPdfUpload.middleware.js   # multer PDF
│   │   └── priceListUpload.middleware.js      # multer listas de precio
│   │
│   ├── models/                    # Sequelize (catálogo + legado)
│   │   ├── associations.catalog.js   # Asociaciones Solution / ProductModel / specs / inbox
│   │   ├── User.model.js
│   │   ├── Product.model.js
│   │   ├── ProductTemp.model.js
│   │   ├── Datasheet.model.js
│   │   ├── DatasheetSource.model.js
│   │   ├── DatasheetModelMap.model.js
│   │   ├── FortigateSpecs.model.js
│   │   ├── SolutionSpecs.models.js       # VM, Manager, Switch, AP, Mail, Web, …
│   │   ├── Solution.model.js
│   │   ├── ProductModel.model.js
│   │   ├── ProductModelAttribute.model.js
│   │   ├── SolutionOffer.model.js
│   │   ├── ModelOfferLink.model.js
│   │   ├── OfferCompatibilityRule.model.js
│   │   ├── IntentKeyword.model.js
│   │   ├── NeedsInbox.model.js
│   │   ├── NeedInboxTag.model.js
│   │   ├── LearnedSolutionKeyword.model.js
│   │   ├── ProductLifecycle.model.js
│   │   ├── ProductReplacement.model.js
│   │   ├── PriceUploadBatch.model.js
│   │   └── PriceListStaging.model.js
│   │
│   ├── routes/                    # Montaje en /api/v1/… (ver index.js)
│   │   ├── index.js
│   │   ├── auth.routes.js
│   │   ├── user.routes.js
│   │   ├── product.routes.js
│   │   ├── datasheet.routes.js
│   │   ├── datasheets.routes.js
│   │   ├── ollama.routes.js
│   │   ├── sizing.routes.js
│   │   ├── priceList.routes.js
│   │   ├── needsInbox.routes.js
│   │   ├── fortiwifi.routes.js
│   │   ├── fortianalyzer.routes.js
│   │   ├── fortiswitch.routes.js
│   │   └── compare.routes.js
│   │
│   ├── llm/                       # Módulo LLM (prompts, schemas, validación intent)
│   │   ├── index.js
│   │   ├── prompts/
│   │   │   └── intent-extraction.v1.prompt.txt
│   │   ├── schemas/
│   │   │   └── intent.schema.json
│   │   ├── validators/
│   │   │   └── intent.validator.js
│   │   └── examples/
│   │       └── intent-extraction.example.js
│   │
│   ├── services/                  # Lógica de negocio
│   │   ├── llm/                   # Adaptadores de proveedor
│   │   │   ├── OllamaAdapter.js
│   │   │   └── OpenRouterAdapter.js
│   │   ├── llm.service.js         # Servicio unificado (auto-detección / fallback)
│   │   ├── ollama.service.js      # Legacy / compatibilidad
│   │   ├── TransactSQL.js         # Llamadas a stored procedures
│   │   ├── user.service.js
│   │   ├── product.service.js
│   │   ├── productExtractor.service.js
│   │   ├── Datasheet.service.js
│   │   ├── catalogSync.service.js
│   │   ├── productModelUpsert.service.js
│   │   ├── sizingDispatcher.service.js
│   │   ├── fortigateSizing.service.js
│   │   ├── fortigateVMSizing.service.js
│   │   ├── fortiwifiSizing.service.js
│   │   ├── fortianalyzerSizing.service.js
│   │   ├── fortimanagerSizing.service.js
│   │   ├── fortiswitchSizing.service.js
│   │   ├── solutionRecommendation.service.js
│   │   ├── comparison.service.js
│   │   ├── modelCompare.service.js
│   │   ├── compareNarrative.service.js
│   │   ├── compareFallbackRecommendation.js
│   │   ├── lifecycle.service.js
│   │   ├── licenseBundle.service.js
│   │   ├── needsInbox.service.js
│   │   ├── learnedSolutionKeywords.service.js
│   │   ├── response.service.js
│   │   ├── normalizer.service.js
│   │   ├── priceListUpload.service.js
│   │   ├── priceListParser.service.js
│   │   ├── priceListEtl.service.js
│   │   ├── pdfDetector.service.js
│   │   ├── extractorRouter.js
│   │   ├── datasheetPdf/          # Ingesta PDF → specs (FortiGate, etc.)
│   │   │   ├── index.js
│   │   │   ├── datasheetPdfIngest.service.js
│   │   │   ├── pdfExtract.service.js
│   │   │   ├── pdfMetrics.service.js
│   │   │   ├── pdfModelIdentify.service.js
│   │   │   ├── pdfSpecUpsert.service.js
│   │   │   ├── pdfSolutionConsistency.service.js
│   │   │   ├── pdfConstants.js
│   │   │   └── metrics/
│   │   │       └── fortigate.metrics.js
│   │   ├── fortigate/             # Motor / flujo / rangos / catálogo FortiGate appliance
│   │   ├── fortigateVM/           # VM: engine, flow, extractor, bundles, licencias, rangos
│   │   ├── fortiwifi/
│   │   ├── fortianalyzer/
│   │   ├── fortimanager/
│   │   └── fortiswitch/          # engine, flow, ETL, PDF, offers, cleaner, parser, …
│   │
│   ├── utils/
│   │   ├── database.utils.js      # Import modelos + setupCatalogAssociations + sync
│   │   ├── asyncHandler.js
│   │   ├── ApiResponse.js
│   │   ├── StoredProcedure.js
│   │   ├── bulk.utils.js
│   │   ├── model.utils.js
│   │   ├── normalizeUnit.js
│   │   ├── specUpsert.utils.js
│   │   ├── priceListClassifier.js
│   │   ├── recommendationFormatter.js
│   │   └── sizingPresentation.js
│   │
│   ├── examples/
│   │   ├── storedProcedureExamples.js
│   │   ├── productParser.example.js
│   │   └── model-utils.example.js
│   │
│   └── app.js                     # Express: helmet, cors, rutas, errores
│
├── migrations/                    # Migraciones Sequelize (tablas catálogo / specs / inbox / keywords)
│   └── 20260323_*.js … 20260404_*.js   # (varios archivos numerados por fecha)
│
├── scripts/                       # Utilidades CLI: migraciones datos, seeds, debug PDF
│   ├── migrateFortigateFromDatasheet.mjs
│   ├── applyFortiwifiSpecsMatrix.mjs
│   ├── applyFortianalyzerSpecsMatrix.mjs
│   ├── applyFortimanagerSpecsPdfColumns.mjs
│   ├── applyFortimanagerSpecsUnitColumn.mjs
│   ├── applyFortimanagerSpecsSizingColumnNames.mjs
│   ├── fixFortimanagerSpecsForeignKey.mjs
│   ├── seedOfferCompatibilityRules.mjs
│   ├── fortimanager.loadFromPdf.js
│   ├── loadFortiSwitch.js
│   ├── debugFortiwifiPdf.mjs
│   ├── debugFortiswitchPdfDump.mjs
│   └── testFortiswitchEngine.mjs
│
├── Docs/                          # Documentación técnica + SQL de referencia
│   ├── audits/
│   ├── sql/                       # Scripts .sql, matrices, migraciones documentadas, READMEs
│   │   └── migrations/
│   ├── AUTH_ENDPOINTS.md
│   ├── STORED_PROCEDURES.md
│   ├── LLM_README.md
│   ├── LLM_QUICKSTART.md
│   ├── LLM_MIGRATION_TO_ES_MODULES.md
│   ├── DATABASE_ARCHITECTURE.md
│   ├── DATABASE_CATALOG_LAYERS.md
│   ├── DATASHEET_PDF_UPLOAD.md
│   ├── PRICE_LIST_BACKEND_FILES.md
│   ├── ARQUITECTURA_PRICE_LIST_UPLOAD.md
│   └── … (auditorías FortiGate, runbooks, etc.)
│
├── logs/                          # Winston: combined.log, error.log (según entorno)
│
├── .env                           # (local; no versionar secretos)
├── .env.example                   # Plantilla (si existe en tu clon)
├── .gitignore
├── package.json
├── package-lock.json              # npm
├── pnpm-lock.yaml                 # pnpm (si también usáis pnpm)
└── server.js                      # Punto de entrada: DB, sync dev, servidor HTTP
 ```
## 🚀 Instalación

1. **Clonar el repositorio**

2. **Instalar dependencias:**
   ```bash
   pnpm install
   ```

3. **Crear archivo `.env` basado en `.env.example`:**
   ```bash
   cp .env.example .env
   ```

4. **Configurar las variables de entorno en `.env`**

5. **Crear la base de datos MySQL:**
   ```sql
   CREATE DATABASE chat_db;
   ```

## 📦 Scripts Disponibles

```bash
# Desarrollo (con nodemon - hot reload)
pnpm dev

# Producción
pnpm start
```

## 🔧 Configuración

### Variables de Entorno

Edita el archivo `.env` con tus configuraciones:

```env
# Server
PORT=3000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=3306
DB_NAME=nycolt_db
DB_USER=root
DB_PASSWORD=tu_password
DB_DIALECT=mysql

# JWT
JWT_SECRET=tu-clave-secreta-super-segura
JWT_EXPIRE=7d

# CORS - Múltiples orígenes separados por comas
CORS_ORIGIN=http://localhost:3000,http://127.0.0.1:5500,http://192.168.x.x:5500

# API
API_VERSION=v1

# LLM Provider (auto, ollama, openrouter)
LLM_PROVIDER=auto

# Ollama (local)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=phi3
OLLAMA_TIMEOUT=3600000

# OpenRouter (cloud) - opcional
# OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_MODEL=anthropic/claude-3-sonnet
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
```

**Importante:** 

1. Genera un `JWT_SECRET` seguro:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

2. **CORS para red local:** Si quieres acceder desde otros dispositivos en tu red:
```env
CORS_ORIGIN=http://localhost:3000,http://192.168.2.9:5500
```

3. **Sistema LLM Híbrido:** Usa Ollama (local) por defecto. Para OpenRouter, configura:
```env
OPENROUTER_API_KEY=sk-or-v1-tu-clave-aqui
```

## 📚 Endpoints Principales

### Autenticación (JWT)
- `POST /api/v1/auth/register` - Registrar usuario y obtener token
- `POST /api/v1/auth/login` - Iniciar sesión y obtener token
- `PUT /api/v1/auth/update-password` - Actualizar contraseña

**Ver documentación completa**: [Docs/AUTH_ENDPOINTS.md](Docs/AUTH_ENDPOINTS.md)

### Usuarios
- `GET /api/v1/users` - Listar usuarios (requiere autenticación)
- `GET /api/v1/users/:id` - Obtener usuario por ID
- `POST /api/v1/users` - Crear usuario
- `PUT /api/v1/users/:id` - Actualizar usuario
- `DELETE /api/v1/users/:id` - Eliminar usuario

### Productos
- `GET /api/v1/products` - Listar productos
- `GET /api/v1/products/:id` - Obtener producto por ID
- `POST /api/v1/products` - Crear producto
- `PUT /api/v1/products/:id` - Actualizar producto
- `DELETE /api/v1/products/:id` - Eliminar producto

### Agente Conversacional (LLM)
- `POST /api/v1/agent/ask` - Chat con agente inteligente

### Health Check
- `GET /health` - Verificar estado del servidor

## 🏗️ Arquitectura

El backend sigue una arquitectura en capas basada en buenas prácticas:

- **MVC + Service Layer**
- Separación de responsabilidades (routes → controllers → services → models)
- Integración híbrida con ORM (Sequelize) y Stored Procedures
### Flujo general

Cliente → Routes → Controllers → Services → Base de datos / LLM → Respuesta

### Capas de la Aplicación

1. **Routes**: Define los endpoints y aplica middlewares de validación
2. **Controllers**: Maneja las peticiones HTTP y respuestas
3. **Services**: Contiene la lógica de negocio y llamadas a Stored Procedures
4. **Models**: Define la estructura de datos con Sequelize
5. **Middlewares**: Funciones intermedias (auth, validación, errores)
6. **Utils**: Funciones auxiliares reutilizables

## 🧩 Componentes principales

- 🤖 **Agente conversacional**
  - Integración con LLM (Ollama / OpenRouter)
  - Procesamiento de lenguaje natural

- 📊 **Motores de dimensionamiento**
  - Servicios especializados por solución
  - Dispatcher dinámico

- 📦 **Gestión de catálogo**
  - Modelos normalizados (Solution, ProductModel)
  - Integración con listas de precios

- 📄 **Procesamiento de datasheets**
  - Extracción de PDFs
  - Normalización de especificaciones técnicas

- 💰 **Pipeline de precios**
  - Carga → staging → procesamiento → almacenamiento final
    
### Patrones Implementados

- **MVC (Model-View-Controller)**: Separación de responsabilidades
- **Service Layer**: Lógica de negocio aislada
- **Repository Pattern**: Acceso a datos mediante Stored Procedures
- **Error Handling**: Manejo centralizado de errores
- **Async Handler**: Wrapper para funciones asíncronas
- **API Response**: Respuestas consistentes
## 🔐 Seguridad

- Autenticación basada en JWT
- Hash de contraseñas con bcrypt
- Validación de entrada con express-validator
- Protección de rutas mediante middleware
- Control de acceso CORS configurable
- Headers de seguridad con Helmet

> ⚠️ Nota: el endpoint del agente (`/agent/ask`) actualmente es público

## 🔐 Autenticación

El sistema usa **JWT (JSON Web Tokens)** para autenticación:

1. El usuario se registra o inicia sesión en `/api/v1/auth/register` o `/api/v1/auth/login`
2. El servidor valida las credenciales usando bcryptjs
3. El servidor genera un token JWT firmado
4. El servidor devuelve el token junto con la información del usuario
5. El cliente incluye el token en el header de cada petición: `Authorization: Bearer <token>`
6. El middleware [`protect`](src/middlewares/auth.js) valida el token JWT
7. Las rutas protegidas tienen acceso al usuario en `req.user`

**Estructura del token JWT:**
```javascript
{
  id: 1,          // ID del usuario
  iat: 1704710400,  // Timestamp de emisión
  exp: 1705315200   // Timestamp de expiración (7 días por defecto)
}
```

**Ejemplo de uso:**
```bash
# 1. Login
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"Usuario": "admin", "Credencial": "password123"}'

# Respuesta: { "token": "eyJhbGc..." }

# 2. Usar el token en peticiones protegidas
curl -X GET http://localhost:3000/api/v1/users \
  -H "Authorization: Bearer eyJhbGc..."
```

**Documentación completa**: [Docs/AUTH_ENDPOINTS.md](Docs/AUTH_ENDPOINTS.md)
## 🗄️ Base de datos y lógica

El sistema utiliza un enfoque híbrido:

- ORM (Sequelize) para operaciones estándar
- Stored Procedures para lógica crítica

## 🗄️ Base de Datos y Stored Procedures

Este proyecto utiliza **MySQL con Stored Procedures** para operaciones críticas de la base de datos.

### Ventajas de usar Stored Procedures:

- ✅ **Rendimiento**: Lógica ejecutada directamente en el servidor de BD
- ✅ **Seguridad**: Reducción de inyección SQL
- ✅ **Reutilización**: Lógica centralizada en la base de datos
- ✅ **Mantenibilidad**: Cambios sin modificar código de la aplicación

### Ejemplos de Stored Procedures implementados:

- `CheckLogin(Usuario, Credencial)` - Validación de credenciales con bcrypt
- `UpdatePassword(Usuario, NuevaCredencial)` - Actualización de contraseña
- `CreateUser(Usuario, Credencial)` - Creación de usuario con hash

### Servicios disponibles:

- [`TransactSQL`](src/services/TransactSQL.js) - Servicio genérico para SPs (estilo Dapper de .NET)
- [`StoredProcedureHelper`](src/utils/StoredProcedure.js) - Utilidades para ejecutar SPs

**Documentación completa**: [Docs/STORED_PROCEDURES.md](Docs/STORED_PROCEDURES.md)

**Ejemplos de uso**: [src/examples/storedProcedureExamples.js](src/examples/storedProcedureExamples.js)

## 🛡️ Seguridad

- **Helmet**: Headers de seguridad HTTP
- **CORS**: Control de acceso entre orígenes
- **Validación**: express-validator para validar datos de entrada
- **Password Hashing**: bcryptjs para hashear contraseñas (bcrypt en DB)
- **JWT**: Autenticación basada en tokens
- **SQL Injection**: Protección mediante Stored Procedures y Sequelize

## 📊 Logging

El proyecto usa **Winston** para logging estructurado:

- Logs en consola (desarrollo)
- Logs en archivos (producción):
  - `logs/error.log` - Solo errores
  - `logs/combined.log` - Todos los logs

Configuración en [`src/config/logger.js`](src/config/logger.js)

## 🧪 Testing

Para probar los endpoints puedes usar:

- **Thunder Client** (extensión de VS Code)
- **Postman**
- **cURL**

Ejemplos en [Docs/AUTH_ENDPOINTS.md](Docs/AUTH_ENDPOINTS.md)

## 📝 Modelos de Datos

### User (Usuario)
- `id` (INT, PK, AI)
- `Usuario` (VARCHAR(50), UNIQUE, NOT NULL)
- `Credencial` (VARCHAR(255), NOT NULL) - Hash bcrypt
- `createdAt`, `updatedAt` (DATETIME)

### Product (Producto)
- `id` (INT, PK, AI)
- `UNIT` (VARCHAR(250))
- `SKU` (VARCHAR(250))
- `Familia` (VARCHAR(100))
- `Descripcion` (TEXT)
- `Price`, `OneYearContract`, `ThirdYearContract`, `FiveYearContract` (VARCHAR(20))
- `createdAt`, `updatedAt` (DATETIME)

### ProductTemp (ProductoTemporal)
Similar a Product, para datos temporales de importación.

## 📦 Dependencias Principales

- **express** - Libreria web
- **sequelize** - ORM para MySQL
- **mysql2** - Driver de MySQL
- **bcryptjs** - Hashing de contraseñas (Node.js)
- **jsonwebtoken** - Autenticación JWT
- **express-validator** - Validación de datos
- **winston** - Logging
- **helmet** - Seguridad HTTP
- **cors** - Control de acceso
- **dotenv** - Variables de entorno
- **openai** - SDK para OpenRouter/OpenAI
- **ollama** - SDK para Ollama local

## 📄 Licencia

ISC

---

**Desarrollado por Nycolt** 🚀

Para más información, consulta:
- [Documentación de Autenticación](Docs/AUTH_ENDPOINTS.md)
- [Guía de Stored Procedures](Docs/STORED_PROCEDURES.md)
- [Ejemplos de Stored Procedures](src/examples/storedProcedureExamples.js)
```
