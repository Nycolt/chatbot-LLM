/**
 * Schemas de preguntas para formularios de dimensionamiento por solución.
 * solutionType: 1 FortiGate, 2 FortiGate VM, 3 FortiWiFi, 4 FortiAnalyzer, 5 FortiManager, 6 FortiSwitch, 7 FortiAP, 8 FortiMail, 9 FortiWeb
 */

import {
  BUNDLE_TYPE_OPTIONS,
  ADDONS_OPTIONS,
  ADDON_TYPE_OPTIONS,
} from '../services/fortigate/fortigate.flow.js';
import {
  FORTIGATE_WAN_OPTIONS,
  FORTIGATE_USERS_OPTIONS,
  FORTIGATE_SECURITY_LEVEL_OPTIONS,
  FORTIGATE_TRAFFIC_OPTIONS,
  FORTIGATE_VPN_TYPE_OPTIONS,
  FORTIGATE_SSL_VPN_USERS_OPTIONS,
  FORTIGATE_IPSEC_TUNNEL_OPTIONS,
  FORTIGATE_SSL_OPTIONS,
  FORTIGATE_VDOM_OPTIONS,
} from '../services/fortigate/fortigate.sizing.definitions.js';
import { FORTIGATE_VM_RANGES } from '../services/fortigateVM/fortigateVM.ranges.js';
import { FORTIWIFI_RANGES } from '../services/fortiwifi/fortiwifi.ranges.js';
import { FORTIANALYZER_RANGES } from '../services/fortianalyzer/fortianalyzer.ranges.js';
import { FORTIMANAGER_RANGES } from '../services/fortimanager/fortimanager.ranges.js';
import { FORTISWITCH_RANGES } from '../services/fortiswitch/fortiswitch.ranges.js';

function optionsFromCommerceList(arr) {
  return (arr || []).map((o, i) => ({ value: i + 1, label: o.label }));
}

/** Opciones con `value` fijo (1-based del dominio), p. ej. FortiAnalyzer. */
function optionsFromValueList(arr) {
  return (arr || []).map((o) => ({ value: o.value, label: o.label }));
}

export const SIZING_SCHEMAS = {
  1: {
    name: 'FortiGate',
    description: 'Dimensionamiento de firewall FortiGate (appliances físicos)',
    fields: [
      {
        id: 'wan',
        label: '¿Cuál es el ancho de banda de tu conexión principal a internet (WAN)?',
        type: 'select',
        required: true,
        options: optionsFromCommerceList(FORTIGATE_WAN_OPTIONS),
      },
      {
        id: 'users',
        label: '¿Cuántos usuarios utilizarán la red aproximadamente?',
        type: 'select',
        required: true,
        options: optionsFromCommerceList(FORTIGATE_USERS_OPTIONS),
      },
      {
        id: 'securityLevel',
        label: '¿Qué nivel de seguridad deseas aplicar al tráfico?',
        type: 'select',
        required: true,
        options: optionsFromCommerceList(FORTIGATE_SECURITY_LEVEL_OPTIONS),
      },
      {
        id: 'trafficType',
        label: '¿Qué tipo de tráfico predomina en tu red?',
        type: 'select',
        required: true,
        options: optionsFromCommerceList(FORTIGATE_TRAFFIC_OPTIONS),
      },
      {
        id: 'vpnType',
        label: '¿Qué tipo de conectividad VPN necesitas?',
        type: 'select',
        required: true,
        options: optionsFromCommerceList(FORTIGATE_VPN_TYPE_OPTIONS),
      },
      {
        id: 'sslVpnUsers',
        label: '¿Cuántos usuarios remotos se conectarán simultáneamente?',
        type: 'select',
        required: true,
        showWhen: { field: 'vpnType', values: [2, 4, 5] },
        options: optionsFromCommerceList(FORTIGATE_SSL_VPN_USERS_OPTIONS),
      },
      {
        id: 'ipsecTunnels',
        label: '¿Cuántas conexiones site-to-site necesitas?',
        type: 'select',
        required: true,
        showWhen: { field: 'vpnType', values: [3, 4, 5] },
        options: optionsFromCommerceList(FORTIGATE_IPSEC_TUNNEL_OPTIONS),
      },
      {
        id: 'sslInspection',
        label: '¿Qué nivel de inspección HTTPS (SSL) necesitas?',
        type: 'select',
        required: true,
        options: optionsFromCommerceList(FORTIGATE_SSL_OPTIONS),
      },
      {
        id: 'vdoms',
        label: '¿Necesitas segmentar tu red (VDOMs)?',
        type: 'select',
        required: true,
        options: optionsFromCommerceList(FORTIGATE_VDOM_OPTIONS),
      },
      {
        id: 'bundleType',
        label: '¿Qué tipo de solución deseas implementar?',
        type: 'select',
        required: true,
        options: optionsFromCommerceList(BUNDLE_TYPE_OPTIONS),
      },
      {
        id: 'addons',
        label: '¿Deseas agregar servicios adicionales?',
        type: 'select',
        required: true,
        options: optionsFromCommerceList(ADDONS_OPTIONS),
      },
      {
        id: 'addonType',
        label: 'Para complementar la solución, ¿qué aspecto te gustaría fortalecer?',
        type: 'select',
        required: true,
        showWhen: { field: 'addons', values: [1] },
        options: optionsFromCommerceList(ADDON_TYPE_OPTIONS),
      },
    ],
  },
  2: {
    name: 'FortiGate VM',
    description:
      'Modelo VM + bundle (UTP/ATP/Enterprise). Si indicas servicios adicionales, se sugerirá también una licencia FC-/FCI-.',
    fields: [
      {
        id: 'deployType',
        label: '¿Dónde planeas implementar la solución? (entorno del firewall virtual)',
        type: 'select',
        required: true,
        options: optionsFromCommerceList(FORTIGATE_VM_RANGES.deployType),
      },
      {
        id: 'capacity',
        label: '¿Qué tamaño de carga esperas manejar con el firewall?',
        type: 'select',
        required: true,
        options: optionsFromCommerceList(FORTIGATE_VM_RANGES.capacity),
      },
      {
        id: 'endpoints',
        label: '¿Cuántos dispositivos o usuarios tendrá la solución?',
        type: 'select',
        required: true,
        options: optionsFromCommerceList(FORTIGATE_VM_RANGES.endpoints),
      },
      {
        id: 'vdoms',
        label: '¿Necesitas segmentar tu red (VDOMs)?',
        type: 'select',
        required: true,
        options: optionsFromCommerceList(FORTIGATE_VM_RANGES.vdoms),
      },
      {
        id: 'fortiap',
        label: '¿Gestionarás redes inalámbricas (Access Points)?',
        type: 'select',
        required: false,
        options: optionsFromCommerceList(FORTIGATE_VM_RANGES.fortiap),
      },
      {
        id: 'fortiswitch',
        label: '¿Gestionarás switches desde el firewall?',
        type: 'select',
        required: false,
        options: optionsFromCommerceList(FORTIGATE_VM_RANGES.fortiswitch),
      },
      {
        id: 'securityProfile',
        label: '¿Qué nivel de seguridad deseas aplicar?',
        type: 'select',
        required: true,
        options: optionsFromCommerceList(FORTIGATE_VM_RANGES.securityProfile),
      },
      {
        id: 'sslInspection',
        label: '¿Qué nivel de inspección HTTPS (SSL) necesitas?',
        type: 'select',
        required: true,
        options: optionsFromCommerceList(FORTIGATE_VM_RANGES.sslInspection),
      },
      {
        id: 'vpnUsage',
        label: '¿Qué nivel de uso de VPN tendrás?',
        type: 'select',
        required: true,
        options: optionsFromCommerceList(FORTIGATE_VM_RANGES.vpnUsage),
      },
      {
        id: 'growth',
        label: '¿Cómo esperas que crezca la solución en el tiempo?',
        type: 'select',
        required: true,
        options: optionsFromCommerceList(FORTIGATE_VM_RANGES.growth),
      },
      {
        id: 'wantsAdditionalServices',
        label:
          '¿Deseas complementar la solución con servicios adicionales? (Si eliges Sí, se mostrarán las opciones siguientes)',
        type: 'select',
        required: true,
        options: optionsFromCommerceList(FORTIGATE_VM_RANGES.wantsAdditionalServices),
      },
      {
        id: 'addons',
        label:
          'Selecciona una necesidad principal de servicio adicional (solo si elegiste «Sí» antes).',
        type: 'select',
        required: true,
        showWhen: { field: 'wantsAdditionalServices', values: [1] },
        options: optionsFromCommerceList(FORTIGATE_VM_RANGES.addons),
      },
    ],
  },
  3: {
    name: 'FortiWiFi',
    description:
      '📡 Formulario de Dimensionamiento FortiWiFi\n\nResponde las siguientes preguntas para recomendar el modelo adecuado:',
    fields: [
      {
        id: 'wan',
        label: '¿Cuál es el ancho de banda de tu conexión principal (WAN)?',
        type: 'select',
        required: true,
        options: optionsFromCommerceList(FORTIWIFI_RANGES.wan),
      },
      {
        id: 'users',
        label: '¿Cuántos usuarios se conectarán a la red?',
        type: 'select',
        required: true,
        options: optionsFromCommerceList(FORTIWIFI_RANGES.users),
      },
      {
        id: 'wifiUsers',
        label: '¿Cuántos usuarios usarán WiFi simultáneamente?',
        type: 'select',
        required: true,
        options: optionsFromCommerceList(FORTIWIFI_RANGES.wifiUsers),
      },
      {
        id: 'securityLevel',
        label: '¿Qué nivel de seguridad deseas aplicar?',
        type: 'select',
        required: true,
        options: optionsFromCommerceList(FORTIWIFI_RANGES.securityLevel),
      },
      {
        id: 'sslInspection',
        label: '¿Vas a inspeccionar tráfico SSL?',
        type: 'select',
        required: true,
        options: optionsFromCommerceList(FORTIWIFI_RANGES.sslInspection),
      },
      {
        id: 'vpnUsage',
        label: '¿Qué tipo de VPN necesitas?',
        type: 'select',
        required: false,
        options: optionsFromCommerceList(FORTIWIFI_RANGES.vpnUsage),
      },
      {
        id: 'fortiSwitch',
        label: '¿Planeas usar switches gestionados (FortiSwitch)?',
        type: 'select',
        required: false,
        options: optionsFromCommerceList(FORTIWIFI_RANGES.fortiSwitch),
      },
      {
        id: 'growth',
        label: '¿Cómo crecerá tu red?',
        type: 'select',
        required: true,
        options: optionsFromCommerceList(FORTIWIFI_RANGES.growth),
      },
      {
        id: 'wantsAdditionalServices',
        label:
          '¿Deseas incluir servicios adicionales?',
        type: 'select',
        required: true,
        options: optionsFromCommerceList(FORTIWIFI_RANGES.wantsAdditionalServices),
      },
      {
        id: 'addons',
        label:
          'Selecciona la necesidad principal de servicio adicional',
        type: 'select',
        required: true,
        showWhen: { field: 'wantsAdditionalServices', values: [1] },
        options: optionsFromCommerceList(FORTIWIFI_RANGES.addons),
      },
    ],
  },
  4: {
    name: 'FortiAnalyzer',
    description:
      '📊 Formulario de dimensionamiento FortiAnalyzer. Las recomendaciones usan datos reales de `fortianalyzer_specs` y SKUs de `solution_offers` (sin bundles). En la pregunta 9 debes elegir una opción de licencia/servicio para una recomendación completa (equipo + licencia).',
    fields: [
      {
        id: 'logsVolume',
        label: '1. Volumen de logs (GB/día)',
        type: 'select',
        required: true,
        options: optionsFromValueList(FORTIANALYZER_RANGES.logsVolume),
      },
      {
        id: 'analyticsLevel',
        label: '2. Nivel de análisis requerido',
        type: 'select',
        required: true,
        options: optionsFromValueList(FORTIANALYZER_RANGES.analyticsLevel),
      },
      {
        id: 'devices',
        label: '3. Dispositivos que enviarán logs',
        type: 'select',
        required: true,
        options: optionsFromValueList(FORTIANALYZER_RANGES.devices),
      },
      {
        id: 'retention',
        label: '4. Retención de logs',
        type: 'select',
        required: true,
        options: optionsFromValueList(FORTIANALYZER_RANGES.retention),
      },
      {
        id: 'growth',
        label: '5. Crecimiento esperado del volumen',
        type: 'select',
        required: true,
        options: optionsFromValueList(FORTIANALYZER_RANGES.growth),
      },
      {
        id: 'deployment',
        label: '6. Tipo de despliegue',
        type: 'select',
        required: true,
        options: optionsFromValueList(FORTIANALYZER_RANGES.deployment),
      },
      {
        id: 'performance',
        label: '7. Nivel de rendimiento del análisis',
        type: 'select',
        required: true,
        options: optionsFromValueList(FORTIANALYZER_RANGES.performance),
      },
      {
        id: 'storageType',
        label: '8. Tipo de almacenamiento',
        type: 'select',
        required: true,
        options: optionsFromValueList(FORTIANALYZER_RANGES.storageType),
      },
      {
        id: 'licenseOption',
        label:
          '9. Licencias y servicios adicionales — selecciona al menos una opción para obtener la recomendación completa (modelo + licencia).',
        type: 'select',
        required: true,
        options: optionsFromValueList(FORTIANALYZER_RANGES.licenseOption),
      },
    ],
  },
  5: {
    name: 'Dimensionamiento de FortiManager',
    description:
      'Responde las preguntas para recomendar el modelo y, si lo deseas, licencias asociadas. El FortiCare es obligatorio en cotización; el resto es opcional.',
    fields: [
      {
        id: 'fortimanager_intro',
        type: 'static',
        required: false,
        content:
          'Responde las siguientes preguntas para recomendar el modelo adecuado y, si lo deseas, las licencias asociadas.',
      },
      {
        id: 'devicesRange',
        label:
          '🧩 1. Alcance de gestión (Obligatorio)\n¿Cuántos dispositivos (FortiGate / FortiWiFi / VDOMs) necesitas administrar?',
        type: 'select',
        required: true,
        options: optionsFromValueList(FORTIMANAGER_RANGES.devicesRange),
      },
      {
        id: 'growth',
        label:
          '📈 2. Crecimiento esperado (Obligatorio)\n¿Cómo proyectas el crecimiento de tu infraestructura en los próximos 2–3 años?',
        type: 'select',
        required: true,
        options: optionsFromValueList(FORTIMANAGER_RANGES.growth),
      },
      {
        id: 'vdoms',
        label:
          '🧠 3. Uso de segmentación (VDOMs)\n¿Tus dispositivos utilizan múltiples VDOMs?',
        type: 'select',
        required: true,
        options: optionsFromValueList(FORTIMANAGER_RANGES.vdoms),
      },
      {
        id: 'operationLevel',
        label:
          '⚙️ 4. Nivel de operación (Obligatorio)\n¿Qué tipo de gestión necesitas realizar?',
        type: 'select',
        required: true,
        options: optionsFromValueList(FORTIMANAGER_RANGES.operationLevel),
      },
      {
        id: 'logsPerDay',
        label:
          '📊 5. Volumen de logs\n¿Cuánto volumen de logs genera tu red diariamente?',
        type: 'select',
        required: true,
        options: optionsFromValueList(FORTIMANAGER_RANGES.logsPerDay),
      },
      {
        id: 'logActivity',
        label:
          '⚡ 6. Nivel de actividad de la red\n¿Qué tan activa es tu red en términos de eventos y cambios?',
        type: 'select',
        required: true,
        options: optionsFromValueList(FORTIMANAGER_RANGES.logActivity),
      },
      {
        id: 'storageNeed',
        label:
          '💾 7. Necesidad de almacenamiento\n¿Qué nivel de almacenamiento necesitas para configuraciones, backups o auditoría?',
        type: 'select',
        required: true,
        options: optionsFromValueList(FORTIMANAGER_RANGES.storageNeed),
      },
      {
        id: 'fortimanager_lic_header',
        type: 'static',
        required: false,
        staticVariant: 'emphasis',
        content:
          '🔐 LICENCIAS Y SERVICIOS (Opcional)\n\nPuedes seleccionar manualmente las licencias o dejar que el sistema haga una recomendación automática.',
      },
      {
        id: 'supportLevel',
        label:
          '🛠️ 8. Nivel de soporte\nSelecciona el nivel de soporte deseado.\n\n💡 Nota: FortiCare Premium es el soporte mínimo requerido para cualquier implementación.',
        type: 'select',
        required: true,
        options: optionsFromValueList(FORTIMANAGER_RANGES.supportLevel),
      },
      {
        id: 'wantsAdditionalLicenses',
        label:
          'Para mostrar la lista de servicios adicionales del punto 9, indica si deseas valorarlos en la cotización:',
        type: 'select',
        required: true,
        options: optionsFromValueList(FORTIMANAGER_RANGES.wantsAdditionalLicenses),
      },
      {
        id: 'fortimanager_addons_header',
        type: 'static',
        required: false,
        staticVariant: 'emphasis',
        showWhen: { field: 'wantsAdditionalLicenses', values: [1] },
        content:
          '🔧 9. Servicios adicionales\n\nPuedes seleccionar uno o varios según tus necesidades:\n• Gestión avanzada (IA generativa)\n• Continuidad del servicio (opciones RMA / ingeniero en sitio / Secure RMA)\n• Upgrade de soporte Premium → Elite',
      },
      {
        id: 'addOns',
        label: 'Marca los servicios que quieras incluir (solo si elegiste «Sí» arriba):',
        type: 'checkboxes',
        required: false,
        minSelected: 0,
        showWhen: { field: 'wantsAdditionalLicenses', values: [1] },
        options: optionsFromValueList(FORTIMANAGER_RANGES.addOns),
      },
    ],
  },
  6: {
    name: 'FortiSwitch',
    description: 'Dimensionamiento de switches gestionados FortiSwitch',
    fields: [
      {
        id: 'fortiswitch_intro',
        type: 'static',
        required: false,
        content:
          'Responde las preguntas para recomendar el modelo mínimo que cumpla según `fortiswitch_specs` (datos del datasheet cargado).',
      },
      {
        id: 'ports',
        label:
          '🔌 1. Cantidad de puertos *(Obligatorio)*\n¿Cuántos puertos de acceso necesitas?',
        type: 'select',
        required: true,
        options: optionsFromValueList(FORTISWITCH_RANGES.ports),
      },
      {
        id: 'speed',
        label:
          '⚡ 2. Velocidad de acceso *(Obligatorio)*\n¿Qué tipo de puertos necesitas?',
        type: 'select',
        required: true,
        options: optionsFromValueList(FORTISWITCH_RANGES.speed),
      },
      {
        id: 'uplinks',
        label:
          '🚀 3. Uplinks *(Obligatorio)*\n¿Qué tipo de uplinks necesitas?',
        type: 'select',
        required: true,
        options: optionsFromValueList(FORTISWITCH_RANGES.uplinks),
      },
      {
        id: 'poe',
        label:
          '🔋 4. Necesidad de PoE *(Obligatorio)*\n¿Vas a alimentar dispositivos (APs, cámaras, teléfonos)?',
        type: 'select',
        required: true,
        options: optionsFromValueList(FORTISWITCH_RANGES.poe),
      },
      {
        id: 'switching',
        label:
          '📊 5. Capacidad de switching *(Obligatorio)*\n¿Qué nivel de tráfico manejará la red?',
        type: 'select',
        required: true,
        options: optionsFromValueList(FORTISWITCH_RANGES.switching),
      },
      {
        id: 'pps',
        label:
          '⚡ 6. Rendimiento (Mpps)\n¿Qué banco de paquetes por segundo esperas?',
        type: 'select',
        required: true,
        options: optionsFromValueList(FORTISWITCH_RANGES.pps),
      },
      {
        id: 'redundancy',
        label:
          '🔄 7. Redundancia *(Obligatorio)*\n¿Qué nivel de disponibilidad necesitas?',
        type: 'select',
        required: true,
        options: optionsFromValueList(FORTISWITCH_RANGES.redundancy),
      },
      {
        id: 'formFactor',
        label:
          '📦 8. Formato *(Obligatorio)*\n¿Cómo se instalará el equipo?',
        type: 'select',
        required: true,
        options: optionsFromValueList(FORTISWITCH_RANGES.formFactor),
      },
      {
        id: 'scalability',
        label:
          '🧠 9. Escalabilidad\n¿Qué tamaño tendrá la red? (Amplía requisitos calculados)',
        type: 'select',
        required: true,
        options: optionsFromValueList(FORTISWITCH_RANGES.scalability),
      },
      {
        id: 'fortiswitch_lic_header',
        type: 'static',
        required: false,
        staticVariant: 'emphasis',
        content:
          '🔐 LICENCIAS *(Opcional)*\n\nSoporte FortiCare y servicios comerciales. Las SKUs salen de `solution_offers` cuando existan.',
      },
      {
        id: 'supportLevel',
        label:
          '🛠️ 10. Soporte\nSi eliges automático, se aplicará Elite en escenarios de alta carga o fuente dual.',
        type: 'select',
        required: true,
        options: optionsFromValueList(FORTISWITCH_RANGES.supportLevel),
      },
      {
        id: 'cloudManagement',
        label: '☁️ 11. Gestión',
        type: 'select',
        required: true,
        options: optionsFromValueList(FORTISWITCH_RANGES.cloudManagement),
      },
      {
        id: 'fortiswitch_addons_header',
        type: 'static',
        required: false,
        staticVariant: 'emphasis',
        content: '🔧 12. Servicios adicionales (marca los que apliquen)',
      },
      {
        id: 'addOns',
        label: 'Opcionales — no afectan el modelo elegido; se listan con SKU si hay coincidencia en catálogo.',
        type: 'checkboxes',
        required: false,
        minSelected: 0,
        options: optionsFromValueList(FORTISWITCH_RANGES.addOns),
      },
    ],
  },
  7: { name: 'FortiAP', description: 'Wireless / Access Points', fields: [] },
  8: { name: 'FortiMail', description: 'Seguridad de correo', fields: [] },
  9: { name: 'FortiWeb', description: 'WAF / aplicaciones web', fields: [] },
};

export function getSizingSchema(solutionType) {
  const t = Number(solutionType);
  if (!Number.isInteger(t) || t < 1 || t > 9) return null;
  return SIZING_SCHEMAS[t] || null;
}
