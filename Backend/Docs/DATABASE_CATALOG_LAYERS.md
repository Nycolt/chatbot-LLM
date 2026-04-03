# Base de datos — capas del catálogo Fortinet (chatbot)

Estructura implementada en SQL `migrations/20260309_fortinet_catalog_layers.sql` y modelos Sequelize bajo `Backend/src/models/`.

## CAPA 1 — Catálogo base

| Tabla | Propósito |
|-------|-----------|
| **solutions** | Lista maestra de soluciones del portafolio (`code` estable: `fortigate`, `fortigate_vm`, …). Referencia para FKs y semántica. |
| **product_models** | **Una fila por modelo lógico** (`solution_id` + `unit` único). Origen: `excel`, `pdf` o `manual`. Estado técnico: `verified` / `partial` / `commercial_only`. |

## CAPA 2 — Trazabilidad documental

| Tabla | Propósito |
|-------|-----------|
| **datasheet_sources** | Registro de cada archivo fuente (PDF, matrix Excel, etc.) por solución. |
| **datasheet_model_map** | Vincula un `datasheet_source` con `product_model` (página, extractor, verificación manual). |

## CAPA 3 — Comercial (existente + ampliación)

| Tabla | Propósito |
|-------|-----------|
| **price_upload_batches** | Metadatos de cada carga de lista de precios (sin cambio de rol). |
| **price_list_staging** | Filas crudas del Excel (sin cambio de rol). |
| **solution_offers** | Tabla comercial final: `hardware` / `license` / `bundle`. **Nuevos campos:** `solution_id`, `product_model_id`, `offer_subtype`. El ETL sigue igual; `catalogSync.service` enlaza tras cada batch. |

## CAPA 4 — Atributos inferidos

| Tabla | Propósito |
|-------|-----------|
| **product_model_attributes** | Pares `attribute_key` / `attribute_value` con `source_type` (`excel_description`, `pdf`, `manual`) y `confidence_level` (`verified`, `inferred`, `unknown`). |

## CAPA 5 — Especificaciones por solución

En general **una fila por `product_model_id`** (FK único). **Excepción:** `fortiwifi_specs` usa **`UNIT`** (sin `product_model_id` en la tabla); el catálogo enlaza por `product_models.unit` y `datasheet_model_map`.

- `fortigate_specs` — throughput, sesiones, túneles, FortiAP/Switch, VDOM, etc.
- `fortigate_vm_specs` — tier VM, vCPU, VDOM, tokens.
- `fortiwifi_specs` — métricas matrix (IPS, NGFW, FortiAPs, …) por `UNIT`.
- `fortianalyzer_specs` — logs, almacenamiento, dispositivos.
- `fortimanager_specs` — dispositivos/VDOMs y ADOMs (default/máx), logs GB/día, almacenamiento, RAID, interfaces, SED, etc. (matriz PDF FMG-*).
- `fortiswitch_specs` — puertos, PoE, capacidad.
- `fortiap_specs` — generación Wi‑Fi, MIMO, clientes.
- `fortimail_specs` — dominios, buzones.
- `fortiweb_specs` — throughput HTTP, aplicaciones.

> La tabla legacy **Datasheet** sigue en uso para el agente actual; migrar filas hacia estas tablas es una fase posterior.

## CAPA 6 — Compatibilidad comercial

| Tabla | Propósito |
|-------|-----------|
| **offer_compatibility_rules** | Reglas estructuradas (`condition_json`) entre tipos de oferta. |
| **model_offer_links** | Enlace explícito modelo ↔ fila `solution_offers` (`link_type`: `primary_sku`, etc.). |

## CAPA 7 — Semántico y buzón

| Tabla | Propósito |
|-------|-----------|
| **needs_inbox** | Buzón existente; **nuevo:** `solution_id` opcional (FK a `solutions`). |
| **need_inbox_tags** | Etiquetas por entrada del buzón. |
| **intent_keywords** | Keywords + `intent_label` + `weight` para detección (opcional `solution_id`). |

## Flujo Excel (sin romper)

1. Parse → `price_list_staging` → `processBatchToSolutionOffers` → `solution_offers` (transacción por fila).  
2. **Dentro del mismo ETL:** resuelve `solution_id` desde `solutions.code`; si la fila es **hardware** y la solución está en el catálogo soportado, ejecuta `upsertProductModelFromOffer` (`productModelUpsert.service.js`): `findOrCreate` por `(solution_id, unit)`, relleno solo de campos vacíos, sin tocar modelos `technical_completeness_status = verified`; atributos inferidos en `product_model_attributes` (`excel_description` / `inferred`). Licencias y bundles **no** crean `product_models`.  
3. El resumen `etl_summary.catalog` incluye contadores y `warnings` (p. ej. hardware sin solución mapeable).  
4. `Producto` / `ProductoTemporal` / `DebbugProductos` **no se modifican**.  
5. `catalogSync.linkSolutionOffersToCatalog` queda como **backfill** opcional para batches antiguos.

## Archivos SQL

| Archivo | Uso |
|---------|-----|
| `20260309_fortinet_catalog_layers.sql` | Script completo (incluye DROP de tablas del catálogo nuevo; **backup** antes). |
| `20260309_alter_existing_only.sql` | Solo `ALTER` de `solution_offers` y `needs_inbox` si ya creaste `solutions` / `product_models` por otro medio. |
| `price_list_tables.sql` | Instalación nueva: `solution_offers` ya incluye columnas extendidas (sin FK a `solutions` hasta correr migración). |

## Sequelize

- Asociaciones: `associations.catalog.js` (`setupCatalogAssociations()`), invocado desde `database.utils.js`.
- Modelos: `Solution`, `ProductModel`, `DatasheetSource`, `DatasheetModelMap`, `ProductModelAttribute`, specs en `SolutionSpecs.models.js`, `OfferCompatibilityRule`, `ModelOfferLink`, `NeedInboxTag`, `IntentKeyword`; `SolutionOffer` y `NeedsInbox` ampliados.
