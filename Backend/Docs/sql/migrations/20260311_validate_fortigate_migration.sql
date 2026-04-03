-- Consultas de validación post-migración FortiGate (solo lectura)
SET @sid := (SELECT id FROM solutions WHERE code = 'fortigate' LIMIT 1);

-- Filas Datasheet consideradas FortiGate (misma lógica que migración)
SELECT COUNT(*) AS datasheet_fg_rows
FROM Datasheet d
WHERE d.UNIT IS NOT NULL AND TRIM(d.UNIT) <> ''
  AND (
    LOWER(d.UNIT) LIKE '%fortigate-%'
    OR LOWER(d.UNIT) LIKE 'fg-%'
    OR LOWER(IFNULL(d.SKU, '')) LIKE 'fg-%'
    OR LOWER(IFNULL(d.SKU, '')) LIKE 'fg/fw%'
    OR LOWER(IFNULL(d.SKU, '')) LIKE 'fwf-%'
  );

SELECT COUNT(DISTINCT d.UNIT) AS datasheet_fg_distinct_units
FROM Datasheet d
WHERE d.UNIT IS NOT NULL AND TRIM(d.UNIT) <> ''
  AND (
    LOWER(d.UNIT) LIKE '%fortigate-%'
    OR LOWER(d.UNIT) LIKE 'fg-%'
    OR LOWER(IFNULL(d.SKU, '')) LIKE 'fg-%'
    OR LOWER(IFNULL(d.SKU, '')) LIKE 'fg/fw%'
    OR LOWER(IFNULL(d.SKU, '')) LIKE 'fwf-%'
  );

-- Modelos FortiGate en catálogo con specs
SELECT COUNT(*) AS product_models_fortigate
FROM product_models pm
WHERE pm.solution_id = @sid;

SELECT COUNT(*) AS fortigate_specs_rows
FROM fortigate_specs fs
INNER JOIN product_models pm ON pm.id = fs.product_model_id AND pm.solution_id = @sid;

-- Unidades en Datasheet sin fila en catálogo (debería ser 0 tras migración OK)
SELECT d.UNIT
FROM (
  SELECT DISTINCT UNIT
  FROM Datasheet
  WHERE UNIT IS NOT NULL AND TRIM(UNIT) <> ''
    AND (
      LOWER(UNIT) LIKE '%fortigate-%'
      OR LOWER(UNIT) LIKE 'fg-%'
      OR LOWER(IFNULL(SKU, '')) LIKE 'fg-%'
      OR LOWER(IFNULL(SKU, '')) LIKE 'fg/fw%'
      OR LOWER(IFNULL(SKU, '')) LIKE 'fwf-%'
    )
) d
WHERE NOT EXISTS (
  SELECT 1 FROM product_models pm
  WHERE pm.solution_id = @sid AND pm.unit = d.UNIT
)
LIMIT 50;
