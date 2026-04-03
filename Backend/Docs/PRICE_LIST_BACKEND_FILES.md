# Lista de archivos – Backend listas de precios

## Archivos ya creados

### Documentación
- **Backend/Docs/ARQUITECTURA_PRICE_LIST_UPLOAD.md** – Análisis de la arquitectura, validación y reglas de clasificación.
- **Backend/Docs/PRICE_LIST_BACKEND_FILES.md** – Este archivo (lista de archivos y próximos pasos).

### SQL
- **Backend/Docs/sql/price_list_tables.sql** – Creación de las tablas `price_upload_batches`, `price_list_staging`, `solution_offers`.

### Modelos Sequelize
- **Backend/src/models/PriceUploadBatch.model.js** – Batch de subida (file_name, uploaded_at, uploaded_by, status, is_active, source_type, row_count, error_message).
- **Backend/src/models/PriceListStaging.model.js** – Staging por fila (batch_id, unit, sku, description, price, contract_1y/3y/5y, row_index). Relación `belongsTo` con PriceUploadBatch.
- **Backend/src/models/SolutionOffer.model.js** – Ofertas finales (batch_id, unit, sku, description, offer_type, price, price_1y/3y/5y, is_active). Relación `belongsTo` con PriceUploadBatch.

### Registro de modelos
- **Backend/src/utils/database.utils.js** – Añadidos imports de PriceUploadBatch, PriceListStaging, SolutionOffer para que Sequelize los registre (sync/alter si se usa).

---

## Archivos que faltan (siguiente fase, sin frontend)

### Servicios (lógica ETL y negocio)
- **Backend/src/services/priceListUpload.service.js** (propuesto)
  - Crear batch (registro en `price_upload_batches`).
  - Recibir filas parseadas del Excel y hacer bulk insert en `price_list_staging`.
  - Actualizar batch (status, row_count).
  - Orquestar el proceso: staging → clasificación → bulk insert en `solution_offers`.
- **Backend/src/services/priceListEtl.service.js** (propuesto)
  - Leer filas de `price_list_staging` por `batch_id`.
  - Clasificar cada fila: `FC-` → license; “bundle”/“BDL” → bundle; resto → hardware.
  - Normalizar precios (string → decimal).
  - Insertar en `solution_offers` (y opcionalmente marcar ofertas de otros batches como no activas al activar el nuevo).

### Utilidades
- **Backend/src/utils/priceListClassifier.js** (propuesto)
  - Función `classifyOfferType(sku, description)` → `'hardware' | 'license' | 'bundle'`.
  - Reutilizable desde el ETL.

### Controladores y rutas (cuando haya API)
- **Backend/src/controllers/priceListUpload.controller.js** (propuesto)
  - POST: recibir archivo (multipart), parsear Excel, llamar a priceListUpload.service.
  - GET batches (listado, filtros).
  - GET batch/:id (detalle + conteos staging/offers).
- **Backend/src/routes/priceListUpload.routes.js** (propuesto)
  - Protegidas con `protect` (mismo patrón que product/datasheet).
  - Montar en **Backend/src/routes/index.js** como `/price-list` o similar.

### Parser del Excel oficial (sin plantilla)
- **Backend/src/services/priceListParser.service.js** (propuesto)
  - Leer el Excel subido (xlsx).
  - Detectar columnas por nombre o por posición (según convención del archivo oficial que definas).
  - Devolver array de objetos `{ unit, sku, description, price, contract_1y, contract_3y, contract_5y, row_index }`.
  - Aquí es donde se adapta “directamente el archivo oficial” sin plantilla intermedia: mapeo por nombres de columna o por índices fijos del layout oficial.

---

## Orden sugerido de implementación (solo backend)

1. **Tablas y modelos** – Hecho (SQL + modelos Sequelize).
2. **Clasificador** – Implementar `priceListClassifier.js` (reglas FC-, bundle, BDL).
3. **Parser** – Implementar `priceListParser.service.js` según el formato real del Excel oficial (nombres de columna o posiciones).
4. **ETL** – Implementar `priceListEtl.service.js`: staging → clasificación → solution_offers.
5. **Upload service** – Implementar `priceListUpload.service.js`: crear batch → insertar staging → ejecutar ETL → actualizar status del batch.
6. **Controller + rutas** – Implementar endpoints (subida, listado de batches, detalle). Sin implementar aún el frontend.

---

## Relación con Datasheet

- **No se duplica** la tabla Datasheet.
- En consultas y recomendaciones: para `solution_offers` con `offer_type = 'hardware'`, hacer JOIN por `solution_offers.unit = Datasheet.UNIT`.
- Para licencias y bundles, `unit` puede no existir en Datasheet; se usa para agrupar o mostrar sin obligar FK a Datasheet.
