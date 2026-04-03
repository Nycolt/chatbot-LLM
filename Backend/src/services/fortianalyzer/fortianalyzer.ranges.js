/**
 * Opciones del formulario FortiAnalyzer (índices 1-based en UI).
 * Licencias: textos cortos; la descripción larga va en ayuda del front si hace falta.
 */

export const FORTIANALYZER_LOGS_VOLUME = [
  { value: 1, label: 'Hasta 25 GB/día' },
  { value: 2, label: 'Hasta 100 GB/día' },
  { value: 3, label: 'Hasta 200 GB/día' },
  { value: 4, label: 'Hasta 660 GB/día' },
  { value: 5, label: 'Hasta 3 TB/día' },
  { value: 6, label: 'Más de 3 TB/día' },
];

export const FORTIANALYZER_ANALYTICS_LEVEL = [
  { value: 1, label: 'Solo almacenamiento de logs' },
  { value: 2, label: 'Reportes básicos' },
  { value: 3, label: 'Análisis avanzado (eventos, correlación)' },
  { value: 4, label: 'Análisis en tiempo real / SOC' },
];

export const FORTIANALYZER_DEVICES = [
  { value: 1, label: '1 – 5 dispositivos' },
  { value: 2, label: '6 – 20 dispositivos' },
  { value: 3, label: '21 – 50 dispositivos' },
  { value: 4, label: '51 – 100 dispositivos' },
  { value: 5, label: 'Más de 100 dispositivos' },
];

export const FORTIANALYZER_RETENTION = [
  { value: 1, label: '30 días' },
  { value: 2, label: '90 días' },
  { value: 3, label: '6 meses' },
  { value: 4, label: '1 año' },
  { value: 5, label: 'Más de 1 año' },
];

export const FORTIANALYZER_GROWTH = [
  { value: 1, label: 'No crecerá' },
  { value: 2, label: 'Crecimiento moderado' },
  { value: 3, label: 'Crecimiento alto' },
  { value: 4, label: 'Crecimiento impredecible' },
];

export const FORTIANALYZER_DEPLOYMENT = [
  { value: 1, label: 'Appliance físico (FAZ-150G, 300G, 1000G, …)' },
  { value: 2, label: 'Máquina virtual (FAZ-VM-GB*)' },
  { value: 3, label: 'Sin preferencia (appliance o VM)' },
];

export const FORTIANALYZER_PERFORMANCE = [
  { value: 1, label: 'No crítico' },
  { value: 2, label: 'Moderado' },
  { value: 3, label: 'Alto (respuesta rápida)' },
  { value: 4, label: 'Muy alto (SOC / tiempo real)' },
];

export const FORTIANALYZER_STORAGE_TYPE = [
  { value: 1, label: 'Almacenamiento estándar' },
  { value: 2, label: 'Alto almacenamiento (muchos históricos)' },
  { value: 3, label: 'Alto rendimiento (NVMe / SSD)' },
];

export const FORTIANALYZER_LICENSE_OPTIONS = [
  {
    value: 1,
    label: 'FortiCare Premium — 24x7, parches, RMA estándar',
    hint: 'Soporte 24x7, actualizaciones y RMA estándar.',
  },
  {
    value: 2,
    label: 'FortiCare Elite — prioridad y respuesta más rápida',
    hint: 'Todo Premium + cola prioritaria ante incidentes críticos.',
  },
  {
    value: 3,
    label: 'Upgrade Premium → Elite',
    hint: 'Mejora un FortiCare Premium ya contratado.',
  },
  {
    value: 4,
    label: 'RMA siguiente día hábil',
    hint: 'Repuesto al día hábil siguiente.',
  },
  {
    value: 5,
    label: 'RMA 4 horas',
    hint: 'Entrega de repuesto en ~4 h.',
  },
  {
    value: 6,
    label: 'RMA 4 h + ingeniero en sitio',
    hint: 'Repuesto 4 h con técnico presencial.',
  },
  {
    value: 7,
    label: 'Secure RMA',
    hint: 'Datos protegidos; no se devuelve el disco original.',
  },
  {
    value: 8,
    label: 'Gestión inteligente (IA)',
    hint: 'IA / automatización para monitoreo y operación.',
  },
  {
    value: 9,
    label: 'Recomendación automática',
    hint: 'El motor elige según rendimiento y nivel de análisis.',
  },
];

export const FORTIANALYZER_RANGES = {
  logsVolume: FORTIANALYZER_LOGS_VOLUME,
  analyticsLevel: FORTIANALYZER_ANALYTICS_LEVEL,
  devices: FORTIANALYZER_DEVICES,
  retention: FORTIANALYZER_RETENTION,
  growth: FORTIANALYZER_GROWTH,
  deployment: FORTIANALYZER_DEPLOYMENT,
  performance: FORTIANALYZER_PERFORMANCE,
  storageType: FORTIANALYZER_STORAGE_TYPE,
  licenseOption: FORTIANALYZER_LICENSE_OPTIONS,
};
