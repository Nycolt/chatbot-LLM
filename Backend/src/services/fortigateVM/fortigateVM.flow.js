import {
  FORTIGATE_VM_RANGES,
  listOptions,
  pickOptionByNumber,
  pickMultiOptionByNumbers,
} from './fortigateVM.ranges.js';
import { bundleFromSecurityProfile } from './fortigateVM.engine.js';
import { computeFortigateVMRequirements } from './fortigateVM.requirements.js';
import { loadFortigateVmSpecRows, selectBestFortigateVMModel } from './fortigateVM.modelSelector.js';
import { loadFortigateVmLicenseOffers, selectPrimaryVmLicense } from './fortigateVM.licenses.js';
import { loadFortigateVmBundleOffers, selectVmBundleOffer } from './fortigateVM.bundles.js';

const vmSessions = new Map();

/** Preguntas 1–10 */
const VM_QUESTION_DEFS_CORE = [
  {
    key: 'deployType',
    label:
      '¿Dónde planeas implementar la solución?\nSelecciona el entorno donde desplegarás el firewall virtual:',
    options: FORTIGATE_VM_RANGES.deployType,
    multi: false,
    required: true,
  },
  {
    key: 'capacity',
    label: '¿Qué tamaño de carga esperas manejar con el firewall?\nPiensa en el tamaño de tu empresa o red:',
    options: FORTIGATE_VM_RANGES.capacity,
    multi: false,
    required: true,
  },
  {
    key: 'endpoints',
    label:
      '¿Cuántos dispositivos o usuarios tendrá la solución?\nEsto incluye equipos, usuarios y dispositivos conectados:',
    options: FORTIGATE_VM_RANGES.endpoints,
    multi: false,
    required: true,
  },
  {
    key: 'vdoms',
    label:
      '¿Necesitas segmentar tu red (VDOMs)?\nEsto aplica si quieres separar entornos (ej.: clientes, áreas, servicios):',
    options: FORTIGATE_VM_RANGES.vdoms,
    multi: false,
    required: true,
  },
  {
    key: 'fortiap',
    label: '¿Gestionarás redes inalámbricas (Access Points)?',
    options: FORTIGATE_VM_RANGES.fortiap,
    multi: false,
    required: false,
  },
  {
    key: 'fortiswitch',
    label: '¿Gestionarás switches desde el firewall?',
    options: FORTIGATE_VM_RANGES.fortiswitch,
    multi: false,
    required: false,
  },
  {
    key: 'securityProfile',
    label: '¿Qué nivel de seguridad deseas aplicar?',
    options: FORTIGATE_VM_RANGES.securityProfile,
    multi: false,
    required: true,
  },
  {
    key: 'sslInspection',
    label: '¿Qué nivel de inspección HTTPS (SSL) necesitas?',
    options: FORTIGATE_VM_RANGES.sslInspection,
    multi: false,
    required: true,
  },
  {
    key: 'vpnUsage',
    label: '¿Qué nivel de uso de VPN tendrás?',
    options: FORTIGATE_VM_RANGES.vpnUsage,
    multi: false,
    required: true,
  },
  {
    key: 'growth',
    label: '¿Cómo esperas que crezca la solución en el tiempo?',
    options: FORTIGATE_VM_RANGES.growth,
    multi: false,
    required: true,
  },
];

const Q_WANTS_ADDITIONAL = {
  key: 'wantsAdditionalServices',
  label:
    '¿Deseas complementar la solución con servicios adicionales?\nSi respondes Sí, en la siguiente pregunta podrás indicar el tipo principal.',
  options: FORTIGATE_VM_RANGES.wantsAdditionalServices,
  multi: false,
  required: true,
};

const Q_ADDONS = {
  key: 'addons',
  label:
    'Selecciona una opción que mejor represente tu necesidad principal de servicio adicional:',
  options: FORTIGATE_VM_RANGES.addons,
  multi: false,
  required: true,
};

const MAX_STEP = 12;

/** Todas las claves para mapeo desde el formulario */
const ALL_QUESTION_DEFS = [...VM_QUESTION_DEFS_CORE, Q_WANTS_ADDITIONAL, Q_ADDONS];

function getQuestionByStep(step) {
  if (step >= 1 && step <= 10) return VM_QUESTION_DEFS_CORE[step - 1];
  if (step === 11) return Q_WANTS_ADDITIONAL;
  if (step === 12) return Q_ADDONS;
  return null;
}

function vmSessionKey(sessionId) {
  return String(sessionId || 'default');
}

function getSession(sessionId = 'default') {
  const key = vmSessionKey(sessionId);
  if (!vmSessions.has(key)) {
    vmSessions.set(key, { mode: 'idle', step: 0, answers: {} });
  }
  return vmSessions.get(key);
}

function resetSession(sessionId = 'default') {
  vmSessions.set(vmSessionKey(sessionId), { mode: 'idle', step: 0, answers: {} });
}

export function resetFortigateVMSession(sessionId = 'default') {
  resetSession(sessionId);
}

export function isFortigateVMSizingActive(sessionId = 'default') {
  const state = vmSessions.get(vmSessionKey(sessionId));
  return state?.mode === 'sizing';
}

function introBlock() {
  return (
    `🔐 Dimensionamiento FortiGate VM\n\n` +
    `Obtendrás: modelo VM, bundle (UTP / ATP / Enterprise) y, si lo deseas, licencia adicional.\n\n` +
    `---\n\n`
  );
}

function startMessage() {
  const q = getQuestionByStep(1);
  return (
    introBlock() +
    `Pregunta 1/${MAX_STEP}: ${q.label}\n` +
    `${listOptions(q.options)}\n\n` +
    `Responde SOLO con el número.\n\n` +
    `_Comandos:_ cancelar, salir o reset.`
  );
}

function getQuestionPrompt(step) {
  const q = getQuestionByStep(step);
  if (!q) return '';
  let hint = 'Responde SOLO con el número.';
  if (q.multi) {
    hint = 'Varios números separados por coma (ej: 1,3).';
  }
  return `Pregunta ${step}/${MAX_STEP}: ${q.label}\n${listOptions(q.options)}\n\n${hint}`;
}

function formatOfferLine(offer) {
  if (!offer) return 'N/A';
  const sku = String(offer.sku || '').trim();
  const desc = String(offer.description || '').trim();
  return desc ? `${sku} — ${desc}` : sku;
}

function buildVmPresalesResponse({
  requirements,
  modelPick,
  licensePick,
  bundleOffer,
  bundleMeta,
  answersSnapshot,
}) {
  const { capacityScore, breakdown, rulesApplied, initialVmUnit } = requirements;
  const b = breakdown;
  const rulesLines = (rulesApplied || []).map((r) => `- ${r}`).join('\n');

  let content = `📊 FortiGate VM — recomendación\n\n`;

  content += `✅ Resumen ejecutivo\n`;
  content += `- VM recomendada: ${modelPick.unit}\n`;
  content += `- Bundle (${bundleMeta.bundleLabel}): `;
  if (bundleOffer) {
    content += `${formatOfferLine(bundleOffer)}\n`;
  } else {
    content += `_SKU no localizada en catálogo_ — referencia ${bundleMeta.bundleCode} (${bundleMeta.bundleDetail})\n`;
  }

  content += `\n🔐 Licencias / servicios adicionales\n`;
  if (licensePick?.offer) {
    content += `- ${formatOfferLine(licensePick.offer)}\n`;
    if (licensePick.reason) content += `  _${licensePick.reason}_\n`;
  } else if (answersSnapshot.wantsAdditionalServices?.id === 'yes') {
    content += `- _No se encontró una SKU FC-/FCI- clara para los servicios elegidos; revisa lista de precios._\n`;
  } else {
    content += `- _No aplica — no solicitaste servicios adicionales._\n`;
  }

  content += `\n📋 Criterios y justificación\n`;
  content += `- Carga (score ${capacityScore}): capacidad ${b.capacity} + endpoints ${b.endpoints} + VPN ${b.vpn} + SSL ${b.ssl} + crecimiento ${b.growth}\n`;
  content += `- Endpoints: ${answersSnapshot.endpoints?.label || '—'}\n`;
  content += `- VPN: ${answersSnapshot.vpnUsage?.label || '—'}\n`;
  content += `- Inspección SSL: ${answersSnapshot.sslInspection?.label || '—'}\n`;
  content += `- Crecimiento: ${answersSnapshot.growth?.label || '—'}\n`;
  content += `- Perfil de seguridad: ${answersSnapshot.securityProfile?.label || '—'}\n`;
  if (rulesLines) content += `${rulesLines}\n`;
  if (!modelPick.fromSpecs) {
    content += `- ⚠️ _Sin datos completos en fortigate_vm_specs; tier por score (${initialVmUnit})._ \n`;
  } else if (modelPick.bumpedTiers > 0) {
    content += `- Ajuste datasheet: se subió tier por VDOMs, endpoints, FortiAP o FortiSwitch.\n`;
  }

  return content;
}

async function runVmSizingPipeline(answersSnapshot) {
  const requirements = computeFortigateVMRequirements(answersSnapshot);
  const specRows = await loadFortigateVmSpecRows();
  const modelPick = selectBestFortigateVMModel(requirements, specRows);
  const bundleMeta = bundleFromSecurityProfile(answersSnapshot.securityProfile);
  const bundleRows = await loadFortigateVmBundleOffers();
  const bundleOffer = selectVmBundleOffer(bundleMeta.bundleCode, bundleRows);
  const licenseRows = await loadFortigateVmLicenseOffers();
  const licensePick = selectPrimaryVmLicense(answersSnapshot, licenseRows);

  return { requirements, modelPick, licensePick, bundleOffer, bundleMeta };
}

async function finalizeSizingSession(sessionId, answersSnapshot) {
  const { requirements, modelPick, licensePick, bundleOffer, bundleMeta } = await runVmSizingPipeline(answersSnapshot);
  const assistantMessage = buildVmPresalesResponse({
    requirements,
    modelPick,
    licensePick,
    bundleOffer,
    bundleMeta,
    answersSnapshot,
  });
  if (sessionId != null) resetSession(sessionId);
  return {
    done: true,
    assistantMessage,
    state: getSession(sessionId),
    recommendation: {
      solution: 'FortiGate VM',
      vmUnit: modelPick.unit,
      capacityScore: requirements.capacityScore,
      specMatched: modelPick.fromSpecs,
      bumpedTiers: modelPick.bumpedTiers,
      bundleCode: bundleMeta.bundleCode,
      bundleOffer: bundleOffer || null,
      bundleLabel: bundleMeta.bundleLabel,
      licenseOffer: licensePick?.offer || null,
      additionalOffer: licensePick?.offer || null,
      additionalOffers: licensePick?.offer ? [licensePick.offer] : [],
    },
  };
}

export async function handleFortigateVMSizingFlow({ sessionId = 'default', userText }) {
  const state = getSession(sessionId);
  const text = String(userText || '').trim();
  const lower = text.toLowerCase();

  const isHardStart =
    text === '__START_FORTIGATE_VM_SIZING__' || lower.includes('__start_fortigate_vm_sizing__');
  if (isHardStart) {
    resetSession(sessionId);
    const s = getSession(sessionId);
    s.mode = 'sizing';
    s.step = 1;
    s.answers = {};
    return { done: true, assistantMessage: startMessage(), state: s };
  }

  const wantsVmSizing =
    /dimension(ar|amiento)?.*fortigate\s*vm|fortigate\s*vm.*dimension|fg\s*-?\s*vm|fgvm/i.test(text) ||
    lower.includes('__start_fortigate_vm_sizing__');

  if (state.mode === 'idle' && !wantsVmSizing) {
    return { done: false, assistantMessage: null, state };
  }

  if (state.mode === 'idle' && wantsVmSizing) {
    state.mode = 'sizing';
    state.step = 1;
    state.answers = {};
    return { done: true, assistantMessage: startMessage(), state };
  }

  if (state.mode === 'sizing' && /cancelar|cancel|salir|parar|reset/.test(lower)) {
    resetSession(sessionId);
    return {
      done: true,
      assistantMessage: 'Listo ✅ Cancelé el dimensionamiento de FortiGate VM.',
      state: getSession(sessionId),
    };
  }

  const question = getQuestionByStep(state.step);
  if (!question) return { done: false, assistantMessage: null, state };

  let picked = null;
  if (question.multi) {
    picked = pickMultiOptionByNumbers(text, question.options);
  } else {
    picked = pickOptionByNumber(text, question.options);
  }

  const multiInvalid = question.multi && (!picked || !picked.length);
  const singleInvalid = !question.multi && !picked;
  if (multiInvalid || singleInvalid) {
    return {
      done: true,
      assistantMessage: question.multi
        ? 'Responde con números válidos separados por coma.'
        : question.key === 'addons'
          ? `Elige un número del 1 al ${question.options.length} (un solo servicio adicional).`
          : `Responde con un número válido (1 a ${question.options.length}).`,
      state,
    };
  }

  state.answers[question.key] = picked;

  if (question.key === 'wantsAdditionalServices' && picked.id === 'no') {
    state.answers.addons = [];
    const answersSnapshot = applyOptionalDefaults(applyAddonGate({ ...state.answers }));
    return finalizeSizingSession(sessionId, answersSnapshot);
  }

  if (question.key === 'addons') {
    const answersSnapshot = applyOptionalDefaults(applyAddonGate({ ...state.answers }));
    return finalizeSizingSession(sessionId, answersSnapshot);
  }

  state.step += 1;
  return {
    done: true,
    assistantMessage: `Perfecto ✅\n\n${getQuestionPrompt(state.step)}`,
    state,
  };
}

function mapSingleField(options, raw) {
  if (raw == null || !Array.isArray(options)) return null;
  if (Array.isArray(raw)) return null;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1 || n > options.length) return null;
  return options[n - 1];
}

function mapMultiField(options, raw) {
  if (!Array.isArray(options)) return null;
  let nums = [];
  if (Array.isArray(raw)) {
    nums = raw.map((x) => Number(x)).filter((x) => Number.isInteger(x) && x >= 1 && x <= options.length);
  } else if (raw != null) {
    const n = Number(raw);
    if (Number.isInteger(n) && n >= 1 && n <= options.length) nums = [n];
  }
  const uniq = [...new Set(nums)].sort((a, b) => a - b);
  if (!uniq.length) return [];
  return uniq.map((i) => options[i - 1]);
}

function applyAddonGate(out) {
  if (out.wantsAdditionalServices?.id === 'no') {
    out.addons = [];
    return out;
  }
  const a = out.addons;
  if (a != null && !Array.isArray(a) && typeof a === 'object' && a.id) {
    out.addons = [a];
  }
  return out;
}

function applyOptionalDefaults(mapped) {
  const out = { ...mapped };
  for (const q of ALL_QUESTION_DEFS) {
    if (q.required === false && q.multi && (out[q.key] == null || !Array.isArray(out[q.key]))) {
      out[q.key] = [];
    }
    if (q.required === false && !q.multi && !out[q.key] && q.options?.[0]) {
      out[q.key] = q.options[0];
    }
  }
  return out;
}

function mapFormAnswersToState(formAnswers) {
  const out = {};
  for (const q of ALL_QUESTION_DEFS) {
    const raw = formAnswers[q.key];
    out[q.key] = q.multi ? mapMultiField(q.options, raw) : mapSingleField(q.options, raw);
  }
  return applyAddonGate(applyOptionalDefaults(out));
}

export async function runFortigateVMSizingFromPayload(formAnswers) {
  const answersSnapshot = mapFormAnswersToState(formAnswers || {});

  if (!answersSnapshot.wantsAdditionalServices) {
    return {
      done: true,
      assistantMessage: 'Indica si deseas servicios adicionales (pregunta obligatoria).',
    };
  }

  if (answersSnapshot.wantsAdditionalServices.id === 'yes') {
    const add = answersSnapshot.addons;
    const ok = Array.isArray(add) ? add.length > 0 : Boolean(add?.id);
    if (!ok) {
      return {
        done: true,
        assistantMessage:
          'Selecciona un tipo de servicio adicional en el desplegable o elige «No necesito servicios adicionales».',
      };
    }
  }

  for (const q of ALL_QUESTION_DEFS) {
    if (q.key === 'addons') continue;
    if (q.required === false) continue;
    const v = answersSnapshot[q.key];
    if (q.multi) {
      if (!Array.isArray(v)) {
        return { done: true, assistantMessage: 'Faltan respuestas válidas en el formulario.' };
      }
    } else if (!v) {
      return { done: true, assistantMessage: 'Faltan respuestas obligatorias en el formulario.' };
    }
  }

  return finalizeSizingSession(null, answersSnapshot);
}
