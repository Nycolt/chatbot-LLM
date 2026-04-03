/**
 * Flujo "Comparación entre modelos" — textos y ejemplos por solución (opción 3 del menú).
 */

/** Paso 1: elegir solución (1–4) */
export const COMPARE_STEP1_HTML = `<div class="compare-flow compare-step1 menu-inicio">
  <p class="menu-inicio-saludo">📊 Comparación entre modelos</p>
  <p class="menu-inicio-instruction">Primero selecciona la solución que deseas comparar:</p>
  <div class="menu-opciones">
    <div class="menu-opcion"><span class="menu-opcion-num">1</span> FortiGate (Firewall)</div>
    <div class="menu-opcion"><span class="menu-opcion-num">2</span> FortiAnalyzer (Logs y analítica)</div>
    <div class="menu-opcion"><span class="menu-opcion-num">3</span> FortiManager (Gestión centralizada)</div>
    <div class="menu-opcion"><span class="menu-opcion-num">4</span> FortiSwitch (Switching)</div>
  </div>
  <p class="menu-inicio-pie">Escribe el <strong>número</strong> (1–4). <strong>inicio</strong> para volver al menú principal.</p>
</div>`;

/** Clave API → nombre visible */
export const COMPARE_SOLUTION_LABELS = {
  fortigate: 'FortiGate',
  fortianalyzer: 'FortiAnalyzer',
  fortimanager: 'FortiManager',
  fortiswitch: 'FortiSwitch',
};

function escapeHtmlAttr(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeHtmlText(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Selector visual: botones por cada UNIT en BD.
 * @param {string} solutionKey
 * @param {string[]} units
 */
export function buildComparePickerHtml(solutionKey, units) {
  const label = COMPARE_SOLUTION_LABELS[solutionKey] || solutionKey;
  const list = Array.isArray(units) ? units.filter((u) => u && String(u).trim()) : [];
  const buttons = list
    .map((u) => {
      const raw = String(u).trim();
      return `<button type="button" class="compare-model-btn" data-unit="${escapeHtmlAttr(raw)}">${escapeHtmlText(raw)}</button>`;
    })
    .join('');
  return `<div class="compare-picker-root" data-solution="${escapeHtmlAttr(solutionKey)}">
  <p class="compare-picker-title">📊 Comparación — <strong>${escapeHtmlText(label)}</strong></p>
  <p class="compare-picker-hint">Selecciona <strong>dos o más</strong> modelos (puedes combinar varios). Luego pulsa <strong>Comparar</strong>. También puedes escribir en el chat: <code>Modelo A vs Modelo B</code>.</p>
  <p class="compare-picker-selected">Seleccionados: <span class="compare-picker-count">0</span></p>
  <div class="compare-model-grid">${buttons}</div>
  <div class="compare-picker-actions">
    <button type="button" class="compare-picker-clear">Limpiar selección</button>
    <button type="button" class="compare-picker-run" disabled>Comparar</button>
  </div>
  <p class="compare-picker-note">${list.length >= 500 ? 'Mostrando los primeros 500 modelos del catálogo.' : ''}</p>
</div>`;
}

const EXAMPLES = {
  fortigate: ['<code class="compare-code">FG-100F vs FG-200F</code>', '<code class="compare-code">FortiGate 60F vs FortiGate 80F</code>'],
  fortianalyzer: ['<code class="compare-code">FAZ-100F vs FAZ-200F</code>', '<code class="compare-code">FAZ-300G vs FAZ-1000G</code>'],
  fortimanager: ['<code class="compare-code">FMG-200F vs FMG-400F</code>', '<code class="compare-code">FMG-1000F vs FMG-3000F</code>'],
  fortiswitch: ['<code class="compare-code">FS-124F vs FS-148F</code>', '<code class="compare-code">FortiSwitch-108E vs FortiSwitch-124F</code>'],
};

/**
 * Paso 2: instrucciones y ejemplos según solución elegida
 * @param {string} solutionKey — fortigate | fortianalyzer | …
 */
export function buildCompareStep2Html(solutionKey) {
  const name = COMPARE_SOLUTION_LABELS[solutionKey] || solutionKey;
  const ex = EXAMPLES[solutionKey] || EXAMPLES.fortigate;
  return `<div class="compare-flow compare-step2">
  <p class="compare-step2-title">Perfecto, vas a comparar modelos <strong>${name}</strong> 🔥</p>
  <p>Ahora escribe los modelos usando este formato:</p>
  <p class="compare-format-hint">👉 <strong>Modelo1 vs Modelo2</strong> (y opcionalmente <strong>vs Modelo3</strong>…)</p>
  <ul class="compare-tips">
    <li>✔ Usa <strong>vs</strong> entre cada par modelo.</li>
    <li>✔ Puedes comparar <strong>2 o más</strong> modelos en la misma línea.</li>
    <li>✔ Los modelos deben existir en el catálogo cargado (datasheet / specs).</li>
  </ul>
  <p class="compare-examples-title">Ejemplos para ${name}:</p>
  <ul class="compare-examples-list">
    <li>${ex[0]}</li>
    <li>${ex[1]}</li>
  </ul>
  <p class="compare-step2-footer">Escribe <strong>inicio</strong> para volver al menú principal.</p>
</div>`;
}
