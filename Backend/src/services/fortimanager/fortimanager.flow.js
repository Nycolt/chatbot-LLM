/**
 * Flujo dimensionamiento FortiManager: chat secuencial y POST /sizing/submit.
 */

import {
  runFortiManagerSizingEngine,
  runFortiManagerSizingFromAnswers,
} from './fortimanagerSizingEngine.js';

const sessions = new Map();

function getSession(sessionId = 'default') {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, { mode: 'idle', step: 1, answers: {} });
  }
  return sessions.get(sessionId);
}

export function resetFortiManagerSession(sessionId = 'default') {
  sessions.set(sessionId, { mode: 'idle', step: 1, answers: {} });
}

export function isFortiManagerSizingActive(sessionId = 'default') {
  const s = sessions.get(sessionId);
  return s?.mode === 'fortimanager_sizing';
}

/**
 * @param {{ sessionId?: string, userText: string }} params
 */
export async function handleFortiManagerSizingFlow({ sessionId = 'default', userText }) {
  let state = getSession(sessionId);
  if (state.mode !== 'fortimanager_sizing') {
    state = { mode: 'fortimanager_sizing', step: 1, answers: {} };
    sessions.set(sessionId, state);
  }

  const engineIn = { step: state.step, answers: state.answers };
  const r = runFortiManagerSizingEngine(engineIn, userText);
  const merged = { mode: 'fortimanager_sizing', step: r.state.step, answers: r.state.answers };
  sessions.set(sessionId, merged);

  if (!r.done) {
    return { done: false, assistantMessage: r.assistantMessage, state: merged };
  }

  const { assistantMessage, recommendation, requirements } = await runFortiManagerSizingFromAnswers(
    merged.answers,
  );
  resetFortiManagerSession(sessionId);
  return { done: true, assistantMessage, recommendation, requirements, state: null };
}

/**
 * @param {Record<string, unknown>} formAnswers
 */
function parsePayloadAddOns(v) {
  if (v == null) return [];
  if (Array.isArray(v)) return v.map(Number).filter((n) => n >= 1 && n <= 6);
  const s = String(v).trim();
  if (!s) return [];
  if ((s.startsWith('[') && s.endsWith(']')) || (s.startsWith('[') && s.includes(']'))) {
    try {
      const parsed = JSON.parse(s);
      if (Array.isArray(parsed)) return parsed.map(Number).filter((n) => n >= 1 && n <= 6);
    } catch {
      /* seguir con split */
    }
  }
  return s
    .split(/[,;\s]+/)
    .map((x) => Number(x.trim()))
    .filter((n) => n >= 1 && n <= 6);
}

export async function runFortiManagerSizingFromPayload(formAnswers) {
  const requiredKeys = [
    'devicesRange',
    'growth',
    'logsPerDay',
    'logActivity',
    'storageNeed',
    'vdoms',
    'operationLevel',
    'supportLevel',
    'wantsAdditionalLicenses',
  ];
  const answers = {};
  for (const k of requiredKeys) {
    const n = Number(formAnswers[k]);
    if (!Number.isFinite(n)) {
      return {
        done: true,
        assistantMessage: `Falta o no es numérico el campo obligatorio: ${k}.`,
      };
    }
    answers[k] = n;
  }
  const wantsMore = answers.wantsAdditionalLicenses;
  if (wantsMore !== 1 && wantsMore !== 2) {
    return {
      done: true,
      assistantMessage:
        'La pregunta sobre licencias adicionales debe ser 1 (Sí) o 2 (No). Vuelve a enviar el formulario.',
    };
  }
  answers.addOns = wantsMore === 2 ? [] : parsePayloadAddOns(formAnswers.addOns);

  const { assistantMessage, recommendation, requirements } = await runFortiManagerSizingFromAnswers(answers);
  return {
    done: true,
    assistantMessage,
    recommendation,
    requirements,
  };
}
