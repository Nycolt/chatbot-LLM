-- ============================================================================
-- Stored Procedure: DebbugDatasheets
-- Descripción: Sincroniza datos desde DatasheetTemporal a Datasheet
--              - Inserta nuevas datasheets
--              - Actualiza datasheets existentes
--              - Limpia tabla temporal después de la sincronización
-- ============================================================================

DELIMITER //

CREATE PROCEDURE DebbugDatasheets()
BEGIN
    -- Variables para manejo de errores
    DECLARE exit handler for SQLEXCEPTION
    BEGIN
        -- Rollback en caso de error
        ROLLBACK;
        -- Devolver mensaje de error
        SELECT 'Error en la sincronización de datasheets' AS status, 
               0 AS inserted, 
               0 AS updated, 
               0 AS deleted;
    END;

    -- Iniciar transacción
    START TRANSACTION;

    -- Variables para contar operaciones
    SET @insertCount = 0;
    SET @updateCount = 0;
    SET @deleteCount = 0;

    -- ===========================================================
    -- 1. ACTUALIZAR datasheets existentes
    -- ===========================================================
    UPDATE Datasheet d
    INNER JOIN DatasheetTemporal dt ON d.id = dt.id
    SET 
        d.UNIT = COALESCE(dt.UNIT, d.UNIT),
        d.SKU = COALESCE(dt.SKU, d.SKU),
        d.Firewall_Throughput_UDP = COALESCE(dt.Firewall_Throughput_UDP, d.Firewall_Throughput_UDP),
        d.IPSec_VPN_Throughput = COALESCE(dt.IPSec_VPN_Throughput, d.IPSec_VPN_Throughput),
        d.IPS_Throughput_Enterprise_Mix = COALESCE(dt.IPS_Throughput_Enterprise_Mix, d.IPS_Throughput_Enterprise_Mix),
        d.NGFW_Throughput_Enterprise_Mix = COALESCE(dt.NGFW_Throughput_Enterprise_Mix, d.NGFW_Throughput_Enterprise_Mix),
        d.Threat_Protection_Throughput = COALESCE(dt.Threat_Protection_Throughput, d.Threat_Protection_Throughput),
        d.Firewall_Latency = COALESCE(dt.Firewall_Latency, d.Firewall_Latency),
        d.Concurrent_Sessions = COALESCE(dt.Concurrent_Sessions, d.Concurrent_Sessions),
        d.New_Sessions_Per_Second = COALESCE(dt.New_Sessions_Per_Second, d.New_Sessions_Per_Second),
        d.Firewall_Policies = COALESCE(dt.Firewall_Policies, d.Firewall_Policies),
        d.Max_Gateway_To_Gateway_IPSec_Tunnels = COALESCE(dt.Max_Gateway_To_Gateway_IPSec_Tunnels, d.Max_Gateway_To_Gateway_IPSec_Tunnels),
        d.Max_Client_To_Gateway_IPSec_Tunnels = COALESCE(dt.Max_Client_To_Gateway_IPSec_Tunnels, d.Max_Client_To_Gateway_IPSec_Tunnels),
        d.SSL_VPN_Throughput = COALESCE(dt.SSL_VPN_Throughput, d.SSL_VPN_Throughput),
        d.Concurrent_SSL_VPN_Users = COALESCE(dt.Concurrent_SSL_VPN_Users, d.Concurrent_SSL_VPN_Users),
        d.SSL_Inspection_Throughput = COALESCE(dt.SSL_Inspection_Throughput, d.SSL_Inspection_Throughput),
        d.Application_Control_Throughput = COALESCE(dt.Application_Control_Throughput, d.Application_Control_Throughput),
        d.Max_FortiAPs = COALESCE(dt.Max_FortiAPs, d.Max_FortiAPs),
        d.Max_FortiSwitches = COALESCE(dt.Max_FortiSwitches, d.Max_FortiSwitches),
        d.Max_FortiTokens = COALESCE(dt.Max_FortiTokens, d.Max_FortiTokens),
        d.Virtual_Domains = COALESCE(dt.Virtual_Domains, d.Virtual_Domains),
        d.Interfaces = COALESCE(dt.Interfaces, d.Interfaces),
        d.Local_Storage = COALESCE(dt.Local_Storage, d.Local_Storage),
        d.Power_Supplies = COALESCE(dt.Power_Supplies, d.Power_Supplies),
        d.Form_Factor = COALESCE(dt.Form_Factor, d.Form_Factor),
        d.Variants = COALESCE(dt.Variants, d.Variants),
        d.updatedAt = CURRENT_TIMESTAMP;

    -- Guardar cantidad de registros actualizados
    SET @updateCount = ROW_COUNT();

    -- ===========================================================
    -- 2. INSERTAR nuevas datasheets
    -- ===========================================================
    INSERT INTO Datasheet (
        id,
        UNIT,
        SKU,
        Firewall_Throughput_UDP,
        IPSec_VPN_Throughput,
        IPS_Throughput_Enterprise_Mix,
        NGFW_Throughput_Enterprise_Mix,
        Threat_Protection_Throughput,
        Firewall_Latency,
        Concurrent_Sessions,
        New_Sessions_Per_Second,
        Firewall_Policies,
        Max_Gateway_To_Gateway_IPSec_Tunnels,
        Max_Client_To_Gateway_IPSec_Tunnels,
        SSL_VPN_Throughput,
        Concurrent_SSL_VPN_Users,
        SSL_Inspection_Throughput,
        Application_Control_Throughput,
        Max_FortiAPs,
        Max_FortiSwitches,
        Max_FortiTokens,
        Virtual_Domains,
        Interfaces,
        Local_Storage,
        Power_Supplies,
        Form_Factor,
        Variants,
        createdAt,
        updatedAt
    )
    SELECT 
        dt.id,
        dt.UNIT,
        dt.SKU,
        dt.Firewall_Throughput_UDP,
        dt.IPSec_VPN_Throughput,
        dt.IPS_Throughput_Enterprise_Mix,
        dt.NGFW_Throughput_Enterprise_Mix,
        dt.Threat_Protection_Throughput,
        dt.Firewall_Latency,
        dt.Concurrent_Sessions,
        dt.New_Sessions_Per_Second,
        dt.Firewall_Policies,
        dt.Max_Gateway_To_Gateway_IPSec_Tunnels,
        dt.Max_Client_To_Gateway_IPSec_Tunnels,
        dt.SSL_VPN_Throughput,
        dt.Concurrent_SSL_VPN_Users,
        dt.SSL_Inspection_Throughput,
        dt.Application_Control_Throughput,
        dt.Max_FortiAPs,
        dt.Max_FortiSwitches,
        dt.Max_FortiTokens,
        dt.Virtual_Domains,
        dt.Interfaces,
        dt.Local_Storage,
        dt.Power_Supplies,
        dt.Form_Factor,
        dt.Variants,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    FROM DatasheetTemporal dt
    LEFT JOIN Datasheet d ON dt.id = d.id
    WHERE d.id IS NULL;

    -- Guardar cantidad de registros insertados
    SET @insertCount = ROW_COUNT();

    -- ===========================================================
    -- 3. LIMPIAR tabla temporal
    -- ===========================================================
    TRUNCATE TABLE DatasheetTemporal;
    
    SET @deleteCount = (SELECT COUNT(*) FROM DatasheetTemporal);

    -- Confirmar transacción
    COMMIT;

    -- Retornar resultado
    SELECT 'success' AS status, 
           @insertCount AS inserted, 
           @updateCount AS updated, 
           @deleteCount AS deleted,
           (@insertCount + @updateCount) AS total_affected;

END //

DELIMITER ;
