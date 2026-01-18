# 🚀 API Backend con Express.js y MySQL

Backend desarrollado con Node.js, Express.js y MySQL siguiendo las mejores prácticas de arquitectura, con autenticación JWT y uso de Stored Procedures.

## 📁 Estructura del Proyecto

```
Backend/
├── src/
│   ├── config/          # Configuraciones (DB, env, logger, LLM)
│   │   ├── database.js  # Configuración de Sequelize + MySQL
│   │   ├── env.js       # Variables de entorno
│   │   ├── logger.js    # Winston logger
│   │   ├── llm.config.js # Configuración LLM (Ollama/OpenRouter)
│   │   └── columnasAgente.js
│   ├── controllers/     # Controladores de rutas
│   │   ├── auth.controller.js
│   │   ├── datasheet.controller.js
│   │   ├── ollama.controller.js  # Agente conversacional
│   │   ├── product.controller.js
│   │   └── user.controller.js
│   ├── middlewares/     # Middlewares personalizados
│   │   ├── auth.js      # Protección de rutas con JWT
│   │   ├── errorHandler.js
│   │   ├── notFound.js
│   │   └── validate.js
│   ├── models/          # Modelos de Sequelize
│   │   ├── User.model.js
│   │   ├── Product.model.js
│   │   └── ProductTemp.model.js
│   ├── routes/          # Definición de rutas
│   ├── llm/             # Módulo de Language Models
│   │   ├── prompts/     # Prompts versionados
│   │   ├── schemas/     # JSON Schemas de validación
│   │   ├── validators/  # Validadores AJV
│   │   ├── examples/    # Ejemplos de uso
│   │   └── index.js     # Punto de entrada
│   ├── services/        # Lógica de negocio
│   │   ├── llm/         # Adapters para proveedores LLM
│   │   │   ├── OllamaAdapter.js    # Adapter Ollama local
│   │   │   └── OpenRouterAdapter.js # Adapter OpenRouter cloud
│   │   ├── llm.service.js    # Servicio LLM unificado (auto-detección)
│   │   ├── ollama.service.js # Servicio Ollama legacy
│   │   ├── productExtractor.service.js # Extracción inteligente
│   │   ├── user.service.js
│   │   ├── product.service.js
│   │   ├── Datasheet.service.js
│   │   └── TransactSQL.js  # Servicio para SPs (estilo Dapper)
│   ├── utils/           # Utilidades y helpers
│   │   ├── database.utils.js
│   │   └── StoredProcedure.js
│   ├── examples/        # Ejemplos de uso
│   │   └── storedProcedureExamples.js
│   └── app.js           # Configuración de Express
├── Docs/                # Documentación
│   ├── AUTH_ENDPOINTS.md
│   └── STORED_PROCEDURES.md
├── logs/                # Archivos de log (Winston)
├── .env                 # Variables de entorno
├── .env.example         # Ejemplo de variables de entorno
├── .gitignore
├── package.json
├── pnpm-lock.yaml
└── server.js            # Punto de entrada
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

### Capas de la Aplicación

1. **Routes**: Define los endpoints y aplica middlewares de validación
2. **Controllers**: Maneja las peticiones HTTP y respuestas
3. **Services**: Contiene la lógica de negocio y llamadas a Stored Procedures
4. **Models**: Define la estructura de datos con Sequelize
5. **Middlewares**: Funciones intermedias (auth, validación, errores)
6. **Utils**: Funciones auxiliares reutilizables

### Patrones Implementados

- **MVC (Model-View-Controller)**: Separación de responsabilidades
- **Service Layer**: Lógica de negocio aislada
- **Repository Pattern**: Acceso a datos mediante Stored Procedures
- **Error Handling**: Manejo centralizado de errores
- **Async Handler**: Wrapper para funciones asíncronas
- **API Response**: Respuestas consistentes

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

## 🚧 Próximos Pasos Recomendados

1. ✅ ~~Configurar base de datos MySQL~~
2. ✅ ~~Implementar autenticación JWT~~
3. ✅ ~~Crear Stored Procedures~~
4. ⬜ Implementar Refresh Tokens
5. ⬜ Agregar Rate Limiting
6. ⬜ Implementar Roles y Permisos (RBAC)
7. ⬜ Agregar Tests (Jest/Mocha)
8. ⬜ Documentación con Swagger/OpenAPI
9. ⬜ CI/CD con GitHub Actions
10. ⬜ Dockerizar la aplicación

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