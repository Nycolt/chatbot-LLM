# Migraciones SQL manuales

Ejecutar en **MySQL** tras **backup** de `chat_db`.

| Archivo | Descripción |
|---------|-------------|
| `20260308_01_product_models_and_datasheet_documents.sql` | **Obsoleto** frente a `20260309_*` (esquema antiguo `canonical_unit` / `datasheet_documents`). No mezclar con la nueva capa. |
| `20260309_fortinet_catalog_layers.sql` | **Estructura final por capas:** `solutions`, `product_models`, trazabilidad, specs, compatibilidad, `need_inbox_tags`, `intent_keywords`, `ALTER` de `solution_offers` y `needs_inbox`. Incluye **DROP** de tablas del catálogo nuevo si re-ejecutas. |
| `20260309_alter_existing_only.sql` | Solo `ALTER` comercial + buzón si ya tienes `solutions` y `product_models` creados sin el script destructivo. |

**Tablas temporales** `ProductoTemporal` / `DatasheetTemporal`: no eliminar (siguen usadas por los SP `Debbug*`). Ver `NO_DROP_temporales.md`.

**Auditoría** (uso real + riesgos + `ProductLifecycle` / `ProductReplacement`): `Backend/Docs/audits/AUDIT_DatasheetTemporal_ProductoTemporal_Lifecycle.md`. SQL de referencia **sin DROP**: `NO_DROP_temporales_lifecycle.sql`.

**Documentación de propósito por tabla:** `Backend/Docs/DATABASE_CATALOG_LAYERS.md`.
