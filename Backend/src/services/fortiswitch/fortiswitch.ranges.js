/**
 * Opciones del formulario FortiSwitch (values 1-based, alineados con el motor).
 */

/** @type {Array<{ value: number, label: string }>} */
export const FORTISWITCH_PORTS = [
  { value: 1, label: '1️⃣ Hasta 8 puertos' },
  { value: 2, label: '2️⃣ Hasta 24 puertos' },
  { value: 3, label: '3️⃣ Hasta 48 puertos' },
  { value: 4, label: '4️⃣ Más de 48 / distribución-core' },
];

export const FORTISWITCH_SPEED = [
  { value: 1, label: '1️⃣ 1G (RJ45 / SFP)' },
  { value: 2, label: '2️⃣ 2.5G / 5G' },
  { value: 3, label: '3️⃣ 10G' },
  { value: 4, label: '4️⃣ 25G / 100G' },
];

export const FORTISWITCH_UPLINKS = [
  { value: 1, label: '1️⃣ 1G' },
  { value: 2, label: '2️⃣ 10G' },
  { value: 3, label: '3️⃣ 40G' },
  { value: 4, label: '4️⃣ 100G' },
];

export const FORTISWITCH_POE = [
  { value: 1, label: '1️⃣ No' },
  { value: 2, label: '2️⃣ Sí, baja densidad (hasta ~65W)' },
  { value: 3, label: '3️⃣ Sí, media (hasta ~370W)' },
  { value: 4, label: '4️⃣ Sí, alta (hasta ~740W o más)' },
];

export const FORTISWITCH_SWITCHING = [
  { value: 1, label: '1️⃣ Bajo (hasta ~50 Gbps)' },
  { value: 2, label: '2️⃣ Medio (hasta ~200 Gbps)' },
  { value: 3, label: '3️⃣ Alto (hasta ~1000 Gbps)' },
  { value: 4, label: '4️⃣ Muy alto (>1000 Gbps / core)' },
];

export const FORTISWITCH_PPS = [
  { value: 1, label: '1️⃣ Bajo (<100 Mpps)' },
  { value: 2, label: '2️⃣ Medio (100–500 Mpps)' },
  { value: 3, label: '3️⃣ Alto (500–2000 Mpps)' },
  { value: 4, label: '4️⃣ Muy alto (>2000 Mpps)' },
];

export const FORTISWITCH_REDUNDANCY = [
  { value: 1, label: '1️⃣ Sin redundancia' },
  { value: 2, label: '2️⃣ Fuente simple' },
  { value: 3, label: '3️⃣ Fuente dual hot-swappable' },
];

export const FORTISWITCH_FORM_FACTOR = [
  { value: 1, label: '1️⃣ Desktop' },
  { value: 2, label: '2️⃣ Rack 1RU' },
  { value: 3, label: '3️⃣ Core / alta densidad' },
];

export const FORTISWITCH_SCALABILITY = [
  { value: 1, label: '1️⃣ Pequeña (hasta 8 switches / baja MAC)' },
  { value: 2, label: '2️⃣ Media (hasta 24 switches / VLANs estándar)' },
  { value: 3, label: '3️⃣ Grande (hasta 48 switches / muchas VLANs)' },
  { value: 4, label: '4️⃣ Core / datacenter (alta densidad)' },
];

export const FORTISWITCH_SUPPORT = [
  { value: 1, label: '1️⃣ No seleccionar (automático según criterios)' },
  { value: 2, label: '2️⃣ FortiCare Premium' },
  { value: 3, label: '3️⃣ FortiCare Elite' },
];

export const FORTISWITCH_CLOUD = [
  { value: 1, label: '1️⃣ Gestión local' },
  { value: 2, label: '2️⃣ FortiSwitch Cloud Management' },
];

export const FORTISWITCH_ADDONS = [
  { value: 1, label: 'Next Day RMA' },
  { value: 2, label: '4H Hardware RMA' },
  { value: 3, label: '4H Onsite Engineer' },
  { value: 4, label: 'Secure RMA' },
  { value: 5, label: 'Upgrade Premium → Elite' },
];

export const FORTISWITCH_RANGES = {
  ports: FORTISWITCH_PORTS,
  speed: FORTISWITCH_SPEED,
  uplinks: FORTISWITCH_UPLINKS,
  poe: FORTISWITCH_POE,
  switching: FORTISWITCH_SWITCHING,
  pps: FORTISWITCH_PPS,
  redundancy: FORTISWITCH_REDUNDANCY,
  formFactor: FORTISWITCH_FORM_FACTOR,
  scalability: FORTISWITCH_SCALABILITY,
  supportLevel: FORTISWITCH_SUPPORT,
  cloudManagement: FORTISWITCH_CLOUD,
  addOns: FORTISWITCH_ADDONS,
};
