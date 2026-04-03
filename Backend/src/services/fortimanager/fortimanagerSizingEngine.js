/**
 * Motor de dimensionamiento FortiManager (preventa).
 * Datos: `fortimanager_specs` (devices_vdoms_default, gb_per_day, usable_storage_after_raid, …).
 * Chat: `runFortiManagerSizingEngine(state, userInput)`.
 */

import { FortimanagerSpec } from '../../models/SolutionSpecs.models.js';
import ProductModel from '../../models/ProductModel.model.js';
import Solution from '../../models/Solution.model.js';
import {
  FORTIMANAGER_DEVICES_RANGE,
  FORTIMANAGER_GROWTH,
  FORTIMANAGER_LOGS_PER_DAY,
  FORTIMANAGER_LOG_ACTIVITY,
  FORTIMANAGER_STORAGE_NEED,
  FORTIMANAGER_VDOMS,
  FORTIMANAGER_OPERATION,
  FORTIMANAGER_SUPPORT,
  FORTIMANAGER_WANTS_ADDITIONAL_LICENSES,
  FORTIMANAGER_ADDON_OPTIONS,
} from './fortimanager.ranges.js';

/** SKUs indicativos (Fortinet usa referencias FC-10-* por familia; confirmar en lista de precios). */
export const LICENSE_SKUS = {
  premium: 'FC-10-M3K7G-1118-02-DD',
  elite: 'FC-10-M3K7G-284-02-DD',
  upgrade: 'FC-10-M3K7G-204-02-DD',
  nextDay: 'FC-10-M3K7G-210-02-DD',
  rma4h: 'FC-10-M3K7G-211-02-DD',
  onsite4h: 'FC-10-M3K7G-212-02-DD',
  secureRma: 'FC-10-M3K7G-301-02-DD',
};

export const SUPPORT_AUTO = 1;
export const SUPPORT_PREMIUM = 2;
export const SUPPORT_ELITE = 3;

const MARGIN = 1.2;

/** Fallback solo si la tabla está vacía o sin parseo (no sustituye datasheet cargado). */
export const FORTIMANAGER_MODEL_FALLBACK = [
  { unit: 'FMG-200G', devices: 30, gbDay: 2, storageTb: 4 },
  { unit: 'FMG-410G', devices: 150, gbDay: 2, storageTb: 24 },
  { unit: 'FMG-1000G', devices: 1000, gbDay: 2, storageTb: 24 },
  { unit: 'FMG-3100G', devices: 4000, gbDay: 10, storageTb: 56 },
  { unit: 'FMG-3700G', devices: 10000, gbDay: 10, storageTb: 224 },
  { unit: 'FMG-3750G', devices: 10000, gbDay: 10, storageTb: 336 },
];

const FMG_APPLIANCE_RE = /^FMG-\d{3,4}G$/i;

function parseIntLoose(v) {
  if (v == null || v === '') return null;
  const m = String(v).replace(/,/g, '').match(/(\d+)/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

function parseFloatLoose(v) {
  if (v == null || v === '') return null;
  const m = String(v).replace(/,/g, '').match(/(\d+(?:\.\d+)?)/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

/** "56 TB", "336TB (RAID 50…)" → TB numérico */
export function parseUsableStorageTb(v) {
  if (v == null || v === '') return null;
  const s = String(v);
  const m = s.match(/(\d+(?:\.\d+)?)\s*TB\b/i);
  if (m) return Number(m[1]);
  return parseFloatLoose(s);
}

/**
 * @param {import('sequelize').Model | Record<string, unknown>} row
 */
export function normalizeFortiManagerSpecRow(row) {
  const o = row?.get ? row.get({ plain: true }) : row;
  const unit = String(o.unit || '').trim().toUpperCase();
  if (!FMG_APPLIANCE_RE.test(unit)) return null;

  const devicesDefault = parseIntLoose(o.devices_vdoms_default);
  const devicesMax = parseIntLoose(o.devices_vdoms_maximum);
  const gbPerDay = parseFloatLoose(o.gb_per_day);
  const sustainedLogRates = parseIntLoose(o.sustained_log_rates);
  const storageTb = parseUsableStorageTb(o.usable_storage_after_raid);

  return {
    UNIT: unit,
    devicesDefault: devicesDefault ?? 0,
    devicesMax: devicesMax,
    gbPerDay: gbPerDay ?? 0,
    sustainedLogRates: sustainedLogRates,
    storageTb: storageTb ?? 0,
    raw: o,
  };
}

function fallbackModelsFromConstants() {
  return normalizeAndSortModels(
    FORTIMANAGER_MODEL_FALLBACK.map((m) => ({
      unit: m.unit,
      devices_vdoms_default: String(m.devices),
      gb_per_day: String(m.gbDay),
      usable_storage_after_raid: `${m.storageTb} TB`,
    })),
  );
}

function normalizeAndSortModels(rows) {
  const list = rows.map(normalizeFortiManagerSpecRow).filter(Boolean);
  list.sort((a, b) => a.devicesDefault - b.devicesDefault || a.UNIT.localeCompare(b.UNIT));
  return list;
}

/**
 * Carga filas desde BD (solo appliances FMG-NNNG con capacidad parseable).
 */
export async function loadFortiManagerSpecRows() {
  const rows = await FortimanagerSpec.findAll({
    attributes: [
      'unit',
      'devices_vdoms_default',
      'devices_vdoms_maximum',
      'gb_per_day',
      'sustained_log_rates',
      'usable_storage_after_raid',
    ],
    raw: true,
  });
  const normalized = normalizeAndSortModels(rows).filter((m) => m.devicesDefault > 0);
  if (normalized.length) return normalized;
  return fallbackModelsFromConstants();
}

export async function resolveFortiManagerHardwareSku(unit) {
  const u = String(unit || '').trim();
  if (!u) return { sku: null };
  const solution = await Solution.findOne({ where: { code: 'fortimanager' } });
  if (!solution?.id) return { sku: null };
  const pm = await ProductModel.findOne({
    where: { solution_id: solution.id, unit: u },
    attributes: ['sku_base', 'unit'],
  });
  const sku = pm?.sku_base ? String(pm.sku_base).trim() : null;
  return { sku: sku || null };
}

function mapDevicesRange(opt) {
  const map = { 1: 30, 2: 150, 3: 1000, 4: 4000, 5: 10000, 6: 20000 };
  return map[Number(opt)] ?? 1000;
}

function mapGrowth(opt) {
  const map = { 1: 1, 2: 1.3, 3: 1.6, 4: 2 };
  return map[Number(opt)] ?? 1.3;
}

function mapLogsPerDay(opt) {
  const map = { 1: 2, 2: 10, 3: 20, 4: 5 };
  return map[Number(opt)] ?? 5;
}

function mapStorageNeed(opt) {
  const map = { 1: 4, 2: 24, 3: 56, 4: 200 };
  return map[Number(opt)] ?? 24;
}

function mapLogActivity(opt) {
  const map = { 1: 1, 2: 1.2, 3: 1.5, 4: 2 };
  return map[Number(opt)] ?? 1;
}

export class FortiManagerEngine {
  /**
   * @param {ReturnType<normalizeFortiManagerSpecRow>[]} models
   */
  constructor(models) {
    this.models = Array.isArray(models) ? models : [];
  }

  /**
   * @param {Record<string, unknown>} raw - índices 1-based del formulario
   */
  normalizeInputs(raw = {}) {
    const wants = Number(raw.wantsAdditionalLicenses);
    const addOns =
      wants === 2 ? [] : coerceAddOns(raw.addOns);
    return {
      devicesRange: Number(raw.devicesRange) || 3,
      growth: Number(raw.growth) || 2,
      logsPerDay: Number(raw.logsPerDay) || 4,
      logActivity: Number(raw.logActivity) || 2,
      storageNeed: Number(raw.storageNeed) || 2,
      vdoms: Number(raw.vdoms) || 1,
      operationLevel: Number(raw.operationLevel) || 2,
      supportLevel: Number(raw.supportLevel) || 1,
      wantsAdditionalLicenses:
        wants === 1 || wants === 2 ? wants : undefined,
      addOns,
    };
  }

  /**
   * @param {ReturnType<FortiManagerEngine['normalizeInputs']>} input
   */
  calculateRequirements(input) {
    const devices = mapDevicesRange(input.devicesRange);
    const growth = mapGrowth(input.growth);
    const logsPerDay = mapLogsPerDay(input.logsPerDay);
    const logActivity = mapLogActivity(input.logActivity);
    const storageNeedTb = mapStorageNeed(input.storageNeed);

    const requiredDevices = devices * growth * MARGIN;
    const requiredLogsGb = logsPerDay * logActivity * growth * MARGIN;
    const requiredStorageTb = storageNeedTb * growth * MARGIN;

    return {
      devices,
      growth,
      logsPerDay,
      logActivity,
      storageNeedTb,
      requiredDevices,
      requiredLogsGb,
      requiredStorageTb,
    };
  }

  /**
   * @param {ReturnType<FortiManagerEngine['calculateRequirements']>} req
   * @param {ReturnType<normalizeFortiManagerSpecRow>} model
   * @param {{ skipLogs?: boolean }} [opts]
   */
  evaluateModel(req, model, opts = {}) {
    const dOk = model.devicesDefault >= req.requiredDevices;
    const sOk = model.storageTb >= req.requiredStorageTb;
    const lOk = opts.skipLogs || model.gbPerDay >= req.requiredLogsGb;
    return dOk && sOk && lOk;
  }

  /**
   * @param {ReturnType<FortiManagerEngine['calculateRequirements']>} req
   * @param {ReturnType<FortiManagerEngine['normalizeInputs']>} input
   */
  selectBestModel(req, input) {
    const warnings = [];
    const sorted = [...this.models];

    let picked = null;
    for (const m of sorted) {
      if (this.evaluateModel(req, m)) {
        picked = m;
        break;
      }
    }

    if (!picked) {
      for (const m of sorted) {
        if (this.evaluateModel(req, m, { skipLogs: true })) {
          picked = m;
          warnings.push(
            'Ningún modelo cumplió simultáneamente el umbral de GB/día calculado y devices/almacenamiento; se eligió el primero que cumple devices y almacenamiento (revisa ingest del datasheet o volumen de logs).',
          );
          break;
        }
      }
    }

    if (!picked) {
      picked = sorted[sorted.length - 1] || null;
      if (picked) {
        warnings.push(
          'Requisitos por encima del catálogo parseado: se recomienda el modelo de mayor capacidad listado; valida con preventa Fortinet.',
        );
      }
    }

    let unit = picked?.UNIT;
    if (!unit) {
      return { model: null, warnings, bumpSteps: 0 };
    }

    const idx = sorted.findIndex((m) => m.UNIT === unit);
    let bumpSteps = 0;
    if (mapGrowth(input.growth) >= 1.6) {
      bumpSteps += 1;
    }
    if (input.vdoms >= 3) bumpSteps += 1;
    if (input.operationLevel >= 3) bumpSteps += 1;

    const j = Math.min(Math.max(idx, 0) + bumpSteps, sorted.length - 1);
    const finalModel = sorted[j];
    if (bumpSteps > 0 && finalModel.UNIT !== unit) {
      warnings.push(
        `Escalado por crecimiento alto, VDOMs u operación avanzada: de ${unit} a ${finalModel.UNIT}.`,
      );
    }

    return { model: finalModel, warnings, bumpSteps };
  }

  /**
   * @param {ReturnType<FortiManagerEngine['normalizeInputs']>} input
   */
  selectSupport(input) {
    const sl = Number(input.supportLevel) || SUPPORT_AUTO;
    if (sl === SUPPORT_PREMIUM) return { type: 'FortiCare Premium', sku: LICENSE_SKUS.premium };
    if (sl === SUPPORT_ELITE) return { type: 'FortiCare Elite', sku: LICENSE_SKUS.elite };
    if (input.operationLevel >= 3 || input.logActivity >= 3) {
      return { type: 'FortiCare Elite', sku: LICENSE_SKUS.elite, auto: true };
    }
    return { type: 'FortiCare Premium', sku: LICENSE_SKUS.premium, auto: true };
  }

  /**
   * @param {Record<string, unknown>} answers
   */
  buildFortiManagerLicenses(selectedModel, answers, support) {
    const lines = [];

    lines.push({
      name: support.type,
      sku: support.sku,
      mandatory: true,
    });

    const wantsExtra = Number(answers.wantsAdditionalLicenses);
    const addOns =
      wantsExtra === 2 ? [] : coerceAddOns(answers.addOns);
    const addonDefs = [
      { id: 1, name: 'Generative AI Management', sku: null },
      { id: 2, name: 'Next Day RMA', sku: LICENSE_SKUS.nextDay },
      { id: 3, name: '4-Hour Hardware RMA', sku: LICENSE_SKUS.rma4h },
      { id: 4, name: '4-Hour Onsite Engineer', sku: LICENSE_SKUS.onsite4h },
      { id: 5, name: 'Secure RMA Service', sku: LICENSE_SKUS.secureRma },
      { id: 6, name: 'Upgrade Premium → Elite', sku: LICENSE_SKUS.upgrade },
    ];

    for (const id of addOns) {
      const def = addonDefs.find((x) => x.id === id);
      if (!def) continue;
      lines.push({ name: def.name, sku: def.sku, mandatory: false });
    }

    return { lines };
  }

  /**
   * @param {ReturnType<normalizeFortiManagerSpecRow> | null} selected
   * @param {ReturnType<FortiManagerEngine['selectSupport']>} support
   * @param {string[]} warnings
   * @param {ReturnType<FortiManagerEngine['calculateRequirements']>} req
   * @param {string | null} hwSku
   */
  buildResult(selected, support, licenseBundle, warnings, req, hwSku) {
    return {
      model: {
        UNIT: selected?.UNIT ?? null,
        SKU: hwSku || null,
      },
      support: {
        type: support.type,
        sku: support.sku,
        auto: Boolean(support.auto),
      },
      licenses: licenseBundle.lines,
      reasoning: {
        devices: `Dispositivos declarados (rango): ~${req.devices}; requisito con crecimiento y margen ${MARGIN}: ${Math.ceil(req.requiredDevices)} (referencia devices/VDOMs default datasheet).`,
        logs: `Logs ~${req.logsPerDay} GB/día × actividad × crecimiento × margen → ${req.requiredLogsGb.toFixed(1)} GB/día requeridos vs. ficha.`,
        storage: `Almacenamiento útil requerido ~${req.requiredStorageTb.toFixed(1)} TB (tras RAID, margen incluido).`,
      },
      warnings: warnings || [],
    };
  }
}

const TOTAL_STEPS = 10;
/** Mismo orden que el formulario web (alcance → crecimiento → VDOMs → operación → logs → actividad → almacenamiento → licencias). */
const STEP_KEYS = [
  'devicesRange',
  'growth',
  'vdoms',
  'operationLevel',
  'logsPerDay',
  'logActivity',
  'storageNeed',
  'supportLevel',
  'wantsAdditionalLicenses',
  'addOns',
];

function coerceAddOns(raw) {
  if (raw == null) return [];
  if (Array.isArray(raw)) {
    return raw.map(Number).filter((n) => n >= 1 && n <= 6);
  }
  const s = String(raw).trim();
  if (!s) return [];
  return s
    .split(/[,;\s]+/)
    .map((x) => Number(x.trim()))
    .filter((n) => n >= 1 && n <= 6);
}

function listOptionsLines(options) {
  return (options || []).map((o) => `${o.value}️⃣ ${o.label}`).join('\n');
}

const FMG_PROMPT_BUILDERS = [
  () =>
    `📊 Dimensionamiento de FortiManager\n\nResponde las siguientes preguntas para recomendar el modelo adecuado y, si lo deseas, las licencias asociadas.\n\n🧩 1/${TOTAL_STEPS} — Alcance de gestión (obligatorio)\n\n¿Cuántos dispositivos (FortiGate / FortiWiFi / VDOMs) necesitas administrar?\n\n${listOptionsLines(FORTIMANAGER_DEVICES_RANGE)}\n\nResponde SOLO con el número.`,
  () =>
    `📈 2/${TOTAL_STEPS} — Crecimiento esperado (obligatorio)\n\n¿Cómo proyectas el crecimiento de tu infraestructura en los próximos 2–3 años?\n\n${listOptionsLines(FORTIMANAGER_GROWTH)}\n\nResponde con el número.`,
  () =>
    `🧠 3/${TOTAL_STEPS} — Uso de segmentación (VDOMs)\n\n¿Tus dispositivos utilizan múltiples VDOMs?\n\n${listOptionsLines(FORTIMANAGER_VDOMS)}\n\nResponde con el número.`,
  () =>
    `⚙️ 4/${TOTAL_STEPS} — Nivel de operación (obligatorio)\n\n¿Qué tipo de gestión necesitas realizar?\n\n${listOptionsLines(FORTIMANAGER_OPERATION)}\n\nResponde con el número.`,
  () =>
    `📊 5/${TOTAL_STEPS} — Volumen de logs\n\n¿Cuánto volumen de logs genera tu red diariamente?\n\n${listOptionsLines(FORTIMANAGER_LOGS_PER_DAY)}\n\nResponde con el número.`,
  () =>
    `⚡ 6/${TOTAL_STEPS} — Nivel de actividad de la red\n\n¿Qué tan activa es tu red en términos de eventos y cambios?\n\n${listOptionsLines(FORTIMANAGER_LOG_ACTIVITY)}\n\nResponde con el número.`,
  () =>
    `💾 7/${TOTAL_STEPS} — Necesidad de almacenamiento\n\n¿Qué nivel de almacenamiento necesitas para configuraciones, backups o auditoría?\n\n${listOptionsLines(FORTIMANAGER_STORAGE_NEED)}\n\nResponde con el número.`,
  () =>
    `🔐 8/${TOTAL_STEPS} — Nivel de soporte\n\nSelecciona el nivel de soporte deseado.\n\n💡 Nota: FortiCare Premium es el soporte mínimo requerido para cualquier implementación.\n\n${listOptionsLines(FORTIMANAGER_SUPPORT)}\n\nResponde con el número.`,
  () =>
    `🔐 Licencias y servicios (opcional)\n\nPara mostrar la lista de servicios adicionales, indica si deseas valorarlos en la cotización:\n\n${listOptionsLines(FORTIMANAGER_WANTS_ADDITIONAL_LICENSES)}\n\nResponde 1 (Sí) o 2 (No).`,
  () =>
    `🔧 9. Servicios adicionales — pregunta ${TOTAL_STEPS}/${TOTAL_STEPS} (solo si elegiste Sí antes).\n\nPuedes enviar números separados por coma, o vacío si no quieres ninguno.\n\n${listOptionsLines(FORTIMANAGER_ADDON_OPTIONS)}`,
];

/**
 * Un paso del flujo chat. Si `done: true`, el caller debe ejecutar `runFortiManagerSizingFromAnswers(answers)` (async).
 * @param {{ mode?: string, step?: number, answers?: Record<string, unknown> }} state
 * @param {string} userInput
 */
export function runFortiManagerSizingEngine(state, userInput) {
  const text = String(userInput || '').trim();
  let step = Number(state?.step) || 1;
  const answers = { ...(state?.answers || {}) };

  if (step < 1) step = 1;
  if (step > TOTAL_STEPS) step = TOTAL_STEPS;

  const firstEmpty = STEP_KEYS.findIndex((k) => answers[k] === undefined);
  if (text === '' && firstEmpty === 0) {
    return {
      state: { mode: 'fortimanager', step: 1, answers },
      assistantMessage: FMG_PROMPT_BUILDERS[0](),
      done: false,
    };
  }

  if (firstEmpty >= 0) {
    step = firstEmpty + 1;
    const key = STEP_KEYS[firstEmpty];

    if (text === '' && key !== 'addOns') {
      return {
        state: { mode: 'fortimanager', step, answers },
        assistantMessage: FMG_PROMPT_BUILDERS[firstEmpty](),
        done: false,
      };
    }

    if (key === 'addOns') {
      answers.addOns = text === '' ? [] : coerceAddOns(text);
    } else if (key === 'wantsAdditionalLicenses') {
      const n = Number(text);
      if (!Number.isFinite(n) || (n !== 1 && n !== 2)) {
        return {
          state: { mode: 'fortimanager', step, answers },
          assistantMessage: 'Respuesta no válida. Usa 1 (Sí) o 2 (No).',
          done: false,
        };
      }
      answers.wantsAdditionalLicenses = n;
      if (n === 2) answers.addOns = [];
    } else {
      const n = Number(text);
      if (!Number.isFinite(n)) {
        return {
          state: { mode: 'fortimanager', step, answers },
          assistantMessage: 'Respuesta no válida. Usa el número de la opción.',
          done: false,
        };
      }
      answers[key] = n;
    }

    const nextEmpty = STEP_KEYS.findIndex((k) => answers[k] === undefined);
    if (nextEmpty >= 0) {
      return {
        state: { mode: 'fortimanager', step: nextEmpty + 1, answers },
        assistantMessage: FMG_PROMPT_BUILDERS[nextEmpty](),
        done: false,
      };
    }
  }

  return {
    state: { mode: 'fortimanager', step: TOTAL_STEPS + 1, answers },
    assistantMessage: '',
    done: true,
  };
}

/**
 * Motor async: catálogo `fortimanager_specs` + licencias mínimas.
 * @param {Record<string, unknown>} answers
 */
export async function runFortiManagerSizingFromAnswers(answers) {
  const rows = await loadFortiManagerSpecRows();
  const engine = new FortiManagerEngine(rows);
  const input = engine.normalizeInputs(answers);
  const req = engine.calculateRequirements(input);
  const { model: selected, warnings } = engine.selectBestModel(req, input);
  if (process.env.DEBUG_FMGR_SIZING === '1') {
    console.log('[fortimanagerSizing]', { req, selected: selected?.UNIT, input });
  }
  const support = engine.selectSupport(input);
  const licenseBundle = engine.buildFortiManagerLicenses(selected, answers, support);
  const { sku: hwSku } = selected ? await resolveFortiManagerHardwareSku(selected.UNIT) : { sku: null };
  const structured = engine.buildResult(selected, support, licenseBundle, warnings, req, hwSku);

  let text = `📊 FortiManager — recomendación\n\n`;
  text += `✅ Resumen ejecutivo\n`;
  text += `- Modelo recomendado: ${structured.model.UNIT || 'N/A'}\n`;
  if (structured.model.SKU) text += `- _SKU equipo (catálogo):_ \`${structured.model.SKU}\`\n`;
  text += `\n🔐 Licencias / servicios\n`;
  for (const line of structured.licenses) {
    text += `- ${line.name}`;
    if (line.sku) text += ` — SKU: \`${line.sku}\``;
    text += line.mandatory ? ' *(contrato de soporte del appliance — obligatorio en cotización)*' : ' *(opcional)*';
    text += '\n';
  }

  const wantsNoExtras = Number(answers.wantsAdditionalLicenses) === 2;
  const optionalLines = structured.licenses.filter((l) => !l.mandatory).length;

  text += `\n📋 Nota para cotización\n`;
  text += `El ${support.type} con SKU \`${support.sku}\` es el contrato base de soporte que debe figurar junto al equipo. Sin un FortiCare activo el appliance no cumple el requisito comercial habitual de Fortinet (el hardware no se puede formalizar en preventa sin soporte).\n`;
  if (support.type === 'FortiCare Premium') {
    text += `_En Premium, la referencia suele alinearse con \`${LICENSE_SKUS.premium}\`; valida el FC-10 exacto para tu unidad en la lista de precios._\n`;
  }
  if (wantsNoExtras || optionalLines === 0) {
    text += `_No se han incluido licencias opcionales: la propuesta mínima queda en modelo recomendado + este FortiCare._\n`;
  }

  text += `\n📋 Criterios técnicos\n- ${structured.reasoning.devices}\n- ${structured.reasoning.logs}\n- ${structured.reasoning.storage}\n`;
  if (structured.warnings?.length) {
    text += `\n⚠️ Avisos\n`;
    for (const w of structured.warnings) text += `- ${w}\n`;
  }

  return { assistantMessage: text, recommendation: structured, requirements: req };
}
