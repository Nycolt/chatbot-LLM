# 🎨 Frontend - Asistente Fortinet

Aplicación web tipo Single Page que permite interactuar con un asistente inteligente, gestionar productos Fortinet y cargar información mediante archivos Excel.

---

## 🎯 Propósito

Proporcionar una interfaz interactiva para:

- 🤖 Comunicación con el asistente conversacional
- 📊 Carga masiva de productos mediante Excel
- 🔐 Autenticación de usuarios
- 📦 Integración con el backend de preventa
  
**Última actualización:** 2026-04-02

**Mantenedor:** Equipo Nycolt

## 📋 Descripción General
Aplicación web para la gestión y carga masiva de productos Fortinet mediante archivos Excel, con sistema de autenticación, validación avanzada de datos y chatbot integrado para asesoría de productos.

---

## 🧩 Tipo de aplicación

- Aplicación web tipo **Single Page Application (SPA clásica)**
- Desarrollada con **HTML + JavaScript ES Modules**
- No utiliza frameworks como React, Vue o Angular
- Se ejecuta directamente en navegador con servidor estático

---

## ⚙️ Arranque de la aplicación

- `index.html` → estructura UI + librerías (Tailwind, SweetAlert2, SheetJS)
- `main.js` → inicialización global del sistema

Flujo de inicio:

DOMContentLoaded  
→ ConfiguracionInicial()  
→ initVariables()  
→ initSweetAlert()  
→ initAgentChat()

...

## 🏗️ Estructura del Proyecto

```
Frontend/
├── index.html                      # Shell del chat, meta api-base, CDNs (Tailwind, SweetAlert2, SheetJS)
├── main.js                         # Punto de entrada ES module (DOMContentLoaded → init)
├── jsconfig.json                   # ES2020 / paths @/* → src/*
├── tailwind.config.js              # Config Tailwind (content: html + js)
├── soluciones.json                 # Datos de soluciones / referencia
├── README.md                       # Documentación del frontend (si está versionado)
├── .gitignore
│
└── src/
    ├── Agent/
    │   └── prompt.js               # Prompt / instrucciones del asistente
    │
    ├── config/
    │   ├── variables.js            # apiUrl, getResolvedApiBase(), initVariales()
    │   ├── localStorage.js         # Helpers de almacenamiento (token, etc.)
    │   ├── fetch.js                # httpService (fetch + timeout + Bearer)
    │   ├── sweetalert.js           # Tema / defaults SweetAlert2
    │   ├── columnasExcel.js        # Columnas esperadas en Excel
    │   ├── compareFlow.config.js   # Textos / HTML flujo comparación
    │   └── datasheetPdfSolutions.js  # Mapeo soluciones ↔ carga PDF
    │
    ├── components/
    │   ├── ComponentesFormulario.js  # Chat: burbujas, envío, render mensajes
    │   ├── MenuActions.js            # FAB configuración → popups / acciones
    │   ├── MenuActions.fun.js        # Helpers del menú
    │   ├── MenuConfiguracion.js      # Panel / opciones de configuración
    │   ├── SizingForm.js             # Formulario dinámico (schema desde API)
    │   ├── CompareTable.js           # Tabla + narrativa comparación
    │   ├── CompareModelPicker.js     # Selector de modelos en comparación
    │   └── BuzonNecesidades.js      # UI buzón de necesidades (si aplica al flujo actual)
    │
    ├── modal/
    │   ├── ModalAutenticacion.js     # Login / registro
    │   ├── ModalCargaDocumentos.js     # Carga Excel (drag & drop / legacy flujo)
    │   └── ModalCargaDatasheetPdf.js   # Carga datasheet PDF
    │
    ├── services/
    │   ├── AgentService.js           # Chat, menús, sizing, compare (antes “ChatService” conceptual)
    │   ├── AuthService.js
    │   ├── ExcelService.js
    │   ├── DatasheetPdfService.js
    │   └── PriceListService.js
    │
    ├── utils/
    │   ├── excelValidator.js
    │   ├── fixedData.js
    │   ├── clipboard.js
    │   └── compareFallbackRecommendation.js  # Fallback si falla narrativa API
    │
    ├── style/
    │   ├── style.css                 # Globales / layout app
    │   ├── form.css                  # Burbujas, menús, inputs chat
    │   ├── chat-theme.css            # Tema Fortinet / animaciones mensajes
    │   └── compare-table.css         # Estilos tabla comparación
    │
    ├── img/
    │   └── lib/                      # Favicon, manifest, logos (rutas usadas en index.html)
    │
    ├── php/                          # Scripts PHP (import / proceso Excel legacy)
    │   ├── import_excel.php
    │   └── process_excel.php
    │
    └── other/
        └── ExampleBodyExcel.json     # Ejemplo de cuerpo / estructura
```

---

## 🎯 Arquitectura de la Aplicación

### **Patrón de Diseño: Modular con ES6 Modules**

```

┌──────────────────────────────────────────────────────────┐
│                     index.html                            │
│  UI + Tailwind (CDN) + SweetAlert2 + SheetJS (CDN)        │
│  meta api-base → URL del Backend /api/v1                   │
└───────────────────────────┬──────────────────────────────┘
                            │
                            ▼
                    ┌───────────────┐
                    │   main.js     │  ← punto de entrada (type="module")
                    │  DOMContentLoaded
                    └───────┬───────┘
                            │
                            ▼
                ┌───────────────────────┐
                │  ConfiguracionInicial() │
                └───────────┬───────────┘
                            │
        ┌───────────────────┼────────────────────────────┐
        │                   │                            │
        ▼                   ▼                            ▼
 ┌─────────────┐   ┌─────────────────┐        ┌─────────────────────────┐
 │   config/   │   │  components/  │        │        modal/             │
 │             │   │                 │        │                         │
 │ variables   │   │ Componentes     │        │ ModalAutenticacion      │
 │ fetch       │   │   Formulario    │        │ ModalCargaDocumentos    │
 │ sweetalert  │   │   (chat UI)     │        │ ModalCargaDatasheetPdf  │
 │ localStorage│   │ MenuActions (+  │        │   (PDF datasheets)      │
 │ columnas    │   │   .fun)         │        └────────────┬────────────┘
 │ Excel       │   │ MenuConfiguracion                     │
 │ compareFlow │   │ SizingForm      │                     │
 │ datasheet   │   │ CompareTable /  │                     │
 │ PdfSolutions│   │ CompareModel    │                     │
 └─────────────┘   │ Picker          │                     │
                   │ BuzonNecesidades│                     │
                   │ (si aplica)     │                     │
                   └────────┬────────┘                     │
                            │                             │
                            ▼                             ▼
                   ┌─────────────────┐          ┌──────────────────────────┐
                   │  #chatbox (UI)  │          │       services/           │
                   │  render mensajes│          │                           │
                   │  innerHTML asst.│          │ AgentService ← chat + menús│
                   └────────┬────────┘          │   + sizing + compare     │
                            │                   │ AuthService              │
                            │                   │ ExcelService             │
                            │                   │ DatasheetPdfService      │
                            │                   │ PriceListService         │
                            │                   └────────────┬─────────────┘
                            │                                │
                            ▼                                │
                   ┌─────────────────┐                       │
                   │    Agent/       │                       │
                   │   prompt.js     │◄── usado por AgentService / agente
                   └─────────────────┘                       │
                            │                                ▼
                            │                   ┌──────────────────────────┐
                            │                   │        utils/             │
                            │                   │ excelValidator            │
                            │                   │ fixedData                   │
                            │                   │ clipboard                   │
                            │                   │ compareFallbackRecommendation│
                            └──────────────────►│  (si falla API narrativa)   │
                                                └──────────────────────────┘
                                                            │
                                                            ▼
                                                ┌──────────────────────────┐
                                                │   Backend REST (fetch)    │
                                                │   /agent/ask, /sizing/*,  │
                                                │   /compare/*, auth, etc. │
                                                └──────────────────────────┘
```

---
## 🔌 Comunicación con backend

El frontend consume una API REST:

- Base URL configurable en `src/config/variables.js`
- Uso de `fetch` mediante servicio centralizado (`httpService`)
- Manejo de autenticación mediante JWT (Bearer Token)

Endpoints principales:

- `/agent/ask` → Chat con el asistente  
- `/sizing/submit` → Dimensionamiento  
- `/compare` → Comparación de modelos

---

## 🔧 Componentes Principales

### **1. Entry Point (`main.js`)**

**Responsabilidades:**
- Inicializar configuración global
- Configurar SweetAlert2 con estilos personalizados
- Registrar event listeners del botón de configuración
- Orquestar el flujo de autenticación y carga de documentos

**Flujo:**
```javascript
DOMContentLoaded
    → ConfiguracionInicial()
        → initVariales()                     // Configurar variables globales
        → initSweetAlert()                   // Configurar SweetAlert2
        → configButtons()                    // Vincular eventos
            → ModalAutenticacion()           // Login
                → setTokenAuth()             // Guardar token
                → ModalCargaDocumentos()     // Cargar Excel
                    → ValidarProducto()      // Validar datos
                    → fixedData()            // Transformar datos
                    → ExcelService.InsertarProductos() // Enviar al backend
```
- Registrar event listeners
- Orquestar la apertura de modales

**Flujo:**
```javascript
DOMContentLoaded
    → ConfiguracionInicial()
        → initVariales()              // Configurar variables globales
        → settingsBtn.addEventListener() // Vincular botón de configuración
```

---

### **2. Configuración (`src/config/`)**

#### **2.1. variables.js**
**Propósito:** Centralizar variables globales del proyecto.

**API:**
```javascript
export const initVariales = () => {
  window.apiUrl = "http://localhost:8000/api/chatbot";
}

export const getGlobalVariable = (key) => window[key];
export const setGlobalVariable = (key, value) => { window[key] = value; }
```

#### **2.2. sweetalert.js**
Configura estilos globales y personalizaciones de SweetAlert2 para mantener consistencia visual.

#### **2.3. fetch.js**
HTTP client personalizado con:
- Configuración de headers automática
- Manejo de tokens de autenticación
- Interceptores de request/response

```javascript
export const setTokenAuth = (token) => { /* ... */ }
export const httpService = { get, post, put, delete }
```

#### **2.4. columnasExcel.js**
Define las columnas requeridas para validación de Excel:

```javascript
export const REQUIRED_PRODUCT_COLUMNS = [
    'UNIT', 'SKU', 'Description', 'Price',
    '1YrContract', '3YrContract', '5YrContract'
];

export const NO_EMPTY_PRODUCT_COLUMNS = ['UNIT', 'SKU'];
```

---

### **3. Componentes de UI (`src/components/ComponentesFormulario.js`)**

**Elementos exportados:**
- `form` - Formulario del chat
- `chatbox` - Contenedor de mensajes
- `input` - Campo de texto del usuario
- `settingsBtn` - Botón flotante de configuración (engranaje)

**Funcionalidades:**
- Submit con Enter (sin Shift)
- Renderizado de mensajes usuario/bot
- Scroll automático al último mensaje
- Botón de configuración flotante (engranaje)

---

### **4. Modales**

#### **4.1. ModalAutenticacion (`src/modal/ModalAutenticacion.js`)**

**Firma:**
```javascript
ModalAutenticacion(funExito, funUnAut, funError)
```

**Parámetros:**
- `funExito(response)` - Callback si autenticación exitosa (recibe objeto con token)
- `funUnAut()` - Callback si credenciales incorrectas
- `funError(err)` - Callback si ocurre error

**Características:**
- Interfaz de login moderna con SweetAlert2
- Validación de campos en tiempo real
- Integración con AuthService para autenticación real
- Manejo de errores y estados de carga

**Stack tecnológico:**
- SweetAlert2 para UI
- AuthService para llamadas al backend
- Validación inline

---

#### **4.2. ModalCargaDocumentos (`src/modal/ModalCargaDocumentos.js`)**

**Firma:**
```javascript
ModalCargaDocumentos(
    title,
    excelTemplate,
    funExito,
    funError,
    sheetName,
    funValidacion
) => Promise<Array>
```

**Parámetros:**
- `title` - Título del modal (default: "Cargar archivo Excel")
- `excelTemplate` - Ruta de la plantilla Excel para descargar (string o null)
- `funExito(data)` - Callback con array de objetos si carga exitosa
- `funError(err)` - Callback si ocurre error o se cancela
- `sheetName` (opcional) - Nombre de hoja específica a leer (null = todas las hojas)
- `funValidacion(data)` - Función de validación personalizada (ej: ValidarProducto)

**Características:**
- Drag & drop de archivos Excel (.xlsx, .xls, .csv)
- Enlace de descarga de plantilla Excel
- Validación de tipo de archivo
- Parsing con SheetJS (XLSX.js)
- Lectura de múltiples hojas (agrega propiedad 'familia' con nombre de hoja)
- Sistema de validación integrado
- Retorna Promise + ejecuta callbacks

**Flujo:**
```
Usuario arrastra archivo
    → Validar extensión (.xlsx, .xls, .csv)
    → FileReader.readAsArrayBuffer()
    → XLSX.read()
    → Si sheetName especificado: leer solo esa hoja
    → Si no: leer todas las hojas y agregar propiedad 'familia'
    → sheet_to_json()
    → funValidacion(data)  // ValidarProducto
    → Si válido: funExito(data)
    → Si inválido: mostrar error
```

**Uso típico:**
```javascript
ModalCargaDocumentos(
  "Cargar productos desde Excel",
  "./Docs/python/Fortinet_Products.xlsx",
  async (data) => {
    const fixedData = fixedData(data);
    await ExcelService.InsertarProductos(fixedData);
  },
  (err) => console.error(err),
  null,  // null = leer todas las hojas
  ValidarProducto  // Función de validación
);
```

---
## 🧠 Lógica del chat

El flujo del asistente está gestionado por:

- `AgentService.js` → manejo de estado y flujo conversacional
- Estados UI: idle, menú, dimensionamiento, comparación
- Manejo de historial de mensajes
- Integración con backend para respuestas dinámicas
  
---

### **5. Validadores (`src/utils/excelValidator.js`)**

Sistema completo de validación de archivos Excel con múltiples funciones especializadas:

#### **5.1. validateExcelColumns(data, requiredColumns)**
Valida que existan todas las columnas requeridas en los datos.

#### **5.2. validateAllSheetsColumns(data, requiredColumns)**
Valida que todas las hojas del Excel tengan las columnas requeridas.

#### **5.3. validateNoExtraColumns(data, requiredColumns)**
Valida que no existan columnas adicionales no permitidas, hoja por hoja.

**Retorna:**
```javascript
{
    valid: false,
    errors: [
        {
            sheet: "Firewall",
            extraColumns: ["precio", "descuento"],
            message: 'Hoja "Firewall": columnas no permitidas: precio, descuento'
        }
    ],
    message: "1 hoja(s) con columnas adicionales"
}
```

#### **5.4. validateNotEmptyColumns(data, requiredColumns)**
Valida que las columnas especificadas no contengan valores vacíos (null, undefined, "", espacios).

**Retorna:**
```javascript
{
    valid: false,
    errors: [
        {
            sheet: "Switch",
            emptyColumns: ["SKU", "UNIT"],
            message: 'Hoja "Switch": columnas con valores vacíos: SKU, UNIT'
        }
    ],
    message: "1 hoja(s) con columnas vacías"
}
```

#### **5.5. ValidarProducto(data)**
Función principal que ejecuta todas las validaciones para productos Fortinet:

1. ✅ Valida que todas las hojas tengan las columnas requeridas
2. ✅ Valida que no existan columnas adicionales
3. ✅ Valida que las columnas UNIT y SKU no estén vacías

```javascript
const result = ValidarProducto(excelData);
// {
//     valid: true/false,
//     errors: [...],
//     message: "El Excel de productos es válido"
// }
```

---

### **6. Servicios (`src/services/`)**

#### **6.1. AuthService.js**
Maneja la autenticación de usuarios con el backend.

#### **6.2. ExcelService.js**
```javascript
class ExcelService {
    async InsertarProductos(Productos) {
        const response = await httpService.post(
            '/product/insertar/masivo', 
            Productos
        );
        return response.data;
    }
}
```

#### **6.3. ChatService.js**
Servicio para interacciones con el chatbot (en desarrollo).

---

### **7. Utilidades (`src/utils/`)**

#### **7.1. fixedData.js**
Transforma y normaliza los datos del Excel antes de enviarlos al backend.

#### **7.2. clipboard.js**
Funciones para copiar datos al portapapeles.

---

## 📦 Dependencias Externas

### **CDN (incluidas en `index.html`):**

```html
<!-- Estilos y Frameworks CSS -->
<script src="https://cdn.tailwindcss.com"></script>

<!-- Librerías JavaScript -->
<script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
<script src="https://cdn.sheetjs.com/xlsx-latest/package/dist/xlsx.full.min.js"></script>

<!-- Aplicación Principal -->
<script src="./main.js" type="module"></script>
```

| Librería | Versión | Propósito |
|----------|---------|-----------|
| **Tailwind CSS** | Latest (CDN) | Estilos utility-first |
| **SweetAlert2** | v11 | Modales elegantes y personalizables |
| **SheetJS (xlsx)** | Latest | Lectura/escritura de archivos Excel |

---

## 🔄 Flujo de Datos

### **Flujo completo de Carga de Datasheets:**

```

[Usuario]
    │
    ├─> Click en botón engranaje (settings-btn)
    │
    ├─> ¿Sesión activa? (AuthService.isLogged() + token en localStorage)
    │       │
    │       ├─> NO → ModalAutenticacion()
    │       │       │
    │       │       ├─> Credenciales → AuthService.login / register
    │       │       └─> setTokenAuth(token)   // fetch.js + localStorage (Bearer en subidas)
    │       │
    │       └─> SÍ (o tras login) → createMenuConfiguracion()  // menú desplegable
    │
    └─> Opción «Cargar datasheet PDF» → CargarDatasheetPdf()   [MenuActions.fun.js]
            │
            ├─> openModalCargaDatasheetPdf()   [ModalCargaDatasheetPdf.js]
            │       │
            │       ├─> SweetAlert2: select solución obligatoria
            │       │       (opciones desde datasheetPdfSolutions.js → alineado con backend)
            │       │
            │       ├─> Zona drag & drop + <input type="file" accept="application/pdf,.pdf">
            │       │       (sin XLSX: solo PDF)
            │       │
            │       └─> preConfirm:
            │               • solutionType no vacío
            │               • archivo presente
            │               • extensión .pdf
            │       → { file, solutionType }  |  cancel → reject('cancelled')
            │
            ├─> DatasheetPdfService.uploadDatasheetPdf(file, solutionType)
            │       │
            │       ├─> FormData: campo "file" + campo "solutionType"
            │       │
            │       └─> POST {apiUrl}/datasheet/pdf/upload
            │               headers: Authorization: Bearer <token> (si existe)
            │               body: multipart/form-data (no JSON)
            │       │
            │       └─> Backend [datasheet.routes.js]:
            │               protect (JWT)
            │               → uploadDatasheetPdfMiddleware (multer, memoria, límite ~35MB, solo PDF)
            │               → uploadDatasheetPdf [datasheetPdf.controller.js]
            │               → ingest PDF (texto/tablas), upsert catálogo / specs según solución
            │
            ├─> Si respuesta OK:
            │       ├─> success + data.report.warnings[] → SweetAlert advertencias (lista)
            │       └─> sin warnings → SweetAlert éxito breve
            │
            ├─> Si 401 → quitar token, mensaje sesión expirada
            │
            └─> Si error red / 4xx / 5xx → SweetAlert con message del API

---
```
Nota: Carga masiva por Excel (datasheets en filas) sigue siendo otro flujo:
      ModalCargaDocumentos → XLSX → validadores → ExcelService → POST /datasheet/insertar/masivo
      
### **Flujo completo de Carga de Lista de Fortinet:**
```

[Usuario]
    │
    ├─> Click engranaje (settings-btn)
    │
    ├─> ¿Sesión activa? (AuthService.isLogged)
    │       ├─> NO → ModalAutenticacion → token → setTokenAuth → menú configuración
    │       └─> SÍ → createMenuConfiguracion()
    │
    └─> «Cargar Price List Fortinet» → CargarPriceListFortinet()  [MenuActions.fun.js]
            │
            ├─> ModalCargaDocumentos(
            │       título: "Cargar Price List Fortinet (Main Price List)",
            │       plantilla: null (enlace "aquí" queda en '#' si no hay URL),
            │       options: { accept: ".xlsx,.xls", parseExcel: false }   ← modo “archivo crudo”
            │   )
            │       │
            │       ├─> Drag & drop o selector de archivo
            │       │
            │       ├─> preConfirm: exige archivo; NO exige .xlsx en código si accept es solo xlsx/xls
            │       │       (validación fuerte solo en modo parseExcel con isExcelMode)
            │       │
            │       └─> FileReader.readAsArrayBuffer(file)
            │               → sin XLSX.read en frontend (parseExcel: false)
            │               → valor devuelto: { file, name, size, type, data, arrayBuffer }
            │
            ├─> Callback éxito → payload?.file
            │
            ├─> PriceListService.uploadFortinetPriceList(file)
            │       │
            │       ├─> FormData.append("file", file)   // campo que espera multer: 'file'
            │       │
            │       └─> POST {apiUrl}/price-list/upload
            │               Authorization: Bearer <token> (si hay sesión)
            │               multipart/form-data
            │
            └─> Backend [priceList.routes.js]
                    router.use(protect)   // JWT obligatorio en todo el módulo
                    │
                    ├─> uploadPriceListFileMiddleware (multer memoryStorage, límite ~20 MB)
                    │
                    └─> priceList.controller.uploadPriceList
                            ├─> req.file.buffer → uploadPriceListFile(...)  [priceListUpload.service]
                            │       • crea batch (PriceUploadBatch), staging, ETL a catálogo/ofertas
                            │       • sourceType: 'fortinet_official'
                            │
                            └─> Respuesta ApiResponse.created: success + data (p. ej. batch_id, status)

            ├─> Frontend: si success → Swal éxito (muestra batch_id / status si vienen)
            ├─> Si error → Swal error con message del API
            └─> Si 401 → borra token + “Sesión expirada”
```

### **Flujo completo de Buzón de Necesidades**{
Tiene dos carriles: (A) cómo entran los registros, (B) cómo los revisa un usuario autenticado.
A) Alta automática (cada pregunta al chat)
```

[Usuario en el chat]
    │
    └─> Envío mensaje → POST /api/v1/agent/ask  (array de mensajes)
            │
            └─> ollama.controller: si hay texto de usuario no vacío
                    needsInboxService.createFromUserQuestion(userText).catch(...)
                    │   • asíncrono: no bloquea la respuesta del agente
                    │   • persiste en needs_inbox (clasificación inicial / scores / keywords según servicio)
                    └─> el agente sigue: sizing, recomendación, LLM, etc.
```
B) Panel de revisión (menú engranaje)
```

[Usuario administrador / revisor]
    │
    ├─> Engranaje → sesión activa (misma lógica login que arriba)
    │
    └─> «Buzón de Necesidades» → openBuzonNecesidades()  [BuzonNecesidades.js]
            │
            ├─> Overlay HTML: métricas + filtros + tabla
            │
            ├─> Carga inicial (httpService → Bearer desde localStorage)
            │       GET /needs-inbox/stats          → tarjetas (total, por estado, top soluciones)
            │       GET /needs-inbox?limit=100   (+ opcional status, search)
            │
            ├─> Todas las rutas /needs-inbox/* van con protect (JWT)  [needsInbox.routes.js]
            │
            ├─> Acciones en tabla
            │       ├─> «Ver» → GET /needs-inbox/:id
            │       │       → openDetailModal → formulario reclasificación
            │       │       → Guardar → PUT /needs-inbox/:id/review
            │       │             body: confirmed_solution, review_status, observations, learning_phrase (opc.)
            │       │
            │       ├─> «Confirmar» (rápido) → PUT /needs-inbox/:id/status
            │       │       { review_status: 'confirmado' }
            │       │
            │       └─> «Descartar» → PUT /needs-inbox/:id/status
            │               { review_status: 'descartado' }
            │
            ├─> Flujo “Clasificar” (si lo enlazas desde UI con data-action="clasificar")
            │       → GET /needs-inbox/:id → openClassifyModal
            │       → PATCH /needs-inbox/:id
            │             confirmed_solution, review_status: 'confirmado', learning_phrase (opc.)
            │             → alimenta aprendizaje (keywords/frases) según backend
            │
            ├─> Filtros: cambio estado / búsqueda (debounce ~400 ms) → nuevo GET lista
            ├─> «Actualizar» → loadList + loadStats
            │
            └─> Si 401 en cualquier llamada → SweetAlert sesión + closeBuzon()
```

### **Estructura de datos del Excel procesado:**

```javascript
[
    {
        UNIT: "FortiGate-30G",
        SKU: "FG-30G",
        Description: "4 x GE RJ45 ports...",
        Price: 395,
        "1YrContract": 731,
        "3YrContract": 1822,
        "5YrContract": null,
        familia: "FortiGate"  // Nombre de la hoja Excel
    },
    // ... más productos
]
```

---

## 🎨 Stack Tecnológico

### **Frontend:**
- **HTML5** - Estructura semántica
- **CSS3** + **Tailwind CSS** - Estilos modernos y responsivos
- **JavaScript ES6+** - Módulos, Promises, async/await
- **SweetAlert2** - Modales interactivos
- **SheetJS** - Manipulación de Excel en el navegador

### **Backend (previsto):**
- API REST en `http://localhost:8000/api/chatbot`
- Servicios PHP en `src/php/` (legacy, no activos)

---

## 🔐 Seguridad

### **Implementaciones de seguridad:**

✅ **Autenticación con token:**
- Sistema de autenticación basado en JWT
- Token almacenado y enviado en headers de peticiones
- Manejo seguro de credenciales

✅ **Validación de archivos:**
- Validación de extensión (.xlsx, .xls, .csv)
- Validación de estructura de columnas
- Validación de datos obligatorios
- Detección de columnas no permitidas

⚠️ **Consideraciones adicionales:**

**CORS:**
- Las llamadas a API externas requieren configuración CORS en el backend

**Validación de contenido:**
- Considerar validar MIME type además de extensión
- Implementar límite de tamaño de archivo
- Sanitización de datos antes de envío al backend

---

## 🧪 Validación de Datos

### **Sistema de Validación Multi-capa:**

1. **Validación de Estructura:**
   - Verifica que existan todas las columnas requeridas
   - Detecta columnas adicionales no permitidas

2. **Validación de Contenido:**
   - Verifica que campos obligatorios no estén vacíos
   - Soporta validación hoja por hoja

3. **Validación Personalizable:**
   - Sistema extensible para agregar nuevas reglas
   - Mensajes de error detallados por hoja

**Ejemplo de error detallado:**
```
2 hoja(s) con columnas adicionales

• Hoja "Firewall": columnas no permitidas: precio_especial, descuento
• Hoja "Switch": columnas no permitidas: stock
```

---

## 🧩 Extensibilidad

### **Agregar nuevas validaciones:**

```javascript
// src/utils/excelValidator.js
export const validateCustomRule = (data, customParams) => {
    // Agrupar por hojas
    const sheetGroups = {};
    data.forEach(row => {
        const sheetName = row.familia || 'Sin nombre';
        if (!sheetGroups[sheetName]) {
            sheetGroups[sheetName] = [];
        }
        sheetGroups[sheetName].push(row);
    });

    const errors = [];
    
    // Validar cada hoja
    Object.keys(sheetGroups).forEach(sheetName => {
        const sheetData = sheetGroups[sheetName];
        // Tu lógica de validación aquí
        if (/* condición de error */) {
            errors.push({
                sheet: sheetName,
                message: `Hoja "${sheetName}": descripción del error`
            });
        }
    });

    if (errors.length > 0) {
        return {
            valid: false,
            errors: errors,
            message: `${errors.length} hoja(s) con errores`
        };
    }

    return { valid: true, errors: [], message: 'Validación exitosa' };
};
```

### **Agregar nuevos modales:**

```javascript
// src/modal/MiNuevoModal.js
export const MiNuevoModal = (callback) => {
  Swal.fire({
    background: '#1e293b',
    title: 'Mi Modal',
    html: '...',
    confirmButtonColor: '#dc2626',
    // ...
  }).then((result) => {
    if (result.isConfirmed) callback(result.value);
  });
};
```

### **Agregar nuevos servicios:**

```javascript
// src/services/MiServicio.js
import { httpService } from "../config/fetch.js";

class MiServicio {
    async fetchData(params) {
        const response = await httpService.get('/endpoint', params);
        return response.data;
    }
}

export default new MiServicio();
```

---

## 📊 Datos y Modelos

### **Formato de productos Fortinet (estructura del Excel):**

**Columnas requeridas:**
```javascript
REQUIRED_PRODUCT_COLUMNS = [
    'UNIT',           // Nombre del producto
    'SKU',            // Código del producto
    'Description',    // Descripción detallada
    'Price',          // Precio base
    '1YrContract',    // Precio contrato 1 año
    '3YrContract',    // Precio contrato 3 años
    '5YrContract'     // Precio contrato 5 años
]
```

**Columnas obligatorias (no pueden estar vacías):**
```javascript
NO_EMPTY_PRODUCT_COLUMNS = ['UNIT', 'SKU']
```

**Ejemplo de registro:**
```javascript
{
  UNIT: "FortiGate-30G",
  SKU: "FG-30G",
  Description: "4 x GE RJ45 ports, 1 x GE RJ45 WAN port...",
  Price: 395,
  "1YrContract": 731,
  "3YrContract": 1822,
  "5YrContract": null,
  familia: "FortiGate"  // Agregado automáticamente (nombre de hoja)
}
```

### **Plantilla Excel:**
La plantilla oficial se encuentra en: `Docs/python/Fortinet_Products.xlsx`

- Puede contener múltiples hojas (una por familia de productos)
- Cada hoja debe tener las mismas columnas requeridas
- Los usuarios pueden descargarla desde el modal de carga

---

## 🚀 Instalación y Uso

### **Requisitos previos:**
- Navegador moderno con soporte para ES6 modules
- Servidor HTTP para desarrollo local (no se puede abrir directamente desde el sistema de archivos)
- Backend API corriendo en `http://localhost:8000` (configurable)

### **Desarrollo local:**

**Opción 1: Live Server (VS Code)**
```bash
# Instalar extensión Live Server en VS Code
# Clic derecho en index.html > "Open with Live Server"
```

**Opción 2: Python HTTP Server**
```bash
python -m http.server 8080
# Abrir http://localhost:8080
```

**Opción 3: Node.js**
```bash
npx five-server
# o
npx http-server
```

### **Uso de la aplicación:**

1. **Abrir la aplicación** en el navegador
2. **Click en el botón de configuración** (⚙️ engranaje flotante)
3. **Login** con credenciales del backend
4. **Cargar archivo Excel:**
   - Descargar plantilla desde el enlace en el modal
   - Completar datos en el Excel
   - Arrastrar archivo al área de carga o hacer clic para seleccionar
5. **Validación automática:** El sistema valida estructura y contenido
6. **Carga exitosa:** Los productos se envían al backend

### **Configuración:**

Editar `src/config/variables.js` para cambiar la URL del backend:
```javascript
export const initVariales = () => {
  window.apiUrl = "https://tu-backend.com/api/chatbot";
}
```

---

## ⚙️ Tecnologías

- HTML5
- JavaScript ES6 (Modules)
- Tailwind CSS (CDN)
- SweetAlert2
- SheetJS (XLSX)

---
## 🔐 Seguridad

- Autenticación basada en JWT
- Token almacenado en localStorage
- Validación de archivos Excel (estructura y contenido)
- Manejo de headers Authorization en requests

⚠️ Consideración:
El uso de `innerHTML` en mensajes del chat requiere que el contenido provenga de fuentes controladas.

---

## 🎨 Estilos

- CSS personalizado (`style.css`, `form.css`, `chat-theme.css`)
- Tailwind para layout y utilidades

## 📝 Convenciones de Código

### **Nombres de archivos:**
- PascalCase para componentes: `ModalAutenticacion.js`
- camelCase para utilidades: `variables.js`

### **Exports:**
- Named exports para funciones: `export const initVariales`
- Default exports para componentes principales (opcional)

### **Callbacks:**
- Prefijo `fun` para parámetros de callback: `funExito`, `funError`

---

## 🐛 Debugging

### **Variables globales útiles (consola del navegador):**
```javascript
window.apiUrl                 // Ver URL de API configurada
```

### **Herramientas de desarrollo:**
- Consola del navegador muestra logs detallados de validación
- Errores de validación se muestran en modales con SweetAlert2
- Network tab para inspeccionar peticiones HTTP

### **Validación manual:**
```javascript
// Importar validadores en consola (si es necesario)
import { ValidarProducto } from './src/utils/excelValidator.js';

// Validar datos manualmente
const result = ValidarProducto(datosExcel);
console.log(result);
```

---

## ✅ Características Implementadas

- ✅ Sistema de autenticación con token JWT
- ✅ Carga de archivos Excel drag & drop
- ✅ Lectura de múltiples hojas Excel
- ✅ Validación multi-capa de estructura y contenido
- ✅ Validación hoja por hoja con mensajes detallados
- ✅ Descarga de plantilla Excel desde el modal
- ✅ Integración con backend para carga masiva de productos
- ✅ Interfaz moderna con Tailwind CSS
- ✅ Modales elegantes con SweetAlert2
- ✅ HTTP client con manejo de tokens
- ✅ Transformación de datos antes de envío
- ✅ Manejo de errores y estados de carga

---

## 📚 Referencias

- [SweetAlert2 Documentation](https://sweetalert2.github.io/) - Librería de modales
- [SheetJS Documentation](https://docs.sheetjs.com/) - Lectura/escritura de Excel
- [Tailwind CSS](https://tailwindcss.com/) - Framework CSS utility-first
- [ES6 Modules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules) - Sistema de módulos JavaScript

---

## 👥 Contribución

### **Estructura de commits:**
```
tipo(alcance): descripción corta

Descripción detallada (opcional)
```

**Tipos:**
- `feat`: Nueva funcionalidad
- `fix`: Corrección de errores
- `docs`: Documentación
- `style`: Formato de código
- `refactor`: Refactorización
- `test`: Tests
- `chore`: Tareas de mantenimiento

### **Ejemplo:**
```
feat(validator): agregar validación de columnas vacías

Implementa validateNotEmptyColumns() que valida hoja por hoja
que las columnas especificadas no contengan valores vacíos.
```

---

**Última actualización:** 10 de enero de 2026  
**Versión:** 2.0.0  
**Mantenedor:** Equipo Nycolt

---

## 📄 Licencia

Este proyecto es propiedad de Nycolt. Todos los derechos reservados.
