/**
 * Dispatcher de dimensionamiento: delega según solutionType (1-9).
 * Formulario: FortiGate (1), FortiGate VM (2), FortiWiFi (3). Chat secuencial donde aplica.
 */

import {
  handleFortigateSizingFlow,
  runFortigateSizingFromPayload,
  isFortigateSizingActive,
} from './fortigateSizing.service.js';
import {
  handleFortigateVMSizingFlow,
  runFortigateVMSizingFromPayload,
  isFortigateVMSizingActive,
} from './fortigateVMSizing.service.js';
import { runFortiWifiSizingFromPayload } from './fortiwifiSizing.service.js';
import { runFortiAnalyzerSizingFromPayload } from './fortianalyzerSizing.service.js';
import {
  handleFortiManagerSizingFlow,
  isFortiManagerSizingActive,
  runFortiManagerSizingFromPayload,
} from './fortimanagerSizing.service.js';
import { runFortiSwitchSizingFromPayload } from './fortiswitchSizing.service.js';

const SOLUTION_TYPES = {
  FORTIGATE: 1,
  FORTIGATE_VM: 2,
  FORTIWIFI: 3,
  FORTIANALYZER: 4,
  FORTIMANAGER: 5,
  FORTISWITCH: 6,
  FORTIAP: 7,
  FORTIMAIL: 8,
  FORTIWEB: 9,
};

/**
 * Flujo por chat: un mensaje a la vez.
 * @param {{ sessionId: string, userText: string, solutionType?: number }} params
 * @returns {Promise<{ done: boolean, assistantMessage: string | null, state?: object }>}
 */
export async function handleSizingFlow({ sessionId = 'default', userText, solutionType = SOLUTION_TYPES.FORTIGATE }) {
  if (solutionType === SOLUTION_TYPES.FORTIGATE) {
    return handleFortigateSizingFlow({ sessionId, userText });
  }
  if (solutionType === SOLUTION_TYPES.FORTIMANAGER) {
    return handleFortiManagerSizingFlow({ sessionId, userText });
  }
  const lower = String(userText || '').toLowerCase();
  const wantsSizing = /dimension(ar|amiento)?|sizing|recomendar/i.test(lower);
  if (wantsSizing) {
    return {
      done: true,
      assistantMessage: `Por ahora solo está disponible el dimensionamiento de FortiGate (opción 1). Elige "1" en el menú para dimensionar FortiGate.`,
      state: null,
    };
  }
  return { done: false, assistantMessage: null, state: null };
}

/**
 * Ejecuta dimensionamiento con respuestas en lote (formulario).
 * @param {{ solutionType: number, answers: object }} params
 * @returns {Promise<{ done: boolean, assistantMessage: string, recommendation?: object }>}
 */
export async function runSizingFromPayload({ solutionType, answers }) {
  if (solutionType === SOLUTION_TYPES.FORTIGATE) {
    return runFortigateSizingFromPayload(answers);
  }
  if (solutionType === SOLUTION_TYPES.FORTIGATE_VM) {
    return runFortigateVMSizingFromPayload(answers);
  }
  if (solutionType === SOLUTION_TYPES.FORTIWIFI) {
    return runFortiWifiSizingFromPayload(answers);
  }
  if (solutionType === SOLUTION_TYPES.FORTIANALYZER) {
    return runFortiAnalyzerSizingFromPayload(answers);
  }
  if (solutionType === SOLUTION_TYPES.FORTIMANAGER) {
    return runFortiManagerSizingFromPayload(answers);
  }
  if (solutionType === SOLUTION_TYPES.FORTISWITCH) {
    return runFortiSwitchSizingFromPayload(answers);
  }
  return {
    done: true,
    assistantMessage: 'Dimensionamiento para esta solución aún no implementado. Usa el menú y elige una opción disponible.',
  };
}

export { SOLUTION_TYPES, isFortiManagerSizingActive };
