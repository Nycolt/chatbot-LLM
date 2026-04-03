# Arquitectura de base de datos — Chatbot Fortinet

Documento de auditoría, propuesta de reorganización y guía de despliegue (marzo 2026).

---

## 1. Diagnóstico: uso real en el código

| Tabla | Uso en backend | Crítica para el chatbot hoy |
|-------|----------------|-----------------------------|
| **Usuario** | Login / usuarios | Sí (auth) |
| **needs_inbox** | Buzón de necesidades | Sí (flujo operativo) |
| **price_upload_batches** | Metadatos de cada carga Excel | Sí (trazabilidad lista oficial) |
| **price_list_staging** | Filas crudas del Excel | Sí (ETL entrada) |
| **solution_offers** | Salida ETL: ofertas clasificadas | Sí (precios / licencias por SKU) |
| **Producto** | Precios por **SKU** vía Excel → `ProductoTemporal` → SP `DebbugProductos`; SPs `GetProductByUnit*`| Sí (consultas comerciales por UNIT) |
| **ProductoTemporal** | Staging masivo antes de `DebbugProductos` | **Sí** — no eliminar |
| **Datasheet** | Especificaciones técnicas (columnas planas); `getAllDatasheets` (dimensionamiento FG); `GetDatasheetByUnit` | Sí |
| **DatasheetTemporal** | Staging antes de `DebbugDatasheets` | **Sí** — no eliminar |
| **ProductLifecycle** | `lifecycle.service` → `ollama.controller`, `comparison.service` | **Datos opcionales**; si la tabla está vacía, el código asume `ACTIVE` |
| **ProductReplacement** | Mismo servicio (sustitutos EOS/EOL) | **Datos opcionales** |

### 1.1 Nota importante sobre `Producto`

En los datos actuales hay **varias filas por mismo `UNIT`** (una por SKU/bundle/servicio). Eso es un **catálogo comercial por línea de lista de precios**, no un “maestro de modelos” (1 fila = 1 modelo lógico).

Por tanto:

- **No** se recomienda renombrar `Producto` → `product_models` sin migración de datos: el nombre sería engañoso.
- La **tabla maestra 1 fila / modelo** se introduce como **`product_models`** (nueva), con `canonical_unit` único; `Producto` y `solution_offers` siguen representando **líneas comerciales**.

### 1.2 Nota sobre `Datasheet`

Hoy concentra **trazabilidad implícita** (subida Excel/matrix) y **métricas técnicas** en las mismas columnas. Objetivo a medio plazo: separar **documento / carga** (`datasheet_documents`) de **specs** (mantener `Datasheet` o evolucionar a `product_model_specs`). La migración SQL inicial solo añade `datasheet_documents`; mover columnas es fase posterior.

### 1.3 Procedimientos almacenados (MySQL)

Definidos en `func/database/chat_db.sql` (y copias en `Backend/Docs/sql/`):

- `DebbugDatasheets` — sincroniza `DatasheetTemporal` → `Datasheet` (por **UNIT + SKU** en el dump actual).
- `DebbugProductos` — sincroniza `ProductoTemporal` → `Producto`.
- `GetDatasheetByUnit`, `GetProductByUnit`, `GetProductByUnitAndSku`.

Cualquier `RENAME TABLE Producto` obliga a **recrear** estos SPs apuntando al nuevo nombre.

---

## 2. Qué conservar / adaptar / dejar en desuso

### Conservar (base acordada)

- `Usuario`, `needs_inbox`, `price_upload_batches`, `price_list_staging`, `solution_offers`

### Conservar (imprescindible al flujo actual)

- `Producto`, `ProductoTemporal`, `Datasheet`, `DatasheetTemporal`

### Adaptar (evolución)

- **`Producto`**: mantener como catálogo SKU; documentar como “commercial product lines”. Opcional: renombrar en el futuro a `commercial_skus` cuando haya ventana de mantenimiento + actualización de SPs.
- **`Datasheet`**: seguir siendo la tabla de **specs** visibles al agente hasta migración; enriquecer con vínculo opcional a `datasheet_documents`.
- **Nueva `product_models`**: índice de modelos lógicos para el chatbot (1 fila / `canonical_unit`).

### Opcional (no crítico si están vacías)

- `ProductLifecycle`, `ProductReplacement` — **sí están cableadas** en código; si no cargas datos, el comportamiento sigue siendo válido.

### Eliminar

- **`DatasheetTemporal` / `ProductoTemporal`**: **NO eliminar** mientras existan `DebbugDatasheets` / `DebbugProductos` y la carga masiva por API. Son **candidatas a eliminación solo** si reemplazas el flujo por inserción directa + transacciones en app.

---

## 3. Propuesta final de estructura (objetivo)

```
Usuario
needs_inbox
price_upload_batches → price_list_staging → solution_offers

product_models          -- 1 fila por modelo (canonical_unit UNIQUE)
  ↑ (lógico)            -- Enlaza con Datasheet.UNIT y solution_offers.unit

Producto                -- N filas por UNIT (SKUs / bundles); lista precios legacy + Excel
ProductoTemporal        -- Staging → DebbugProductos

Datasheet               -- Specs técnicas (por UNIT/SKU fila)
DatasheetTemporal       -- Staging → DebbugDatasheets
datasheet_documents     -- PDF / matrix: archivo, hash, fecha, notas (trazabilidad)

ProductLifecycle        -- EOS/EOL (opcional)
ProductReplacement      -- Reemplazos (opcional)
```

**Flujo deseado:**

1. **Excel oficial** → `price_list_staging` → ETL → `solution_offers`; en paralelo (hoy) → `ProductoTemporal` → `Producto`. **Futuro:** job que haga upsert en `product_models` por `unit` distintos.
2. **PDF / matrix** → registrar fila en `datasheet_documents` → ingest a `DatasheetTemporal` → `DebbugDatasheets` → `Datasheet`.
3. **Chatbot:** dimensionar/recomendar usando `Datasheet` + `solution_offers`; comparaciones enriquecidas con `ProductLifecycle`/`ProductReplacement` si hay datos.

---

## 4. Archivos SQL añadidos

Ver `Backend/Docs/sql/migrations/20260308_01_product_models_and_datasheet_documents.sql`:

- `CREATE TABLE product_models`
- `CREATE TABLE datasheet_documents`
- `INSERT ... SELECT DISTINCT` inicial de `product_models` desde `Producto` (si existe la tabla)

**Opcional (no incluido por defecto):** `RENAME TABLE Producto TO product_models` — desaconsejado sin normalizar SKUs.

---

## 5. Sequelize

- `Product.model.js` — sigue mapeando `Producto`; comentario de propósito actualizado.
- `ProductModel.model.js` — nuevo maestro de modelos.
- `DatasheetDocument.model.js` — trazabilidad de PDFs/cargas documentales.

Registrar los nuevos modelos en `database.utils.js` si usas `sync()`.

---

## 6. Checklist de despliegue

1. Backup de `chat_db`.
2. Ejecutar migración SQL en MySQL.
3. (Opcional) Poblar `datasheet_documents` desde tu proceso de subida de PDFs.
4. No eliminar tablas temporales sin sustituir SPs y flujos.
5. Si algún día renombras `Producto`, actualizar `DebbugProductos`, `GetProductByUnit`, `GetProductByUnitAndSku` y el modelo Sequelize.
