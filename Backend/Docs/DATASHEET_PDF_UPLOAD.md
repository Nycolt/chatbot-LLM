# Carga de datasheets PDF → catálogo y specs

## Endpoint

`POST /api/v1/datasheet/pdf/upload`  
**Auth:** Bearer (mismo `protect` que el resto de datasheet).

**multipart/form-data**

| Campo | Obligatorio | Descripción |
|--------|-------------|-------------|
| `file` | Sí | Archivo `.pdf` |
| `solution_type` | Sí | Código igual a `solutions.code` (`fortigate`, `fortigate_vm`, `fortiwifi`, …) |
| `version` | No | Texto libre (ej. versión del matrix) |
| `units_override` | No | JSON array de strings, ej. `["FortiGate-60F","FortiGate-100F"]` si el detector no encuentra modelos |

## Flujo (servicio modular)

1. **`pdfExtract.service.js`** — texto con `pdf-parse`.
2. **`pdfModelIdentify.service.js`** — UNIT por `solution_type` (regex FortiGate, FWF-, FAZ-, …).
3. **`pdfMetrics.service.js`** — métricas por solución; hoy **FortiGate** tiene reglas en `metrics/fortigate.metrics.js`; el resto devuelve `pending_review` con `parser_not_implemented`.
4. **`datasheetPdfIngest.service.js`** — transacción:
   - Inserta **`datasheet_sources`**
   - Por cada modelo: **`product_models`** `findOrCreate` por `(solution_id, unit)` (no duplica filas Excel)
   - No toca **`sku_base`** ni otros datos comerciales en filas existentes
   - `has_datasheet=true`; `source_origin='pdf'` solo en **creación** desde PDF
   - `technical_completeness_status`: `verified` / `partial` según ratio de métricas mapeadas (no baja un `verified` previo)
   - **`datasheet_model_map`** (`findOrCreate` por fuente + modelo)
   - **`pdfSpecUpsert.service.js`** — upsert en `fortigate_specs` por **UNIT** normalizado (métricas del PDF actualizan columnas presentes). FortiGate VM matrix: `saveFortigateVMSpecs` → `upsertSpecs` por **UNIT** (sin duplicar filas).
5. Trazabilidad extra: JSON en **`datasheet_sources.notes`** (`pending_review`, `warnings`, SHA-256, resumen).

## Revisión manual

- Entradas en `report.pending_review` (y en `notes` persistido) para métricas dudosas o solución sin parser.
- Ampliar patrones en `metrics/fortigate.metrics.js` o añadir `metrics/fortianalyzer.metrics.js` etc.

## Dependencia

`pdf-parse` (ver `package.json`).
