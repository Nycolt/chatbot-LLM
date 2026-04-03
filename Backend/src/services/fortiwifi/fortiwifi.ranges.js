/**
 * Opciones del formulario FortiWiFi (orden y textos fijos).
 * IDs internos para el motor determinístico.
 */

export const FORTIWIFI_RANGES = {
  wan: [
    { id: 'wan_100', label: 'Hasta 100 Mbps' },
    { id: 'wan_500', label: 'Hasta 500 Mbps' },
    { id: 'wan_1g', label: 'Hasta 1 Gbps' },
    { id: 'wan_gt1g', label: 'Más de 1 Gbps' },
  ],
  users: [
    { id: 'u50', label: 'Hasta 50' },
    { id: 'u100', label: 'Hasta 100' },
    { id: 'u250', label: 'Hasta 250' },
    { id: 'u_gt250', label: 'Más de 250' },
  ],
  wifiUsers: [
    { id: 'w20', label: 'Hasta 20' },
    { id: 'w50', label: 'Hasta 50' },
    { id: 'w100', label: 'Hasta 100' },
    { id: 'w_gt100', label: 'Más de 100' },
  ],
  securityLevel: [
    { id: 'fw_basic', label: 'Firewall básico' },
    { id: 'ngfw', label: 'NGFW' },
    { id: 'threat', label: 'Threat Protection' },
    { id: 'advanced', label: 'Protección avanzada' },
  ],
  sslInspection: [
    { id: 'none', label: 'No' },
    { id: 'partial', label: 'Sí (parcial)' },
    { id: 'high', label: 'Sí (alto volumen)' },
  ],
  vpnUsage: [
    { id: 'vpn_none', label: 'No' },
    { id: 'vpn_basic', label: 'Acceso remoto básico' },
    { id: 'vpn_s2s', label: 'Acceso remoto + site-to-site' },
    { id: 'vpn_high', label: 'Alto uso de VPN' },
  ],
  fortiSwitch: [
    { id: 'sw0', label: 'No' },
    { id: 'sw3', label: 'Hasta 3' },
    { id: 'sw8', label: 'Hasta 8' },
    { id: 'sw_gt8', label: 'Más de 8' },
  ],
  growth: [
    { id: 'g_none', label: 'No crecerá' },
    { id: 'g_mod', label: 'Crecimiento moderado' },
    { id: 'g_high', label: 'Crecimiento alto' },
  ],
  /** Igual que FortiGate VM: primero Sí (valor formulario 1), luego No (2). */
  wantsAdditionalServices: [
    { id: 'yes', label: 'Sí, deseo valorar servicios adicionales' },
    { id: 'no', label: 'No necesito servicios adicionales' },
  ],
  addons: [
    { id: 'addon_threat', label: 'Mayor protección contra amenazas' },
    { id: 'addon_monitor', label: 'Monitoreo y análisis (logs)' },
    { id: 'addon_support', label: 'Soporte avanzado' },
    { id: 'addon_remote', label: 'Acceso seguro remoto' },
    { id: 'addon_web', label: 'Control de navegación' },
  ],
};
