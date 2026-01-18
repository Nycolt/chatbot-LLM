-- ============================================================================
-- Stored Procedure: GetProductByUnitAndSku
-- Descripción: Obtiene productos por UNIT y opcionalmente por SKU
--              Si SKU es NULL, retorna todos los productos del UNIT
--              Si SKU tiene valor, retorna el producto específico
-- Parámetros:
--   - p_unit: UNIT del producto (requerido) (ej: 'FG-60F', 'FG-100F')
--   - p_sku: SKU del producto (opcional) (ej: 'FG-60F-BDL', null)
-- ============================================================================

DELIMITER //

CREATE PROCEDURE GetProductByUnitAndSku(
    IN p_unit VARCHAR(250),
    IN p_sku VARCHAR(250)
)
BEGIN
    -- Variables para manejo de errores
    DECLARE exit handler for SQLEXCEPTION
    BEGIN
        -- Devolver mensaje de error
        SELECT 'Error al obtener productos' AS status, 
               p_unit AS unit,
               p_sku AS sku;
    END;

    -- ===========================================================
    -- Validar que el parámetro UNIT no sea NULL o vacío
    -- ===========================================================
    IF p_unit IS NULL OR TRIM(p_unit) = '' THEN
        SELECT 'error' AS status, 
               'El parámetro UNIT es requerido' AS message;
    ELSE
        -- ===========================================================
        -- Si SKU es NULL, buscar solo por UNIT
        -- Si SKU tiene valor, buscar por UNIT y SKU
        -- ===========================================================
        IF p_sku IS NULL OR TRIM(p_sku) = '' THEN
            -- Búsqueda solo por UNIT (todas las variantes)
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
        ELSE
            -- Búsqueda por UNIT y SKU (producto específico)
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
                1 AS total_variants
            FROM Producto p
            WHERE p.UNIT = p_unit 
              AND p.SKU = p_sku
            LIMIT 1;
        END IF;
        
        -- Si no se encontraron resultados, el SELECT anterior estará vacío
        -- MySQL devolverá un resultado vacío automáticamente
    END IF;

END //

DELIMITER ;

-- ============================================================================
-- Ejemplos de uso:
-- ============================================================================
-- Obtener todas las variantes de un producto:
-- CALL GetProductByUnitAndSku('FG-60F', NULL);
-- CALL GetProductByUnitAndSku('FG-100F', NULL);

-- Obtener un producto específico:
-- CALL GetProductByUnitAndSku('FG-60F', 'FG-60F-BDL');
-- CALL GetProductByUnitAndSku('FG-100F', 'FG-100F-BDL-950-12');
-- ============================================================================

-- ============================================================================
-- Para eliminar el procedimiento si ya existe:
-- ============================================================================
-- DROP PROCEDURE IF EXISTS GetProductByUnitAndSku;
-- ============================================================================
