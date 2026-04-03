export function parseThroughputToMbps(value) {
  if (!value) return null;

  const str = String(value).trim();
  if (!str) return null;

  const lower = str.toLowerCase();

  let globalMultiplier = 1;
  if (lower.includes('gbps') || lower.includes('gbit') || lower.includes('gb')) {
    globalMultiplier = 1000;
  } else if (lower.includes('mbps') || lower.includes('mbit') || lower.includes('mb')) {
    globalMultiplier = 1;
  }

  if (str.includes('/')) {
    const parts = str.split('/').map(s => s.trim()).filter(Boolean);

    const nums = parts
      .map(part => {
        const match = part.match(/(\d+(\.\d+)?)/);
        if (!match) return null;

        const num = Number(match[1]);
        if (!Number.isFinite(num)) return null;

        const partLower = part.toLowerCase();

        if (partLower.includes('gbps') || partLower.includes('gbit') || partLower.includes('gb')) {
          return num * 1000;
        }
        if (partLower.includes('mbps') || partLower.includes('mbit') || partLower.includes('mb')) {
          return num;
        }

        return num * globalMultiplier;
      })
      .filter(n => typeof n === 'number' && !Number.isNaN(n));

    if (nums.length) return Math.min(...nums);
    return null;
  }

  const numMatch = str.match(/(\d+(\.\d+)?)/);
  if (!numMatch) return null;

  const num = Number(numMatch[1]);
  if (!Number.isFinite(num)) return null;

  if (lower.includes('gbps') || lower.includes('gbit') || lower.includes('gb')) return num * 1000;
  if (lower.includes('mbps') || lower.includes('mbit') || lower.includes('mb')) return num;

  return num;
}

export function parseSessions(value) {
  if (value == null) return null;

  const s = String(value)
    .trim()
    .toLowerCase()
    .replace(/,/g, '')
    .replace(/\s+/g, '');

  const normalized = s
    .replace('million', 'm')
    .replace('millions', 'm');

  const m = normalized.match(/(\d+(\.\d+)?)([mk])?$/);
  if (!m) {
    const onlyDigits = normalized.replace(/[^\d]/g, '');
    if (!onlyDigits) return null;
    const n = Number(onlyDigits);
    return Number.isFinite(n) ? n : null;
  }

  let n = Number(m[1]);
  const suffix = m[3];

  if (suffix === 'k') n *= 1_000;
  if (suffix === 'm') n *= 1_000_000;

  return Math.round(n);
}

export function wanRequiredMbps(rangeObj) {
  if (!rangeObj) return null;
  return Number(rangeObj.max);
}

export function getProfileField(profileId) {
  const map = {
    firewall: 'Firewall_Throughput_UDP',
    ips: 'IPS_Throughput_Enterprise_Mix',
    ngfw: 'NGFW_Throughput_Enterprise_Mix',
    threat: 'Threat_Protection_Throughput',
  };
  return map[profileId] || 'NGFW_Throughput_Enterprise_Mix';
}

export function isUnknownAnswer(value) {
  if (!value) return false;

  if (typeof value === 'string') {
    return value.toLowerCase().includes('no lo sé');
  }

  if (typeof value === 'object') {
    return value.id === 'unknown' || String(value.label || '').toLowerCase().includes('no lo sé');
  }

  return false;
}

export function usersRangeToNumber(label) {
  if (!label) return 50;

  const str = String(label).trim();

  if (str.toLowerCase().includes('no lo sé')) return 50;

  if (str.startsWith('+')) {
    const min = Number(str.replace(/[^\d]/g, ''));
    return Number.isFinite(min) ? Math.round(min * 1.3) : 650;
  }

  const parts = str.split('–').map(v => Number(v));
  return parts[1] ?? parts[0] ?? 50;
}

export function getTrafficTypeFactor(answers) {
  const id = answers?.trafficType?.id;

  const map = {
    office: 1.00,
    saas: 1.15,
    streaming: 1.10,
    critical: 1.30,
    datacenter: 1.50,
    unknown: 1.15,
  };

  return map[id] ?? 1.15;
}

export function vpnUsersToNumber(answers) {
  const id = answers?.vpnUsers?.id;
  const vpn = answers?.vpn?.id;

  if (vpn === 'none') return 0;
  if (!id || id === 'unknown') return 25;
  if (id === '0') return 0;
  if (id === '250+') return 250;

  const parts = id.split('-').map(Number);
  return parts[1] ?? parts[0] ?? 25;
}

export function ipsecTunnelsToNumber(answers) {
  const id = answers?.ipsecTunnels?.id;
  const vpn = answers?.vpn?.id;

  if (vpn === 'none' || vpn === 'sslvpn') return 0;
  if (!id || id === 'unknown') return 10;
  if (id === '0') return 0;
  if (id === '100+') return 100;

  const parts = id.split('-').map(Number);
  return parts[1] ?? parts[0] ?? 10;
}

export function vdomsToNumber(answers) {
  const id = answers?.vdoms?.id;

  if (!id || id === 'unknown' || id === 'no') return 1;
  if (id === '10+') return 10;

  const parts = id.split('-').map(Number);
  return parts[1] ?? parts[0] ?? 1;
}

export function getSslInspectionFactor(answers) {
  const sslId = answers?.sslInspection?.id;
  const profile = answers?.securityProfile?.id;

  if (sslId === 'yes') return 1.15;
  if (sslId === 'no') return 1.00;
  if (profile === 'ngfw' || profile === 'threat') return 1.08;
  return 1.00;
}

export function hasUnknownInputs(answers) {
  return [
    answers?.users,
    answers?.trafficType,
    answers?.vpnUsers,
    answers?.ipsecTunnels,
    answers?.sslInspection,
    answers?.vdoms,
  ].some(isUnknownAnswer);
}

/** @param {object} answers - snapshot v2 (wan, users, securityLevel, …) */
export function hasUnknownSizingInputsV2(answers) {
  if (!answers) return false;
  const unk = (o) =>
    o &&
    (String(o.id || '').includes('unknown') ||
      String(o.label || '')
        .toLowerCase()
        .includes('no estoy seguro'));
  return [
    unk(answers.wan),
    unk(answers.users),
    unk(answers.securityLevel),
    unk(answers.trafficType),
    unk(answers.vpnType),
    unk(answers.vpn),
    unk(answers.sslVpnUsers),
    unk(answers.vpnUsers),
    unk(answers.ipsecTunnels),
    unk(answers.sslInspection),
    unk(answers.vdoms),
  ].some(Boolean);
}

export function getFactorsFromAnswers(answers) {
  const profileFactorMap = {
    firewall: 1.00,
    ips: 1.20,
    ngfw: 1.35,
    threat: 1.50,
  };

  const trafficTypeFactorMap = {
    office: 1.00,
    saas: 1.15,
    streaming: 1.10,
    critical: 1.30,
    datacenter: 1.50,
    unknown: 1.15,
  };

  const profileFactor = profileFactorMap[answers?.securityProfile?.id] ?? 1.00;
  const trafficTypeFactor = trafficTypeFactorMap[answers?.trafficType?.id] ?? 1.15;
  const growthFactor = 1.15;

  return {
    profileFactor,
    trafficTypeFactor,
    growthFactor,
  };
}

export function computeNeededMbps({ wanMbps, answers }) {
  const {
    profileFactor,
    trafficTypeFactor,
    growthFactor,
  } = getFactorsFromAnswers(answers);

  return Math.round(
    wanMbps *
    profileFactor *
    trafficTypeFactor *
    growthFactor
  );
}

export function getIpsecRequiredMbps(mainRequiredMbps, answers) {
  const vpn = answers?.vpn?.id;
  if (vpn === 'ipsec') return Math.round(mainRequiredMbps * 0.50);
  if (vpn === 'both') return Math.round(mainRequiredMbps * 0.45);
  return 0;
}

export function getSslVpnRequiredMbps(mainRequiredMbps, answers) {
  const vpn = answers?.vpn?.id;
  if (vpn === 'sslvpn') return Math.round(mainRequiredMbps * 0.50);
  if (vpn === 'both') return Math.round(mainRequiredMbps * 0.35);
  return 0;
}

export function getSslInspectionRequiredMbps(mainRequiredMbps, answers) {
  const sslId = answers?.sslInspection?.id;
  if (sslId === 'yes') return Math.round(mainRequiredMbps * 0.85);
  if (sslId === 'unknown') return Math.round(mainRequiredMbps * 0.70);
  return 0;
}

const GROWTH_FACTOR = 1.15;

/**
 * Índice de tipo VPN 1–5 (vpnType.optionIndex o legacy answers.vpn.id).
 * 1 sin VPN, 2 SSL, 3 IPsec, 4 ambos, 5 no seguro.
 */
export function deriveVpnTypeNumeric(answers) {
  if (answers?.vpnType?.optionIndex != null) {
    const n = Number(answers.vpnType.optionIndex);
    if (n >= 1 && n <= 5) return n;
  }
  const id = answers?.vpnType?.id ?? answers?.vpn?.id;
  const map = {
    none: 1,
    ssl_remote: 2,
    remote: 2,
    ipsec_s2s: 3,
    sitestosite: 3,
    both: 4,
    vpn_unknown: 5,
  };
  return map[id] ?? 1;
}

/**
 * Flags para motor VPN: SSL VPN vs IPsec separados (compatible con snapshot legacy `vpn`).
 */
export function deriveVpnSizingFlags(answers) {
  const vpnTypeNum = deriveVpnTypeNumeric(answers);
  const requiresSSLVPN = vpnTypeNum === 2 || vpnTypeNum === 4 || vpnTypeNum === 5;
  const requiresIPSec = vpnTypeNum === 3 || vpnTypeNum === 4 || vpnTypeNum === 5;
  const conservativeVpn = vpnTypeNum === 5;
  return { vpnTypeNum, requiresSSLVPN, requiresIPSec, conservativeVpn };
}

/**
 * Requisitos de throughput principal, inspección SSL y VPN (derivados de WAN/tráfico).
 * @param {object} answers - { wan, users, securityLevel, trafficType, sslInspection, vpnType, vpn, … }
 */
export function computeSizingRequirementsV2(answers) {
  const wanBase = Number(answers?.wan?.baseMbps) || 200;
  const trafficFactor = Number(answers?.trafficType?.factor) || 1.1;
  const primaryRequiredMbps = Math.ceil(wanBase * trafficFactor * GROWTH_FACTOR);

  const sslId = answers?.sslInspection?.id;
  const slId = answers?.securityLevel?.id;

  /** @type {string} */
  let primaryColumn = 'NGFW_Throughput_Enterprise_Mix';
  /** @type {string} */
  let primaryLabel = 'NGFW';

  if (sslId === 'none') {
    primaryColumn = 'Firewall_Throughput_UDP';
    primaryLabel = 'Firewall (UDP)';
  } else if (sslId === 'partial' || sslId === 'ssl_unknown') {
    primaryColumn = 'NGFW_Throughput_Enterprise_Mix';
    primaryLabel = 'NGFW (mix empresarial)';
  } else if (sslId === 'full') {
    const colMap = {
      basic: ['Firewall_Throughput_UDP', 'Firewall (UDP)'],
      medium: ['IPS_Throughput_Enterprise_Mix', 'IPS (mix empresarial)'],
      high: ['NGFW_Throughput_Enterprise_Mix', 'NGFW (mix empresarial)'],
      max: ['Threat_Protection_Throughput', 'Threat Protection'],
      sl_unknown: ['NGFW_Throughput_Enterprise_Mix', 'NGFW (mix empresarial)'],
    };
    const pair = colMap[slId] || colMap.sl_unknown;
    primaryColumn = pair[0];
    primaryLabel = pair[1];
  }

  let sslRequiredMbps = null;
  if (sslId === 'full') {
    sslRequiredMbps = Math.ceil(primaryRequiredMbps * 0.92);
  } else if (sslId === 'ssl_unknown') {
    sslRequiredMbps = Math.ceil(primaryRequiredMbps * 0.55);
  }

  const vpnFlags = deriveVpnSizingFlags(answers);
  const vpnScale = vpnFlags.conservativeVpn ? 0.78 : 1;
  let sslVpnThroughputRequiredMbps = null;
  let ipsecThroughputRequiredMbps = null;
  if (vpnFlags.requiresSSLVPN) {
    sslVpnThroughputRequiredMbps = Math.ceil(primaryRequiredMbps * 0.38 * vpnScale);
  }
  if (vpnFlags.requiresIPSec) {
    ipsecThroughputRequiredMbps = Math.ceil(primaryRequiredMbps * 0.42 * vpnScale);
  }

  return {
    primaryRequiredMbps,
    primaryColumn,
    primaryLabel,
    sslRequiredMbps,
    wanBaseMbps: wanBase,
    trafficFactor,
    vpnFlags,
    sslVpnThroughputRequiredMbps,
    ipsecThroughputRequiredMbps,
  };
}

/** @deprecated usar deriveVpnSizingFlags */
function vpnFlagsV2(vpn) {
  const id = vpn?.id;
  return {
    needsSslVpn: id === 'remote' || id === 'both' || id === 'vpn_unknown',
    needsIpsec: id === 'sitestosite' || id === 'both' || id === 'vpn_unknown',
    conservativeVpn: id === 'vpn_unknown',
  };
}

/**
 * Evalúa un modelo frente al snapshot v2 (métricas reales fortigate_specs).
 * @returns {{ ok: boolean, issues: string[], model: object, neededMbps: number, primaryCapacityMbps: number, usablePrimaryMbps: number, checks: object, usedEstimatedDefaults: boolean }}
 */
export function evaluateModelV2(modelRow, answers, headroom = 0.85) {
  const reqs = computeSizingRequirementsV2(answers);
  const { requiresSSLVPN, requiresIPSec, vpnTypeNum } = reqs.vpnFlags;

  console.log('VPN Type:', vpnTypeNum);
  console.log('Requires SSL VPN:', requiresSSLVPN);
  console.log('Requires IPsec:', requiresIPSec);

  const capacities = {
    Firewall_Throughput_UDP: parseThroughputToMbps(modelRow.Firewall_Throughput_UDP),
    IPS_Throughput_Enterprise_Mix: parseThroughputToMbps(modelRow.IPS_Throughput_Enterprise_Mix),
    NGFW_Throughput_Enterprise_Mix: parseThroughputToMbps(modelRow.NGFW_Throughput_Enterprise_Mix),
    Threat_Protection_Throughput: parseThroughputToMbps(modelRow.Threat_Protection_Throughput),
    IPSec_VPN_Throughput: parseThroughputToMbps(modelRow.IPSec_VPN_Throughput),
    SSL_VPN_Throughput: parseThroughputToMbps(modelRow.SSL_VPN_Throughput),
    SSL_Inspection_Throughput: parseThroughputToMbps(modelRow.SSL_Inspection_Throughput),
  };

  const estimatedUsers = Number(answers?.users?.estimatedUsers) || 50;
  const estimatedSslVpnUsers =
    Number(answers?.sslVpnUsers?.count ?? answers?.vpnUsers?.count) || 0;
  const estimatedIpsecTunnels = Number(answers?.ipsecTunnels?.count) || 0;
  const estimatedVdoms = Number(answers?.vdoms?.count) || 1;

  const issues = [];
  const checks = {};

  const capPrimary = capacities[reqs.primaryColumn];
  const usablePrimary = capPrimary != null ? capPrimary * headroom : null;
  const passPrimary =
    usablePrimary != null && usablePrimary >= reqs.primaryRequiredMbps;
  checks.primary = {
    pass: passPrimary,
    column: reqs.primaryColumn,
    label: reqs.primaryLabel,
    raw: capPrimary,
    usable: usablePrimary != null ? Math.round(usablePrimary) : null,
    required: reqs.primaryRequiredMbps,
  };
  if (!passPrimary) {
    if (capPrimary == null) {
      issues.push(`Sin dato ${reqs.primaryLabel} en BD para este modelo.`);
    } else {
      issues.push(
        `${reqs.primaryLabel}: requiere ~${reqs.primaryRequiredMbps} Mbps, capacidad ${capPrimary} Mbps (útil ~${Math.round(usablePrimary)}).`,
      );
    }
  }

  if (reqs.sslRequiredMbps != null) {
    const capSsl = capacities.SSL_Inspection_Throughput;
    const usableSsl = capSsl != null ? capSsl * headroom : null;
    const passSsl = usableSsl != null && usableSsl >= reqs.sslRequiredMbps;
    checks.sslInspection = {
      pass: passSsl,
      raw: capSsl,
      usable: usableSsl != null ? Math.round(usableSsl) : null,
      required: reqs.sslRequiredMbps,
    };
    if (!passSsl) {
      if (capSsl == null) {
        issues.push('SSL Inspection: sin throughput en BD.');
      } else {
        issues.push(
          `SSL Inspection: requiere ~${reqs.sslRequiredMbps} Mbps, capacidad ${capSsl} Mbps.`,
        );
      }
    }
  } else {
    checks.sslInspection = { pass: true, skipped: true };
  }

  const estimatedSessions = Math.ceil(estimatedUsers * 45 * 1.12);
  const concurrentSessions = parseSessions(modelRow.Concurrent_Sessions);
  if (concurrentSessions != null) {
    const pass = concurrentSessions >= estimatedSessions;
    checks.sessions = { pass, raw: concurrentSessions, required: estimatedSessions };
    if (!pass) {
      issues.push(`Sesiones concurrentes: est. ${estimatedSessions} > ${concurrentSessions}.`);
    }
  } else {
    checks.sessions = { pass: true, skipped: true };
  }

  const trafficTypeFactor =
    ({ browsing: 1, enterprise: 1.08, heavy: 1.22, mixed: 1.12, tr_unknown: 1.1 }[
      answers?.trafficType?.id
    ] ?? 1.1);
  const newSessionsPerSecond = parseSessions(modelRow.New_Sessions_Per_Second);
  if (newSessionsPerSecond != null) {
    const estimatedNps = Math.ceil(estimatedUsers * 3 * trafficTypeFactor);
    const pass = newSessionsPerSecond >= estimatedNps;
    checks.newSessions = { pass, raw: newSessionsPerSecond, required: estimatedNps };
    if (!pass) {
      issues.push(`New sessions/s: est. ${estimatedNps} > ${newSessionsPerSecond}.`);
    }
  } else {
    checks.newSessions = { pass: true, skipped: true };
  }

  if (requiresIPSec) {
    const ipsecReqMbps = reqs.ipsecThroughputRequiredMbps ?? 0;
    const capIpsec = capacities.IPSec_VPN_Throughput;
    const usableI = capIpsec != null ? capIpsec * headroom : null;
    const passI = usableI != null && usableI >= ipsecReqMbps;
    checks.ipsecThroughput = {
      pass: passI,
      raw: capIpsec,
      usable: usableI != null ? Math.round(usableI) : null,
      required: ipsecReqMbps,
    };
    if (!passI) {
      if (capIpsec == null) issues.push('IPsec VPN: sin throughput en BD.');
      else {
        issues.push(
          `IPsec VPN throughput: requiere ~${ipsecReqMbps} Mbps, capacidad ${capIpsec} Mbps (útil ~${Math.round(usableI)}).`,
        );
      }
    }

    const gatewayTunnels = parseSessions(modelRow.Max_Gateway_To_Gateway_IPSec_Tunnels);
    if (estimatedIpsecTunnels > 0) {
      if (gatewayTunnels == null) {
        issues.push('Túneles IPsec: sin dato Max_Gateway_To_Gateway_IPSec_Tunnels en BD.');
        checks.ipsecTunnels = { pass: false, reason: 'missing', required: estimatedIpsecTunnels };
      } else {
        const usableTunnels = gatewayTunnels * headroom;
        const passT = usableTunnels >= estimatedIpsecTunnels;
        checks.ipsecTunnels = {
          pass: passT,
          raw: gatewayTunnels,
          usable: Math.round(usableTunnels),
          required: estimatedIpsecTunnels,
        };
        if (!passT) {
          issues.push(
            `Túneles IPsec site-to-site: requiere ${estimatedIpsecTunnels}, útil ~${Math.round(usableTunnels)} (raw ${gatewayTunnels}).`,
          );
        }
      }
    } else {
      checks.ipsecTunnels = {
        pass: true,
        skipped: true,
        raw: gatewayTunnels,
        required: estimatedIpsecTunnels,
      };
    }
  } else {
    checks.ipsecThroughput = { pass: true, skipped: true };
    checks.ipsecTunnels = { pass: true, skipped: true };
  }

  if (requiresSSLVPN) {
    const sslVpnReqMbps = reqs.sslVpnThroughputRequiredMbps ?? 0;
    const capSslVpn = capacities.SSL_VPN_Throughput;
    const usableS = capSslVpn != null ? capSslVpn * headroom : null;
    const passS = usableS != null && usableS >= sslVpnReqMbps;
    checks.sslVpnThroughput = {
      pass: passS,
      raw: capSslVpn,
      usable: usableS != null ? Math.round(usableS) : null,
      required: sslVpnReqMbps,
    };
    if (!passS) {
      if (capSslVpn == null) issues.push('SSL VPN: sin throughput en BD.');
      else {
        issues.push(
          `SSL VPN throughput: requiere ~${sslVpnReqMbps} Mbps, capacidad ${capSslVpn} Mbps (útil ~${Math.round(usableS)}).`,
        );
      }
    }

    const concurrentSslVpnUsers = parseSessions(modelRow.Concurrent_SSL_VPN_Users);
    if (estimatedSslVpnUsers > 0) {
      if (concurrentSslVpnUsers == null) {
        issues.push('SSL VPN: sin dato Concurrent_SSL_VPN_Users en BD.');
        checks.sslVpnUsers = { pass: false, reason: 'missing', required: estimatedSslVpnUsers };
      } else {
        const usableUsers = concurrentSslVpnUsers * headroom;
        const passU = usableUsers >= estimatedSslVpnUsers;
        checks.sslVpnUsers = {
          pass: passU,
          raw: concurrentSslVpnUsers,
          usable: Math.round(usableUsers),
          required: estimatedSslVpnUsers,
        };
        if (!passU) {
          issues.push(
            `Usuarios SSL VPN concurrentes: requiere ${estimatedSslVpnUsers}, útil ~${Math.round(usableUsers)} (raw ${concurrentSslVpnUsers}).`,
          );
        }
      }
    } else {
      checks.sslVpnUsers = {
        pass: true,
        skipped: true,
        raw: concurrentSslVpnUsers,
        required: estimatedSslVpnUsers,
      };
    }
  } else {
    checks.sslVpnThroughput = { pass: true, skipped: true };
    checks.sslVpnUsers = { pass: true, skipped: true };
  }

  const vdomCapacity = parseSessions(modelRow.Virtual_Domains);
  if (vdomCapacity != null) {
    const passV = vdomCapacity >= estimatedVdoms;
    checks.vdoms = { pass: passV, raw: vdomCapacity, required: estimatedVdoms };
    if (!passV) {
      issues.push(`VDOMs: requiere ${estimatedVdoms}, soporta ${vdomCapacity}.`);
    }
  } else {
    checks.vdoms = { pass: true, skipped: true };
  }

  const ok = issues.length === 0;
  const primaryCapacityMbps = capPrimary ?? Number.MAX_SAFE_INTEGER;

  return {
    ok,
    issues,
    checks,
    model: modelRow,
    neededMbps: reqs.primaryRequiredMbps,
    primaryCapacityMbps,
    usablePrimaryMbps: usablePrimary,
    sortCapacity: primaryCapacityMbps,
    usableProfileCapacity: usablePrimary,
    primaryLabel: reqs.primaryLabel,
    usedEstimatedDefaults: hasUnknownSizingInputsV2(answers),
  };
}

/**
 * Elige el modelo más pequeño (menor capacidad en la métrica principal) que cumple todos los chequeos.
 * @param {object[]} models - filas fortigate_specs (PascalCase)
 * @param {object} answers - snapshot v2
 * @param {number} [headroom=0.85]
 * @returns {{ best: object|null, passing: object[], failing: { model: object, issues: string[] }[] }}
 */
export function selectBestModel(models, answers, headroom = 0.85) {
  const passing = [];
  const failing = [];

  const modelList = Array.isArray(models) ? models : [];
  for (const m of modelList) {
    try {
      const ev = evaluateModelV2(m, answers, headroom);
      if (ev.ok) passing.push(ev);
      else failing.push({ model: m, issues: ev.issues });
    } catch (e) {
      failing.push({ model: m, issues: [`Error: ${e.message}`] });
    }
  }

  passing.sort((a, b) => a.primaryCapacityMbps - b.primaryCapacityMbps);
  const best = passing[0] || null;

  return { best, passing, failing };
}

// Pega aquí tu evaluateModel corregido
export function evaluateModel(modelRow, answers, headroom = 0.85) {
  const wanMbps = wanRequiredMbps(answers.wanRange);
  const estimatedUsers = usersRangeToNumber(answers.users);

  const estimatedVpnUsers = vpnUsersToNumber(answers);
  const estimatedIpsecTunnels = ipsecTunnelsToNumber(answers);
  const estimatedVdoms = vdomsToNumber(answers);

  const capacities = {
    firewall: parseThroughputToMbps(modelRow.Firewall_Throughput_UDP),
    ips: parseThroughputToMbps(modelRow.IPS_Throughput_Enterprise_Mix),
    ngfw: parseThroughputToMbps(modelRow.NGFW_Throughput_Enterprise_Mix),
    threat: parseThroughputToMbps(modelRow.Threat_Protection_Throughput),
    ipsec: parseThroughputToMbps(modelRow.IPSec_VPN_Throughput),
    sslvpn: parseThroughputToMbps(modelRow.SSL_VPN_Throughput),
    sslInspection: parseThroughputToMbps(modelRow.SSL_Inspection_Throughput),
    appControl: parseThroughputToMbps(modelRow.Application_Control_Throughput),
  };

  const profileId = answers.securityProfile.id;
  const mainRequiredMbps = computeNeededMbps({ wanMbps, answers });
  const ipsecRequiredMbps = getIpsecRequiredMbps(mainRequiredMbps, answers);
  const sslVpnRequiredMbps = getSslVpnRequiredMbps(mainRequiredMbps, answers);
  const sslInspectionRequiredMbps = getSslInspectionRequiredMbps(mainRequiredMbps, answers);

  const capProfile = capacities[profileId];
  const issues = [];
  const checks = {};

  const usableProfileCapacity = capProfile != null ? capProfile * headroom : null;

  // 1) Throughput principal
  if (capProfile == null) {
    issues.push(`No tengo throughput para ${answers.securityProfile.label} en BD.`);
    checks.profile = { pass: false, reason: 'missing' };
  } else {
    const pass = usableProfileCapacity >= mainRequiredMbps;

    checks.profile = {
      pass,
      raw: capProfile,
      usable: Math.round(usableProfileCapacity),
      required: mainRequiredMbps,
    };

    if (!pass) {
      issues.push(
        `${answers.securityProfile.label}: requerido ~${mainRequiredMbps} Mbps, capacidad ${capProfile} Mbps (usable ~${Math.round(usableProfileCapacity)}).`
      );
    }
  }

  // 2) Sesiones concurrentes
  const concurrentSessions = parseSessions(modelRow.Concurrent_Sessions);
  if (concurrentSessions != null && estimatedUsers != null) {
    const estimatedSessions = Math.ceil(estimatedUsers * 45 * 1.15);
    const pass = concurrentSessions >= estimatedSessions;

    checks.sessions = {
      pass,
      raw: concurrentSessions,
      required: estimatedSessions,
    };

    if (!pass) {
      issues.push(`Sesiones: est. ${estimatedSessions} > soportadas ${concurrentSessions}.`);
    }
  } else {
    checks.sessions = { pass: true, skipped: true };
  }

  // 3) Nuevas sesiones por segundo
  const newSessionsPerSecond = parseSessions(modelRow.New_Sessions_Per_Second);
  if (newSessionsPerSecond != null && estimatedUsers != null) {
    const trafficTypeFactor = getTrafficTypeFactor(answers);
    const estimatedNps = Math.ceil(estimatedUsers * 3 * trafficTypeFactor);

    const pass = newSessionsPerSecond >= estimatedNps;

    checks.newSessions = {
      pass,
      raw: newSessionsPerSecond,
      required: estimatedNps,
    };

    if (!pass) {
      issues.push(`New Sessions/s: est. ${estimatedNps} > soportadas ${newSessionsPerSecond}.`);
    }
  } else {
    checks.newSessions = { pass: true, skipped: true };
  }

  // 4) IPsec throughput
  if (answers.vpn.id === 'ipsec' || answers.vpn.id === 'both') {
    const capIpsec = capacities.ipsec;
    if (capIpsec == null) {
      issues.push('IPsec VPN: no tengo este dato en BD.');
      checks.ipsec = { pass: false, reason: 'missing' };
    } else {
      const usable = capIpsec * headroom;
      const pass = usable >= ipsecRequiredMbps;

      checks.ipsec = {
        pass,
        raw: capIpsec,
        usable: Math.round(usable),
        required: ipsecRequiredMbps,
      };

      if (!pass) {
        issues.push(`IPsec VPN: requerido ~${ipsecRequiredMbps} Mbps, capacidad ${capIpsec} Mbps (usable ~${Math.round(usable)}).`);
      }
    }
  } else {
    checks.ipsec = { pass: true, skipped: true };
  }

  // 5) Túneles IPsec
  const gatewayTunnels = parseSessions(modelRow.Max_Gateway_To_Gateway_IPSec_Tunnels);
  if (answers.vpn.id === 'ipsec' || answers.vpn.id === 'both') {
    if (gatewayTunnels != null) {
      const pass = gatewayTunnels >= estimatedIpsecTunnels;

      checks.ipsecTunnels = {
        pass,
        raw: gatewayTunnels,
        required: estimatedIpsecTunnels,
      };

      if (!pass) {
        issues.push(`Túneles IPsec: requeridos ${estimatedIpsecTunnels} > soportados ${gatewayTunnels}.`);
      }
    } else {
      checks.ipsecTunnels = { pass: true, skipped: true };
    }
  } else {
    checks.ipsecTunnels = { pass: true, skipped: true };
  }

  // 6) SSL-VPN throughput
  if (answers.vpn.id === 'sslvpn' || answers.vpn.id === 'both') {
    const capSslVpn = capacities.sslvpn;
    if (capSslVpn == null) {
      issues.push('SSL-VPN: no tengo este dato en BD.');
      checks.sslvpn = { pass: false, reason: 'missing' };
    } else {
      const usable = capSslVpn * headroom;
      const pass = usable >= sslVpnRequiredMbps;

      checks.sslvpn = {
        pass,
        raw: capSslVpn,
        usable: Math.round(usable),
        required: sslVpnRequiredMbps,
      };

      if (!pass) {
        issues.push(`SSL-VPN: requerido ~${sslVpnRequiredMbps} Mbps, capacidad ${capSslVpn} Mbps (usable ~${Math.round(usable)}).`);
      }
    }
  } else {
    checks.sslvpn = { pass: true, skipped: true };
  }

  // 7) Usuarios SSL-VPN
  const concurrentSslVpnUsers = parseSessions(modelRow.Concurrent_SSL_VPN_Users);
  if (answers.vpn.id === 'sslvpn' || answers.vpn.id === 'both') {
    if (concurrentSslVpnUsers != null) {
      const pass = concurrentSslVpnUsers >= estimatedVpnUsers;

      checks.concurrentSslVpnUsers = {
        pass,
        raw: concurrentSslVpnUsers,
        required: estimatedVpnUsers,
      };

      if (!pass) {
        issues.push(`Usuarios SSL-VPN: requeridos ${estimatedVpnUsers} > soportados ${concurrentSslVpnUsers}.`);
      }
    } else {
      checks.concurrentSslVpnUsers = { pass: true, skipped: true };
    }
  } else {
    checks.concurrentSslVpnUsers = { pass: true, skipped: true };
  }

  // 8) SSL Inspection
  if (answers.sslInspection.id === 'yes' || answers.sslInspection.id === 'unknown') {
    const capSSL = capacities.sslInspection;
    if (capSSL == null) {
      issues.push('SSL Inspection: no tengo este dato en BD.');
      checks.sslInspection = { pass: false, reason: 'missing' };
    } else {
      const usable = capSSL * headroom;
      const pass = usable >= sslInspectionRequiredMbps;

      checks.sslInspection = {
        pass,
        raw: capSSL,
        usable: Math.round(usable),
        required: sslInspectionRequiredMbps,
      };

      if (!pass) {
        issues.push(`SSL Inspection: requerido ~${sslInspectionRequiredMbps} Mbps, capacidad ${capSSL} Mbps (usable ~${Math.round(usable)}).`);
      }
    }
  } else {
    checks.sslInspection = { pass: true, skipped: true };
  }

  // 9) VDOMs
  const vdomCapacity = parseSessions(modelRow.Virtual_Domains);
  if (vdomCapacity != null) {
    const pass = vdomCapacity >= estimatedVdoms;

    checks.vdoms = {
      pass,
      raw: vdomCapacity,
      required: estimatedVdoms,
    };

    if (!pass) {
      issues.push(`VDOMs: requeridos ${estimatedVdoms} > soportados ${vdomCapacity}.`);
    }
  } else {
    checks.vdoms = { pass: true, skipped: true };
  }

  const ok = issues.length === 0;

  return {
    ok,
    issues,
    checks,
    wanMbps,
    neededMbps: mainRequiredMbps,
    estimatedUsers,
    estimatedVpnUsers,
    estimatedIpsecTunnels,
    estimatedVdoms,
    profileId,
    sortCapacity: capProfile ?? Number.MAX_SAFE_INTEGER,
    usableProfileCapacity,
    usedEstimatedDefaults: hasUnknownInputs(answers),
    model: modelRow,
  };
}

// Pega aquí tu recomendación final
export function buildRecommendedOnly(passingEvaluated) {
  if (!passingEvaluated.length) {
    return null;
  }

  const sorted = [...passingEvaluated].sort(
    (a, b) => a.sortCapacity - b.sortCapacity
  );

  const targetUtilization = 0.62;

  const scored = sorted
    .filter(item => item.usableProfileCapacity && item.neededMbps)
    .map(item => {
      const utilization = item.neededMbps / item.usableProfileCapacity;
      const distanceToTarget = Math.abs(utilization - targetUtilization);

      return {
        ...item,
        utilization,
        distanceToTarget,
      };
    })
    .filter(item => item.utilization >= 0.28 && item.utilization <= 0.92)
    .sort((a, b) => {
      if (a.distanceToTarget !== b.distanceToTarget) {
        return a.distanceToTarget - b.distanceToTarget;
      }
      return a.sortCapacity - b.sortCapacity;
    });

  return scored[0] ?? sorted[0];
}