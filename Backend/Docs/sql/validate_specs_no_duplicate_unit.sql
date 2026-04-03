-- Validación post-carga: no debe haber más de una fila por UNIT en specs FortiGate / VM.
-- Resultado esperado: 0 filas en cada consulta.

SELECT UNIT, COUNT(*) AS cnt
FROM fortigate_specs
GROUP BY UNIT
HAVING COUNT(*) > 1;

SELECT UNIT, COUNT(*) AS cnt
FROM fortigate_vm_specs
WHERE UNIT IS NOT NULL AND TRIM(UNIT) <> ''
GROUP BY UNIT
HAVING COUNT(*) > 1;
