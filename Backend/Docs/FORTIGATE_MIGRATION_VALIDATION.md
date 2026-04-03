# Validar migración FortiGate (antes / después)

## 1) Conteos en SQL

Ejecuta `20260311_validate_fortigate_migration.sql` tras la migración.

Esperado (aprox.):

- `COUNT(DISTINCT UNIT)` FortiGate en `Datasheet` ≈ filas `product_models` FortiGate con `fortigate_specs` (un modelo lógico por UNIT; varias filas Datasheet mismo UNIT colapsan a una fila catálogo usando `MAX(id)`).

## 2) Paridad de dimensionamiento (manual)

1. **Antes** de migrar (o con `FORTIGATE_SIZING_USE_LEGACY_DATASHEET=true` y catálogo vacío): ejecuta un sizing de prueba con respuestas fijas (mismo escenario WAN/usuarios/VPN).
2. Anota modelo recomendado (`UNIT` / `SKU`) y si pasó o falló.
3. **Después** de migrar (catálogo poblado, **sin** env de fallback): repite el mismo escenario.
4. La recomendación debería coincidir si los datos migrados son los mismos que la fila representativa por UNIT (MAX(id)).

## 3) Diferencias esperadas si hay varias SKUs por UNIT

`product_models` tiene **una** fila por `(solution_id, unit)`. La migración toma la fila Datasheet con **id máximo** por UNIT como representante. Si necesitas una variante SKU distinta como canónica, ajusta manualmente `sku_base` o vuelve a ejecutar migración tras corregir Datasheet.

## 4) Script opcional (Node)

Puedes añadir un script que:

- Cargue `Datasheet` FortiGate filtrado.
- Llame a `evaluateModel` con un `answers` fijo para cada fila legacy.
- Compare con `getFortiGateCandidates()` mapeado al mismo `answers`.

No está incluido por defecto para no acoplar tests a credenciales DB; el SQL + prueba manual suele bastar.
