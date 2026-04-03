/**
 * Dimensionamiento FortiSwitch (POST /api/v1/sizing/submit, solutionType 6).
 */

import { FortiSwitchEngine } from './fortiswitch.engine.js';
import { FORTISWITCH_ADDONS } from './fortiswitch.ranges.js';
import {
  loadFortiswitchSpecRowsFromDb,
  loadFortiswitchLicenseOffers,
  resolveFortiSwitchHardwareSku,
  selectFortiSwitchSupportSku,
  selectFortiSwitchLicenseByKeywords,
  mapAddOnLabelsToSkus,
  filterFortiSwitchLicenseRowsForModel,
  fortiswitchLicenseMatchTokens,
} from './fortiswitch.offers.js';

const REQUIRED_KEYS = [
  'ports',
  'speed',
  'uplinks',
  'poe',
  'switching',
  'pps',
  'redundancy',
  'formFactor',
  'scalability',
  'supportLevel',
  'cloudManagement',
];

const ADDON_BY_VALUE = Object.fromEntries(FORTISWITCH_ADDONS.map((o) => [o.value, o.label]));

/**
 * @param {Record<string, unknown>} formAnswers
 */
function coercePayload(formAnswers = {}) {
  const out = {};
  for (const key of REQUIRED_KEYS) {
    const n = Number(formAnswers[key]);
    out[key] = Number.isFinite(n) ? n : null;
  }
  const rawAdd = formAnswers.addOns;
  out.addOns = Array.isArray(rawAdd)
    ? rawAdd.map(Number).filter(Number.isFinite)
    : [];
  return out;
}

function labelsFromAddOnValues(values) {
  const set = new Set();
  for (const v of values || []) {
    const lab = ADDON_BY_VALUE[v];
    if (lab) set.add(lab);
  }
  return [...set];
}

/**
 * @param {Record<string, unknown>} formAnswers
 */
export async function runFortiSwitchSizingFromPayload(formAnswers) {
  const raw = coercePayload(formAnswers);

  for (const key of REQUIRED_KEYS) {
    if (raw[key] == null || !Number.isFinite(raw[key])) {
      return {
        done: true,
        assistantMessage: 'Faltan respuestas obligatorias en el formulario FortiSwitch.',
      };
    }
  }

  const specRows = await loadFortiswitchSpecRowsFromDb();
  if (!specRows.length) {
    return {
      done: true,
      assistantMessage:
        'No hay filas en `fortiswitch_specs`. Carga un datasheet (PDF FortiSwitch) o pobla la tabla antes de dimensionar.',
    };
  }

  const engine = new FortiSwitchEngine(specRows);
  const norm = engine.normalizeInputs(raw);
  const req = engine.calculateRequirements(norm);
  const selected = engine.selectBestModel(req, norm);
  const fallbackClosest = Boolean(selected && selected.__fortiswitch_fallback_closest);
  if (selected && '__fortiswitch_fallback_closest' in selected) {
    delete selected.__fortiswitch_fallback_closest;
  }

  const addOnLabels = labelsFromAddOnValues(norm.addOns);
  const licenseRowsAll = await loadFortiswitchLicenseOffers();
  const support = engine.selectSupport(norm);
  const modelUnit = selected?.unit ? String(selected.unit).trim() : null;
  const modelLicenseRows = filterFortiSwitchLicenseRowsForModel(modelUnit, licenseRowsAll);
  const modelTokens = fortiswitchLicenseMatchTokens(modelUnit);

  const supportPoolPrimary = modelLicenseRows.length ? modelLicenseRows : licenseRowsAll;
  let mandatorySku = selectFortiSwitchSupportSku(support.type, supportPoolPrimary, modelUnit);
  if (!mandatorySku && modelLicenseRows.length) {
    mandatorySku = selectFortiSwitchSupportSku(support.type, licenseRowsAll, modelUnit);
  }

  let cloudSku =
    Number(norm.cloudManagement) === 2
      ? selectFortiSwitchLicenseByKeywords(
          modelLicenseRows.length ? modelLicenseRows : licenseRowsAll,
          ['cloud'],
          modelTokens,
        )
      : null;
  if (!cloudSku && Number(norm.cloudManagement) === 2 && modelLicenseRows.length) {
    cloudSku = selectFortiSwitchLicenseByKeywords(licenseRowsAll, ['cloud'], modelTokens);
  }

  let addonSkus = mapAddOnLabelsToSkus(
    addOnLabels,
    modelLicenseRows.length ? modelLicenseRows : licenseRowsAll,
    modelUnit,
  );
  if (addOnLabels.length && modelLicenseRows.length) {
    const merged = { ...addonSkus };
    for (const lab of addOnLabels) {
      if (!merged[lab]) {
        const partial = mapAddOnLabelsToSkus([lab], licenseRowsAll, modelUnit);
        if (partial[lab]) merged[lab] = partial[lab];
      }
    }
    addonSkus = merged;
  }

  const catalog = {
    hardwareSku: null,
    mandatoryLicenseSku: mandatorySku,
    cloudLicenseSku: cloudSku,
    addonSkus,
  };

  if (selected?.unit) {
    const hw = await resolveFortiSwitchHardwareSku(selected.unit);
    catalog.hardwareSku = hw?.sku || null;
  }

  const structured = engine.buildResult(selected, norm, req, addOnLabels, catalog);

  let text = `🌐 FortiSwitch — recomendación\n\n`;
  text += `✅ Modelo recomendado: ${structured.model.UNIT}\n`;
  if (fallbackClosest) {
    text +=
      `\n⚠️ Nota: ningún equipo en catálogo cumple a la vez puertos de acceso y switching del formulario; se muestra el más cercano (menor déficit en esos dos criterios). Valida con preventa.\n`;
  }
  text += `\n`;
  text += `📊 Especificaciones (datasheet)\n`;
  text += `- Interfaces: ${structured.model.interfaces || '—'}\n`;
  text += `- Capacidad de switching: ${structured.model.throughput || '—'}\n`;
  text += `- PoE: ${structured.model.poe || '—'}${structured.model.poe_ports ? ` (puertos PoE: ${structured.model.poe_ports})` : ''}\n`;
  text += `- Uplink (tabla): ${structured.model.uplink || '—'}\n`;
  if (structured.model.power_supply) {
    text += `- Alimentación: ${structured.model.power_supply}\n`;
  }
  text += `\n🔐 Licencia obligatoria (soporte)\n`;
  text += `- ${structured.support.type}`;
  if (mandatorySku) text += ` — _SKU referencia:_ \`${mandatorySku}\``;
  else text += `\n- _Sin SKU en \`solution_offers\` para fortiswitch; confirma FortiCare en lista de precios._`;
  text += `\n`;

  if (structured.cloud) {
    text += `\n☁️ Licencia / servicio opcional (gestión)\n`;
    text += `- FortiSwitch Cloud Management License`;
    if (cloudSku) text += ` — _SKU:_ \`${cloudSku}\``;
    else text += `\n- _Sin SKU cloud en catálogo; confirma con preventa._`;
    text += `\n`;
  }

  if (addOnLabels.length) {
    text += `\n🧩 Servicios adicionales (opcionales)\n`;
    for (const lab of addOnLabels) {
      const sk = addonSkus[lab];
      text += sk ? `- ${lab} — \`${sk}\`\n` : `- ${lab} — _sin SKU en catálogo_\n`;
    }
    if (addOnLabels.some((l) => /Upgrade\s+Premium/i.test(l))) {
      text +=
        `\n_«Upgrade Premium → Elite» aplica si ya tienes FortiCare Premium activo; confirma con preventa._\n`;
    }
  }

  text += `\n📐 Criterios técnicos\n`;
  text += `- Puertos requeridos (× escalabilidad): ${req.requiredPorts}\n`;
  text += `- Throughput requerido: ${req.requiredThroughput} Gbps\n`;
  text += `- PPS requerido: ${req.requiredPPS} Mpps`;
  if (req.requiredPPSRaw != null && req.requiredPPSRaw !== req.requiredPPS) {
    text += ` _(bruto tras escala: ${req.requiredPPSRaw}; tope correlacionado con Gbps)_`;
  }
  text += `\n- PoE requerido: ${req.requiredPoE} W\n`;

  if (catalog.hardwareSku) {
    text += `\n💼 SKU equipo (catálogo): \`${catalog.hardwareSku}\`\n`;
  }

  const licenseSkuSummary = [];
  if (mandatorySku) {
    licenseSkuSummary.push(`FortiCare (${support.type}): \`${mandatorySku}\``);
  }
  if (cloudSku) {
    licenseSkuSummary.push(`FortiSwitch Cloud Management: \`${cloudSku}\``);
  }
  for (const lab of addOnLabels) {
    const sk = addonSkus[lab];
    if (sk) licenseSkuSummary.push(`${lab}: \`${sk}\``);
  }
  if (licenseSkuSummary.length) {
    text += `\n📋 Resumen — SKU de licencias (cotización)\n`;
    text += `${licenseSkuSummary.map((line) => `- ${line}`).join('\n')}\n`;
  }

  console.log('[fortiswitch.flow] seleccionado', structured.model?.UNIT, 'validos filtrados desde DB');

  return {
    done: true,
    assistantMessage: text,
    recommendation: structured,
  };
}

export default { runFortiSwitchSizingFromPayload };
