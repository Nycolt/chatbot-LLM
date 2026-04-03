/**
 * Dimensionamiento FortiAnalyzer desde payload del formulario (POST /sizing/submit).
 */

import { FortiAnalyzerEngine, LICENSE_TYPES } from './fortianalyzer.engine.js';
import { normalizeSpecRow } from './fortianalyzer.metrics.js';
import {
  loadFortianalyzerSpecRows,
  resolveFortianalyzerHardwareSku,
  loadFortianalyzerLicenseOffers,
  selectFortianalyzerLicenseOffer,
} from './fortianalyzer.offers.js';

const FORM_KEYS = [
  'logsVolume',
  'analyticsLevel',
  'devices',
  'retention',
  'growth',
  'deployment',
  'performance',
  'storageType',
  'licenseOption',
];

/**
 * @param {Record<string, unknown>} formAnswers
 */
function coerceFormPayload(formAnswers = {}) {
  const out = {};
  for (const key of FORM_KEYS) {
    const v = formAnswers[key];
    if (key === 'needs') {
      out[key] = Array.isArray(v) ? v.map(Number).filter(Number.isFinite) : [];
      continue;
    }
    const n = Number(v);
    out[key] = Number.isFinite(n) ? n : null;
  }
  return out;
}

function formatSkuLine(hw, lic) {
  const parts = [];
  if (hw?.sku) parts.push(`SKU equipo: ${hw.sku}`);
  if (lic?.sku) parts.push(`SKU licencia: ${lic.sku}`);
  return parts.length ? `${parts.join('\n')}\n` : '';
}

/**
 * @param {Record<string, unknown>} formAnswers
 */
export async function runFortiAnalyzerSizingFromPayload(formAnswers) {
  const raw = coerceFormPayload(formAnswers);

  for (const key of [
    'logsVolume',
    'analyticsLevel',
    'devices',
    'retention',
    'growth',
    'deployment',
    'performance',
    'storageType',
    'licenseOption',
  ]) {
    if (raw[key] == null || !Number.isFinite(raw[key])) {
      return {
        done: true,
        assistantMessage: 'Faltan respuestas obligatorias en el formulario FortiAnalyzer.',
      };
    }
  }

  const specRows = await loadFortianalyzerSpecRows();
  if (!specRows.length) {
    return {
      done: true,
      assistantMessage:
        'No hay filas en `fortianalyzer_specs`. Carga el datasheet (PDF) o pobla la tabla antes de dimensionar.',
    };
  }

  const normalizedModels = specRows.map((r) => normalizeSpecRow(r)).filter((m) => m.UNIT);

  const engine = new FortiAnalyzerEngine(normalizedModels);
  const input = engine.normalizeInputs(raw);
  const req = engine.calculateRequirements(input);
  const selected = engine.selectBestModel(req, input);
  const licenseType = engine.selectAdditionalLicense(input);

  const warnings = [];
  const dep = engine.validateLicenseDependencies(licenseType);
  if (dep) warnings.push(dep);

  if (licenseType === LICENSE_TYPES.UPGRADE_PREMIUM_ELITE) {
    warnings.push({
      message:
        'La opción «Upgrade Premium → Elite» aplica si ya tienes FortiCare Premium activo; confirma con preventa.',
    });
  }

  const storageAdvisory = selected ? engine.buildStorageAdvisoryMessage(selected, req) : null;
  if (storageAdvisory) {
    warnings.push({ message: storageAdvisory });
  }

  const hardwareOffer = selected ? await resolveFortianalyzerHardwareSku(selected.UNIT) : null;
  const licenseRows = await loadFortianalyzerLicenseOffers();
  const licenseOffer = selectFortianalyzerLicenseOffer(licenseType, licenseRows);

  const structured = engine.buildResult(selected, licenseType, warnings);
  if (selected && hardwareOffer?.sku) {
    structured.model.SKU = hardwareOffer.sku;
  }

  if (!selected) {
    const msg =
      `⚠️ No hay modelo en catálogo que cumpla el rendimiento indicado según \`fortianalyzer_specs\` (GB/día y logs/s de Analytics/Collector).\n\n` +
      `Umbrales usados (con margen 30% en tasas):\n` +
      `- GB/día ≥ ${req.logsPerDayGB}\n` +
      `- Analytics (logs/s) ≥ ${Math.ceil(req.logsPerSecond)}\n` +
      `- Collector (logs/s) ≥ ${Math.ceil(req.requiredCollectorLps)}\n\n` +
      `_Referencia de volumen lógico (retención; no se usa para descartar modelo): ~${Math.ceil(req.totalStorageGB)} GB._\n\n` +
      `Revisa el ingest del PDF, que las filas tengan métricas parseables o sube un datasheet más reciente.`;
    return {
      done: true,
      assistantMessage: msg,
      recommendation: {
        ...structured,
        licenseSku: licenseOffer?.sku || null,
        requirements: req,
        noModelMatch: true,
      },
    };
  }

  let text = `📊 FortiAnalyzer — recomendación\n\n`;
  text += `✅ Resumen ejecutivo\n`;
  text += `- Modelo: ${structured.model.UNIT}\n`;
  text += `- Plataforma de análisis de logs dimensionada según volumen, retención y rendimiento declarados.\n\n`;
  text += `🖥️ Equipo y referencias\n`;
  text += formatSkuLine(hardwareOffer, licenseOffer);
  text += `\n🔐 Licencias / servicios\n`;
  text += `- Tipo: ${structured.license.type}\n`;
  if (licenseOffer?.sku) {
    text += `- _SKU en catálogo:_ \`${licenseOffer.sku}\`\n`;
  } else if (!['FortiCare Premium', 'FortiCare Elite'].includes(licenseType)) {
    text += `- _Sin SKU en solution_offers para esta opción; confirma en lista de precios._\n`;
  }
  text += `\n💼 Bundle comercial\n- _No aplica bundle en este flujo (solo equipo + licencia/servicio)._\n\n`;
  text += `📋 Criterios de selección _(datasheet, margen 30% en tasas)_\n`;
  text += `- Logs/día: ${req.logsPerDayGB} GB\n`;
  text += `- Analytics: ~${Math.ceil(req.logsPerSecond)} logs/s\n`;
  text += `- Collector: ~${Math.ceil(req.requiredCollectorLps)} logs/s\n`;
  text += `- Volumen lógico (retención): ~${Math.ceil(req.totalStorageGB)} GB — revisa avisos si difiere del TB del equipo.\n`;

  if (structured.warnings?.length) {
    text += `\n⚠️ Avisos\n`;
    for (const w of structured.warnings) {
      if (w?.requires) text += `- Requiere base: ${w.requires}\n`;
      else if (w?.message) text += `- ${w.message}\n`;
      else text += `- ${JSON.stringify(w)}\n`;
    }
  }

  return {
    done: true,
    assistantMessage: text,
    recommendation: {
      ...structured,
      licenseSku: licenseOffer?.sku || null,
      requirements: req,
    },
  };
}

export default { runFortiAnalyzerSizingFromPayload };
