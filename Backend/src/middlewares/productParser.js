// Backend/src/middlewares/productParser.js
/**
 * Middleware: extractProductIntent
 * - Extrae intención de producto (rápido, por regex)
 * - Adjunta req.productos si detecta algo
 * - ✅ NUEVO: si detecta sizing FortiGate, NO ejecuta extractor (evita demoras)
 *
 * Uso:
 *   extractProductIntent({ skipOnError: true })
 */

function nowMs() {
  return Date.now();
}

function getLastUserText(req) {
  const body = req.body;
  const lastUser = Array.isArray(body)
    ? [...body].reverse().find(m => m && m.role === 'user')
    : null;

  return String(lastUser?.content || '').trim();
}

function isSizingMessage(userText) {
  const lower = String(userText || '').toLowerCase();

  // Señales del flujo
  if (lower.includes('__start_fortigate_sizing__')) return true;

  // Palabras clave (mantén esto simple, rápido y efectivo)
  return /dimension(ar|amiento)?|sizing|recomendar.*fortigate|recomiendame.*fortigate|fortigate/.test(lower);
}

/**
 * Extrae campos solicitados si el usuario los menciona:
 * (puedes ampliar esta lista cuando quieras)
 */
function extractFields(text) {
  const lower = text.toLowerCase();
  const fields = [];

  const map = [
    { key: 'Firewall_Throughput_UDP', patterns: ['firewall throughput', 'throughput firewall', 'udp'] },
    { key: 'IPSec_VPN_Throughput', patterns: ['ipsec', 'vpn ipsec'] },
    { key: 'SSL_VPN_Throughput', patterns: ['ssl-vpn', 'sslvpn', 'ssl vpn'] },
    { key: 'IPS_Throughput_Enterprise_Mix', patterns: ['ips throughput', 'ips'] },
    { key: 'NGFW_Throughput_Enterprise_Mix', patterns: ['ngfw', 'app control'] },
    { key: 'Threat_Protection_Throughput', patterns: ['threat', 'utm', 'threat protection'] },
    { key: 'Concurrent_Sessions', patterns: ['sesiones', 'sessions', 'concurrent sessions'] },
    { key: 'New_Sessions_Per_Second', patterns: ['new sessions', 'sesiones por segundo'] },
    { key: 'Interfaces', patterns: ['interfaces', 'ports', 'puertos'] },
    { key: 'Form_Factor', patterns: ['form factor', 'rack', 'desktop'] },
  ];

  for (const item of map) {
    if (item.patterns.some(p => lower.includes(p))) fields.push(item.key);
  }

  return [...new Set(fields)];
}

/**
 * Extrae modelos Fortinet comunes.
 * Devuelve { brand, unit, variant } o null.
 *
 * Ejemplos aceptados:
 * - "FortiGate 60F"
 * - "FG-60F"
 * - "FG/FWF-60F" (SKU/variant)
 * - "FortiGate-40F"
 */
function extractFortinetProduct(text) {
  const t = String(text || '').trim();

  // 1) Capturar "FortiGate 60F" / "FortiGate-60F" / "Fortigate 60f"
  const fg1 = t.match(/forti\s*gate[-\s]*([0-9]{2,4}[a-z]?)/i);
  if (fg1) {
    const model = fg1[1].toUpperCase();
    return { brand: 'Fortinet', unit: `FortiGate-${model}`, variant: null };
  }

  // 2) Capturar "FG-60F" / "FG60F"
  const fg2 = t.match(/\bfg[-\s]*([0-9]{2,4}[a-z]?)\b/i);
  if (fg2) {
    const model = fg2[1].toUpperCase();
    return { brand: 'Fortinet', unit: `FortiGate-${model}`, variant: null };
  }

  // 3) Capturar SKU tipo "FG/FWF-60F" (variant) y unit tipo FortiGate-60F
  const sku = t.match(/\bfg\/[a-z]{2,4}-([0-9]{2,4}[a-z]?)\b/i);
  if (sku) {
    const model = sku[1].toUpperCase();
    return { brand: 'Fortinet', unit: `FortiGate-${model}`, variant: sku[0].toUpperCase() };
  }

  return null;
}

export const extractProductIntent = (options = {}) => {
  const { skipOnError = true } = options;

  return async (req, res, next) => {
    const start = nowMs();

    try {
      const userText = getLastUserText(req);

      // ✅ NUEVO: si el usuario está dimensionando, NO correr extractor
      if (isSizingMessage(userText)) {
        // No tocamos req.productos, para no interferir
        return next();
      }

      // Extractor rápido (sin IA)
      const product = extractFortinetProduct(userText);

      if (product) {
        req.productos = {
          ...product,
          fields: extractFields(userText),
        };
      } else {
        req.productos = null;
      }

      const elapsed = nowMs() - start;
      // Mantengo un log similar al tuyo, pero sin bloquear
      if (!req.productos) {
        console.info(`❌ No se pudo extraer producto en ${elapsed}ms`);
      }

      return next();
    } catch (err) {
      const elapsed = nowMs() - start;
      console.error(`❌ Error en extractProductIntent en ${elapsed}ms:`, err?.message || err);

      if (skipOnError) {
        req.productos = null;
        return next();
      }

      return next(err);
    }
  };
};

export default { extractProductIntent };
