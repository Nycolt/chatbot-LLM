export const FORTIGATE_RANGES = {
  wan: [
    { label: '0–50 Mbps', min: 0, max: 50 },
    { label: '51–100 Mbps', min: 51, max: 100 },
    { label: '101–200 Mbps', min: 101, max: 200 },
    { label: '201–300 Mbps', min: 201, max: 300 },
    { label: '301–500 Mbps', min: 301, max: 500 },
    { label: '501–800 Mbps', min: 501, max: 800 },
    { label: '801–1000 Mbps', min: 801, max: 1000 },
    { label: '1–2 Gbps', min: 1001, max: 2000 },
    { label: '2–5 Gbps', min: 2001, max: 5000 },
    { label: '+5 Gbps', min: 5001, max: 999999 },
  ],

  users: ['1–10', '11–25', '26–50', '51–100', '101–200', '201–500', '+500', 'No lo sé'],

  securityProfile: [
    { id: 'firewall', label: 'Firewall básico' },
    { id: 'ips', label: 'IPS' },
    { id: 'ngfw', label: 'NGFW' },
    { id: 'threat', label: 'Threat Protection' },
  ],

  trafficType: [
    { id: 'office', label: 'Oficina / navegación / correo' },
    { id: 'saas', label: 'SaaS / aplicaciones en la nube' },
    { id: 'streaming', label: 'Streaming / contenido multimedia' },
    { id: 'critical', label: 'Aplicaciones críticas / ERP / transaccional' },
    { id: 'datacenter', label: 'Datacenter / tráfico intensivo' },
    { id: 'unknown', label: 'No lo sé' },
  ],

  vpn: [
    { id: 'none', label: 'No VPN' },
    { id: 'ipsec', label: 'Solo IPsec' },
    { id: 'sslvpn', label: 'Solo SSL-VPN' },
    { id: 'both', label: 'IPsec + SSL-VPN' },
  ],

  vpnUsers: [
    { id: '0', label: '0' },
    { id: '1-25', label: '1–25' },
    { id: '26-50', label: '26–50' },
    { id: '51-100', label: '51–100' },
    { id: '101-250', label: '101–250' },
    { id: '250+', label: 'Más de 250' },
    { id: 'unknown', label: 'No lo sé' },
  ],

  ipsecTunnels: [
    { id: '0', label: '0' },
    { id: '1-10', label: '1–10' },
    { id: '11-50', label: '11–50' },
    { id: '51-100', label: '51–100' },
    { id: '100+', label: 'Más de 100' },
    { id: 'unknown', label: 'No lo sé' },
  ],

  yesNoUnknown: [
    { id: 'no', label: 'No' },
    { id: 'yes', label: 'Sí' },
    { id: 'unknown', label: 'No lo sé' },
  ],

  vdoms: [
    { id: 'no', label: 'No' },
    { id: '2-5', label: '2–5' },
    { id: '6-10', label: '6–10' },
    { id: '10+', label: 'Más de 10' },
    { id: 'unknown', label: 'No lo sé' },
  ],
};

export function listOptions(options) {
  return options.map((o, i) => `${i + 1}. ${o.label ?? o}`).join('\n');
}

export function pickOptionByNumber(input, options) {
  const n = Number(String(input).trim());
  if (!Number.isInteger(n)) return null;
  if (n < 1 || n > options.length) return null;
  return options[n - 1];
}

/**
 * Selección múltiple por números (chat): "1,3,8" o "1 3 8"
 * @returns {object[]|null} opciones elegidas sin duplicados, ordenadas por número
 */
export function pickMultiOptionByNumbers(input, options) {
  if (!options?.length) return null;
  const parts = String(input || '')
    .split(/[,\s;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const nums = new Set();
  for (const p of parts) {
    const n = Number(p);
    if (Number.isInteger(n) && n >= 1 && n <= options.length) nums.add(n);
  }
  if (!nums.size) return null;
  return [...nums]
    .sort((a, b) => a - b)
    .map((i) => options[i - 1]);
}