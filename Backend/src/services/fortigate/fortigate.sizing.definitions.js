/**
 * Definiciones del flujo de dimensionamiento FortiGate (preguntas, ids en state.answers).
 * Alineado con métricas PascalCase en fortigate_specs (sin cambiar BD).
 */

/** Bloque 1 – WAN (state.answers.wan) */
export const FORTIGATE_WAN_OPTIONS = [
  { id: 'wan_100', label: 'Hasta 100 Mbps (pequeña oficina)', baseMbps: 100 },
  { id: 'wan_500', label: '100 Mbps – 500 Mbps', baseMbps: 500 },
  { id: 'wan_1g', label: '500 Mbps – 1 Gbps', baseMbps: 1000 },
  { id: 'wan_gt1g', label: 'Más de 1 Gbps', baseMbps: 2500 },
  { id: 'wan_unknown', label: 'No estoy seguro', baseMbps: 200 },
];

/** Bloque 1 – usuarios (state.answers.users) */
export const FORTIGATE_USERS_OPTIONS = [
  { id: 'u_1_25', label: '1 – 25 usuarios', estimatedUsers: 25 },
  { id: 'u_26_100', label: '26 – 100 usuarios', estimatedUsers: 100 },
  { id: 'u_101_500', label: '101 – 500 usuarios', estimatedUsers: 500 },
  { id: 'u_500p', label: 'Más de 500 usuarios', estimatedUsers: 650 },
  { id: 'u_unknown', label: 'No estoy seguro', estimatedUsers: 50 },
];

/** Bloque 1 – nivel de seguridad (state.answers.securityLevel) */
export const FORTIGATE_SECURITY_LEVEL_OPTIONS = [
  { id: 'basic', label: 'Básico: Firewall tradicional' },
  { id: 'medium', label: 'Medio: IPS + control de aplicaciones' },
  { id: 'high', label: 'Alto: NGFW completo' },
  { id: 'max', label: 'Máximo: Seguridad avanzada + inspección SSL completa' },
  { id: 'sl_unknown', label: 'No estoy seguro' },
];

/** Bloque 1 – tráfico (state.answers.trafficType) */
export const FORTIGATE_TRAFFIC_OPTIONS = [
  { id: 'browsing', label: 'Navegación básica', factor: 1.0 },
  { id: 'enterprise', label: 'Aplicaciones empresariales', factor: 1.15 },
  { id: 'heavy', label: 'Tráfico pesado (video, transferencias)', factor: 1.28 },
  { id: 'mixed', label: 'Mixto', factor: 1.12 },
  { id: 'tr_unknown', label: 'No estoy seguro', factor: 1.1 },
];

/**
 * Bloque 2 – tipo VPN (state.answers.vpnType)
 * optionIndex 1–5 alineado con índices de formulario / motor
 */
export const FORTIGATE_VPN_TYPE_OPTIONS = [
  { id: 'none', optionIndex: 1, label: 'No necesito VPN' },
  { id: 'ssl_remote', optionIndex: 2, label: 'Acceso remoto de usuarios (SSL VPN)' },
  { id: 'ipsec_s2s', optionIndex: 3, label: 'Conexión entre sedes (IPsec site-to-site)' },
  { id: 'both', optionIndex: 4, label: 'Ambos (SSL VPN + IPsec)' },
  { id: 'vpn_unknown', optionIndex: 5, label: 'No estoy seguro' },
];

/** @deprecated usar FORTIGATE_VPN_TYPE_OPTIONS */
export const FORTIGATE_VPN_OPTIONS = FORTIGATE_VPN_TYPE_OPTIONS;

/** ¿Preguntar usuarios SSL VPN? (2, 4, 5) */
export function fortigateVpnTypeNeedsSslUsers(vpnType) {
  const n = vpnType?.optionIndex ?? vpnTypeOptionIndexFromId(vpnType?.id);
  return n === 2 || n === 4 || n === 5;
}

/** ¿Preguntar túneles IPsec? (3, 4, 5) */
export function fortigateVpnTypeNeedsIpsec(vpnType) {
  const n = vpnType?.optionIndex ?? vpnTypeOptionIndexFromId(vpnType?.id);
  return n === 3 || n === 4 || n === 5;
}

function vpnTypeOptionIndexFromId(id) {
  const map = {
    none: 1,
    ssl_remote: 2,
    remote: 2,
    ipsec_s2s: 3,
    sitestosite: 3,
    both: 4,
    vpn_unknown: 5,
  };
  return map[id] ?? null;
}

/** Compat: cualquier detalle VPN distinto de “no” */
export function fortigateVpnNeedsDetail(vpnOption) {
  return fortigateVpnTypeNeedsSslUsers(vpnOption) || fortigateVpnTypeNeedsIpsec(vpnOption);
}

/** Usuarios SSL VPN remotos simultáneos (state.answers.sslVpnUsers) */
export const FORTIGATE_SSL_VPN_USERS_OPTIONS = [
  { id: 'vu_1_10', label: '1 – 10', count: 10 },
  { id: 'vu_11_50', label: '11 – 50', count: 50 },
  { id: 'vu_51_200', label: '51 – 200', count: 200 },
  { id: 'vu_200p', label: 'Más de 200', count: 280 },
  { id: 'vu_unknown', label: 'No estoy seguro', count: 35 },
];

/** @deprecated usar FORTIGATE_SSL_VPN_USERS_OPTIONS */
export const FORTIGATE_VPN_USERS_OPTIONS = FORTIGATE_SSL_VPN_USERS_OPTIONS;

export const FORTIGATE_IPSEC_TUNNEL_OPTIONS = [
  { id: 't_1_5', label: '1 – 5', count: 5 },
  { id: 't_6_20', label: '6 – 20', count: 20 },
  { id: 't_21_100', label: '21 – 100', count: 100 },
  { id: 't_100p', label: 'Más de 100', count: 150 },
  { id: 't_unknown', label: 'No estoy seguro', count: 15 },
];

/** Bloque 3 – SSL (state.answers.sslInspection) */
export const FORTIGATE_SSL_OPTIONS = [
  { id: 'none', label: 'Ninguna' },
  { id: 'partial', label: 'Parcial' },
  { id: 'full', label: 'Completa' },
  { id: 'ssl_unknown', label: 'No estoy seguro' },
];

/** Bloque 4 – VDOM (state.answers.vdoms) */
export const FORTIGATE_VDOM_OPTIONS = [
  { id: 'vd_no', label: 'No', count: 1 },
  { id: 'vd_few', label: 'Sí, pocas segmentaciones', count: 8 },
  { id: 'vd_many', label: 'Sí, muchas segmentaciones', count: 32 },
  { id: 'vd_unknown', label: 'No estoy seguro', count: 8 },
];
