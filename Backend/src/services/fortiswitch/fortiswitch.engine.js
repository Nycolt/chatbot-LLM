/**
 * Motor de dimensionamiento FortiSwitch — preventa flexible: hard = puertos + throughput; resto = scoring.
 */

export const SUPPORT_AUTO = 1;
export const SUPPORT_PREMIUM = 2;
export const SUPPORT_ELITE = 3;

const PORTS_MAP = { 1: 8, 2: 24, 3: 48, 4: 96 };
const SPEED_MAP = { 1: 1, 2: 2.5, 3: 10, 4: 25 };
const UPLINK_MAP = { 1: 1, 2: 10, 3: 40, 4: 100 };
const POE_MAP = { 1: 0, 2: 65, 3: 370, 4: 740 };
const SWITCHING_MAP = { 1: 50, 2: 130, 3: 1000, 4: 4000 };
const PPS_MAP = { 1: 100, 2: 200, 3: 2000, 4: 4000 };
const SCALABILITY_MAP = { 1: 1, 2: 1.3, 3: 1.6, 4: 2 };

/**
 * Solo puertos de acceso (no sumar uplinks SFP/QSFP del bloque siguiente).
 * @param {string|number|null|undefined} str
 */
export function parseAccessPorts(str) {
  if (str == null || str === '') return 0;
  const s = String(str).trim();
  if (/^(?:—|-|n\/a|na)$/i.test(s)) return 0;

  let m = s.match(/(\d+)\s*[x×]\s*(?:GE|2\.5G|5G|10G|multigig|m[Gg]ig|RJ45)\b/i);
  if (m) return parseInt(m[1], 10);

  const head = s.split(/\s*\+\s*/)[0] || s;
  if (!/SFP|QSFP/i.test(head)) {
    m = head.match(/^(\d+)\s*[x×]/i);
    if (m) return parseInt(m[1], 10);
  }

  m = s.match(/(\d+)\s*[x×]\s*(GE|2\.5G|5G|10G|RJ45)/i);
  return m ? parseInt(m[1], 10) : 0;
}

/**
 * @param {string|number|null|undefined} str
 */
export function parseThroughput(str) {
  if (str == null || str === '') return 0;
  const s = String(str).trim();
  if (/^(?:—|-|n\/a|na)$/i.test(s)) return 0;
  if (/tbps/i.test(s)) {
    const n = parseFloat(s.replace(/[^\d.,]/g, '').replace(',', '.'));
    return Number.isFinite(n) ? n * 1000 : 0;
  }
  const n = parseFloat(s.replace(/[^\d.,]/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

/**
 * @param {string|number|null|undefined} str
 */
export function parsePPS(str) {
  if (str == null || str === '') return 0;
  const s = String(str).trim();
  if (/^(?:—|-|n\/a|na)$/i.test(s)) return 0;
  const n = parseFloat(s.replace(/[^\d.,]/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

/**
 * @param {string|number|null|undefined} str
 */
export function parsePoE(str) {
  if (str == null || str === '') return 0;
  const s = String(str).trim();
  if (/^(?:—|-|n\/a|na|no|none)$/i.test(s)) return 0;
  const n = parseFloat(s.replace(/[^\d.,]/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

/**
 * Mayor velocidad en Gbps; complementa con SFP+/QSFP cuando no hay "NG".
 * @param {string|number|null|undefined} str
 */
export function parseUplink(str) {
  if (str == null || str === '') return 0;
  const s = String(str);
  const matches = s.match(/(\d+)\s*G(?:bps)?/gi);
  const nums = matches
    ? matches.map((x) => parseInt(String(x).replace(/[^\d]/g, ''), 10)).filter(Number.isFinite)
    : [];
  let maxG = nums.length ? Math.max(...nums) : 0;
  const u = s.toUpperCase();
  if (/\bQSFP-DD\b|\b400G\b/.test(u)) maxG = Math.max(maxG, 400);
  if (/\bQSFP28\b|\b100G\b/.test(u)) maxG = Math.max(maxG, 100);
  if (/\bQSFP\+\b|\b40G\b/.test(u)) maxG = Math.max(maxG, 40);
  if (/\bSFP28\b|\b25G\b/.test(u)) maxG = Math.max(maxG, 25);
  if (/\bSFP\+/i.test(s) && !/QSFP/i.test(s)) maxG = Math.max(maxG, 10);
  if (/\bRJ45\b.*\b10\b|\b10G-T\b|\b10GBASE-T\b/i.test(s)) maxG = Math.max(maxG, 10);
  return maxG;
}

export function capCampusPpsRequirement(rawPps, requiredThroughputGbps, ppsTier, switchingTier) {
  const pt = Number(ppsTier);
  const st = Number(switchingTier);
  if (pt > 2 || st > 2) return rawPps;
  if (!requiredThroughputGbps || requiredThroughputGbps <= 0) return rawPps;
  const correlated = Math.max(95, requiredThroughputGbps * 1.08);
  return Math.min(rawPps, correlated);
}

export class FortiSwitchEngine {
  /**
   * @param {Array<Record<string, unknown>>} specRows — filas Sequelize plain (snake_case)
   */
  constructor(specRows) {
    this.specRows = Array.isArray(specRows) ? specRows : [];
  }

  static parseAccessPorts = parseAccessPorts;
  static parseThroughput = parseThroughput;
  static parsePPS = parsePPS;
  static parsePoE = parsePoE;
  static parseUplink = parseUplink;

  /** @deprecated usar parseAccessPorts */
  static parsePorts(raw) {
    const n = parseAccessPorts(raw);
    return n > 0 ? n : null;
  }

  normalizeInputs(answers) {
    const n = (k) => {
      const v = answers[k];
      const x = Number(v);
      return Number.isFinite(x) ? x : null;
    };

    return {
      ports: n('ports'),
      speed: n('speed'),
      uplinks: n('uplinks'),
      poe: n('poe'),
      switching: n('switching'),
      pps: n('pps'),
      redundancy: n('redundancy'),
      formFactor: n('formFactor'),
      scalability: n('scalability'),
      supportLevel: n('supportLevel'),
      cloudManagement: n('cloudManagement'),
      addOns: Array.isArray(answers.addOns)
        ? answers.addOns.map(Number).filter(Number.isFinite)
        : [],
    };
  }

  calculateRequirements(norm) {
    const portsBase = PORTS_MAP[norm.ports] ?? 0;
    const scale = SCALABILITY_MAP[norm.scalability] ?? 1;
    const switchingBase = SWITCHING_MAP[norm.switching] ?? 0;
    const ppsBase = PPS_MAP[norm.pps] ?? 0;
    const requiredThroughput = switchingBase * scale;
    const rawPps = ppsBase * scale;
    const requiredPPS = capCampusPpsRequirement(rawPps, requiredThroughput, norm.pps, norm.switching);

    return {
      requiredPorts: Math.ceil(portsBase * scale),
      requiredThroughput,
      requiredPPS,
      requiredPPSRaw: rawPps,
      requiredPoE: POE_MAP[norm.poe] ?? 0,
      requiredUplinkGbps: UPLINK_MAP[norm.uplinks] ?? 0,
      requiredAccessGbps: SPEED_MAP[norm.speed] ?? 1,
      redundancy: norm.redundancy,
      formFactor: norm.formFactor,
      scalabilityMultiplier: scale,
    };
  }

  /**
   * Hard: solo puertos de acceso y throughput.
   */
  hardPass(row, req) {
    const unit = String(row.unit || '').trim();
    if (!unit) return false;
    const ports = parseAccessPorts(row.total_network_interfaces);
    const throughput = parseThroughput(row.switching_capacity);
    if (ports < req.requiredPorts) return false;
    if (throughput < req.requiredThroughput) return false;
    return true;
  }

  /**
   * Soft: PPS, PoE, uplink (1 punto cada uno si cumple o no aplica).
   */
  scoreModel(row, req) {
    let score = 0;
    const pps = parsePPS(row.pps_64_bytes);
    const poe = parsePoE(row.poe_power_budget);
    const u1 = parseUplink(row.uplink);
    const u2 = parseUplink(row.total_network_interfaces);
    const uplink = Math.max(u1, u2);

    if (pps >= req.requiredPPS) score += 1;
    if (req.requiredPoE <= 0 || poe >= req.requiredPoE) score += 1;
    if (req.requiredUplinkGbps <= 0 || uplink >= req.requiredUplinkGbps) score += 1;

    return score;
  }

  /**
   * Penalización para fallback (menor = más cercano a cumplir hard).
   */
  hardDeficit(row, req) {
    const ports = parseAccessPorts(row.total_network_interfaces);
    const throughput = parseThroughput(row.switching_capacity);
    const dp = Math.max(0, req.requiredPorts - ports);
    const dt = Math.max(0, req.requiredThroughput - throughput);
    return dp * 100000 + dt;
  }

  /**
   * Siempre devuelve una fila si hay datos en catálogo; si nadie cumple hard, el más cercano.
   */
  selectBestModel(req, norm) {
    const rows = this.specRows.filter((r) => String(r.unit || '').trim());
    if (!rows.length) return null;

    let candidates = rows.filter((r) => this.hardPass(r, req));
    let usedFallback = false;

    if (!candidates.length) {
      usedFallback = true;
      candidates = [...rows].sort((a, b) => {
        const da = this.hardDeficit(a, req);
        const db = this.hardDeficit(b, req);
        if (da !== db) return da - db;
        return parseThroughput(a.switching_capacity) - parseThroughput(b.switching_capacity);
      });
    } else {
      candidates.sort((a, b) => {
        const ta = parseThroughput(a.switching_capacity);
        const tb = parseThroughput(b.switching_capacity);
        if (ta !== tb) return ta - tb;
        const sa = this.scoreModel(a, req);
        const sb = this.scoreModel(b, req);
        if (sb !== sa) return sb - sa;
        return parseAccessPorts(a.total_network_interfaces) - parseAccessPorts(b.total_network_interfaces);
      });
    }

    let idx = 0;
    if (!usedFallback && (norm.scalability === 3 || norm.scalability === 4) && candidates.length > 1) {
      idx = 1;
    }

    const best = candidates[idx] || candidates[0];
    if (best) {
      if (usedFallback) best.__fortiswitch_fallback_closest = true;
      else delete best.__fortiswitch_fallback_closest;
    }
    return best;
  }

  selectSupport(norm) {
    const sl = Number(norm.supportLevel);
    if (sl === SUPPORT_PREMIUM) return { type: 'FortiCare Premium' };
    if (sl === SUPPORT_ELITE) return { type: 'FortiCare Elite' };

    const sw = Number(norm.switching);
    const pp = Number(norm.pps);
    const red = Number(norm.redundancy);
    if (sw >= 3 || pp >= 3 || red === 3) {
      return { type: 'FortiCare Elite' };
    }
    return { type: 'FortiCare Premium' };
  }

  buildResult(selected, norm, req, addOnLabels, catalog = {}) {
    const cloud = Number(norm.cloudManagement) === 2;

    const model = selected
      ? {
          UNIT: String(selected.unit || '').trim(),
          interfaces: selected.total_network_interfaces ?? null,
          throughput: selected.switching_capacity ?? null,
          poe: selected.poe_power_budget ?? null,
          poe_ports: selected.poe_ports ?? null,
          uplink: selected.uplink ?? null,
          power_supply: selected.power_supply ?? null,
        }
      : null;

    return {
      model,
      support: this.selectSupport(norm),
      cloud,
      cloudLine: cloud ? 'FortiSwitch Cloud Management License' : null,
      addOns: addOnLabels,
      mandatoryLicense: {
        description: 'FortiCare (soporte) — mínimo según política Fortinet',
        sku: catalog.mandatoryLicenseSku ?? null,
      },
      optionalLicenses: [
        ...(cloud
          ? [{ description: 'FortiSwitch Cloud Management License', sku: catalog.cloudLicenseSku ?? null }]
          : []),
        ...(addOnLabels || []).map((label) => ({
          description: label,
          sku: catalog.addonSkus?.[label] ?? null,
        })),
      ],
      hardwareSku: catalog.hardwareSku ?? null,
      reasoning: {
        requiredPorts: req.requiredPorts,
        requiredThroughput: req.requiredThroughput,
        requiredPPS: req.requiredPPS,
        requiredPPSRaw: req.requiredPPSRaw ?? req.requiredPPS,
        requiredPoE: req.requiredPoE,
        requiredUplinkGbps: req.requiredUplinkGbps,
      },
    };
  }
}
