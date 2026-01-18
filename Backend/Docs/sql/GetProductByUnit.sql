-- ============================================================================
-- Stored Procedure: GetProductByUnit
-- Descripción: Obtiene todos los productos de un UNIT específico
--              Retorna todas las variantes/SKUs de un producto base
-- Parámetros:
--   - p_unit: UNIT del producto (requerido) (ej: 'FG-60F', 'FG-100F')
-- ============================================================================

DELIMITER //

CREATE PROCEDURE GetProductByUnit(
    IN p_unit VARCHAR(250)
)
BEGIN
    -- Variables para manejo de errores
    DECLARE exit handler for SQLEXCEPTION
    BEGIN
        -- Devolver mensaje de error
        SELECT 'Error al obtener productos' AS status, 
               p_unit AS unit;
    END;

    -- ===========================================================
    -- Validar que el parámetro UNIT no sea NULL o vacío
    -- ===========================================================
    IF p_unit IS NULL OR TRIM(p_unit) = '' THEN
        SELECT 'error' AS status, 
               'El parámetro UNIT es requerido' AS message;
    ELSE
        -- ===========================================================
        -- Buscar todos los productos con el UNIT especificado
        -- ===========================================================
        SELECT 
            p.id,
            p.UNIT,
            p.SKU,
            p.Familia,
            p.Descripcion,
            p.Price,
            p.OneYearContract,
            p.ThirdYearContract,
            p.FiveYearContract,
            p.createdAt,
            p.updatedAt,
            COUNT(*) OVER() AS total_variants
        FROM Producto p
        WHERE p.UNIT = p_unit
        ORDER BY p.SKU;
        
        -- Si no se encontraron resultados, el SELECT anterior estará vacío
        -- MySQL devolverá un resultado vacío automáticamente
    END IF;

END //

DELIMITER ;

-- ============================================================================
-- Ejemplos de uso:
-- ============================================================================
-- CALL GetProductByUnit('FG-60F');
-- CALL GetProductByUnit('FG-100F');
-- CALL GetProductByUnit('FortiGate-40F-3G4G');
-- ============================================================================

-- ============================================================================
-- Para eliminar el procedimiento si ya existe:
-- ============================================================================
-- DROP PROCEDURE IF EXISTS GetProductByUnit;
-- ============================================================================
