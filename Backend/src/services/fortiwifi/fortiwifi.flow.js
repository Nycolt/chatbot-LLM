/**
 * Dimensionamiento FortiWiFi desde payload del formulario (determinístico).
 */

import { FORTIWIFI_RANGES } from './fortiwifi.ranges.js';
import {
  computeRequirements,
  bundleTierFromSecurity,
} from './fortiwifi.engine.js';
import { loadFortiwifiSpecRows, selectBestFortiWifiModel } from './fortiwifi.modelSelector.js';
import {
  loadFortiwifiBundleOffers,
  selectFortiwifiBundleOffer,
} from './fortiwifi.bundles.js';
import {
  loadFortiwifiLicenseOffers,
  selectFortiwifiAddonLicense,
} from './fortiwifi.licenses.js';

const FORM_KEYS = [
  'wan',
  'users',
  'wifiUsers',
  'securityLevel',
  'sslInspection',
  'vpnUsage',
  'fortiSwitch',
  'growth',
  'wantsAdditionalServices',
  'addons',
];

function mapSingleField(options, raw) {
  if (raw == null || !Array.isArray(options)) return null;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1 || n > options.length) return null;
  return options[n - 1];
}

function formatOfferLine(offer) {
  if (!offer) return 'N/A';
  const sku = String(offer.sku || '').trim();
  const desc = String(offer.description || '').trim();
  return desc ? `${sku} — ${desc}` : sku;
}

function mapFormAnswersToSnapshot(formAnswers = {}) {
  const out = {};
  for (const key of FORM_KEYS) {
    const opts = FORTIWIFI_RANGES[key];
    if (!opts) continue;
    out[key] = mapSingleField(opts, formAnswers[key]);
  }
  if (!out.vpnUsage) out.vpnUsage = FORTIWIFI_RANGES.vpnUsage[0];
  if (!out.fortiSwitch) out.fortiSwitch = FORTIWIFI_RANGES.fortiSwitch[0];
  if (out.wantsAdditionalServices?.id === 'no') {
    out.addons = null;
  }
  return out;
}

function buildAssistantMessage({ pick, bundle, licensePick, requirements, answers }) {
  const noExtras = answers.wantsAdditionalServices?.id === 'no';
  let licBlock = '';
  if (noExtras) {
    licBlock = '_No aplica — no solicitaste servicios adicionales en la cotización._\n';
  } else if (licensePick?.offer) {
    licBlock = `${formatOfferLine(licensePick.offer)}\n`;
    if (licensePick?.reason) licBlock += `_${licensePick.reason}_\n`;
  } else {
    licBlock = `${licensePick?.reason || '_No aplica o sin SKU clara en catálogo._'}\n`;
  }

  let text = `📊 FortiWiFi — recomendación\n\n`;
  text += `✅ Resumen ejecutivo\n`;
  text += `- Modelo: ${pick.unit}\n`;
  text += `- FortiWiFi dimensionado según WAN, usuarios, densidad WiFi y perfil de seguridad declarados.\n\n`;
  text += `💼 Bundle y licencias\n`;
  text += `- Bundle (catálogo): ${formatOfferLine(bundle)}\n`;
  text += `- Servicios adicionales:\n${licBlock}\n`;
  text += `📋 Tu escenario (criterios)\n`;
  text += `- WAN: ${answers.wan?.label || '—'}\n`;
  text += `- Usuarios: ${answers.users?.label || '—'}\n`;
  text += `- WiFi simultáneo: ${answers.wifiUsers?.label || '—'}\n`;
  text += `- Seguridad: ${answers.securityLevel?.label || '—'}\n`;
  text += `- Inspección SSL: ${answers.sslInspection?.label || '—'}\n`;
  text += `- VPN: ${answers.vpnUsage?.label || '—'}\n`;
  text += `- FortiSwitch: ${answers.fortiSwitch?.label || '—'}\n`;
  text += `- Crecimiento: ${answers.growth?.label || '—'}\n`;
  if (!pick.fromSpecs) {
    text += `\n⚠️ Aviso: _Sin fila completa en fortiwifi_specs para todos los criterios; modelo sugerido según catálogo disponible._\n`;
  }
  if (requirements?.rulesApplied?.length) {
    text += `\n📌 _Reglas aplicadas:_ ${requirements.rulesApplied.join('; ')}\n`;
  }
  return text;
}

export async function runFortiWifiSizingFromPayload(formAnswers) {
  const answers = mapFormAnswersToSnapshot(formAnswers || {});

  for (const key of [
    'wan',
    'users',
    'wifiUsers',
    'securityLevel',
    'sslInspection',
    'growth',
    'wantsAdditionalServices',
  ]) {
    if (!answers[key]) {
      return {
        done: true,
        assistantMessage: 'Faltan respuestas obligatorias en el formulario FortiWiFi.',
      };
    }
  }

  if (answers.wantsAdditionalServices?.id === 'yes' && !answers.addons?.id) {
    return {
      done: true,
      assistantMessage:
        'Indicaste que deseas servicios adicionales: elige una opción en el desplegable correspondiente.',
    };
  }

  const requirements = computeRequirements(answers);
  const specRows = await loadFortiwifiSpecRows();
  const pick = selectBestFortiWifiModel(requirements, specRows);
  const tier = bundleTierFromSecurity(answers.securityLevel?.id);
  const bundleRows = await loadFortiwifiBundleOffers();
  const bundleOffer = selectFortiwifiBundleOffer(pick.unit, tier, bundleRows);
  const licenseRows = await loadFortiwifiLicenseOffers();
  const licensePick = selectFortiwifiAddonLicense(answers, licenseRows);

  const assistantMessage = buildAssistantMessage({
    pick,
    bundle: bundleOffer,
    licensePick,
    requirements,
    answers,
  });

  return {
    done: true,
    assistantMessage,
    recommendation: {
      solution: 'FortiWiFi',
      unit: pick.unit,
      fromSpecs: pick.fromSpecs,
      bundleTier: tier,
      bundleOffer: bundleOffer || null,
      licenseOffer: licensePick?.offer || null,
    },
  };
}

export default { runFortiWifiSizingFromPayload };
