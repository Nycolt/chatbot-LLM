# 🤖 Chatbot - Asistente Fortinet

Sistema inteligente de preventa en ciberseguridad que automatiza la recomendación, dimensionamiento y comparación de soluciones Fortinet mediante reglas de negocio, base de datos técnica y modelos de lenguaje (LLM): local (Ollama) o externo (OpenRouter).

---
## 🎯 Objetivo

Automatizar procesos de preventa en ciberseguridad mediante un asistente inteligente que permite recomendar, dimensionar y comparar soluciones Fortinet utilizando reglas de negocio, base de datos técnica y modelos de lenguaje (LLM).

---

## 🚀 Funcionalidades principales

- 🔍 Recomendación de soluciones Fortinet según necesidades
- 📊 Dimensionamiento técnico (FortiGate, FortiAnalyzer, etc.)
- ⚖️ Comparación entre modelos
- 🤖 Asistente conversacional con soporte LLM (Ollama / OpenRouter)
- 📦 Integración con listas de precios (Excel)
- 📥 Buzón de necesidades para mejora continua

---
## 💡 Caso de uso

Este proyecto está diseñado para equipos comerciales y de preventa que requieren:

- Reducir tiempos de dimensionamiento técnico
- Mejorar la precisión en la selección de soluciones
- Centralizar información técnica y comercial
- Automatizar análisis de requerimientos del cliente

## 📋 Tabla de Contenidos

- [Requisitos](#-requisitos)
- [Arquitectura del Proyecto](#-arquitectura-del-proyecto)
- [Instalación Rápida](#-instalación-rápida)
- [Configuración de Variables de Entorno](#-configuración-de-variables-de-entorno)
- [Configuración Detallada](#-configuración-detallada)
- [Ejecución](#-ejecución)
- [Scripts Disponibles](#-scripts-disponibles)
- [Solución de Problemas](#-solución-de-problemas)

---

## 🔧 Requisitos

- **Node.js** ≥ 18.x ([Descargar](https://nodejs.org/))
- **pnpm** (gestor de paquetes): `npm install -g pnpm`
- **Docker Desktop** ([Descargar](https://www.docker.com/products/docker-desktop))
- **Visual Studio Code** ([Descargar](https://code.visualstudio.com/))
- **Git** (opcional, para clonar el repo)

### Hardware recomendado para LLM local (Ollama):
- **RAM**: 8-16 GB
- **Espacio**: 5-10 GB libres (modelos LLM)
- **GPU** (opcional): mejora velocidad de inferencia

---

## 🏗️ Arquitectura del Proyecto
Arquitectura basada en cliente-servidor con integración de inteligencia artificial y base de datos técnica especializada en soluciones Fortinet.
```
├── Backend/              # API REST con Node.js + Express
│   ├── src/
│   │   ├── controllers/  # Controladores de rutas
│   │   ├── services/     # Lógica de negocio y LLM
│   │   ├── models/       # Modelos de base de datos
│   │   └── routes/       # Definición de endpoints
│   └── server.js         # Punto de entrada
│
├── Frontend/             # Interfaz web (HTML + JS + Tailwind)
│   ├── index.html        # Página principal
│   ├── src/              # Scripts, estilos, componentes
│   └── main.js           # Lógica principal del cliente
│
├── Base de datos (Docker)/  # Contenedores Docker
│   ├── docker-compose.yml   # MySQL + phpMyAdmin + Ollama
│   ├── .env.example         # Variables de entorno (plantilla)
│   └── MySQL/               # Datos persistentes
│
├── func/
│   └── Ollama_local/     # Gestor de modelos Ollama
│       └── index.js      # CLI interactivo para modelos
│
├── start.js              # Orquestador de Frontend
└── package.json          # Scripts de automatización
```

---

## 🚀 Instalación Rápida

### 1️⃣ Clonar e instalar dependencias raíz

```bash
git clone <repo-url>
```

### 2️⃣ Configurar variables de entorno

```bash
# En Base de datos (Docker)
cp "Base de datos (Docker)/.env.example" "Base de datos (Docker)/.env"

# Edita el .env con tus credenciales MySQL
# Ejemplo: MYSQL_ROOT_PASSWORD=tuPassword123
# SE RECOMIENDA DEJAR EL NOMBRE DE LA BASE DE DATOS COMO chat_db
```

```bash
# En Backend (crear archivo .env)
cd Backend
cp .env.example .env  # Si existe, sino crear manualmente
```

Agregar en `Backend/.env`:
```env
# Base de datos
DB_HOST=localhost
DB_PORT=3306
DB_USER=chat_user
DB_PASSWORD=tuPasswordMySQL
DB_NAME=chat_db

# LLM Provider (ollama o openrouter)
LLM_PROVIDER=auto  # 'auto', 'ollama' o 'openrouter'

# Ollama (local)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=phi3

# OpenRouter (externo) - Obtener en https://openrouter.ai/
OPENROUTER_API_KEY=tu_api_key_aqui
OPENROUTER_MODEL=meta-llama/llama-3.1-8b-instruct:free
```

### 3️⃣ Levantar servicios Docker

```bash
pnpm run:docker
# O manualmente:
cd "Base de datos (Docker)"
docker-compose up -d
```

**Servicios disponibles:**
- MySQL: `localhost:3306`
- phpMyAdmin: `http://localhost:8080`
- Ollama: `http://localhost:11434`

### 4️⃣ Importar base de datos inicial

El proyecto incluye un dump de base de datos con la estructura y datos iniciales en `func/database/chat_db.sql`.

**Opción A - Usando Docker CLI (recomendado):**

```bash
# Asegúrate de que MySQL esté corriendo
docker exec -i mysql_db mysql -u root -p"$MYSQL_ROOT_PASSWORD" chat_db < func/database/chat_db.sql
```

Si usas Windows y tienes problemas con la variable de entorno:
```bash
# Reemplaza TU_PASSWORD con la contraseña del .env
docker exec -i mysql_db mysql -u root -pTU_PASSWORD chat_db < func/database/chat_db.sql
```

**Opción B - Usando phpMyAdmin:**

1. Abre http://localhost:8080
2. Login con credenciales de `.env` (usuario: `root`, contraseña: `MYSQL_ROOT_PASSWORD`)
3. Selecciona la base de datos `chat_db` en el panel izquierdo (Si no existe creala)
4. Ve a la pestaña **Importar**
5. Click en **Seleccionar archivo** → navega a `func/database/chat_db.sql`
6. Click en **Continuar/Go** al final de la página
7. Espera a que termine la importación (verás mensaje de éxito)

**Nota:** El dump incluye:
- Tablas: `Usuario`, `Producto`, `Datasheet`, etc.
- Stored Procedures: `CheckLogin`, `CreateUser`, etc.
- Datos de ejemplo de productos Fortinet

### 5️⃣ (Opcional) Configurar modelo LLM local

Si quieres usar Ollama (LLM local):

```bash
pnpm config:model
```

Esto abrirá un menú interactivo para:
- Ver modelos disponibles (phi3, llama3.2, mistral, etc.)
- Instalar el modelo que elijas
- Gestionar modelos instalados

**Recomendado:** `phi3` (2.3 GB, rápido, 8GB RAM)

---

## 🔐 Configuración de Variables de Entorno

El proyecto requiere configurar variables de entorno en dos ubicaciones principales:

### 1️⃣ Base de datos (Docker) - `.env`

**Ubicación:** `Base de datos (Docker)/.env`

**Crear archivo desde plantilla:**
```bash
cp "Base de datos (Docker)/.env.example" "Base de datos (Docker)/.env"
```

**Variables requeridas:**
```env
# MySQL Configuration
MYSQL_ROOT_PASSWORD=tuPasswordSegura123
MYSQL_DATABASE=chat_db
MYSQL_USER=chat_user
MYSQL_PASSWORD=tuPasswordUsuario123

# MySQL Port (default: 3306)
MYSQL_PORT=3306

# phpMyAdmin Port (default: 8080)
PHPMYADMIN_PORT=8080

# Ollama Port (default: 11434)
OLLAMA_PORT=11434
```

**Descripción de variables:**
- `MYSQL_ROOT_PASSWORD`: Contraseña del usuario root de MySQL (usar contraseña segura)
- `MYSQL_DATABASE`: Nombre de la base de datos (usar `chat_db`)
- `MYSQL_USER`: Usuario de aplicación con permisos limitados
- `MYSQL_PASSWORD`: Contraseña del usuario de aplicación
- `MYSQL_PORT`: Puerto para MySQL (cambiar si 3306 está ocupado)
- `PHPMYADMIN_PORT`: Puerto para phpMyAdmin (cambiar si 8080 está ocupado)
- `OLLAMA_PORT`: Puerto para servicio Ollama (cambiar si 11434 está ocupado)

### 2️⃣ Backend - `.env`

**Ubicación:** `Backend/.env`

**Crear archivo:**
```bash
cd Backend
# Si existe .env.example
cp .env.example .env

# Si no existe, crear manualmente
touch .env  # Linux/Mac
# En Windows, crear archivo .env en Backend/
```

**Variables requeridas:**
```env
# Server Configuration
PORT=8000
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=chat_user
DB_PASSWORD=tuPasswordUsuario123
DB_NAME=chat_db

# LLM Provider Configuration
# Opciones: 'auto' (intenta ollama primero, luego openrouter)
#           'ollama' (fuerza uso de Ollama local)
#           'openrouter' (fuerza uso de OpenRouter API)
LLM_PROVIDER=auto

# Ollama Configuration (Local LLM)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=phi3

# OpenRouter Configuration (Cloud LLM)
# Obtener API Key en: https://openrouter.ai/
OPENROUTER_API_KEY=sk-or-v1-tu_api_key_aqui
OPENROUTER_MODEL=meta-llama/llama-3.1-8b-instruct:free

# JWT Configuration (para autenticación)
JWT_SECRET=tu_secreto_jwt_super_seguro_cambiar_en_produccion
JWT_EXPIRES_IN=7d

# CORS Configuration
CORS_ORIGIN=http://localhost:5500

# Logging
LOG_LEVEL=info
```

**Descripción de variables Backend:**

**Servidor:**
- `PORT`: Puerto del servidor backend (default: 3000)
- `NODE_ENV`: Entorno de ejecución (`development`, `production`, `test`)

**Base de Datos:**
- `DB_HOST`: Host de MySQL (usar `localhost` para desarrollo)
- `DB_PORT`: Puerto de MySQL (debe coincidir con el .env de Docker)
- `DB_USER`: Usuario de MySQL (debe coincidir con `MYSQL_USER` en Docker)
- `DB_PASSWORD`: Contraseña del usuario (debe coincidir con `MYSQL_PASSWORD`)
- `DB_NAME`: Nombre de la base de datos (usar `chat_db`)

**Proveedor LLM:**
- `LLM_PROVIDER`: Define qué servicio LLM usar
  - `auto`: Intenta Ollama primero, si falla usa OpenRouter
  - `ollama`: Usa solo Ollama (local, gratis, requiere modelo descargado)
  - `openrouter`: Usa solo OpenRouter (cloud, requiere API key)

**Ollama (Local):**
- `OLLAMA_BASE_URL`: URL del servicio Ollama (default: `http://localhost:11434`)
- `OLLAMA_MODEL`: Modelo a usar (opciones: `phi3`, `llama3.2`, `mistral`, `gemma2`, etc.)

**OpenRouter (Cloud):**
- `OPENROUTER_API_KEY`: Tu API key de OpenRouter ([obtener aquí](https://openrouter.ai/))
- `OPENROUTER_MODEL`: Modelo a usar (ver [modelos disponibles](https://openrouter.ai/models))

**Seguridad:**
- `JWT_SECRET`: Secreto para firmar tokens JWT (cambiar en producción)
- `JWT_EXPIRES_IN`: Tiempo de expiración de tokens (ej: `7d`, `24h`, `30m`)
- `CORS_ORIGIN`: Origen permitido para CORS (URL del frontend)

**Logging:**
- `LOG_LEVEL`: Nivel de logs (`error`, `warn`, `info`, `debug`)

### 📝 Notas Importantes

1. **Nunca commits archivos `.env`**: Están incluidos en `.gitignore` por seguridad
2. **Contraseñas seguras**: Usar contraseñas fuertes, especialmente en producción
3. **Credenciales consistentes**: Las credenciales de MySQL deben coincidir entre `Base de datos (Docker)/.env` y `Backend/.env`
4. **Modelos Ollama**: Para usar Ollama local, primero descargar el modelo con `pnpm config:model`
5. **OpenRouter API Key**: Obtener una cuenta gratuita en [openrouter.ai](https://openrouter.ai/) para usar modelos en la nube

### 🔍 Verificar Configuración

**Verificar que las variables estén cargadas correctamente:**

```bash
# En Backend, ejecutar:
cd Backend
node -e "require('dotenv').config(); console.log(process.env.DB_NAME, process.env.LLM_PROVIDER)"
# Debería mostrar: chat_db auto
```

**Verificar conexión a base de datos:**
```bash
cd Backend
pnpm run dev
# Si conecta correctamente, verás: "✅ Database connected successfully"
```

---

## ⚙️ Configuración Detallada

### Backend - Instalar dependencias

```bash
cd Backend
pnpm install  # o npm install
```

### Frontend - Sin dependencias npm

El Frontend es HTML/JS puro. Solo necesita un servidor HTTP.

---

## ▶️ Ejecución

### Opción 1: Ejecutar todo por separado

**Terminal 1 - Docker (Base de datos):**
```bash
cd "Base de datos (Docker)"
docker-compose up
```

**Terminal 2 - Backend:**
```bash
cd Backend
pnpm run dev  # o npm run dev
# Se ejecuta en http://localhost:8000 (por defecto)
```

**Terminal 3 - Frontend:**
```bash
node start.js
# Se abre en http://localhost:5500
```

### Opción 2: Usar Visual Studio Code (recomendado)

1. Abre el proyecto en VS Code
2. Instala la extensión **Live Server**:
   - Ir a Extensiones (Ctrl+Shift+X)
   - Buscar "Live Server"
   - Instalar (de Ritwick Dey)

3. Ejecutar servicios:
   ```bash
   # Terminal integrada 1
   pnpm run:docker

   # Terminal integrada 2
   cd Backend && pnpm run dev
   ```

4. Click derecho en `Frontend/index.html` → **"Open with Live Server"**
   - Se abre automáticamente en `http://localhost:5500`

---

## 📦 Scripts Disponibles

Desde la raíz del proyecto (`package.json`):

| Script | Comando | Descripción |
|--------|---------|-------------|
| **run:docker** | `pnpm run:docker` | Inicia Docker (MySQL + phpMyAdmin + Ollama) |
| **run:server** | `pnpm run:server` | Inicia Backend (instala deps automáticamente) |
| **config:model** | `pnpm config:model` | Gestor interactivo de modelos Ollama |
| **start:frontend** | `node start.js` | Inicia Frontend en puerto 5500 |

---

## 🔍 Solución de Problemas

### Error: "Ollama no está corriendo"

**Solución:**
```bash
cd "Base de datos (Docker)"
docker-compose up -d ollama
```

Verifica que esté corriendo:
```bash
docker ps | grep ollama
```

### Error: "Cannot connect to MySQL"

**Causas comunes:**
1. Docker no está corriendo → ejecutar `pnpm run:docker`
2. Credenciales incorrectas en `Backend/.env`
3. Puerto 3306 ocupado → cambiar puerto en `docker-compose.yml`

**Verificar conexión:**
```bash
# Entrar al contenedor MySQL
docker exec -it mysql_db mysql -u root -p
# Usar contraseña de .env (MYSQL_ROOT_PASSWORD)
```

### Frontend no se ve en Live Server

1. Verifica que `index.html` esté en la raíz de `Frontend/`
2. Asegúrate de tener Live Server instalado
3. Revisa la consola del navegador (F12) para errores CORS
4. Alternativa: usar `node start.js` (puerto 5500)

### Backend devuelve errores de LLM

**Si usas Ollama:**
- Verifica modelo instalado: `docker exec -it ollama ollama list`
- Instala modelo: `pnpm config:model`

**Si usas OpenRouter:**
- Verifica API Key en `Backend/.env`
- Consulta límites en [OpenRouter Dashboard](https://openrouter.ai/dashboard)

### Dump de base de datos (backup/restore)

**Exportar dump actual:**
```bash
docker exec -i mysql_db mysqldump -u root -p"$MYSQL_ROOT_PASSWORD" chat_db > backup_$(date +%Y%m%d).sql
```

**Importar dump existente:**

Desde la raíz del proyecto, importar el dump inicial:
```bash
docker exec -i mysql_db mysql -u root -p"$MYSQL_ROOT_PASSWORD" chat_db < func/database/chat_db.sql
```

O un backup personalizado:
```bash
docker exec -i mysql_db mysql -u root -p"$MYSQL_ROOT_PASSWORD" chat_db < ruta/a/tu/backup.sql
```

**Usando phpMyAdmin:**

1. Ir a http://localhost:8080
2. Seleccionar base de datos `chat_db`
3. **Exportar**: Pestaña → Exportar → Método Rápido → SQL → Continuar
4. **Importar**: Pestaña → Importar → Seleccionar archivo (`func/database/chat_db.sql` o tu backup) → Continuar

**Nota:** El dump en `func/database/chat_db.sql` contiene la estructura completa y datos de ejemplo.

---

## 🛠️ Tecnologías

- **Backend**: Node.js, Express, MySQL, Sequelize
- **Frontend**: HTML5, JavaScript ES6+, Tailwind CSS
- **LLM**: Ollama (local) / OpenRouter (cloud)
- **Infraestructura**: Docker, docker-compose
- **DB**: MySQL 8.0, phpMyAdmin

---
## 🧠 Arquitectura técnica y stack

### 🧩 Frameworks y stack

| Capa | Tecnología |
|------|------------|
| Backend | Node.js + Express 4 |
| ORM | Sequelize 6 |
| Base de datos | MySQL |
| Frontend | HTML + JavaScript (ES Modules) + Tailwind |
| Validación | express-validator |
| Autenticación | JWT (jsonwebtoken) + bcrypt |
| Archivos | multer |

> ⚠️ El frontend está construido sin frameworks SPA (React/Vue), utilizando JavaScript puro modular.

---

### 🔐 Seguridad implementada

El backend incluye varias medidas de seguridad:

#### 🛡️ Seguridad HTTP
- Uso de **helmet** para cabeceras seguras
- Configuración de `crossOriginResourcePolicy` para permitir consumo desde frontend en distinto origen

#### 🌐 CORS
- Configuración dinámica por entorno
- Soporte para credenciales (`credentials: true`)

#### 🔑 Autenticación y autorización
- JWT con expiración configurable
- Middleware `protect` para rutas protegidas
- Soporte de roles (`authorize`)

> ⚠️ Actualmente el endpoint `/agent/ask` es público (no protegido con JWT)

#### ✅ Validación de datos
- Validación de inputs con `express-validator`
- Manejo centralizado de errores

#### 🔒 Manejo de contraseñas
- Hash con bcrypt (factor 10)
- Comparación segura en login

#### 📂 Subida de archivos
- Uso de multer con límites de tamaño
- Restricción a PDF para datasheets

#### ⚠️ Manejo de errores
- Control de errores JWT (expiración, token inválido)
- Respuestas estructuradas
- Stack visible solo en desarrollo

#### 📊 Logging
- Implementación con Winston y express-winston

---

### ⚠️ Consideraciones de seguridad

El sistema actualmente no incluye:

- Rate limiting (protección contra ataques de fuerza bruta)
- Protección CSRF (no necesaria en JWT stateless, pero evaluable)
- Validación estricta de MIME en todos los uploads
- Protección del endpoint del agente (puede requerir autenticación en producción)

---

## ✅ Estado del proyecto

Proyecto finalizado.

✔ Sistema de dimensionamiento técnico implementado  
✔ Motor de recomendación funcional  
✔ Comparador de soluciones integrado  
✔ Asistente conversacional con soporte LLM  
✔ Integración con base de datos y listas de precios  
✔ Buzón de necesidades para mejora continua  

🔧 Posibles mejoras futuras:
- Expansión a más soluciones del ecosistema Fortinet  
- Optimización de respuestas del LLM  
- Implementación de medidas adicionales de seguridad (rate limiting, protección del agente)

---

## 📝 Notas Adicionales

- **Primer inicio**: La instalación de dependencias del Backend puede tardar 2-5 minutos
- **Modelos LLM**: La descarga puede tardar 5-15 minutos según el modelo
- **Puertos usados**: 3306 (MySQL), 5500 (Frontend), 3000 (Backend), 8080 (phpMyAdmin), 11434 (Ollama)
- **Producción**: Este setup es para desarrollo. Para producción, configurar variables de entorno seguras y reverse proxy (nginx/Apache)

---

## 🙋🏼 Soporte

Para problemas o preguntas, consulta la documentación en `Backend/Docs/`.
