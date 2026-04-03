# Auditoría: tablas `DatasheetTemporal`, `ProductoTemporal`, `ProductLifecycle`, `ProductReplacement`

Fecha: revisión de código del repositorio (Backend + Frontend + SQL de referencia).

---

## Resumen ejecutivo

| Tabla                 | ¿Se usa? | Riesgo si se elimina (DROP) | Recomendación |
|-----------------------|----------|-----------------------------|---------------|
| **DatasheetTemporal** | **Sí**   | **Alto** — rompe carga de datasheets y SP `DebbugDatasheets` | **Conservar** |
| **ProductoTemporal** | **Sí**  | **Alto** — rompe carga de productos, price list → `Producto`, SP `DebbugProductos` | **Conservar** |
| **ProductLifecycle**  | **Sí** (código) | **Alto** — las consultas Sequelize fallan si la tabla no existe | **Conservar** (puede estar vacía) |
| **ProductReplacement**| **Sí** (código) | **Alto** — igual que arriba | **Conservar** (puede estar vacía) |

**No se recomienda ejecutar `DROP TABLE` sobre ninguna de las cuatro** sin antes refactorizar flujos y SPs (temporales) o eliminar/adaptar código que las consulta (lifecycle).

---

## 1. `DatasheetTemporal`

### ¿Se usa?

**Sí**, de forma activa en el flujo de carga masiva de especificaciones.

### Dónde

| Capa        | Ubicación |
|-------------|-----------|
| **Modelo**  | `Backend/src/models/Datasheet.model.js` — `DatasheetTemp` → tabla `DatasheetTemporal` |
| **Servicio**| `Backend/src/services/Datasheet.service.js` — `bulkCreateDatasheets()` escribe en `DatasheetTemp`; `syncDatasheetsFromTemp()` llama al SP `DebbugDatasheets` |
| **Controlador** | `Backend/src/controllers/datasheet.controller.js` — `insertarDatasheets` |
| **Rutas**   | `POST .../datasheet/insertar/masivo` (ver `datasheet.routes.js`) |
| **ETL lista precios** | **No** — el ETL de price list usa `price_list_staging` / `solution_offers` |
| **Parser price list** | **No** |
| **Frontend** | `Frontend/src/components/MenuActions.fun.js` — `CargarDatasheet` → `ExcelService.InsertarDatasheets` → API masiva |
| **MySQL**   | `func/database/chat_db.sql` — SP `DebbugDatasheets` hace `INSERT`/`UPDATE` desde `DatasheetTemporal` y `TRUNCATE` al final |

### Riesgo de eliminar

- Las peticiones de carga de datasheets fallarían al insertar.
- El SP `DebbugDatasheets` quedaría roto hasta reescribirlo o eliminarlo.

### Recomendación

**Conservar.** No marcar como legacy en BD sin sustituir el flujo (p. ej. upsert directo a `Datasheet` desde Node).

---

## 2. `ProductoTemporal`

### ¿Se usa?

**Sí**, en dos caminos:

1. Carga manual de productos desde Excel (mismo patrón que datasheets).
2. Carga de **Main Price List** Fortinet: filas válidas se vuelcan a temporal y luego se sincronizan a `Producto`.

### Dónde

| Capa        | Ubicación |
|-------------|-----------|
| **Modelo**  | `Backend/src/models/ProductTemp.model.js` → `ProductoTemporal` |
| **Servicio**| `Backend/src/services/product.service.js` — `bulkCreateProducts()` → `ProductTemp`; `syncProductosFromTemp()` → SP `DebbugProductos` |
| **Controlador** | `Backend/src/controllers/product.controller.js` — `insertarProductos` |
| **Rutas**   | `POST .../product/insertar/masivo` |
| **Price list** | `Backend/src/services/priceListUpload.service.js` — `mapRowsToProductTemporal` + `ProductService.bulkCreateProducts` (antes del ETL a `solution_offers`) |
| **Parser**  | Indirecto: el parser de Excel de price list alimenta las filas que acaban en temporal vía `priceListUpload` |
| **Frontend** | `MenuActions.fun.js` — `CargarProducto`; también menú “Cargar Productos” |
| **MySQL**   | `DebbugProductos` en `chat_db.sql` |

### Riesgo de eliminar

- Rompe **carga de productos** y **actualización de precios** ligada a `Producto` vía lista oficial.
- Rompe el SP `DebbugProductos`.

### Recomendación

**Conservar.**

---

## 3. `ProductLifecycle` y `ProductReplacement`

### ¿Están integradas en el chatbot hoy?

**Sí, a nivel de código y flujos del agente**, aunque **los datos pueden estar vacíos**.

### Dónde

| Capa | Ubicación |
|------|-----------|
| **Modelos** | `ProductLifecycle.model.js`, `ProductReplacement.model.js` |
| **Servicio** | `Backend/src/services/lifecycle.service.js` — `findOne` sobre ambas tablas |
| **Controlador** | `Backend/src/controllers/ollama.controller.js` |
| **Uso real** | Intención **`lifecycle`**: consulta EOS/EOL y reemplazo sugerido. Intención **`compare`**: `comparison.service.compareModels(..., true)` añade `lifecycle` por cada UNIT (estado y reemplazo si aplica). |
| **Comparación** | `Backend/src/services/comparison.service.js` — `compareWithReplacement` |
| **Registro Sequelize** | `database.utils.js` importa los modelos |
| **ETL / parser / rutas dedicadas** | No hay ETL que rellene estas tablas en el código revisado; el SQL de creación está en `Backend/Docs/sql/ProductLifecycle_ProductReplacement.sql` |
| **Frontend** | Sin pantalla específica; el valor es vía respuestas del agente cuando el intent lo dispara |

### Comportamiento sin datos

Si las tablas existen pero **no hay filas**, `lifecycle.service` devuelve `status: 'ACTIVE'` y sin reemplazo — el chatbot **no falla**.

### Riesgo de eliminar

Si se hace **`DROP TABLE`** y el código sigue igual, **`findOne` lanzará error** al resolver intenciones `compare` / `lifecycle`.

### Recomendación

- **Conservar** las tablas (estructura mínima).
- Si quieres “desactivar” la función sin borrar tablas: se puede cortar en el controller (feature flag) **sin** tocar la BD.
- **Eliminar** solo tras quitar llamadas a `lifecycle.service` y rutas/intents asociados, o sustituir por otra fuente de datos.

---

## 4. SQL — qué es seguro y qué no

### No seguro (sin refactor previo)

```sql
-- NO EJECUTAR sin cambiar aplicación y stored procedures:
-- DROP TABLE DatasheetTemporal;
-- DROP TABLE ProductoTemporal;
-- DROP TABLE ProductLifecycle;
-- DROP TABLE ProductReplacement;
```

### Limpieza de **datos** (opcional, no de esquema)

Si el objetivo es vaciar entornos de prueba **manteniendo** el esquema:

- `TRUNCATE TABLE ProductoTemporal;` / `DatasheetTemporal;` — **solo si no hay proceso a medias**; los SPs suelen truncar al sincronizar.
- `DELETE FROM ProductLifecycle;` / `ProductReplacement;` — seguro para vaciar catálogos opcionales; el agente seguirá respondiendo con `ACTIVE` por defecto.

### Renombrar como legacy

Renombrar `ProductoTemporal` → `ProductoTemporal_legacy` **rompe** el código y los SPs que referencian el nombre actual. Solo tendría sentido junto con migración coordinada (vistas sinónimo, SPs nuevos, cambio de modelo Sequelize).

---

## 5. Conclusión

- Las **temporales** no son “basura”: son **staging oficial** enlazado a **procedimientos almacenados** y a **rutas API + frontend**.
- **Lifecycle / Replacement** son **opcionales en datos** pero **obligatorias en esquema** mientras exista el código actual del agente.

**No se aplica ningún `DROP` en esta auditoría** para no dañar el proyecto.
