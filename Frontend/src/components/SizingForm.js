/**
 * Formulario dinámico de dimensionamiento según schema del backend
 */

import { getGlobalVariable, getResolvedApiBase } from '../config/variables.js';
import { httpService } from '../config/fetch.js';

/**
 * Renderiza el formulario en el contenedor y maneja envío
 * @param {HTMLElement} container - Elemento donde insertar el formulario
 * @param {number} solutionType - menú de dimensionamiento: 1-6
 * @param {function(string)} onResult - Callback con el mensaje de respuesta del asistente
 * @param {function()} onCancel - Callback al cancelar
 */
export function renderSizingForm(container, solutionType, onResult, onCancel) {
  const apiUrl = getGlobalVariable('apiUrl') || getResolvedApiBase();

  /** No usar innerHTML en el chatbox: borra el historial. Reutilizar o añadir un solo bloque. */
  removeSizingForm(container);

  const root = document.createElement('div');
  root.id = 'sizing-form-root';
  root.className = 'bg-gray-800/95 border border-red-600 rounded-2xl p-4 my-4 text-left';
  root.innerHTML = `
      <div class="flex justify-between items-center mb-3">
        <h3 id="sizing-form-title" class="text-lg font-semibold text-white">Dimensionamiento</h3>
        <button type="button" id="sizing-form-cancel" class="text-gray-400 hover:text-white text-sm">Cancelar</button>
      </div>
      <div id="sizing-form-fields"></div>
      <div class="mt-4 flex gap-2">
        <button type="button" id="sizing-form-submit" class="bg-red-600 hover:bg-red-700 text-white font-semibold px-4 py-2 rounded-xl">Obtener recomendación</button>
      </div>
  `;
  container.appendChild(root);

  const fieldsEl = root.querySelector('#sizing-form-fields');
  const submitBtn = root.querySelector('#sizing-form-submit');
  const cancelBtn = root.querySelector('#sizing-form-cancel');

  if (!fieldsEl || !submitBtn || !cancelBtn) {
    console.error('[SizingForm] Estructura DOM incompleta');
    return;
  }

  let schema = null;
  const answers = {};

  function isFieldRequired(field) {
    if (field.type === 'static') return false;
    if (field.required === false) return false;
    if (field.showWhen) {
      const raw = answers[field.showWhen.field];
      const dep = raw === '' || raw == null ? null : Number(raw);
      if (dep == null || !field.showWhen.values.includes(dep)) return false;
    }
    return true;
  }

  function isCheckboxGroupSatisfied(field, payload) {
    if (field.type !== 'checkboxes') return true;
    const min = field.minSelected != null ? field.minSelected : 1;
    const arr = payload[field.id];
    if (min <= 0) return Array.isArray(arr);
    return Array.isArray(arr) && arr.length >= min;
  }

  function refreshConditionalFields() {
    if (!schema?.fields || !fieldsEl) return;
    schema.fields.forEach((field) => {
      if (!field.showWhen) return;
      const wrap = fieldsEl.querySelector(`[data-field-wrap="${field.id}"]`);
      if (!wrap) return;
      const raw = answers[field.showWhen.field];
      const dep = raw === '' || raw == null ? null : Number(raw);
      const show = field.showWhen.values.includes(dep);
      wrap.style.display = show ? '' : 'none';
      if (!show) {
        answers[field.id] = null;
        const sel = wrap.querySelector('select');
        if (sel) sel.value = '';
        wrap.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
          cb.checked = false;
        });
      }
    });
  }

  async function loadSchema() {
    if (!fieldsEl) return;
    try {
      const res = await httpService.get(`/sizing/schema/${solutionType}`);
      schema = res.data?.data;
      const titleEl = root.querySelector('#sizing-form-title');
      if (titleEl && schema?.name) {
        titleEl.textContent = schema.name;
      }
      if (!schema || !schema.fields || schema.fields.length === 0) {
        fieldsEl.innerHTML = '<p class="text-gray-400">No hay preguntas configuradas para esta solución. Usa el chat.</p>';
        return;
      }
      schema.fields.forEach((field) => {
        const id = field.id;
        if (field.type === 'static') {
          const block = document.createElement('div');
          const emphasis = field.staticVariant === 'emphasis';
          block.className = emphasis
            ? 'mt-4 pt-3 border-t border-gray-600 text-sm text-gray-100 font-semibold whitespace-pre-line'
            : 'mt-3 text-sm text-gray-300 whitespace-pre-line leading-relaxed';
          block.textContent = field.content || field.label || '';
          if (field.showWhen) {
            const wrap = document.createElement('div');
            wrap.dataset.fieldWrap = field.id;
            wrap.appendChild(block);
            fieldsEl.appendChild(wrap);
          } else {
            fieldsEl.appendChild(block);
          }
          return;
        }

        const label = document.createElement('label');
        label.className = 'block text-sm text-gray-300 mt-2 mb-1 whitespace-pre-line leading-relaxed';
        label.textContent = field.label;

        if (field.type === 'checkboxes') {
          if (!Array.isArray(answers[id])) answers[id] = [];
          const boxWrap = document.createElement('div');
          boxWrap.className = 'space-y-1 pl-1';
          (field.options || []).forEach((opt) => {
            const row = document.createElement('label');
            row.className = 'flex items-start gap-2 text-sm text-gray-200 cursor-pointer';
            const cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.className = 'mt-1';
            cb.value = String(opt.value);
            cb.dataset.fieldId = id;
            const numVal = Number(opt.value);
            cb.checked = Array.isArray(answers[id]) && answers[id].includes(numVal);
            cb.addEventListener('change', () => {
              const set = new Set(Array.isArray(answers[id]) ? answers[id] : []);
              if (cb.checked) set.add(numVal);
              else set.delete(numVal);
              answers[id] = [...set].sort((a, b) => a - b);
              refreshConditionalFields();
            });
            const span = document.createElement('span');
            span.textContent = opt.label;
            row.appendChild(cb);
            row.appendChild(span);
            boxWrap.appendChild(row);
          });

          if (field.showWhen) {
            const wrap = document.createElement('div');
            wrap.dataset.fieldWrap = id;
            wrap.appendChild(label);
            wrap.appendChild(boxWrap);
            fieldsEl.appendChild(wrap);
          } else {
            fieldsEl.appendChild(label);
            fieldsEl.appendChild(boxWrap);
          }
          return;
        }

        const select = document.createElement('select');
        select.id = `sizing-${id}`;
        select.className = 'w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2';
        select.dataset.fieldId = id;
        const opt0 = document.createElement('option');
        opt0.value = '';
        opt0.textContent = 'Selecciona...';
        select.appendChild(opt0);
        (field.options || []).forEach((opt) => {
          const option = document.createElement('option');
          option.value = opt.value;
          option.textContent = opt.label;
          select.appendChild(option);
        });
        select.addEventListener('change', () => {
          answers[id] = select.value ? Number(select.value) : null;
          refreshConditionalFields();
        });

        if (field.showWhen) {
          const wrap = document.createElement('div');
          wrap.dataset.fieldWrap = id;
          wrap.appendChild(label);
          wrap.appendChild(select);
          fieldsEl.appendChild(wrap);
        } else {
          fieldsEl.appendChild(label);
          fieldsEl.appendChild(select);
        }
      });
      refreshConditionalFields();
    } catch (err) {
      console.error('Error cargando schema de sizing:', err);
      fieldsEl.innerHTML = '<p class="text-red-400">No se pudo cargar el formulario. Usa el chat para dimensionar.</p>';
    }
  }

  function collectAnswers() {
    if (!schema?.fields) return {};
    schema.fields.forEach((f) => {
      if (f.type === 'static') return;
      if (f.type === 'checkboxes') {
        if (f.showWhen) {
          const raw = answers[f.showWhen.field];
          const dep = raw === '' || raw == null ? null : Number(raw);
          if (!f.showWhen.values.includes(dep)) {
            answers[f.id] = [];
            return;
          }
        }
        const checked = [
          ...fieldsEl.querySelectorAll(`input[type="checkbox"][data-field-id="${f.id}"]:checked`),
        ].map((input) => Number(input.value));
        answers[f.id] = checked.sort((a, b) => a - b);
        return;
      }
      const el = document.getElementById(`sizing-${f.id}`);
      if (el && el.value) answers[f.id] = Number(el.value);
    });
    return { ...answers };
  }

  submitBtn.addEventListener('click', async () => {
    if (!schema?.fields?.length) {
      alert('El formulario aún se está cargando. Espera un momento e intenta de nuevo.');
      return;
    }
    const payload = collectAnswers();
    const required = (schema?.fields || []).filter((f) => isFieldRequired(f));
    const missing = required.filter((f) => {
      if (f.type === 'checkboxes') return !isCheckboxGroupSatisfied(f, payload);
      return payload[f.id] == null || payload[f.id] === '';
    });
    if (missing.length) {
      alert('Completa todas las preguntas obligatorias (en listas múltiples marca al menos una opción).');
      return;
    }
    submitBtn.disabled = true;
    submitBtn.textContent = 'Calculando...';
    try {
      const res = await httpService.post('/sizing/submit', {
        solutionType: Number(solutionType),
        answers: payload,
      });
      const data = res.data?.data;
      const assistantMessage = Array.isArray(data) && data[0]?.content ? data[0].content : (data?.content || 'Listo.');
      onResult(assistantMessage);
    } catch (err) {
      console.error('Error enviando formulario sizing:', err);
      const serverMsg = err?.response?.data?.message || err?.response?.data?.error;
      const offline =
        err?.request && !err?.response
          ? 'Sin respuesta del servidor (comprueba que la API esté en marcha y la URL en index.html / meta api-base).'
          : null;
      onResult(
        serverMsg
          ? `⚠️ ${serverMsg}`
          : offline ||
            'No se pudo obtener la recomendación. Revisa la conexión e intenta de nuevo.',
      );
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Obtener recomendación';
    }
  });

  cancelBtn.addEventListener('click', () => {
    if (typeof onCancel === 'function') onCancel();
  });

  loadSchema();
}

/**
 * Elimina el formulario del DOM
 * @param {HTMLElement} container
 */
export function removeSizingForm(container) {
  const root = container.querySelector('#sizing-form-root');
  if (root) root.remove();
}
