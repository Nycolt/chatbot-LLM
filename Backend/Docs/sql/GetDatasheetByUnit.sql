-- ============================================================================
-- Stored Procedure: GetDatasheetByUnit
-- Descripción: Obtiene todas las datasheets de un producto por su UNIT
--              Retorna todos los SKUs/variantes de un producto base
-- Parámetros:
--   - p_unit: UNIT del producto (ej: 'FG-60F', 'FG-100F')
-- ============================================================================

DELIMITER //

CREATE PROCEDURE GetDatasheetByUnit(
    IN p_unit VARCHAR(250)
)
BEGIN
    -- Variables para manejo de errores
    DECLARE exit handler for SQLEXCEPTION
    BEGIN
        -- Devolver mensaje de error
        SELECT 'Error al obtener datasheets del producto' AS status, 
               p_unit AS unit;
    END;

    -- ===========================================================
    -- Validar que el parámetro no sea NULL o vacío
    -- ===========================================================
    IF p_unit IS NULL OR TRIM(p_unit) = '' THEN
        SELECT 'error' AS status, 
               'El parámetro UNIT es requerido' AS message;
    ELSE
        -- ===========================================================
        -- Obtener todas las datasheets que coincidan con el UNIT
        -- ===========================================================
        SELECT 
            d.id,
            d.UNIT,
            d.SKU,
            d.Firewall_Throughput_UDP,
            d.IPSec_VPN_Throughput,
            d.IPS_Throughput_Enterprise_Mix,
            d.NGFW_Throughput_Enterprise_Mix,
            d.Threat_Protection_Throughput,
            d.Firewall_Latency,
            d.Concurrent_Sessions,
            d.New_Sessions_Per_Second,
            d.Firewall_Policies,
            d.Max_Gateway_To_Gateway_IPSec_Tunnels,
            d.Max_Client_To_Gateway_IPSec_Tunnels,
            d.SSL_VPN_Throughput,
            d.Concurrent_SSL_VPN_Users,
            d.SSL_Inspection_Throughput,
            d.Application_Control_Throughput,
            d.Max_FortiAPs,
            d.Max_FortiSwitches,
            d.Max_FortiTokens,
            d.Virtual_Domains,
            d.Interfaces,
            d.Local_Storage,
            d.Power_Supplies,
            d.Form_Factor,
            d.Variants,
            d.createdAt,
            d.updatedAt,
            COUNT(*) OVER() AS total_variants
        FROM Datasheet d
        WHERE d.UNIT = p_unit
        ORDER BY d.SKU;
        
        -- Si no se encontraron resultados, el SELECT anterior estará vacío
        -- MySQL devolverá un resultado vacío automáticamente
    END IF;

END //

DELIMITER ;

-- ============================================================================
-- Ejemplos de uso:
-- ============================================================================
-- CALL GetDatasheetByUnit('FG-60F');
-- CALL GetDatasheetByUnit('FG-100F');
-- CALL GetDatasheetByUnit('FG-200F');
-- ============================================================================

-- ============================================================================
-- Para eliminar el procedimiento si ya existe:
-- ============================================================================
-- DROP PROCEDURE IF EXISTS GetDatasheetByUnit;
-- ============================================================================
