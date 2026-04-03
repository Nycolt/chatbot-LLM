/**
 * Buzón de Necesidades (Bandeja de Clasificación)
 * Panel administrativo para revisar y reclasificar consultas guardadas por el chatbot.
 * Se abre desde el menú de configuración (ruedita).
 */

import { httpService } from '../config/fetch.js';

const BASE = '/needs-inbox';

/** Soluciones típicas para clasificación rápida (alineadas al diccionario / dimensionamiento) */
const FORTINET_SOLUTION_OPTIONS = [
  'FortiGate',
  'FortiGate VM',
  'FortiWiFi',
  'FortiAnalyzer',
  'FortiManager',
  'FortiSwitch',
  'FortiAP',
  'FortiMail',
  'FortiWeb',
];

const REVIEW_STATUS_LABELS = {
  pendiente: 'Pendiente',
  auto_clasificado: 'Auto clasificado',
  requiere_revision: 'Requiere revisión',
  confirmado: 'Confirmado',
  descartado: 'Descartado',
};

/**
 * Fetch con manejo 401 para cerrar panel si token expiró
 */
async function apiGet(url) {
  const res = await httpService.get(url).catch((err) => {
    if (err?.response?.status === 401) {
      if (typeof Swal !== 'undefined') {
        Swal.fire({ icon: 'error', title: 'Sesión expirada', text: 'Inicia sesión de nuevo.' });
      }
      closeBuzon();
    }
    throw err;
  });
  return res?.data?.data ?? res?.data;
}

async function apiPut(url, body) {
  const res = await httpService.put(url, body).catch((err) => {
    if (err?.response?.status === 401) {
      if (typeof Swal !== 'undefined') Swal.fire({ icon: 'error', title: 'Sesión expirada' });
      closeBuzon();
    }
    throw err;
  });
  return res?.data?.data ?? res?.data;
}

async function apiPatch(url, body) {
  const res = await httpService.patch(url, body).catch((err) => {
    if (err?.response?.status === 401) {
      if (typeof Swal !== 'undefined') Swal.fire({ icon: 'error', title: 'Sesión expirada' });
      closeBuzon();
    }
    throw err;
  });
  return res?.data?.data ?? res?.data;
}

let overlayEl = null;

function closeBuzon() {
  if (overlayEl && overlayEl.parentNode) {
    overlayEl.parentNode.removeChild(overlayEl);
    overlayEl = null;
  }
}

/**
 * Renderiza las tarjetas de métricas
 */
function renderStats(stats) {
  if (!stats) return '';
  const { total = 0, byStatus = {}, topSolutions = [] } = stats;
  return `
    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
      <div class="bg-gray-800 rounded-lg p-3 border border-gray-600">
        <p class="text-xs text-gray-400 uppercase">Total</p>
        <p class="text-xl font-bold text-white">${total}</p>
      </div>
      <div class="bg-gray-800 rounded-lg p-3 border border-gray-600">
        <p class="text-xs text-gray-400 uppercase">Pendiente</p>
        <p class="text-xl font-bold text-yellow-400">${byStatus.pendiente ?? 0}</p>
      </div>
      <div class="bg-gray-800 rounded-lg p-3 border border-gray-600">
        <p class="text-xs text-gray-400 uppercase">Auto clasificado</p>
        <p class="text-xl font-bold text-blue-400">${byStatus.auto_clasificado ?? 0}</p>
      </div>
      <div class="bg-gray-800 rounded-lg p-3 border border-gray-600">
        <p class="text-xs text-gray-400 uppercase">Confirmado</p>
        <p class="text-xl font-bold text-green-400">${byStatus.confirmado ?? 0}</p>
      </div>
      <div class="bg-gray-800 rounded-lg p-3 border border-gray-600">
        <p class="text-xs text-gray-400 uppercase">Descartado</p>
        <p class="text-xl font-bold text-red-400">${byStatus.descartado ?? 0}</p>
      </div>
      <div class="bg-gray-800 rounded-lg p-3 border border-gray-600">
        <p class="text-xs text-gray-400 uppercase">Requiere revisión</p>
        <p class="text-xl font-bold text-orange-400">${byStatus.requiere_revision ?? 0}</p>
      </div>
    </div>
    ${topSolutions.length ? `
    <div class="bg-gray-800 rounded-lg p-3 border border-gray-600 mb-4">
      <p class="text-xs text-gray-400 uppercase mb-2">Soluciones más detectadas</p>
      <div class="flex flex-wrap gap-2">
        ${topSolutions.map((s) => `<span class="bg-gray-700 px-2 py-1 rounded text-sm">${escapeHtml(s.solution)} (${s.count})</span>`).join('')}
      </div>
    </div>
    ` : ''}
  `;
}

function escapeHtml(str) {
  if (str == null) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Renderiza la tabla de registros
 */
function renderTable(data) {
  const rows = (data || []).map((r) => {
    const question = (r.user_question || '').slice(0, 60) + ((r.user_question || '').length > 60 ? '…' : '');
    const status = REVIEW_STATUS_LABELS[r.review_status] || r.review_status;
    const category = r.detected_category || '—';
    const created = r.createdAt ? new Date(r.createdAt).toLocaleString('es') : '—';
    return `
      <tr class="border-b border-gray-600 hover:bg-gray-800/50">
        <td class="py-2 px-2 text-gray-300">${r.id}</td>
        <td class="py-2 px-2 text-gray-200 max-w-xs truncate" title="${escapeHtml(r.user_question || '')}">${escapeHtml(question)}</td>
        <td class="py-2 px-2 text-gray-300">${escapeHtml(category)}</td>
        <td class="py-2 px-2"><span class="px-2 py-0.5 rounded text-xs ${getStatusClass(r.review_status)}">${status}</span></td>
        <td class="py-2 px-2 text-gray-400 text-sm">${escapeHtml(created)}</td>
        <td class="py-2 px-2 flex flex-wrap gap-1">
          <button type="button" data-action="ver" data-id="${r.id}" class="px-2 py-1 bg-gray-600 hover:bg-gray-500 rounded text-xs">Ver</button>
          ${r.review_status !== 'confirmado' ? `<button type="button" data-action="confirmar" data-id="${r.id}" class="px-2 py-1 bg-green-700 hover:bg-green-600 rounded text-xs">Confirmar</button>` : ''}
          ${r.review_status !== 'descartado' ? `<button type="button" data-action="descartar" data-id="${r.id}" class="px-2 py-1 bg-red-700 hover:bg-red-600 rounded text-xs">Descartar</button>` : ''}
        </td>
      </tr>
    `;
  }).join('');

  return `
    <table class="w-full text-left text-sm">
      <thead>
        <tr class="border-b border-gray-600 text-gray-400">
          <th class="py-2 px-2">Id</th>
          <th class="py-2 px-2">Pregunta</th>
          <th class="py-2 px-2">Solución detectada</th>
          <th class="py-2 px-2">Estado</th>
          <th class="py-2 px-2">Fecha</th>
          <th class="py-2 px-2">Acciones</th>
        </tr>
      </thead>
      <tbody>${rows || '<tr><td colspan="6" class="py-4 text-center text-gray-500">Sin registros</td></tr>'}</tbody>
    </table>
  `;
}

function getStatusClass(status) {
  const map = {
    pendiente: 'bg-yellow-900/50 text-yellow-300',
    auto_clasificado: 'bg-blue-900/50 text-blue-300',
    requiere_revision: 'bg-orange-900/50 text-orange-300',
    confirmado: 'bg-green-900/50 text-green-300',
    descartado: 'bg-red-900/50 text-red-300',
  };
  return map[status] || 'bg-gray-700 text-gray-300';
}

/**
 * Modal rápido: elegir solución + confirmar (PATCH) y alimentar aprendizaje
 */
function openClassifyModal(record, onSaved) {
  const detected = record.detected_category || '';
  const optionsHtml = FORTINET_SOLUTION_OPTIONS.map(
    (s) => `<option value="${escapeHtml(s)}" ${s === detected ? 'selected' : ''}>${escapeHtml(s)}</option>`,
  ).join('');
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black/80 flex items-center justify-center z-[110] p-4';
  modal.innerHTML = `
    <div class="bg-gray-900 border border-indigo-600 rounded-xl shadow-2xl max-w-lg w-full p-4">
      <h3 class="text-lg font-semibold text-white mb-2">Clasificar #${record.id}</h3>
      <p class="text-sm text-gray-400 mb-3 break-words">${escapeHtml((record.user_question || '').slice(0, 400))}${(record.user_question || '').length > 400 ? '…' : ''}</p>
      <form id="buzon-classify-form" class="space-y-3">
        <div>
          <label class="block text-sm text-gray-400 mb-1">Solución Fortinet</label>
          <select name="confirmed_solution" class="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white">
            <option value="">— Elegir —</option>
            ${optionsHtml}
          </select>
          <p class="text-xs text-gray-500 mt-1">O escribe otra en el campo siguiente si no está en la lista.</p>
          <input type="text" name="confirmed_solution_custom" placeholder="Otro (opcional)" class="w-full mt-2 bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white text-sm">
        </div>
        <div>
          <label class="block text-sm text-gray-400 mb-1">Frase para reconocer (opcional)</label>
          <input type="text" name="learning_phrase" class="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white text-sm" placeholder="Vacío = usar toda la pregunta del usuario">
        </div>
        <div class="flex gap-2 pt-2">
          <button type="submit" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded text-white">Guardar y confirmar</button>
          <button type="button" id="buzon-classify-cancel" class="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded text-white">Cancelar</button>
        </div>
      </form>
    </div>
  `;
  modal.querySelector('#buzon-classify-cancel').addEventListener('click', () => modal.remove());
  modal.querySelector('#buzon-classify-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const fromSelect = form.confirmed_solution.value.trim();
    const fromCustom = form.confirmed_solution_custom.value.trim();
    const solution = fromCustom || fromSelect;
    if (!solution) {
      if (typeof Swal !== 'undefined') Swal.fire({ icon: 'warning', title: 'Elige o escribe una solución' });
      return;
    }
    const lp = form.learning_phrase.value.trim();
    const payload = {
      confirmed_solution: solution,
      review_status: 'confirmado',
      ...(lp ? { learning_phrase: lp } : {}),
    };
    try {
      await apiPatch(`${BASE}/${record.id}`, payload);
      if (typeof Swal !== 'undefined') Swal.fire({ icon: 'success', title: 'Clasificado y aprendido', timer: 1600, showConfirmButton: false });
      modal.remove();
      if (onSaved) onSaved();
    } catch (err) {
      if (typeof Swal !== 'undefined') Swal.fire({ icon: 'error', title: 'Error', text: err?.message || 'No se pudo guardar' });
    }
  });
  modal.addEventListener('click', (ev) => { if (ev.target === modal) modal.remove(); });
  document.body.appendChild(modal);
}

/**
 * Modal de detalle: muestra pregunta, scores, keywords y formulario para reclasificar
 */
function openDetailModal(record, onSaved) {
  const scores = Array.isArray(record.detected_scores) ? record.detected_scores : [];
  const keywords = record.matched_keywords && typeof record.matched_keywords === 'object'
    ? record.matched_keywords
    : {};
  const solutionsList = Array.isArray(record.detected_solutions) ? record.detected_solutions : [];

  const modal = document.createElement('div');
  modal.id = 'buzon-detail-modal';
  modal.className = 'fixed inset-0 bg-black/80 flex items-center justify-center z-[110] p-4';
  modal.innerHTML = `
    <div class="bg-gray-900 border border-gray-600 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
      <div class="p-4 border-b border-gray-600 flex justify-between items-center">
        <h3 class="text-lg font-semibold text-white">Detalle #${record.id}</h3>
        <button type="button" id="buzon-detail-close" class="text-gray-400 hover:text-white">✕</button>
      </div>
      <div class="p-4 overflow-y-auto flex-1 space-y-4">
        <div>
          <p class="text-xs text-gray-400 uppercase mb-1">Pregunta del usuario</p>
          <p class="text-gray-200 bg-gray-800 p-3 rounded border border-gray-600 break-words">${escapeHtml(record.user_question || '')}</p>
        </div>
        <div>
          <p class="text-xs text-gray-400 uppercase mb-1">Soluciones detectadas</p>
          <p class="text-gray-300">${solutionsList.map((s) => escapeHtml(s)).join(', ') || '—'}</p>
        </div>
        <div>
          <p class="text-xs text-gray-400 uppercase mb-1">Puntajes</p>
          <ul class="text-gray-300 text-sm">${scores.map((s) => `<li>${escapeHtml(s.solution)}: ${s.score}</li>`).join('') || '—'}</ul>
        </div>
        <div>
          <p class="text-xs text-gray-400 uppercase mb-1">Palabras coincidentes</p>
          <div class="text-gray-300 text-sm space-y-1">${Object.entries(keywords).map(([sol, kws]) => `<p><strong>${escapeHtml(sol)}:</strong> ${(kws || []).map((k) => escapeHtml(k)).join(', ') || '—'}</p>`).join('') || '—'}</div>
        </div>
        <hr class="border-gray-600">
        <p class="text-xs text-gray-400 uppercase">Reclasificación manual</p>
        <form id="buzon-review-form" class="space-y-3">
          <div>
            <label class="block text-sm text-gray-400 mb-1">Solución confirmada</label>
            <input type="text" name="confirmed_solution" value="${escapeHtml(record.confirmed_solution || record.detected_category || '')}" placeholder="Ej: FortiAnalyzer" class="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white">
          </div>
          <div>
            <label class="block text-sm text-gray-400 mb-1">Frase para reconocer la necesidad (opcional)</label>
            <input type="text" name="learning_phrase" value="" placeholder="Vacío = usar toda la pregunta; o escribe un fragmento corto ej: visibilidad del trafico" class="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white text-sm">
            <p class="text-xs text-gray-500 mt-1">Al guardar como Confirmado, esta frase (o la pregunta completa) se guarda en BD y el chat la reconocerá al instante, sin demoras.</p>
          </div>
          <div>
            <label class="block text-sm text-gray-400 mb-1">Estado</label>
            <select name="review_status" class="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white">
              ${Object.entries(REVIEW_STATUS_LABELS).map(([v, l]) => `<option value="${v}" ${record.review_status === v ? 'selected' : ''}>${l}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="block text-sm text-gray-400 mb-1">Observaciones</label>
            <textarea name="observations" rows="2" class="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white" placeholder="Notas del revisor">${escapeHtml(record.observations || '')}</textarea>
          </div>
          <div class="flex gap-2">
            <button type="submit" class="px-4 py-2 bg-red-600 hover:bg-red-500 rounded text-white">Guardar</button>
            <button type="button" id="buzon-detail-cancel" class="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded text-white">Cerrar</button>
          </div>
        </form>
      </div>
    </div>
  `;

  modal.querySelector('#buzon-detail-close').addEventListener('click', () => modal.remove());
  modal.querySelector('#buzon-detail-cancel').addEventListener('click', () => modal.remove());
  modal.querySelector('#buzon-review-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const lp = form.learning_phrase?.value?.trim();
    const payload = {
      confirmed_solution: form.confirmed_solution.value.trim() || null,
      review_status: form.review_status.value,
      observations: form.observations.value.trim() || null,
      ...(lp ? { learning_phrase: lp } : {}),
    };
    try {
      await apiPut(`${BASE}/${record.id}/review`, payload);
      if (typeof Swal !== 'undefined') Swal.fire({ icon: 'success', title: 'Guardado', timer: 1500, showConfirmButton: false });
      modal.remove();
      if (onSaved) onSaved();
    } catch (err) {
      if (typeof Swal !== 'undefined') Swal.fire({ icon: 'error', title: 'Error', text: err?.message || 'No se pudo guardar' });
    }
  });
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
  document.body.appendChild(modal);
}

/**
 * Abre el panel del Buzón de Necesidades
 */
export async function openBuzonNecesidades() {
  if (overlayEl) {
    closeBuzon();
    return;
  }

  overlayEl = document.createElement('div');
  overlayEl.id = 'buzon-necesidades-overlay';
  overlayEl.className = 'fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 overflow-auto';
  overlayEl.innerHTML = `
    <div class="bg-gray-900 border border-red-600 rounded-xl shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col">
      <div class="p-4 border-b border-gray-600 flex justify-between items-center flex-shrink-0">
        <h2 class="text-xl font-bold text-white">Buzón de Necesidades</h2>
        <button type="button" id="buzon-close-btn" class="text-gray-400 hover:text-white text-2xl leading-none">×</button>
      </div>
      <div class="p-4 flex-shrink-0 border-b border-gray-600">
        <div id="buzon-stats"></div>
        <div class="flex flex-wrap gap-2 mb-3">
          <input type="text" id="buzon-search" placeholder="Buscar en pregunta..." class="bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white text-sm w-48">
          <select id="buzon-filter-status" class="bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white text-sm">
            <option value="">Todos los estados</option>
            ${Object.entries(REVIEW_STATUS_LABELS).map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}
          </select>
          <button type="button" id="buzon-btn-refresh" class="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm text-white">Actualizar</button>
        </div>
      </div>
      <div class="p-4 overflow-auto flex-1 min-h-0">
        <div id="buzon-table-wrap"></div>
      </div>
    </div>
  `;

  overlayEl.querySelector('#buzon-close-btn').addEventListener('click', closeBuzon);
  overlayEl.addEventListener('click', (e) => { if (e.target === overlayEl) closeBuzon(e); });

  const statsEl = overlayEl.querySelector('#buzon-stats');
  const tableWrap = overlayEl.querySelector('#buzon-table-wrap');

  async function loadStats() {
    try {
      const stats = await apiGet(`${BASE}/stats`);
      statsEl.innerHTML = renderStats(stats);
    } catch (e) {
      statsEl.innerHTML = '<p class="text-red-400">Error al cargar métricas</p>';
    }
  }

  async function loadList() {
    const status = overlayEl.querySelector('#buzon-filter-status').value;
    const search = overlayEl.querySelector('#buzon-search').value.trim();
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (search) params.set('search', search);
    params.set('limit', '100');
    try {
      const result = await apiGet(`${BASE}?${params.toString()}`);
      const data = result?.data ?? result ?? [];
      const total = result?.total ?? data.length;
      tableWrap.innerHTML = renderTable(data);
      bindTableActions(tableWrap, openDetail, onClasificar, onConfirmar, onDescartar);
    } catch (e) {
      const msg =
        e?.response?.status === 401
          ? 'No autenticado: inicia sesión de nuevo.'
          : e?.response?.data?.message || e?.message || 'Error del servidor';
      tableWrap.innerHTML = `<p class="text-red-400">Error al cargar el listado: ${escapeHtml(String(msg))}</p>`;
    }
  }

  function openDetail(id) {
    apiGet(`${BASE}/${id}`).then((rec) => {
      openDetailModal(rec, () => { loadList(); loadStats(); });
    }).catch(() => {
      if (typeof Swal !== 'undefined') Swal.fire({ icon: 'error', title: 'No se pudo cargar el detalle' });
    });
  }

  function onClasificar(id) {
    apiGet(`${BASE}/${id}`).then((rec) => {
      openClassifyModal(rec, () => { loadList(); loadStats(); });
    }).catch(() => {
      if (typeof Swal !== 'undefined') Swal.fire({ icon: 'error', title: 'No se pudo cargar el registro' });
    });
  }

  async function onConfirmar(id) {
    try {
      await apiPut(`${BASE}/${id}/status`, { review_status: 'confirmado' });
      if (typeof Swal !== 'undefined') Swal.fire({ icon: 'success', title: 'Confirmado', timer: 1500, showConfirmButton: false });
      loadList();
      loadStats();
    } catch (e) {
      if (typeof Swal !== 'undefined') Swal.fire({ icon: 'error', title: 'Error al confirmar' });
    }
  }

  async function onDescartar(id) {
    try {
      await apiPut(`${BASE}/${id}/status`, { review_status: 'descartado' });
      if (typeof Swal !== 'undefined') Swal.fire({ icon: 'success', title: 'Descartado', timer: 1500, showConfirmButton: false });
      loadList();
      loadStats();
    } catch (e) {
      if (typeof Swal !== 'undefined') Swal.fire({ icon: 'error', title: 'Error al descartar' });
    }
  }

  function bindTableActions(wrap, onVer, onClasificar, onConfirmar, onDescartar) {
    if (!wrap) return;
    wrap.querySelectorAll('[data-action="ver"]').forEach((btn) => {
      btn.addEventListener('click', () => onVer(btn.getAttribute('data-id')));
    });
    wrap.querySelectorAll('[data-action="clasificar"]').forEach((btn) => {
      btn.addEventListener('click', () => onClasificar(btn.getAttribute('data-id')));
    });
    wrap.querySelectorAll('[data-action="confirmar"]').forEach((btn) => {
      btn.addEventListener('click', () => onConfirmar(btn.getAttribute('data-id')));
    });
    wrap.querySelectorAll('[data-action="descartar"]').forEach((btn) => {
      btn.addEventListener('click', () => onDescartar(btn.getAttribute('data-id')));
    });
  }

  overlayEl.querySelector('#buzon-btn-refresh').addEventListener('click', () => {
    loadList();
    loadStats();
  });
  overlayEl.querySelector('#buzon-filter-status').addEventListener('change', loadList);
  overlayEl.querySelector('#buzon-search').addEventListener('input', (() => {
    let t;
    return () => {
      clearTimeout(t);
      t = setTimeout(loadList, 400);
    };
  })());

  document.body.appendChild(overlayEl);
  await loadStats();
  await loadList();
}
