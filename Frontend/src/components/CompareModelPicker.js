/**
 * Delegación de clics para el selector de modelos (botones en la burbuja del asistente).
 */

import AgentService from '../services/AgentService.js';
import { renderMessages, scrollToBottom } from './ComponentesFormulario.js';

function updatePickerUi(root) {
  const selected = root.querySelectorAll('.compare-model-btn.compare-model-btn--selected');
  const n = selected.length;
  const countEl = root.querySelector('.compare-picker-count');
  if (countEl) countEl.textContent = String(n);
  const run = root.querySelector('.compare-picker-run');
  if (run) {
    run.disabled = n < 2;
    run.textContent = n < 2 ? 'Comparar' : `Comparar (${n} modelos)`;
  }
}

let delegated = false;

/**
 * Registra un único listener en el chat para botones del selector de comparación.
 * @param {HTMLElement} chatbox
 */
export function ensureComparePickerDelegation(chatbox) {
  if (!chatbox || delegated) return;
  delegated = true;

  chatbox.addEventListener('click', async (e) => {
    const root = e.target.closest('.compare-picker-root');
    if (!root) return;

    const runBtn = e.target.closest('.compare-picker-run');
    const clearBtn = e.target.closest('.compare-picker-clear');
    const modelBtn = e.target.closest('.compare-model-btn');

    if (clearBtn) {
      root
        .querySelectorAll('.compare-model-btn.compare-model-btn--selected')
        .forEach((b) => b.classList.remove('compare-model-btn--selected'));
      updatePickerUi(root);
      return;
    }

    if (modelBtn && !runBtn) {
      modelBtn.classList.toggle('compare-model-btn--selected');
      updatePickerUi(root);
      return;
    }

    if (!runBtn) return;

    e.preventDefault();
    const solution = root.dataset.solution;
    if (!solution) return;

    const selected = [
      ...root.querySelectorAll('.compare-model-btn.compare-model-btn--selected'),
    ].map((b) => b.dataset.unit).filter(Boolean);

    if (selected.length < 2) return;

    runBtn.disabled = true;
    const prevLabel = runBtn.textContent;
    runBtn.textContent = 'Comparando… (puede incluir recomendación del agente)';

    try {
      await AgentService.finishCompareFromPicker(solution, selected, () => {
        renderMessages(AgentService.getMessages());
        scrollToBottom();
      });
      renderMessages(AgentService.getMessages());
      scrollToBottom();
    } catch (err) {
      console.error('[compare picker]', err);
    } finally {
      if (runBtn.isConnected) {
        runBtn.disabled = false;
        runBtn.textContent = prevLabel;
        const still = runBtn.closest('.compare-picker-root');
        if (still) updatePickerUi(still);
      }
    }
  });
}
