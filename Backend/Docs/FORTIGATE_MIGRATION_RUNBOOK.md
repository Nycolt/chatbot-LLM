# Migración FortiGate: Datasheet → `product_models` + `fortigate_specs`

## Orden de ejecución (MySQL)

1. **Backup** de `chat_db` (o el schema que uses).
2. Si aún no existen tablas del catálogo: aplicar `20260309_fortinet_catalog_layers.sql` (o equivalente).
3. `20260311_fortigate_specs_create_if_missing.sql` — solo si `fortigate_specs` no existe.
4. `20260311_product_models_legacy_migration_enum.sql` — añade `legacy_migration` al ENUM `source_origin`.
5. `20260310_datasheet_sources_processing.sql` — si aún no añadiste `processing_status` / `uploaded_by` (PDF).
6. **`20260311_migrate_datasheet_fortigate_to_catalog.sql`** — copia datos FortiGate desde `Datasheet`.

`Datasheet` **no se borra**; sigue como respaldo.

## Backend / Sequelize

- Tras el ALTER del ENUM, alinear modelo: `ProductModel.model.js` incluye `'legacy_migration'` en `SOURCE_ORIGIN`.
- Opcional: `pnpm` / `npm` en Backend y reiniciar servidor.

## Dimensionamiento (motor)

- Lectura principal: `getFortiGateCandidates()` / `getFortiGateSpecs()` en `fortigateCatalog.read.service.js` (solo `fortigate_specs` + `product_models`).
- **Fallback temporal** a `Datasheet`: variable de entorno  
  `FORTIGATE_SIZING_USE_LEGACY_DATASHEET=true`  
  solo si el catálogo está vacío (pre-migración o emergencia).

## Validación

Ver `FORTIGATE_MIGRATION_VALIDATION.md` y el SQL `20260311_validate_fortigate_migration.sql`.

## Compatibilidad temporal

| Componente | Comportamiento |
|------------|----------------|
| Sizing | Catálogo primero; fallback Datasheet solo con env |
| Agente / comparación por UNIT | `getDatasheetRowsByUnitPreferCatalog` → catálogo FortiGate, luego SP/Datasheet |
| Excel masivo datasheets | Sigue escribiendo `product_models` + `fortigate_specs` para FortiGate |
