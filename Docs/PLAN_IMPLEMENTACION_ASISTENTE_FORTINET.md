# Plan de implementación – Asistente Comercial Fortinet

Documento de referencia para terminar el proyecto del chatbot asistente comercial Fortinet.  
**Objetivo:** no romper lo que ya funciona (FortiGate sizing), extender de forma modular y entregable.

---

## 1. Resumen: cómo se entiende el proyecto

### Qué es hoy

- **Backend:** API REST (Express) con `POST /api/v1/agent/ask` como eje. Flujo actual:
  1. **Sizing FortiGate:** si el mensaje del usuario entra en el flujo de dimensionamiento (palabras clave o `__START_FORTIGATE_SIZING__`), se delega a `fortigateSizing.service.js` → `fortigate/fortigate.flow.js`. Sesión en memoria por `sessionId` (IP + User-Agent). Preguntas secuenciales (WAN, usuarios, perfil, VPN, SSL, VDOMs, etc.), evaluación contra `Datasheet` con `fortigate.engine.js`, respuesta con modelo recomendado (económico/recomendado/holgado).
  2. **Producto + LLM:** si `req.productos` viene poblado por el middleware `productParser.js` (extracción por regex de FortiGate), se consulta `Datasheet` + `Producto` y se inyecta contexto al LLM (Ollama/OpenRouter); la respuesta es generada por el modelo.
  3. **Chat genérico:** en cualquier otro caso, el mensaje se envía al LLM sin contexto estructurado.

- **Frontend:** HTML + JS (módulos) + Tailwind. Flujo de chat:
  - Usuario escribe → `AgentService.generateAgentResponse(messages)`.
  - Si es "dimensionar" (sin "fortigate") → se muestra menú local 1–9 (solo FortiGate implementado como opción 1).
  - Si opción "1" o "dimensionar fortigate" → se envía a `/agent/ask` (en opción 1 se sustituye por `__START_FORTIGATE_SIZING__`).
  - Resto de mensajes → siempre a `/agent/ask`. No hay formularios dinámicos; todo es chat secuencial.

- **Datos:** 
  - **Producto / ProductoTemporal:** UNIT, SKU, Familia, Descripcion, Price, OneYearContract, ThirdYearContract, FiveYearContract. Carga desde Excel → staging (ProductoTemporal) → SP `DebbugProductos` → Producto.
  - **Datasheet / DatasheetTemporal:** especificaciones técnicas (throughputs, sesiones, VPN, etc.). Carga similar vía `DebbugDatasheets`. Solo FortiGate usa hoy estos campos en el motor de sizing.
  - No existe aún: lifecycle (EOS/EOL), replacement map, ni estructura explícita hardware vs licencias/bundles.

### Qué se pide completar

| Área | Descripción |
|------|-------------|
| **A** | Dimensionamiento de las otras 8 soluciones (FortiGate VM, FortiWiFi, FortiAnalyzer, FortiManager, FortiSwitch, FortiAP, FortiMail, FortiWeb) con lógica determinística (preguntas + datasheet/matrices). |
| **B** | Recomendación de licencias/bundles por modelo: identificar SKUs por UNIT, separar hardware vs licencias (ej. FC-*), sugerir por duración (1/3/5 años) sin romper el cargue actual. |
| **C** | Recomendación de solución por descripción en lenguaje natural: keywords/categorías/pesos (sin LLM obligatorio) → sugerir producto Fortinet. |
| **D** | Comparación entre modelos: tabla comparativa estructurada; y comparación EOS/EOL vs reemplazo sugerido. |
| **E** | Gestión EOS/EOL: estados ACTIVE/EOS/EOL + reemplazo sugerido, con datos estructurados (tablas). |
| **F** | Pasar de chat secuencial a formulario dinámico editable por solución (preguntas, selects, enviar todo junto). |

Restricciones: no romper el motor FortiGate actual; código limpio y escalable; recomendaciones preferiblemente determinísticas; no depender solo de LLM; priorizar rapidez y estabilidad.

---

## 2. Arquitectura final propuesta

### 2.1 Backend

- **Dispatcher de intención en `/agent/ask`:**
  - Mantener orden actual: primero sizing (todos los tipos), luego producto+LLM, luego chat genérico.
  - Sizing: un único “sizing dispatcher” que, según tipo de solución (1–9), llame al motor correspondiente (FortiGate ya existe; los otros 8, nuevos).
  - Nuevos flujos pueden ser: “por chat” (igual que ahora pero con otras preguntas) o “por formulario” (backend recibe un solo payload con todas las respuestas cuando el frontend envíe el formulario completo).

- **Servicios nuevos/reorganizados:**

  | Servicio | Responsabilidad |
  |----------|-----------------|
  | `sizingDispatcher.service.js` | Recibe tipo de solución (1–9) y texto o payload; delega a fortigate / fortigateVM / fortianalyzer / … |
  | `fortigate/` (existente) | Sin cambios de lógica; solo se llama desde el dispatcher. |
  | `fortigateVM/`, `fortiwifi/`, `fortianalyzer/`, `fortimanager/`, `fortiswitch/`, `fortiap/`, `fortimail/`, `fortiweb/` | Cada uno: `*.ranges.js` (opciones), `*.engine.js` (evaluación), `*.flow.js` (flujo preguntas o evaluación en lote). |
  | `solutionRecommendation.service.js` | Recomendación por descripción: keywords → categorías → solución sugerida (sin LLM). |
  | `comparison.service.js` | Comparar 2+ modelos (datasheet/producto) → tabla estructurada; EOS/EOL + replacement. |
  | `lifecycle.service.js` | Consultar estado (ACTIVE/EOS/EOL) y reemplazo desde BD. |
  | `licenseBundle.service.js` | Dado un UNIT (modelo), listar SKUs asociados; clasificar hardware vs licencias/bundles; filtrar por duración (1/3/5 años). |

- **Controladores/rutas:**
  - Mantener `POST /api/v1/agent/ask` como entrada principal; dentro del controller, después del sizing (todos los tipos), seguir con producto+LLM o respuesta directa.
  - Opcional más adelante: `POST /api/v1/sizing/submit` para cuando el frontend envíe formulario completo (payload con `solutionType` + `answers`); el backend ejecuta el motor correspondiente y devuelve recomendación sin chat.
  - Opcional: `GET /api/v1/sizing/schema/:solutionType` para que el frontend construya el formulario dinámico (preguntas, tipos, opciones).

- **Base de datos (nuevas tablas / campos):**
  - **Lifecycle:** tabla `ProductLifecycle` (o equivalente): identificador de producto (UNIT o UNIT+SKU según convención), `status`: ACTIVE | EOS | EOL, fechas opcionales.
  - **Reemplazo:** tabla `ProductReplacement` (product_id o UNIT/SKU, replacement_id o UNIT/SKU); o columna `replacement_unit` en la misma tabla de lifecycle.
  - **Pricing/bundles:** no hace falta cambiar el cargue. Se puede:
    - Mantener Producto como está (todas las filas: hardware + licencias).
    - En backend, regla por convención: mismo UNIT → mismo “modelo”; primera fila por UNIT (orden por id o SKU) = hardware; SKU tipo `FC-*` o sin prefijo de hardware = licencia/bundle. Servicio `licenseBundle.service.js` filtra por UNIT y clasifica según SKU/Descripcion.
  - **Recomendación por keywords:** puede ser solo configuración en código (mapa keyword → solución) o tabla `SolutionKeyword` (keyword, solution_id, weight). Para entregar rápido, mapa en código es suficiente.

### 2.2 Frontend

- **Estados de UI:**
  - `idle`: chat normal.
  - `dimension_menu`: menú 1–9 (actual).
  - `sizing_form`: se muestra formulario dinámico de la solución elegida (2–9; FortiGate puede seguir por chat o también tener formulario).
  - `sizing_flow`: mismo que ahora, flujo por chat (para FortiGate u otros que aún no tengan formulario).

- **Formularios dinámicos:**
  - Al elegir opción 2–9 (o 1 si se unifica): si existe “schema” para esa solución, mostrar formulario (preguntas, selects, inputs) en un panel/modal, sin enviar mensajes uno a uno.
  - El usuario edita y envía todo; el frontend envía a `POST /api/v1/agent/ask` (o a `POST /api/v1/sizing/submit`) un payload como `{ solutionType: 3, answers: { ... } }`.
  - Backend devuelve recomendación; el frontend la muestra como mensaje del asistente (o en una “vista de resultado” con tabla).

- **Comparación y EOS/EOL:**
  - El usuario puede escribir “comparar X vs Y” o “¿FortiGate 40F está EOL?”. Backend ya resuelve con los nuevos servicios; el frontend solo debe poder mostrar tablas (HTML o componente simple de tabla) cuando la respuesta incluya `comparisonTable` o `lifecycleStatus`. Se puede definir un formato de respuesta estructurado (JSON) para que el frontend renderice tabla.

- **Recomendación de solución:**
  - El usuario escribe su necesidad; backend usa `solutionRecommendation.service.js` y responde con la solución sugerida; el frontend lo muestra como mensaje normal o con un bloque destacado.

- **Licencias/bundles:**
  - Después de una recomendación de equipo, el backend (o el LLM con contexto) puede añadir: “¿Quieres que recomiende licencias/bundles?”. Si el usuario acepta, backend usa `licenseBundle.service.js` y devuelve opciones (1/3/5 años); el frontend las muestra en el chat o en una minitabla.

### 2.3 Flujo de datos resumido

```
Usuario (chat o formulario)
    → POST /api/v1/agent/ask [ messages ] o POST /api/v1/sizing/submit { solutionType, answers }
    → productParser (solo si no es sizing)
    → Dispatcher sizing:
        - Si sizing por chat (ej. FortiGate): handleFortigateSizingFlow(...) / otros flows
        - Si sizing por formulario: runSizingFromPayload(solutionType, answers)
    → Si hay recomendación de sizing → respuesta
    → Si no: producto + LLM o solutionRecommendation o comparison o lifecycle o licenseBundle según intención
    → Respuesta (texto + opcionalmente comparisonTable / lifecycle / bundles)
```

La detección de “intención” (comparar, EOS/EOL, recomendar solución, licencias) puede hacerse por keywords en el último mensaje del usuario y/o con un pequeño router en el controller antes de llamar al LLM.

---

## 3. Estrategia de base de datos

### 3.1 Lifecycle y reemplazo

- **Tabla `ProductLifecycle`:**
  - `id`, `unit` (VARCHAR, ej. "FortiGate-40F"), `sku` (opcional, para variantes), `status` ENUM('ACTIVE','EOS','EOL'), `eos_date`, `eol_date` (opcional), `createdAt`, `updatedAt`.
  - Índice por `unit` (y sku si se usa).

- **Tabla `ProductReplacement`:**
  - `id`, `unit` (modelo que se reemplaza), `replacement_unit` (modelo sugerido), opcionalmente `replacement_sku`, `createdAt`, `updatedAt`.
  - Índice por `unit`.

- Carga inicial: script SQL o Excel importado a estas tablas; el cargue de Producto/Datasheet no se toca.

### 3.2 Pricing / bundles

- **Sin cambiar esquema de Producto:** seguir cargando Excel → ProductoTemporal → DebbugProductos → Producto.
- **Convención en backend:**
  - Mismo `UNIT` = mismo “modelo”. Todos los registros con ese UNIT son “asociados” (hardware + licencias).
  - Clasificación: por prefijo de SKU (ej. FG-*, FAZ-* = hardware; FC-* = licencia/bundle) o por orden (primera fila del UNIT = hardware). Esto se implementa en `licenseBundle.service.js` usando ProductService.getProductByUnit(unit).
- Si más adelante se quiere normalizar: tabla `ProductModel` (UNIT, tipo: hardware | license | bundle) y `ProductModelItem` (product_id, model_id, type), pero no es necesario para la primera entrega.

### 3.3 Datasheets por solución

- Hoy Datasheet es muy “FortiGate-centric” (throughputs, VPN, VDOMs). Para FortiAnalyzer, FortiManager, FortiAP, etc., puede que no existan columnas en la misma tabla.
- Opciones:
  - **A)** Ampliar `Datasheet` con columnas opcionales por familia (nullable); cada motor lee solo las que necesita.
  - **B)** Tablas por familia: `DatasheetFortiAnalyzer`, etc. Más limpio pero más migraciones y más código.
- Recomendación para no romper nada: **A)** añadir columnas opcionales cuando haga falta y que los nuevos motores usen solo las suyas; o usar un JSON column si MySQL lo permite. Si los datos ya vienen en otro Excel, se puede mapear a columnas nuevas en la misma tabla.

---

## 4. Archivos a tocar y a crear

### 4.1 Backend – archivos existentes a modificar

| Archivo | Cambios |
|---------|---------|
| `src/controllers/ollama.controller.js` | Después de obtener `userText` y `sessionId`: llamar a un sizing dispatcher que soporte todos los tipos (1–9); si el dispatcher indica “no es sizing” o “sizing resuelto sin match”, seguir con la lógica actual (productos + LLM). Opcional: detectar intención “comparar”, “EOS/EOL”, “recomendar solución”, “licencias” y llamar a los nuevos servicios antes del LLM. |
| `src/routes/ollama.routes.js` | Sin cambios críticos; opcional: añadir `POST /sizing/submit` si se usa formulario. |
| `src/middlewares/productParser.js` | Ampliar detección de “sizing” para que no solo sea FortiGate (ej. si el body trae `solutionType` y `answers`, no ejecutar extractor de producto). |
| `src/services/fortigateSizing.service.js` | Mantener export de `handleFortigateSizingFlow` y `resetSession`; puede reexportar desde un índice de sizing si se centraliza. |

### 4.2 Backend – archivos nuevos

| Archivo | Responsabilidad |
|---------|-----------------|
| `src/services/sizingDispatcher.service.js` | Recibe `{ solutionType, sessionId, userText }` o `{ solutionType, answers }`. Si es formulario, llama al motor correspondiente con `answers`; si es chat, delega al flow correspondiente (solo FortiGate existe hoy). |
| `src/services/fortigateVM/` | fortigateVM.ranges.js, fortigateVM.engine.js, fortigateVM.flow.js (patrón igual que fortigate). |
| `src/services/fortiwifi/`, `fortianalyzer/`, `fortimanager/`, `fortiswitch/`, `fortiap/`, `fortimail/`, `fortiweb/` | Misma estructura por solución (ranges, engine, flow). |
| `src/services/solutionRecommendation.service.js` | Keywords → categoría → solución (FortiGate, FortiWeb, FortiMail, etc.). |
| `src/services/comparison.service.js` | Dados 2 UNIT (o UNIT+SKU), leer Datasheet/Producto y armar tabla comparativa; si uno es EOS/EOL, incluir reemplazo. |
| `src/services/lifecycle.service.js` | Consultar ProductLifecycle y ProductReplacement. |
| `src/services/licenseBundle.service.js` | Por UNIT, listar productos (getProductByUnit), clasificar hardware vs licencias, filtrar por duración (1/3/5 años). |
| `src/config/solutionKeywords.js` (o BD) | Mapa o lista keyword → solution type. |
| Migraciones o SQL para `ProductLifecycle` y `ProductReplacement`. |

### 4.3 Frontend – archivos existentes a modificar

| Archivo | Cambios |
|---------|---------|
| `src/services/AgentService.js` | Cuando el usuario elige 2–9 (o 1 con formulario): en lugar de enviar solo `__START_FORTIGATE_SIZING__`, abrir formulario dinámico si existe schema para ese tipo; si no, enviar comando de inicio de sizing al backend (ej. `__START_SIZING__{ "solutionType": 2 }`). Gestionar estado `sizing_form` y envío de payload de formulario. |
| `src/components/ComponentesFormulario.js` | Soportar render de “bloque de formulario” (preguntas + selects + botón Enviar) además de burbujas de chat; al enviar formulario, llamar a backend con `solutionType` + `answers` y mostrar resultado. |
| `src/components/` (nuevo o existente) | Componente o función que renderice tabla comparativa y/o estado EOS/EOL cuando la respuesta del backend traiga estructura (ej. `comparisonTable`, `lifecycle`). |
| `main.js` | Sin cambios grandes; el flujo se controla desde AgentService y componentes. |

### 4.4 Frontend – archivos nuevos

| Archivo | Responsabilidad |
|---------|-----------------|
| `src/config/sizingSchemas.js` o respuesta de `GET /api/v1/sizing/schema/:type` | Definir para cada solutionType (1–9) las preguntas (id, label, type: select|number|text, options). Usado para construir el formulario dinámico. |
| `src/components/SizingForm.js` (o similar) | Formulario dinámico: recibe schema, renderiza campos, recoge `answers`, envía a backend. |
| `src/components/ComparisonTable.js` (o similar) | Renderizar tabla a partir de datos estructurados de comparación. |

---

## 5. Orden de implementación recomendado

Objetivo: entregar valor incremental sin romper FortiGate y permitir probar cada pieza.

### Fase 1 – Base y dispatcher (1–2 semanas)

1. **BD:** Crear tablas `ProductLifecycle` y `ProductReplacement`; script de migración o SQL en `func/database/` o en `Backend/Docs/sql/`.
2. **Backend:** `sizingDispatcher.service.js` que por ahora solo delegue a FortiGate (igual que ahora) y acepte en el futuro `solutionType` + `answers` para formulario.
3. **Backend:** Integrar en `ollama.controller.js` el dispatcher (sustituir la llamada directa a `handleFortigateSizingFlow` por una llamada al dispatcher con `solutionType: 1` cuando corresponda).
4. Verificar que el flujo actual de dimensionamiento FortiGate sigue igual (chat secuencial).

### Fase 2 – Formularios dinámicos (frontend) (1–2 semanas)

5. **Backend:** Endpoint `GET /api/v1/sizing/schema/:solutionType` que devuelva el schema de preguntas para tipo 1 (FortiGate) y, si se quiere, tipos 2–9 con preguntas placeholder.
6. **Frontend:** Schema de FortiGate en código o desde API; componente `SizingForm` que renderice preguntas y envíe `{ solutionType, answers }`.
7. **Backend:** `POST /api/v1/sizing/submit` (o reutilizar `/agent/ask` con body específico) que reciba `solutionType` + `answers` y, para tipo 1, ejecute la lógica de FortiGate sin chat (mismo `evaluateModel` + `buildRecommendedOnly` con `state.answers = answers`).
8. **Frontend:** Al elegir “1” en el menú, mostrar formulario FortiGate en lugar de iniciar chat secuencial; al enviar, mostrar recomendación.

Con esto se valida el patrón “formulario → backend → recomendación” sin tocar la lógica interna de FortiGate.

### Fase 3 – Otros 8 dimensionamientos (2–3 semanas)

9. Definir por cada solución (2–9) preguntas mínimas y campos de Datasheet (o matriz) necesarios.
10. Implementar `*.ranges.js`, `*.engine.js`, `*.flow.js` para cada uno (o un flow único “por formulario” que solo evalúe con answers).
11. Registrar cada motor en el sizing dispatcher; exponer schemas en `GET /sizing/schema/:solutionType`.
12. Completar en frontend los formularios para 2–9 (mismo componente, otro schema).

### Fase 4 – Recomendación por descripción (≈1 semana)

13. **Backend:** `solutionRecommendation.service.js` + mapa de keywords (ej. en `solutionKeywords.js`).
14. En el controller, detectar si el mensaje pide “recomendación de solución” (keywords); si sí, llamar al servicio y responder con la solución sugerida sin LLM.
15. Frontend: solo mostrar la respuesta (puede ser texto o bloque destacado).

### Fase 5 – Comparación y EOS/EOL (1–2 semanas)

16. **Backend:** `lifecycle.service.js` (lectura de ProductLifecycle y ProductReplacement).
17. **Backend:** `comparison.service.js` (construir tabla comparativa; si hay EOS/EOL, incluir reemplazo).
18. En el controller, detectar intención “comparar X vs Y” o “¿X está EOL?” (regex o parser simple); llamar a comparison/lifecycle y devolver respuesta estructurada (texto + `comparisonTable`, `lifecycle`).
19. **Frontend:** Si la respuesta incluye tabla, renderizarla con `ComparisonTable` o HTML generado.

### Fase 6 – Licencias y bundles (1–2 semanas)

20. **Backend:** `licenseBundle.service.js`: por UNIT, obtener productos, clasificar hardware vs licencias, filtrar por duración (OneYearContract, etc.).
21. Integrar en el flujo: después de recomendar un equipo (sizing o por otro camino), el backend puede preguntar “¿Recomendar licencias/bundles?”; si el usuario acepta, llamar a `licenseBundle.service` y añadir la respuesta (opciones 1/3/5 años).
22. Frontend: mostrar lista o minitabla de opciones en el chat.

---

## 6. Riesgos y simplificaciones sugeridas

- **Datasheet heterogéneo:** No todas las soluciones tienen el mismo nivel de detalle en Datasheet. Para entregar en tiempo, se puede empezar con motores “ligeros” (pocas preguntas + reglas simples o matriz en código) y dejar la ampliación de columnas de Datasheet para después.
- **Recomendación por descripción:** Mantenerla 100% por keywords en código (sin LLM) reduce complejidad y es estable; se puede ampliar luego con más términos o pesos.
- **Comparación:** Si no hay Datasheet para todos los modelos, la tabla puede incluir solo los campos que existan y marcar “N/A” el resto.
- **Formularios 2–9:** Pueden compartir el mismo componente de formulario; solo cambia el schema y el motor en backend. Priorizar 2–3 soluciones primero (ej. FortiAnalyzer, FortiSwitch) para validar el patrón.

---

## 7. Próximo paso concreto

Empezar por **Fase 1**: creación de tablas `ProductLifecycle` y `ProductReplacement`, y refactor del controller para usar `sizingDispatcher.service.js` que por ahora solo delegue a `handleFortigateSizingFlow`. Así se establece el punto de extensión para los otros 8 motores y para formularios sin tocar la lógica interna de FortiGate.

Cuando quieras, seguimos con el código paso a paso (Fase 1 en detalle o Fase 2 con el primer formulario dinámico).

---

## 8. Implementación realizada (resumen)

- **Fase 1:** Tablas `ProductLifecycle` y `ProductReplacement` (SQL en `Backend/Docs/sql/ProductLifecycle_ProductReplacement.sql`), modelos Sequelize, `sizingDispatcher.service.js` y controller usando el dispatcher.
- **Fase 2:** `GET /api/v1/sizing/schema/:solutionType`, `POST /api/v1/sizing/submit`, `sizingSchemas.js` (FortiGate con 9 campos), `runFortigateSizingFromPayload` en el flow de FortiGate, componente `SizingForm.js` en frontend y flujo en `AgentService` + `ComponentesFormulario` para mostrar formulario al elegir opción 1.
- **Fase 4:** `solutionRecommendation.service.js` + `solutionKeywords.js`; detección de intención “recomendar solución” en el controller y respuesta por keywords.
- **Fase 5:** `lifecycle.service.js`, `comparison.service.js`; detección de “comparar X vs Y” y “EOS/EOL” en el controller con respuestas estructuradas.
- **Fase 6:** `licenseBundle.service.js` (clasificación hardware vs licencias por SKU, filtro por 1/3/5 años). Pendiente: enlazar en el flujo post-recomendación (“¿Recomendar licencias?”).
- **Fase 3 (esqueletos 2–9):** No implementada; el menú 2–9 muestra mensaje de “solo FortiGate disponible”. Los schemas en `sizingSchemas.js` tienen placeholders para 2–9.

**Ejecutar las tablas nuevas en MySQL:**  
`mysql -u root -p chat_db < Backend/Docs/sql/ProductLifecycle_ProductReplacement.sql`  
(o importar desde phpMyAdmin el archivo `ProductLifecycle_ProductReplacement.sql`).
