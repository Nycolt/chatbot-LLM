-- phpMyAdmin SQL Dump
-- version 5.2.3
-- https://www.phpmyadmin.net/
--
-- Servidor: db:3306
-- Tiempo de generación: 16-01-2026 a las 22:11:27
-- Versión del servidor: 8.0.44
-- Versión de PHP: 8.3.29

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `chat_db`
--

DELIMITER $$
--
-- Procedimientos
--
CREATE DEFINER=`root`@`%` PROCEDURE `CheckLogin` (IN `Usuario_entrada` VARCHAR(50), IN `Credencial_entrada` VARCHAR(255))   BEGIN
    DECLARE Counter INT DEFAULT 0;
    DECLARE UserId INT DEFAULT 0;
    
    SELECT COUNT(Id), MAX(Id) INTO Counter, UserId
    FROM chat_db.Usuario
    WHERE Usuario = Usuario_entrada 
      AND Credencial = Credencial_entrada;
    
    IF Counter > 0 THEN
        SELECT UserId AS LoginExitoso;
    ELSE 
        SELECT 0 AS LoginExitoso;
    END IF;
END$$

CREATE DEFINER=`root`@`%` PROCEDURE `CreateUser` (IN `Usuario_entrada` VARCHAR(50), IN `Credencial_entrada` VARCHAR(255))   BEGIN
    DECLARE UsuarioExiste INT DEFAULT 0;
    DECLARE NuevoId INT DEFAULT 0;
    
    -- Verificar si el usuario ya existe
    SELECT COUNT(Id) INTO UsuarioExiste
    FROM chat_db.Usuario
    WHERE Usuario = Usuario_entrada;
    
    -- Si el usuario ya existe, retornar error
    IF UsuarioExiste > 0 THEN
        SELECT 0 AS CreacionExitosa, 
               NULL AS UsuarioId,
               'El usuario ya existe' AS Mensaje;
    ELSE
        -- Insertar nuevo usuario
        INSERT INTO chat_db.Usuario (Usuario, Credencial)
        VALUES (Usuario_entrada, Credencial_entrada);
        
        -- Obtener el ID del usuario creado
        SET NuevoId = LAST_INSERT_ID();
        
        -- Retornar éxito
        SELECT 1 AS CreacionExitosa, 
               NuevoId AS UsuarioId,
               'Usuario creado exitosamente' AS Mensaje;
    END IF;
END$$

CREATE DEFINER=`root`@`%` PROCEDURE `DebbugDatasheets` ()   BEGIN
    -- Variables para manejo de errores
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SELECT 'Error en la sincronización de datasheets' AS status, 
               0 AS inserted, 
               0 AS updated, 
               0 AS deleted;
    END;

    START TRANSACTION;

    SET @insertCount = 0;
    SET @updateCount = 0;
    SET @deleteCount = 0;

    -- ===========================================================
    -- 1. ACTUALIZAR datasheets existentes (usando UNIT y SKU)
    -- ===========================================================
    UPDATE Datasheet d
    INNER JOIN DatasheetTemporal dt ON d.UNIT = dt.UNIT AND d.SKU = dt.SKU
    SET 
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

    SET @updateCount = ROW_COUNT();

    -- ===========================================================
    -- 2. INSERTAR nuevas datasheets (que no existan por UNIT y SKU)
    -- ===========================================================
    INSERT INTO Datasheet (
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
    LEFT JOIN Datasheet d ON dt.UNIT = d.UNIT AND dt.SKU = d.SKU
    WHERE d.UNIT IS NULL AND d.SKU IS NULL;

    SET @insertCount = ROW_COUNT();

    -- ===========================================================
    -- 3. LIMPIAR tabla temporal
    -- ===========================================================
    SET @deleteCount = (SELECT COUNT(*) FROM DatasheetTemporal);
    TRUNCATE TABLE DatasheetTemporal;

    COMMIT;

    SELECT 'success' AS status, 
           @insertCount AS inserted, 
           @updateCount AS updated, 
           @deleteCount AS deleted,
           (@insertCount + @updateCount) AS total_affected;

END$$

CREATE DEFINER=`root`@`%` PROCEDURE `DebbugProductos` ()   BEGIN
    DECLARE registrosInsertados INT DEFAULT 0;
    DECLARE registrosActualizados INT DEFAULT 0;
    
    -- 1. Insertar productos nuevos (que están en ProductoTemporal pero no en Producto)
    INSERT INTO chat_db.Producto (
        UNIT, 
        SKU, 
        Familia,
        Descripcion, 
        Price, 
        OneYearContract,
        ThirdYearContract,
        FiveYearContract,
        createdAt, 
        updatedAt
    )
    SELECT 
        pt.UNIT,
        pt.SKU,
        pt.Familia,
        pt.Descripcion,
        pt.Price,
        pt.OneYearContract,
        pt.ThirdYearContract,
        pt.FiveYearContract,
        NOW(),
        NOW()
    FROM chat_db.ProductoTemporal pt
    LEFT JOIN chat_db.Producto p ON pt.UNIT = p.UNIT AND pt.SKU = p.SKU
    WHERE p.Id IS NULL;
    
    SET registrosInsertados = ROW_COUNT();
    
    -- 2. Actualizar productos existentes con información de ProductoTemporal
    UPDATE chat_db.Producto p
    INNER JOIN chat_db.ProductoTemporal pt ON p.UNIT = pt.UNIT AND p.SKU = pt.SKU
    SET 
        p.Familia = pt.Familia,
        p.Descripcion = pt.Descripcion,
        p.Price = pt.Price,
        p.OneYearContract = pt.OneYearContract,
        p.ThirdYearContract = pt.ThirdYearContract,
        p.FiveYearContract = pt.FiveYearContract,
        p.updatedAt = NOW();
    
    SET registrosActualizados = ROW_COUNT();
    
    -- 3. Limpiar tabla temporal
    TRUNCATE TABLE chat_db.ProductoTemporal;
    
    -- Retornar estadísticas
    SELECT 
        registrosInsertados AS ProductosInsertados,
        registrosActualizados AS ProductosActualizados,
        'Sincronización completada exitosamente' AS Mensaje;
END$$

CREATE DEFINER=`root`@`%` PROCEDURE `GetDatasheetByUnit` (IN `p_unit` VARCHAR(250))   BEGIN
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

END$$

CREATE DEFINER=`root`@`%` PROCEDURE `GetProductByUnit` (IN `p_unit` VARCHAR(250))   BEGIN
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

END$$

CREATE DEFINER=`root`@`%` PROCEDURE `GetProductByUnitAndSku` (IN `p_unit` VARCHAR(250), IN `p_sku` VARCHAR(250))   BEGIN
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

END$$

CREATE DEFINER=`root`@`%` PROCEDURE `GetUserById` (IN `Id_entrada` INT)   BEGIN
    SELECT 
        Id,
        Usuario
    FROM chat_db.Usuario
    WHERE Id = Id_entrada
    LIMIT 1;
END$$

CREATE DEFINER=`root`@`%` PROCEDURE `GetUserCredential` (IN `Usuario_entrada` VARCHAR(50))   BEGIN
    SELECT Id AS UsuarioId, Credencial AS HashCredencial
    FROM chat_db.Usuario
    WHERE Usuario = Usuario_entrada
    LIMIT 1;
END$$

CREATE DEFINER=`root`@`%` PROCEDURE `SyncDatasheets` ()   BEGIN
    -- Variables para manejo de errores
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
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
    -- 3. LIMPIAR tabla temporal (contar ANTES de truncar)
    -- ===========================================================
    SET @deleteCount = (SELECT COUNT(*) FROM DatasheetTemporal);
    TRUNCATE TABLE DatasheetTemporal;

    -- Confirmar transacción
    COMMIT;

    -- Retornar resultado
    SELECT 'success' AS status, 
           @insertCount AS inserted, 
           @updateCount AS updated, 
           @deleteCount AS deleted,
           (@insertCount + @updateCount) AS total_affected;

END$$

CREATE DEFINER=`root`@`%` PROCEDURE `UpdatePassword` (IN `Usuario_entrada` VARCHAR(50), IN `NuevaCredencial_entrada` VARCHAR(255))   BEGIN
    DECLARE RowsAffected INT DEFAULT 0;
    
    -- Actualizar la contraseña del usuario
    UPDATE chat_db.Usuario
    SET Credencial = NuevaCredencial_entrada,
        updatedAt = NOW()
    WHERE Usuario = Usuario_entrada;
    
    -- Obtener filas afectadas
    SET RowsAffected = ROW_COUNT();
    
    -- Retornar resultado
    IF RowsAffected > 0 THEN
        SELECT 1 AS ActualizacionExitosa, 'Contraseña actualizada correctamente' AS Mensaje;
    ELSE 
        SELECT 0 AS ActualizacionExitosa, 'Usuario no encontrado' AS Mensaje;
    END IF;
END$$

DELIMITER ;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `Datasheet`
--

CREATE TABLE `Datasheet` (
  `id` int NOT NULL,
  `UNIT` varchar(250) NOT NULL,
  `SKU` varchar(250) NOT NULL,
  `Firewall_Throughput_UDP` varchar(250) DEFAULT NULL,
  `IPSec_VPN_Throughput` varchar(250) DEFAULT NULL,
  `IPS_Throughput_Enterprise_Mix` varchar(250) DEFAULT NULL,
  `NGFW_Throughput_Enterprise_Mix` varchar(250) DEFAULT NULL,
  `Threat_Protection_Throughput` varchar(250) DEFAULT NULL,
  `Firewall_Latency` varchar(250) DEFAULT NULL,
  `Concurrent_Sessions` varchar(250) DEFAULT NULL,
  `New_Sessions_Per_Second` varchar(250) DEFAULT NULL,
  `Firewall_Policies` varchar(250) DEFAULT NULL,
  `Max_Gateway_To_Gateway_IPSec_Tunnels` varchar(250) DEFAULT NULL,
  `Max_Client_To_Gateway_IPSec_Tunnels` varchar(250) DEFAULT NULL,
  `SSL_VPN_Throughput` varchar(250) DEFAULT NULL,
  `Concurrent_SSL_VPN_Users` varchar(250) DEFAULT NULL,
  `SSL_Inspection_Throughput` varchar(250) DEFAULT NULL,
  `Application_Control_Throughput` varchar(250) DEFAULT NULL,
  `Max_FortiAPs` varchar(250) DEFAULT NULL,
  `Max_FortiSwitches` varchar(250) DEFAULT NULL,
  `Max_FortiTokens` varchar(250) DEFAULT NULL,
  `Virtual_Domains` varchar(250) DEFAULT NULL,
  `Interfaces` varchar(250) DEFAULT NULL,
  `Local_Storage` varchar(250) DEFAULT NULL,
  `Power_Supplies` varchar(250) DEFAULT NULL,
  `Form_Factor` varchar(250) DEFAULT NULL,
  `Variants` varchar(250) DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `Datasheet`
--

INSERT INTO `Datasheet` (`id`, `UNIT`, `SKU`, `Firewall_Throughput_UDP`, `IPSec_VPN_Throughput`, `IPS_Throughput_Enterprise_Mix`, `NGFW_Throughput_Enterprise_Mix`, `Threat_Protection_Throughput`, `Firewall_Latency`, `Concurrent_Sessions`, `New_Sessions_Per_Second`, `Firewall_Policies`, `Max_Gateway_To_Gateway_IPSec_Tunnels`, `Max_Client_To_Gateway_IPSec_Tunnels`, `SSL_VPN_Throughput`, `Concurrent_SSL_VPN_Users`, `SSL_Inspection_Throughput`, `Application_Control_Throughput`, `Max_FortiAPs`, `Max_FortiSwitches`, `Max_FortiTokens`, `Virtual_Domains`, `Interfaces`, `Local_Storage`, `Power_Supplies`, `Form_Factor`, `Variants`, `createdAt`, `updatedAt`) VALUES
(1, 'FortiGate-40F-3G4G', 'FG-40F-3G4G', '4/3.9 Gbps', '3.5 Gbps', '800 Mbps', '570 Mbps', '500 Mbps', '2.87 micro', '600000', '30000', '2000', '200', '250', '-', '-', '400Mbps', '830 Mbps', '46250', '8', '500', '-', '4X GE RJ45', '30 GB', 'Single AC PS', 'Desktop', 'Wifi', '2026-01-14 20:34:37', '2026-01-14 20:34:37');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `DatasheetTemporal`
--

CREATE TABLE `DatasheetTemporal` (
  `id` int NOT NULL,
  `UNIT` varchar(250) NOT NULL,
  `SKU` varchar(250) NOT NULL,
  `Firewall_Throughput_UDP` varchar(250) DEFAULT NULL,
  `IPSec_VPN_Throughput` varchar(250) DEFAULT NULL,
  `IPS_Throughput_Enterprise_Mix` varchar(250) DEFAULT NULL,
  `NGFW_Throughput_Enterprise_Mix` varchar(250) DEFAULT NULL,
  `Threat_Protection_Throughput` varchar(250) DEFAULT NULL,
  `Firewall_Latency` varchar(250) DEFAULT NULL,
  `Concurrent_Sessions` varchar(250) DEFAULT NULL,
  `New_Sessions_Per_Second` varchar(250) DEFAULT NULL,
  `Firewall_Policies` varchar(250) DEFAULT NULL,
  `Max_Gateway_To_Gateway_IPSec_Tunnels` varchar(250) DEFAULT NULL,
  `Max_Client_To_Gateway_IPSec_Tunnels` varchar(250) DEFAULT NULL,
  `SSL_VPN_Throughput` varchar(250) DEFAULT NULL,
  `Concurrent_SSL_VPN_Users` varchar(250) DEFAULT NULL,
  `SSL_Inspection_Throughput` varchar(250) DEFAULT NULL,
  `Application_Control_Throughput` varchar(250) DEFAULT NULL,
  `Max_FortiAPs` varchar(250) DEFAULT NULL,
  `Max_FortiSwitches` varchar(250) DEFAULT NULL,
  `Max_FortiTokens` varchar(250) DEFAULT NULL,
  `Virtual_Domains` varchar(250) DEFAULT NULL,
  `Interfaces` varchar(250) DEFAULT NULL,
  `Local_Storage` varchar(250) DEFAULT NULL,
  `Power_Supplies` varchar(250) DEFAULT NULL,
  `Form_Factor` varchar(250) DEFAULT NULL,
  `Variants` varchar(250) DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `Producto`
--

CREATE TABLE `Producto` (
  `id` int NOT NULL,
  `UNIT` varchar(250) NOT NULL,
  `SKU` varchar(250) NOT NULL,
  `Familia` varchar(100) NOT NULL,
  `Descripcion` text,
  `Price` varchar(20) DEFAULT NULL,
  `OneYearContract` varchar(20) DEFAULT NULL,
  `ThirdYearContract` varchar(20) DEFAULT NULL,
  `FiveYearContract` varchar(20) DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `Producto`
--

INSERT INTO `Producto` (`id`, `UNIT`, `SKU`, `Familia`, `Descripcion`, `Price`, `OneYearContract`, `ThirdYearContract`, `FiveYearContract`, `createdAt`, `updatedAt`) VALUES
(1, 'FortiGate-40F-3G4G', 'FG-40F-3G4G', 'FortiWeb', '5 x GE RJ45 ports (including 1 x WAN Port, 4 x Internal Ports) with Embedded 3G/4G/LTE wireless wan module, 3 external SMA WWAN antennas included', '955', '0', '0', '0', '2026-01-14 20:26:41', '2026-01-14 20:26:41'),
(2, 'FortiGate-40F-3G4G', 'FG-40F-3G4G-HA', 'FortiWeb', '5 x GE RJ45 ports (including 1 x WAN Port, 4 x Internal Ports) with Embedded 3G/4G/LTE wireless wan module, 3 external SMA WWAN antennas included.FG-XX-HA SKUs must to be bought in pairs and entitle HA pair to leverage single service contracts. (limited to Enterprise, UTP and ATP bundles only)', '0', '1766.75', '0', '0', '2026-01-14 20:26:41', '2026-01-14 20:26:41'),
(3, 'FortiGate-40F-3G4G', 'FG-40F-3G4G-BDL-809-DD', 'FortiWeb', 'Hardware plus FortiCare Premium and FortiGuard Enterprise Protection', '0', '1623.5', '3146.73', '4404.94', '2026-01-14 20:26:41', '2026-01-14 20:26:41'),
(4, 'FortiGate-40F-3G4G', 'FG-40F-3G4G-BDL-950-DD', 'FortiWeb', 'Hardware plus FortiCare Premium and FortiGuard Unified Threat Protection (UTP)', '0', '811.75', '2759.95', '3796.13', '2026-01-14 20:26:41', '2026-01-14 20:26:41'),
(5, 'FortiGate-40F-3G4G', 'FC-10-F40FG-809-02-DD', 'FortiWeb', 'Enterprise Protection (IPS, AI-based Inline Malware Prevention, DLP, App Control, Adv Malware Protection, URL/DNS/Video Filtering, Anti-spam, Attack Surface Security, Converter Svc, FortiCare Premium)', '0', '668.5', '2191.73', '3449.94', '2026-01-14 20:26:41', '2026-01-14 20:26:41'),
(6, 'FortiGate-40F-3G4G', 'FC-10-F40FG-950-02-DD', 'FortiWeb', 'Unified Threat Protection (UTP) (IPS, Advanced Malware Protection, Application Control, URL, DNS & Video Filtering, Antispam Service, and FortiCare Premium)', '0', '429.75', '1804.95', '2841.13', '2026-01-14 20:26:41', '2026-01-14 20:26:41'),
(7, 'FortiGate-40F-3G4G', 'FC-10-F40FG-928-02-DD', 'FortiWeb', 'Advanced Threat Protection (IPS, Advanced Malware Protection Service, Application Control, and FortiCare Premium)', '0', '191', '1160.33', '1826.44', '2026-01-14 20:26:41', '2026-01-14 20:26:41'),
(8, 'FortiGate-40F-3G4G', 'FC-10-F40FG-131-02-DD', 'FortiWeb', 'FortiGate Cloud Management, Analysis and 1 Year Log Retention', '0', '382', '573', '955', '2026-01-14 20:26:41', '2026-01-14 20:26:41'),
(9, 'FortiGate-40F-3G4G', 'FC-10-F40FG-1125-02-DD', 'FortiWeb', 'FortiGate Cloud Advanced, including Management, Analysis and 1 Year Log Retention plus SD-WAN Overlay-as-a-Service and extended SecOps', '0', '191', '1146', '1910', '2026-01-14 20:26:41', '2026-01-14 20:26:41'),
(10, 'FortiGate-40F-3G4G', 'FC-10-F40FG-100-02-DD', 'FortiWeb', 'Advanced Malware Protection (AMP) including Antivirus, Mobile Malware and FortiGate Cloud Sandbox Service', '0', '286.5', '573', '955', '2026-01-14 20:26:41', '2026-01-14 20:26:41'),
(11, 'FortiGate-40F-3G4G', 'FC-10-F40FG-577-02-DD', 'FortiWeb', 'FortiGuard AI-based Inline Malware Prevention Service', '0', '191', '859.5', '1432.5', '2026-01-14 20:26:41', '2026-01-14 20:26:41'),
(12, 'FortiGate-40F-3G4G', 'FC-10-F40FG-108-02-DD', 'FortiWeb', 'FortiGuard IPS Service', '0', '286.5', '573', '955', '2026-01-14 20:26:41', '2026-01-14 20:26:41'),
(13, 'FortiGate-40F-3G4G', 'FC-10-F40FG-112-02-DD', 'FortiWeb', 'FortiGuard URL, DNS & Video Filtering Service', '0', '191', '859.5', '1432.5', '2026-01-14 20:26:41', '2026-01-14 20:26:41'),
(14, 'FortiGate-40F-3G4G', 'FC-10-F40FG-159-02-DD', 'FortiWeb', 'FortiGuard OT Security Service (OT dashboards and compliance reports, OT application and service detection, OT vulnerability correlation, OT virtual patching, OT signatures - Application Control and IPS rules)', '0', '191', '573', '955', '2026-01-14 20:26:41', '2026-01-14 20:26:41'),
(15, 'FortiGate-40F-3G4G', 'FC-10-F40FG-175-02-DD', 'FortiWeb', 'FortiGuard Attack Surface Security Service (Security, Compliance and Risk Ratings, IoT Detection and IoT Vulnerability Correlation)', '0', '334.25', '573', '955', '2026-01-14 20:26:41', '2026-01-14 20:26:41'),
(16, 'FortiGate-40F-3G4G', 'FC-10-F40FG-595-02-DD', 'FortiWeb', 'FortiSASE subscription including cloud management and bandwidth license', '0', '191', '1002.75', '1671.25', '2026-01-14 20:26:41', '2026-01-14 20:26:41'),
(17, 'FortiGate-40F-3G4G', 'FC-10-F40FG-288-02-DD', 'FortiWeb', 'SDWAN Underlay and Application Monitoring', '0', '191', '573', '955', '2026-01-14 20:26:41', '2026-01-14 20:26:41'),
(18, 'FortiGate-40F-3G4G', 'FC-10-F40FG-589-02-DD', 'FortiWeb', 'FortiGuard Data Loss Prevention Service', '0', '286.5', '573', '955', '2026-01-14 20:26:41', '2026-01-14 20:26:41'),
(19, 'FortiGate-40F-3G4G', 'FC-10-F40FG-585-02-DD', 'FortiWeb', 'FortiAnalyzer Cloud: cloud-Based central logging & analytics. Include All FortiGate log types, IOC Service, Security Automation Service and FortiGuard Outbreak Detection Service.', '0', '549.13', '859.5', '1432.5', '2026-01-14 20:26:41', '2026-01-14 20:26:41'),
(20, 'FortiGate-40F-3G4G', 'FC-10-F40FG-464-02-DD', 'FortiWeb', 'SOCaaS: 24x7 cloud-based managed log monitoring, incident triage and SOC escalation service', '0', '2073', '1647.38', '2745.63', '2026-01-14 20:26:41', '2026-01-14 20:26:41'),
(21, 'FortiGate-40F-3G4G', 'FC-10-F40FG-660-02-DD', 'FortiWeb', 'Managed FortiGate service, available 24x7, with Fortinet NOC experts performing device setup, network, and policy change management', '0', '191', '3219', '4365', '2026-01-14 20:26:41', '2026-01-14 20:26:41'),
(22, 'FortiGate-40F-3G4G', 'FC-10-F40FG-662-02-DD', 'FortiWeb', 'FortiSASE Secure Private Access connector license for SD-WAN', '0', '50', '573', '955', '2026-01-14 20:26:41', '2026-01-14 20:26:41'),
(23, 'FortiGate-40F-3G4G', 'FC-10-F40FG-189-02-DD', 'FortiWeb', 'FortiConverter Service for one time configuration conversion service', '0', '143.25', '0', '0', '2026-01-14 20:26:41', '2026-01-14 20:26:41'),
(24, 'FortiGate-40F-3G4G', 'FC-10-F40FG-314-02-DD', 'FortiWeb', 'FortiCare Essential Support', '0', '191', '429.75', '716.25', '2026-01-14 20:26:41', '2026-01-14 20:26:41'),
(25, 'FortiGate-40F-3G4G', 'FC-10-F40FG-247-02-DD', 'FortiWeb', 'FortiCare Premium Support', '0', '238.75', '573', '955', '2026-01-14 20:26:41', '2026-01-14 20:26:41'),
(26, 'FortiGate-40F-3G4G', 'FC-10-F40FG-284-02-DD', 'FortiWeb', 'FortiCare Elite Support', '0', '47.75', '716.25', '1193.75', '2026-01-14 20:26:41', '2026-01-14 20:26:41'),
(27, 'FortiGate-40F-3G4G', 'FC-10-F40FG-204-02-DD', 'FortiWeb', 'Upgrade FortiCare Premium to Elite (Require FortiCare Premium)', '0', '250', '143.25', '238.75', '2026-01-14 20:26:41', '2026-01-14 20:26:41'),
(28, 'FortiGate-40F-3G4G', 'FC-10-F40FG-210-02-DD', 'FortiWeb', 'Next Calendar Day Delivery Priority RMA Service (Requires FortiCare Premium or FortiCare Elite)', '0', '350', '750', '1250', '2026-01-14 20:26:41', '2026-01-14 20:26:41'),
(29, 'FortiGate-40F-3G4G', 'FC-10-F40FG-211-02-DD', 'FortiWeb', '4-Hour Hardware Delivery Priority RMA Service (Requires FortiCare Premium or FortiCare Elite)', '0', '450', '1050', '1750', '2026-01-14 20:26:41', '2026-01-14 20:26:41'),
(30, 'FortiGate-40F-3G4G', 'FC-10-F40FG-212-02-DD', 'FortiWeb', '4-Hour Hardware and Onsite Engineer Priority RMA Service (Requires FortiCare Premium or FortiCare Elite)', '0', '71.63', '1350', '2250', '2026-01-14 20:26:41', '2026-01-14 20:26:41'),
(31, 'FortiGate-40F-3G4G', 'FC-10-F40FG-301-02-DD', 'FortiWeb', 'Secure RMA Service', '0', '0', '214.88', '358.13', '2026-01-14 20:26:41', '2026-01-14 20:26:41');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `ProductoTemporal`
--

CREATE TABLE `ProductoTemporal` (
  `id` int NOT NULL,
  `UNIT` varchar(250) NOT NULL,
  `SKU` varchar(250) NOT NULL,
  `Familia` varchar(100) NOT NULL,
  `Descripcion` text,
  `Price` varchar(20) DEFAULT NULL,
  `OneYearContract` varchar(20) DEFAULT NULL,
  `ThirdYearContract` varchar(20) DEFAULT NULL,
  `FiveYearContract` varchar(20) DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `Usuario`
--

CREATE TABLE `Usuario` (
  `Id` int NOT NULL,
  `Usuario` varchar(100) DEFAULT NULL,
  `Credencial` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `Usuario`
--

INSERT INTO `Usuario` (`Id`, `Usuario`, `Credencial`) VALUES
(1, 'Admin_Wexler', '$2a$10$ItjeiN8hGR9NtJOjbkP2Aeypc8BI8Y7FlXsH2Vy1SMJ.IuoCc4Lfy');

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `Datasheet`
--
ALTER TABLE `Datasheet`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `DatasheetTemporal`
--
ALTER TABLE `DatasheetTemporal`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `Producto`
--
ALTER TABLE `Producto`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `ProductoTemporal`
--
ALTER TABLE `ProductoTemporal`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `Usuario`
--
ALTER TABLE `Usuario`
  ADD PRIMARY KEY (`Id`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `Datasheet`
--
ALTER TABLE `Datasheet`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT de la tabla `DatasheetTemporal`
--
ALTER TABLE `DatasheetTemporal`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `Producto`
--
ALTER TABLE `Producto`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=32;

--
-- AUTO_INCREMENT de la tabla `ProductoTemporal`
--
ALTER TABLE `ProductoTemporal`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `Usuario`
--
ALTER TABLE `Usuario`
  MODIFY `Id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
