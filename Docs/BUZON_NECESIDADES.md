# Buzón de Necesidades (Bandeja de Clasificación)

Módulo que guarda cada consulta del usuario en el chatbot para que un administrador pueda revisar, validar y reclasificar la necesidad detectada por el sistema.

## Qué se implementó

### 1. Base de datos
- **Tabla:** `needs_inbox`
- **SQL:** `Backend/Docs/sql/needs_inbox.sql`
- Campos: `id`, `user_question`, `detected_solutions` (JSON), `matched_keywords` (JSON), `detected_scores` (JSON), `detected_category`, `confirmed_solution`, `review_status`, `observations`, `createdAt`, `updatedAt`
- Estados de revisión: `pendiente`, `auto_clasificado`, `requiere_revision`, `confirmado`, `descartado`

### 2. Backend
- **Modelo:** `Backend/src/models/NeedsInbox.model.js`
- **Servicio:** `Backend/src/services/needsInbox.service.js`
  - `createFromUserQuestion(userQuestion)` – crea registro y ejecuta detección por keywords
  - `findAll({ status, category, solution, search, limit, offset })`
  - `findById(id)`
  - `updateReview(id, { confirmed_solution, review_status, observations })`
  - `updateStatus(id, review_status)`
  - `getStats()` – métricas para el dashboard
- **Controlador:** `Backend/src/controllers/needsInbox.controller.js`
- **Rutas (todas con `protect`):**
  - `GET /api/v1/needs-inbox` – listado con query: `status`, `category`, `solution`, `search`, `limit`, `offset`
  - `GET /api/v1/needs-inbox/stats` – total, por estado, soluciones más detectadas
  - `GET /api/v1/needs-inbox/:id` – detalle
  - `PUT /api/v1/needs-inbox/:id/review` – body: `confirmed_solution`, `review_status`, `observations`
  - `PUT /api/v1/needs-inbox/:id/status` – body: `review_status`

### 3. Integración en el chatbot
- En `Backend/src/controllers/ollama.controller.js`, tras extraer `userText`, se llama a `needsInboxService.createFromUserQuestion(userText)` en segundo plano (sin bloquear la respuesta).
- La detección usa la función existente ampliada en `Backend/src/config/solutionKeywords.js`: `recommendSolutionByKeywordsWithDetails(userText)` devuelve soluciones con `matchedKeywords` para guardar en el buzón.
- Lógica del estado inicial:
  - Sin soluciones → `pendiente`
  - Una solución o una claramente por encima → `auto_clasificado`
  - Empate o scores muy cercanos → `requiere_revision`

### 4. Frontend
- **Componente:** `Frontend/src/components/BuzonNecesidades.js`
- **Menú:** En el menú de configuración (ruedita), opción **"Buzón de Necesidades"** (solo visible si estás autenticado).
- **Panel:**
  - Dashboard: total, pendiente, auto clasificado, confirmado, descartado, requiere revisión, y “Soluciones más detectadas”.
  - Filtros: búsqueda por texto en la pregunta, filtro por estado.
  - Tabla: id, pregunta (resumida), solución detectada, estado, fecha, acciones (Ver, Confirmar, Descartar).
  - Detalle (modal): pregunta completa, soluciones detectadas, puntajes, palabras coincidentes, y formulario para reclasificar (solución confirmada, estado, observaciones) y guardar.

## Cómo probarlo

### 1. Crear la tabla en MySQL
```bash
mysql -u root -p chat_db < Backend/Docs/sql/needs_inbox.sql
```
O desde phpMyAdmin: importar/ejecutar el contenido de `Backend/Docs/sql/needs_inbox.sql`.

### 2. Backend
- Asegúrate de que el backend esté levantado (puerto configurado, p. ej. 8000).
- Las rutas del buzón usan el mismo `protect` que producto/datasheet; el token de login es obligatorio.

### 3. Flujo de guardado
- En el chat, escribe algo como: **Necesito proteger aplicaciones web** o **Quiero centralizar logs**.
- Envía el mensaje (el chatbot responde como siempre).
- Se crea un registro en `needs_inbox` con la pregunta, soluciones detectadas, keywords y scores.

### 4. Panel del buzón
- Inicia sesión en la app (botón de configuración / ruedita).
- En el menú desplegable elige **"Buzón de Necesidades"**.
- Deberías ver el dashboard y la tabla; si ya hay consultas, aparecerán ahí.
- Prueba:
  - Filtro por estado y búsqueda por texto.
  - **Ver** en una fila: se abre el detalle con puntajes y keywords; edita solución confirmada, estado y observaciones y guarda.
  - **Confirmar** / **Descartar** en una fila: cambian el estado y se actualizan las métricas.

### 5. API a mano (opcional)
- Con token en cabecera `Authorization: Bearer <token>`:
  - `GET /api/v1/needs-inbox` – listado
  - `GET /api/v1/needs-inbox/stats` – métricas
  - `GET /api/v1/needs-inbox/1` – detalle del id 1
  - `PUT /api/v1/needs-inbox/1/review` con body `{ "confirmed_solution": "FortiWeb", "review_status": "confirmado", "observations": "Ok" }`

## Archivos tocados / nuevos

| Archivo | Cambio |
|--------|--------|
| `Backend/Docs/sql/needs_inbox.sql` | Nuevo |
| `Backend/src/models/NeedsInbox.model.js` | Nuevo |
| `Backend/src/config/solutionKeywords.js` | Añadida `recommendSolutionByKeywordsWithDetails` y refactor de `recommendSolutionByKeywords` para usarla |
| `Backend/src/services/needsInbox.service.js` | Nuevo |
| `Backend/src/controllers/needsInbox.controller.js` | Nuevo |
| `Backend/src/routes/needsInbox.routes.js` | Nuevo |
| `Backend/src/routes/index.js` | Registro de rutas `needs-inbox` |
| `Backend/src/utils/database.utils.js` | Import del modelo `NeedsInbox` |
| `Backend/src/controllers/ollama.controller.js` | Import de `needsInboxService` y llamada a `createFromUserQuestion` tras obtener `userText` |
| `Frontend/src/components/BuzonNecesidades.js` | Nuevo |
| `Frontend/src/components/MenuActions.js` | Opción "Buzón de Necesidades" en el menú de configuración |

El flujo del chatbot (sizing, recomendación, comparación, EOS/EOL, LLM) no se modifica; solo se añade el guardado en segundo plano en cada consulta de usuario.
