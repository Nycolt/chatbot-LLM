/**
 * Opciones del formulario FortiManager (valores 1-based, alineados al motor de dimensionamiento).
 */

export const FORTIMANAGER_DEVICES_RANGE = [
  { value: 1, label: 'Hasta 30 dispositivos' },
  { value: 2, label: 'Hasta 150 dispositivos' },
  { value: 3, label: 'Hasta 1000 dispositivos' },
  { value: 4, label: 'Hasta 4000 dispositivos' },
  { value: 5, label: 'Hasta 10000 dispositivos' },
  { value: 6, label: 'Más de 10000 dispositivos' },
];

export const FORTIMANAGER_GROWTH = [
  { value: 1, label: 'No habrá crecimiento' },
  { value: 2, label: 'Crecimiento moderado (hasta el siguiente rango)' },
  { value: 3, label: 'Crecimiento alto (hasta el doble)' },
  { value: 4, label: 'Crecimiento impredecible o acelerado' },
];

export const FORTIMANAGER_LOGS_PER_DAY = [
  { value: 1, label: 'Hasta 2 GB por día' },
  { value: 2, label: 'Hasta 10 GB por día' },
  { value: 3, label: 'Más de 10 GB por día' },
  { value: 4, label: 'No lo sé' },
];

export const FORTIMANAGER_LOG_ACTIVITY = [
  { value: 1, label: 'Baja' },
  { value: 2, label: 'Media' },
  { value: 3, label: 'Alta' },
  { value: 4, label: 'Muy alta' },
];

export const FORTIMANAGER_STORAGE_NEED = [
  { value: 1, label: 'Bajo (hasta 4 TB)' },
  { value: 2, label: 'Medio (hasta 24 TB)' },
  { value: 3, label: 'Alto (hasta 56 TB)' },
  { value: 4, label: 'Muy alto (más de 200 TB)' },
];

export const FORTIMANAGER_VDOMS = [
  { value: 1, label: 'No' },
  { value: 2, label: 'Sí, pocos' },
  { value: 3, label: 'Sí, varios' },
  { value: 4, label: 'Sí, muchos (entorno multi-tenant)' },
];

export const FORTIMANAGER_OPERATION = [
  { value: 1, label: 'Gestión básica (configuración puntual)' },
  { value: 2, label: 'Cambios frecuentes en políticas y configuraciones' },
  { value: 3, label: 'Automatización y gestión centralizada' },
  { value: 4, label: 'Operación avanzada (multi-sitio o multi-cliente)' },
];

export const FORTIMANAGER_SUPPORT = [
  { value: 1, label: 'No seleccionar (recomendación automática)' },
  { value: 2, label: 'FortiCare Premium' },
  { value: 3, label: 'FortiCare Elite' },
];

/**
 * Igual que FortiGate VM / FortiWiFi: 1 = Sí (mostrar opciones), 2 = No (solo FortiCare mínimo en cotización).
 */
export const FORTIMANAGER_WANTS_ADDITIONAL_LICENSES = [
  {
    value: 1,
    label: 'Sí — quiero revisar y marcar servicios adicionales para la cotización',
  },
  {
    value: 2,
    label:
      'No — solo modelo recomendado y FortiCare mínimo obligatorio (sin extras en la propuesta)',
  },
];

/** Add-ons opcionales (IDs para array `addOns`). Redacción alineada al cuestionario de negocio. */
export const FORTIMANAGER_ADDON_OPTIONS = [
  {
    value: 1,
    label:
      'Gestión avanzada — Generative AI Management: automatización y asistencia inteligente para operación y monitoreo.',
  },
  {
    value: 2,
    label:
      'Continuidad (RMA) — Next Day RMA: reemplazo de hardware al siguiente día hábil.',
  },
  {
    value: 3,
    label:
      'Continuidad (RMA) — 4-Hour Hardware RMA: reemplazo de hardware en menos de 4 horas.',
  },
  {
    value: 4,
    label:
      'Continuidad (RMA) — 4-Hour Onsite Engineer: intervención con ingeniero en sitio.',
  },
  {
    value: 5,
    label:
      'Continuidad (RMA) — Secure RMA Service: manejo seguro de equipos y datos en procesos de reemplazo.',
  },
  {
    value: 6,
    label:
      'Upgrade de soporte — Premium → Elite: escalamiento a soporte de mayor nivel.',
  },
];

export const FORTIMANAGER_RANGES = {
  devicesRange: FORTIMANAGER_DEVICES_RANGE,
  growth: FORTIMANAGER_GROWTH,
  logsPerDay: FORTIMANAGER_LOGS_PER_DAY,
  logActivity: FORTIMANAGER_LOG_ACTIVITY,
  storageNeed: FORTIMANAGER_STORAGE_NEED,
  vdoms: FORTIMANAGER_VDOMS,
  operationLevel: FORTIMANAGER_OPERATION,
  supportLevel: FORTIMANAGER_SUPPORT,
  wantsAdditionalLicenses: FORTIMANAGER_WANTS_ADDITIONAL_LICENSES,
  addOns: FORTIMANAGER_ADDON_OPTIONS,
};
