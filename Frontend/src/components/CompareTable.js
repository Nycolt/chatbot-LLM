/**
 * HTML de la tabla comparativa (datos reales del backend). Sin dependencias externas.
 */

function escapeHtml(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function cellDisplay(metric, unit) {
  const raw = metric.raw?.[unit];
  if (raw != null && String(raw).trim() !== '') return escapeHtml(String(raw));
  const n = metric.numeric?.[unit];
  if (n != null && Number.isFinite(n)) return escapeHtml(String(n));
  return '—';
}

/**
 * Genera el HTML completo (tabla animada + ganador). Se inserta en una burbuja del asistente.
 * @param {object} payload — respuesta de POST /compare (data)
 */
export function buildCompareTableHtml(payload) {
  if (!payload || typeof payload !== 'object') {
    return '<p class="compare-error">Sin datos de comparación.</p>';
  }

  const {
    comparison = {},
    resolvedUnits = [],
    winner,
    wins = {},
    notFound = [],
    error,
    solution,
  } = payload;

  const units = Array.isArray(resolvedUnits) ? resolvedUnits : [];
  const metricEntries = Object.entries(comparison).filter(([, m]) => m && typeof m === 'object');

  let html = '<div class="compare-flow-root">';

  if (error) {
    html += `<div class="compare-banner compare-banner-warn">${escapeHtml(error)}</div>`;
  }

  if (notFound.length) {
    html += `<div class="compare-banner compare-banner-miss">No encontrados en BD para esta solución: ${notFound.map(escapeHtml).join(', ')}</div>`;
  }

  if (!metricEntries.length) {
    html += '<p class="compare-muted">No hay métricas comparables con los datos actuales.</p></div>';
    return html;
  }

  html += '<div class="compare-table-wrap">';
  html += '<table class="compare-table" role="table">';
  html += '<thead><tr><th class="compare-th-feature">Característica</th>';
  units.forEach((u) => {
    html += `<th class="compare-th-model">${escapeHtml(u)}</th>`;
  });
  html += '</tr></thead><tbody>';

  metricEntries.forEach(([key, metric], rowIdx) => {
    const delay = 0.05 + rowIdx * 0.07;
    html += `<tr class="compare-row" style="animation-delay:${delay}s">`;
    html += `<td class="compare-td-feature">${escapeHtml(metric.label || key)}</td>`;
    units.forEach((unit) => {
      const isBest = metric.best && metric.best === unit;
      const cls = isBest ? 'compare-td compare-td-best' : 'compare-td';
      html += `<td class="${cls}">${cellDisplay(metric, unit)}</td>`;
    });
    html += '</tr>';
  });

  html += '</tbody></table></div>';

  html += '<div class="compare-wins-summary">';
  units.forEach((u) => {
    const c = wins[u] ?? 0;
    html += `<span class="compare-win-chip">${escapeHtml(u)}: <strong>${c}</strong> métricas</span>`;
  });
  html += '</div>';

  if (winner) {
    html += `<div class="compare-winner-card" style="animation-delay:${0.35 + metricEntries.length * 0.07}s">
      <div class="compare-winner-icon">🏆</div>
      <div class="compare-winner-text">
        <div class="compare-winner-label">Mejor opción recomendada (más métricas superiores)</div>
        <div class="compare-winner-name">${escapeHtml(winner)}</div>
      </div>
    </div>`;
  } else if (units.length >= 2) {
    html += `<div class="compare-winner-card compare-winner-tie">
      <div class="compare-winner-text">Empate o métricas no comparables numéricamente para un único ganador.</div>
    </div>`;
  }

  html += `<p class="compare-meta">Solución: <code>${escapeHtml(solution || '')}</code> · Datos desde tablas <em>specs</em> en MySQL.</p>`;
  html += '</div>';
  return html;
}

/** Placeholder mientras se obtiene la recomendación (LLM o sugerencia automática). */
export function buildCompareRecommendationLoadingHtml() {
  return `<div class="compare-narrative compare-narrative--loading compare-narrative--enter" aria-busy="true">
  <p class="compare-rec-loading-text">🧠 Generando recomendación…</p>
</div>`;
}

/**
 * Texto del LLM o fallback → HTML seguro (párrafos). Permite **negrita** simple.
 * @param {string} rawText
 * @param {{ source?: 'llm' | 'fallback' }} [opts]
 */
export function buildCompareNarrativeHtml(rawText, opts = {}) {
  if (rawText == null || String(rawText).trim() === '') return '';

  function escapeThenBold(s) {
    let t = escapeHtml(s);
    t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    return t;
  }

  const blocks = String(rawText)
    .trim()
    .split(/\n\n+/);
  const ps = blocks
    .map((b) => {
      const inner = escapeThenBold(b).replace(/\n/g, '<br>');
      return `<p class="compare-narrative-p">${inner}</p>`;
    })
    .join('');

  const source = opts.source === 'llm' ? 'llm' : 'fallback';
  const title = 'Recomendación';
  const sub =
    source === 'llm'
      ? 'Interpretación del agente a partir de los datos de la tabla. La decisión final depende de su contexto y de un partner Fortinet.'
      : 'Sugerencia generada a partir de los datos comparados. La decisión final depende de su contexto y de un partner Fortinet.';

  return `<div class="compare-narrative compare-narrative--enter">
  <h4 class="compare-narrative-title">${title}</h4>
  <p class="compare-narrative-sub">${sub}</p>
  ${ps}
</div>`;
}

export default {
  buildCompareTableHtml,
  buildCompareNarrativeHtml,
  buildCompareRecommendationLoadingHtml,
};
