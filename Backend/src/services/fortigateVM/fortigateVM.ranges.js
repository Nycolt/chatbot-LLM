/**
 * Formulario FortiGate VM — textos orientados a negocio / preventa.
 */

export const FORTIGATE_VM_RANGES = {
  deployType: [
    { id: 'vmware', label: 'VMware o entorno virtual privado' },
    { id: 'hyperv_kvm_nutanix', label: 'Hyper-V, KVM o Nutanix' },
    { id: 'aws', label: 'AWS' },
    { id: 'azure', label: 'Microsoft Azure' },
    { id: 'gcp_oci_alibaba', label: 'Google Cloud, OCI o Alibaba' },
  ],
  capacity: [
    { id: 'cap_1', label: 'Muy baja (laboratorio o menos de 50 usuarios)' },
    { id: 'cap_2', label: 'Baja (empresa pequeña)' },
    { id: 'cap_3', label: 'Media (empresa mediana)' },
    { id: 'cap_4', label: 'Alta (empresa grande)' },
    { id: 'cap_5', label: 'Muy alta (data center o múltiples sedes)' },
  ],
  endpoints: [
    { id: 'ep_2000', label: 'Hasta 2.000' },
    { id: 'ep_8000', label: 'Hasta 8.000' },
    { id: 'ep_20000', label: 'Hasta 20.000' },
    { id: 'ep_over_20k', label: 'Más de 20.000' },
  ],
  vdoms: [
    { id: 'vdom_0', label: 'No, no necesito segmentación' },
    { id: 'vdom_10', label: 'Sí, pocas segmentaciones (hasta 10)' },
    { id: 'vdom_25', label: 'Sí, varias segmentaciones (hasta 25)' },
    { id: 'vdom_50', label: 'Sí, muchas segmentaciones (hasta 50)' },
    { id: 'vdom_over_50', label: 'Sí, segmentación avanzada (más de 50 / multi-tenant)' },
  ],
  fortiap: [
    { id: 'ap_0', label: 'No' },
    { id: 'ap_64', label: 'Sí, pocos APs (hasta 64)' },
    { id: 'ap_512', label: 'Sí, cantidad media (hasta 512)' },
    { id: 'ap_1024', label: 'Sí, gran cantidad (hasta 1.024)' },
    { id: 'ap_over_1024', label: 'Sí, despliegue masivo (más de 1.024)' },
  ],
  fortiswitch: [
    { id: 'sw_0', label: 'No' },
    { id: 'sw_24', label: 'Sí, pocos switches (hasta 24)' },
    { id: 'sw_64', label: 'Sí, cantidad media (hasta 64)' },
    { id: 'sw_300', label: 'Sí, gran cantidad (hasta 300)' },
    { id: 'sw_over_300', label: 'Sí, despliegue masivo (más de 300)' },
  ],
  /** Orden: UTP → ATP → Enterprise (opción 1, 2, 3 en formulario) */
  securityProfile: [
    {
      id: 'utp',
      label: 'UTP: Protección básica (antivirus, filtrado web, control de aplicaciones)',
    },
    {
      id: 'atp',
      label: 'ATP: Protección avanzada (sandboxing, amenazas desconocidas)',
    },
    {
      id: 'enterprise',
      label: 'Enterprise: Protección completa con máximo nivel de control y visibilidad',
    },
  ],
  sslInspection: [
    { id: 'none', label: 'No necesito inspección' },
    { id: 'partial', label: 'Inspección parcial (tráfico selectivo)' },
    { id: 'full', label: 'Inspección completa (alto volumen de tráfico cifrado)' },
  ],
  vpnUsage: [
    { id: 'none', label: 'No usaré VPN' },
    { id: 'low', label: 'Uso bajo' },
    { id: 'medium', label: 'Uso medio' },
    { id: 'high', label: 'Uso alto' },
    { id: 'very_high', label: 'Uso muy alto (muchos usuarios o sedes)' },
  ],
  growth: [
    { id: 'none', label: 'No crecerá' },
    { id: 'medium', label: 'Crecimiento moderado' },
    { id: 'high', label: 'Crecimiento alto' },
    { id: 'unpredictable', label: 'Crecimiento impredecible o agresivo' },
  ],
  /** Si responde «Sí», se muestran los add-ons concretos */
  wantsAdditionalServices: [
    { id: 'yes', label: 'Sí, deseo valorar servicios adicionales' },
    { id: 'no', label: 'No necesito servicios adicionales' },
  ],
  addons: [
    { id: 'protection', label: 'Mayor protección frente a amenazas avanzadas' },
    { id: 'visibility', label: 'Mayor visibilidad y monitoreo (logs, análisis de tráfico)' },
    { id: 'support', label: 'Soporte técnico avanzado y continuidad del servicio' },
    { id: 'management', label: 'Administración centralizada de múltiples dispositivos' },
    { id: 'access', label: 'Acceso seguro para usuarios (VPN, Zero Trust, SASE)' },
    { id: 'dlp', label: 'Protección de datos (DLP)' },
    { id: 'ot', label: 'Seguridad para entornos industriales (OT/IoT)' },
  ],
};

export {
  listOptions,
  pickOptionByNumber,
  pickMultiOptionByNumbers,
} from '../fortigate/fortigate.ranges.js';
