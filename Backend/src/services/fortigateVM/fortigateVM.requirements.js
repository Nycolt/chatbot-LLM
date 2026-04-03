/**
 * Requisitos y puntuación de dimensionamiento FortiGate VM (sin I/O).
 */

export const VM_TIER_ORDER = ['VM-01S', 'VM-02S', 'VM-04S', 'VM-08S', 'VM-16S', 'VM-32S', 'VM-ULS'];

/** @typedef {{ id: string, label?: string }} FormOption */

/**
 * Umbrales de score → índice de tier (0 = VM-01S … 6 = VM-ULS)
 */
export function tierIndexFromCapacityScore(score) {
  const s = Number(score);
  if (!Number.isFinite(s)) return 0;
  if (s <= 6) return 0;
  if (s <= 10) return 1;
  if (s <= 14) return 2;
  if (s <= 18) return 3;
  if (s <= 22) return 4;
  if (s <= 26) return 5;
  return 6;
}

function ptsCapacity(opt) {
  const id = opt?.id;
  const m = { cap_1: 1, cap_2: 2, cap_3: 3, cap_4: 4, cap_5: 5 };
  return m[id] ?? 1;
}

function ptsEndpoints(opt) {
  const id = opt?.id;
  const m = { ep_2000: 1, ep_8000: 2, ep_20000: 3, ep_over_20k: 4 };
  return m[id] ?? 1;
}

function ptsVpn(opt) {
  const id = opt?.id;
  const m = { none: 1, low: 2, medium: 3, high: 4, very_high: 5 };
  return m[id] ?? 1;
}

function ptsSsl(opt) {
  const id = opt?.id;
  const m = { none: 1, partial: 2, full: 3 };
  return m[id] ?? 1;
}

function ptsGrowth(opt) {
  const id = opt?.id;
  const m = { none: 1, medium: 2, high: 3, unpredictable: 4 };
  return m[id] ?? 1;
}

/**
 * Requerimientos numéricos para validar contra `fortigate_vm_specs`
 */
export function extractStructuralNeeds(answers = {}) {
  const vdomId = answers.vdoms?.id;
  const vdomMap = {
    vdom_0: 0,
    vdom_10: 10,
    vdom_25: 25,
    vdom_50: 50,
    vdom_over_50: 51,
  };
  const epId = answers.endpoints?.id;
  const epMap = {
    ep_2000: 2000,
    ep_8000: 8000,
    ep_20000: 20000,
    ep_over_20k: 50000,
  };
  const apId = answers.fortiap?.id;
  const apMap = {
    ap_0: 0,
    ap_64: 64,
    ap_512: 512,
    ap_1024: 1024,
    ap_over_1024: 2048,
  };
  const swId = answers.fortiswitch?.id;
  const swMap = {
    sw_0: 0,
    sw_24: 24,
    sw_64: 64,
    sw_300: 300,
    sw_over_300: 500,
  };

  return {
    requiredEndpoints: epMap[epId] ?? 2000,
    requiredVdoms: vdomMap[vdomId] ?? 0,
    requiredFortiap: apMap[apId] ?? 0,
    requiredFortiswitch: swMap[swId] ?? 0,
  };
}

/**
 * capacityScore = capacidad + endpoints + vpn + ssl + crecimiento
 * + reglas: ssl full +2; vpn high/very_high +2; crecimiento high +2
 *
 * @param {object} answers - snapshot del formulario (objetos opción con `id`)
 * @returns {object}
 */
export function computeFortigateVMRequirements(answers = {}) {
  const capacityPts = ptsCapacity(answers.capacity);
  const endpointsPts = ptsEndpoints(answers.endpoints);
  const vpnPts = ptsVpn(answers.vpnUsage);
  const sslPts = ptsSsl(answers.sslInspection);
  const growthPts = ptsGrowth(answers.growth);

  let capacityScore = capacityPts + endpointsPts + vpnPts + sslPts + growthPts;
  const rulesApplied = [];

  if (answers.sslInspection?.id === 'full') {
    capacityScore += 2;
    rulesApplied.push('Inspección SSL completa (+2)');
  }
  if (answers.vpnUsage?.id === 'high' || answers.vpnUsage?.id === 'very_high') {
    capacityScore += 2;
    rulesApplied.push('VPN alta o muy alta (+2)');
  }
  if (answers.growth?.id === 'high') {
    capacityScore += 2;
    rulesApplied.push('Crecimiento alto (+2)');
  }

  const initialTierIndex = tierIndexFromCapacityScore(capacityScore);
  const structural = extractStructuralNeeds(answers);

  return {
    capacityScore,
    breakdown: {
      capacity: capacityPts,
      endpoints: endpointsPts,
      vpn: vpnPts,
      ssl: sslPts,
      growth: growthPts,
    },
    rulesApplied,
    initialTierIndex,
    initialVmUnit: VM_TIER_ORDER[initialTierIndex],
    ...structural,
    answersSnapshot: answers,
  };
}
