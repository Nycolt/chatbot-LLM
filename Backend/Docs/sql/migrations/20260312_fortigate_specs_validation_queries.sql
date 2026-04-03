-- =============================================================================
-- Validación post-migración: Datasheet (FortiGate) → fortigate_specs + product_models
-- Ejecutar después de 20260311_migrate_datasheet_fortigate_to_catalog.sql
--    o después de: node scripts/migrateFortigateFromDatasheet.mjs
-- =============================================================================

SET @sid := (SELECT id FROM solutions WHERE code = 'fortigate' LIMIT 1);

-- 1) Debe existir la solución FortiGate
SELECT @sid AS fortigate_solution_id,
       IF(@sid IS NULL, 'ERROR: falta solutions.code=fortigate', 'OK') AS check_solution;

-- 2) Total de filas en fortigate_specs
SELECT COUNT(*) AS total_fortigate_specs FROM fortigate_specs;

-- 3) Specs ligadas a product_models de la solución fortigate
SELECT COUNT(*) AS specs_for_fortigate_solution
FROM fortigate_specs f
INNER JOIN product_models pm ON pm.id = f.product_model_id
WHERE pm.solution_id = @sid;

-- 4) product_models FortiGate sin spec (debería ser 0 tras migración completa)
SELECT COUNT(*) AS fortigate_models_missing_specs
FROM product_models pm
LEFT JOIN fortigate_specs f ON f.product_model_id = pm.id
WHERE pm.solution_id = @sid
  AND f.id IS NULL;

-- 5) Comparar: unidades FortiGate en Datasheet (mismo filtro SQL migración) vs specs
SELECT
  (SELECT COUNT(DISTINCT d.UNIT)
   FROM Datasheet d
   WHERE UNIT IS NOT NULL AND TRIM(UNIT) <> ''
     AND (
       LOWER(UNIT) LIKE '%fortigate-%'
       OR LOWER(UNIT) LIKE 'fg-%'
       OR LOWER(IFNULL(SKU, '')) LIKE 'fg-%'
       OR LOWER(IFNULL(SKU, '')) LIKE 'fg/fw%'
       OR LOWER(IFNULL(SKU, '')) LIKE 'fg/fwf-%'
       OR LOWER(IFNULL(SKU, '')) LIKE 'fwf-%'
     )
  ) AS distinct_units_datasheet_fg_filter,
  (SELECT COUNT(*) FROM product_models WHERE solution_id = @sid) AS product_models_fortigate,
  (SELECT COUNT(*)
   FROM fortigate_specs f
   INNER JOIN product_models pm ON pm.id = f.product_model_id AND pm.solution_id = @sid
  ) AS fortigate_specs_linked;

-- 6) Muestra de 10 filas: unit + algunos campos técnicos
SELECT pm.unit,
       pm.sku_base,
       f.firewall_throughput_udp,
       f.concurrent_sessions,
       f.updated_at AS spec_updated_at
FROM fortigate_specs f
INNER JOIN product_models pm ON pm.id = f.product_model_id
WHERE pm.solution_id = @sid
ORDER BY pm.unit
LIMIT 10;

-- Nota: si `Datasheet` falla por mayúsculas en Linux, sustituir por el nombre real
-- (p. ej. `datasheet`) según information_schema.
