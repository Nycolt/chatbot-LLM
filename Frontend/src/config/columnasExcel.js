/**
 * Columnas requeridas para el Excel de productos
 */
export const REQUIRED_PRODUCT_COLUMNS = [
    'UNIT',
    'SKU',
    'Description',
    'Price',
    '1YrContract',
    '3YrContract',
    '5YrContract'
];

/**
 * Columnas que no deben estar vacías en el Excel de productos
 */
export const NO_EMPTY_PRODUCT_COLUMNS = [
    'UNIT',
    'SKU',
];


/**
 * Columnas requeridas para el Excel de datasheets
 */
/**
 * Columnas requeridas para el Excel de Datasheets
 */
export const REQUIRED_DATASHEET_COLUMNS = [
    'UNIT',
    'SKU',
    'Firewall_Throughput_UDP',
    'IPSec_VPN_Throughput',
    'IPS_Throughput_Enterprise_Mix',
    'NGFW_Throughput_Enterprise_Mix',
    'Threat_Protection_Throughput',
    'Firewall_Latency',
    'Concurrent_Sessions',
    'New_Sessions_Per_Second',
    'Firewall_Policies',
    'Max_Gateway_To_Gateway_IPSec_Tunnels',
    'Max_Client_To_Gateway_IPSec_Tunnels',
    'SSL_VPN_Throughput',
    'Concurrent_SSL_VPN_Users',
    'SSL_Inspection_Throughput',
    'Application_Control_Throughput',
    'Max_FortiAPs',
    'Max_FortiSwitches',
    'Max_FortiTokens',
    'Virtual_Domains',
    'Interfaces',
    'Local_Storage',
    'Power_Supplies',
    'Form_Factor',
    'Variants'
];

/**
 * Columnas que no deben estar vacías en el Excel de datasheets
 */
//export const NO_EMPTY_DATASHEETS_COLUMNS = [
//    'UNIT',
//    'SKU',
//];
