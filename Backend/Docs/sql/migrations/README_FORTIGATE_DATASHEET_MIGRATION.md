# Migración FortiGate: `Datasheet` → `product_models` + `fortigate_specs`

1. **Backup** de la base de datos.
2. **Precondición:** la tabla `product_models` debe tener las columnas del catálogo (`solution_id`, `unit`, …), como en `20260309_fortinet_catalog_layers.sql`. Si solo tienes el esquema antiguo (`canonical_unit`), el script lo detecta en la etapa **5b** y no insertará en `fortigate_specs` hasta alinear la tabla. Diagnóstico: `20260313_diagnose_product_models_schema.sql`.
3. **Opción A (recomendada para auditoría):** desde la carpeta `Backend`, con `.env` apuntando a la misma BD:
   - `pnpm run migrate:fortigate-specs:dry` — solo lectura y conteos.
   - `pnpm run migrate:fortigate-specs:sample` — escribe **un solo** modelo (prueba manual).
   - `pnpm run migrate:fortigate-specs` — escribe `product_models` y `fortigate_specs` (no toca `Datasheet`).
4. **Opción B:** ejecutar **`20260311_migrate_datasheet_fortigate_to_catalog.sql`** en el cliente MySQL (tras tener `solutions`, `product_models`, `fortigate_specs`). Si `@sid` es NULL, el script no inserta nada: debe existir `solutions.code = 'fortigate'`.
5. **Validación SQL:** `20260312_fortigate_specs_validation_queries.sql`.
6. Opcional: `20260311_product_models_legacy_migration_enum.sql` solo si quieres el valor extra `legacy_migration` en `source_origin` (el script 20260311 / Node usan `manual` por compatibilidad con el ENUM por defecto).
7. Tras validar resultados, en producción puedes fijar **`FORTIGATE_SIZING_STRICT_CATALOG_ONLY=true`** para obligar solo catálogo (solo cuando confirmes filas en `fortigate_specs`).

Diagnóstico y columnas: `Backend/Docs/FORTIGATE_DATASHEET_TO_SPECS_AUDIT.md`.
