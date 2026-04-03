# Arquitectura: Carga de listas de precios Fortinet

## 1. Análisis de la arquitectura propuesta

### Flujo de datos (resumen)

```
Excel oficial → [Batch] → price_list_staging (copia cruda)
                              ↓
                    Proceso ETL (clasificación + normalización)
                              ↓
                    solution_offers (tabla comercial final)
                              ↓
                    Relación lógica con Datasheet.UNIT (para hardware)
```

### Validación de las tres tablas

| Tabla | Propósito | ¿Correcta? | Comentarios |
|-------|-----------|------------|-------------|
| **price_upload_batches** | Registrar cada subida como un batch (no borrar datos anteriores) | Sí | Permite trazabilidad, reproceso y “activar” un batch como vigente. |
| **price_list_staging** | Recibir todas las filas del Excel sin transformar | Sí | Es el staging típico ETL. Permite validar y reprocesar sin volver a subir el archivo. |
| **solution_offers** | Tabla comercial final con clasificación (hardware/license/bundle) | Sí | Encaja con Datasheet.UNIT y con recomendaciones por tipo de oferta. |

### Ajustes recomendados (sin cambiar el espíritu del diseño)

1. **price_upload_batches**
   - **status**: Definir estados explícitos, por ejemplo: `uploaded` → `staging_loaded` → `processing` → `completed` o `failed`. Así el proceso ETL y el frontend pueden mostrar progreso y errores.
   - **uploaded_by**: Mantener como referencia a quién subió. Si ya usas usuarios en BD, conviene `uploaded_by` como FK a `Usuario.id` (nullable). Si no, puede ser STRING (nombre o identificador).
   - **is_active**: Dejar claro que “solo un batch por `source_type` debería estar activo a la vez”. Al activar un batch nuevo, desactivar el anterior del mismo `source_type`.
   - Opcional: `row_count` (filas en staging) y `error_message` (si status = failed) para soporte y auditoría.

2. **price_list_staging**
   - Los precios pueden venir como texto en el Excel. Recomendación: en staging guardar como **STRING** (igual que Producto) para no fallar por formatos; en el ETL convertir a número y en **solution_offers** guardar como **DECIMAL** para consultas y recomendaciones.
   - Opcional: `row_index` (número de fila en el Excel) para reportar errores por fila.

3. **solution_offers**
   - **offer_type**: ENUM `hardware` | `license` | `bundle` según tus reglas.
   - **Relación con Datasheet**: No hace falta duplicar Datasheet. Mantener `unit` como string y en la aplicación hacer JOIN `solution_offers.unit = Datasheet.UNIT` cuando se necesite (p. ej. solo para `offer_type = 'hardware'`). Licencias/bundles pueden tener `unit` que no exista en Datasheet.
   - **is_active**: Interpretar como “esta fila pertenece al batch activo actual”. Al activar un batch nuevo, poner `is_active = 0` en las filas de otros batches (o solo en las del batch que se desactiva).

### Reglas de clasificación (resumen)

- SKU empieza por `FC-` → **license**
- Descripción contiene “bundle” o SKU contiene “BDL” → **bundle**
- Resto → **hardware**

Aplicar en el ETL al pasar de staging a solution_offers; opcional guardar `offer_type` también en staging si quieres depurar por tipo antes de mover.

---

## 2. Relación con tablas existentes

- **Datasheet**: No se duplica. `Datasheet.UNIT` es la referencia del modelo técnico.  
  `solution_offers.unit` se usa para relacionar: para hardware se puede hacer JOIN por `solution_offers.unit = Datasheet.UNIT`; para licencias/bundles el mismo campo puede ser familia o agrupador y no tener fila en Datasheet.
- **Producto**: Sigue siendo tu tabla de productos actual (cargada por otro flujo con ProductoTemporal/DebbugProductos). La lista de precios es un flujo distinto que escribe en `price_upload_batches` → `price_list_staging` → `solution_offers`. Si más adelante quieres unificar ofertas con Producto, se puede hacer vía ETL o vistas; por ahora la arquitectura propuesta es independiente y correcta.

---

## 3. Tipos de datos sugeridos

| Campo | Tipo recomendado | Motivo |
|-------|------------------|--------|
| Precios en **staging** | STRING(50) | Aceptar valor crudo del Excel (coma, punto, símbolos). |
| Precios en **solution_offers** | DECIMAL(15,2) | Cálculos, filtros y recomendaciones. |
| status (batch) | ENUM | Valores controlados para el flujo. |
| offer_type | ENUM('hardware','license','bundle') | Clasificación fija. |
| uploaded_at | DATETIME | Ya contemplado. |
| is_active | BOOLEAN / TINYINT(1) | Estándar MySQL. |

---

## 4. Conclusión

La arquitectura es correcta y encaja con:

- No borrar información anterior (historial en batches y staging).
- Registrar cada archivo como batch.
- Staging como copia fiel del Excel.
- Tabla final comercial con clasificación y relación lógica con Datasheet.UNIT.
- Uso posterior para recomendar hardware, licencias y bundles.

Siguiente paso: implementar modelos Sequelize y, en una fase posterior, el ETL y la API de subida (sin tocar el frontend todavía).
