/**
 * Extracción heurística de métricas FortiGate desde texto plano del PDF.
 * Patrones orientados a datasheets tipo matrix; revisión manual vía pending_review.
 */

/** Número de reglas “objetivo” para ratio de completitud */
export const FORTIGATE_EXPECTED_SLOTS = 14;

/**
 * Cada regla: regex sobre texto completo, clave interna snake_case (mapeada a columnas Pascal en `fortigate_specs` al persistir).
 */
const RULES = [
  {
    field: 'firewall_throughput_udp',
    re: /Firewall\s+throughput[^\n]{0,80}UDP[^\n]{0,120}?(\d[\d.,]*\s*(?:Gbps|Mbps|Gpps|Mpps|Kpps))/i,
  },
  {
    field: 'ipsec_vpn_throughput',
    re: /IPSec\s*VPN[^\n]{0,100}?(\d[\d.,]*\s*(?:Gbps|Mbps))/i,
  },
  {
    field: 'ips_throughput_enterprise_mix',
    re: /IPS\s*throughput[^\n]{0,80}?(?:enterprise|mix)[^\n]{0,40}?(\d[\d.,]*\s*(?:Gbps|Mbps))/i,
  },
  {
    field: 'ngfw_throughput_enterprise_mix',
    re: /NGFW[^\n]{0,80}?(?:enterprise|mix)[^\n]{0,40}?(\d[\d.,]*\s*(?:Gbps|Mbps))/i,
  },
  {
    field: 'threat_protection_throughput',
    re: /Threat\s*protection[^\n]{0,60}?throughput[^\n]{0,40}?(\d[\d.,]*\s*(?:Gbps|Mbps))/i,
  },
  {
    field: 'concurrent_sessions',
    re: /Concurrent\s*sessions[^\n]{0,40}?(\d[\d,]*)/i,
  },
  {
    field: 'new_sessions_per_second',
    re: /New\s*sessions\s*per\s*second[^\n]{0,40}?(\d[\d,]*)/i,
  },
  {
    field: 'firewall_policies',
    re: /Firewall\s*policies[^\n]{0,40}?(\d[\d,]*)/i,
  },
  {
    field: 'max_ipsec_gw_tunnels',
    re: /Gateway[\s-]*to[\s-]*gateway[^\n]{0,50}?IPSec[^\n]{0,40}?(\d[\d,]*)/i,
  },
  {
    field: 'max_ipsec_client_tunnels',
    re: /Client[\s-]*to[\s-]*gateway[^\n]{0,50}?IPSec[^\n]{0,40}?(\d[\d,]*)/i,
  },
  {
    field: 'ssl_vpn_throughput',
    re: /SSL\s*VPN[^\n]{0,60}?throughput[^\n]{0,40}?(\d[\d.,]*\s*(?:Gbps|Mbps))/i,
  },
  {
    field: 'concurrent_ssl_vpn_users',
    re: /Concurrent\s*SSL\s*VPN\s*users[^\n]{0,40}?(\d[\d,]*)/i,
  },
  {
    field: 'virtual_domains',
    re: /(?:Maximum\s+)?(?:number\s+of\s+)?VDOMs?[^\n]{0,40}?(\d[\d,]*)/i,
  },
  {
    field: 'form_factor',
    re: /Form\s*factor[^\n]{0,40}?([A-Za-z0-9][A-Za-z0-9\s,-]{2,40})/i,
  },
];

/**
 * @param {string} text
 * @returns {{ metrics: Record<string, string>, pending_review: Array<object>, matched_rule_count: number }}
 */
export function extractFortigateMetrics(text) {
  const metrics = {};
  const pending_review = [];
  let matched = 0;

  for (const { field, re } of RULES) {
    const m = text.match(re);
    if (m && m[1]) {
      const val = String(m[1]).trim().slice(0, 255);
      if (val) {
        metrics[field] = val;
        matched += 1;
      }
    }
  }

  if (matched === 0 && text.length > 500) {
    pending_review.push({
      type: 'low_confidence_extraction',
      message:
        'No se encontraron métricas FortiGate con patrones conocidos; revisar PDF o usar matrix/Excel.',
      suggestion: 'Completar specs manualmente o afinar patrones en fortigate.metrics.js',
    });
  }

  const unmatchedHints = text.match(/\d[\d.,]*\s*Gbps/gi);
  if (unmatchedHints && unmatchedHints.length > 8 && matched < 4) {
    pending_review.push({
      type: 'ambiguous_throughput_lines',
      sample: unmatchedHints.slice(0, 5).join(', '),
      message: 'Muchas líneas con Gbps sin mapeo claro; revisión manual recomendada.',
    });
  }

  return { metrics, pending_review, matched_rule_count: matched, expected_slots: FORTIGATE_EXPECTED_SLOTS };
}
