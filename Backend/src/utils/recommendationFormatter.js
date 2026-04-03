/**
 * Construye prompts controlados para que el LLM solo redacte (no decide ni calcula).
 * Los datos técnicos vienen siempre del backend.
 */

import { buildSizingAgentInstructions } from './sizingPresentation.js';

function safeStr(v, max = 2000) {
  if (v == null) return '';
  const s = String(v).replace(/\s+/g, ' ').trim();
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

function formatSpecsForPrompt(specs) {
  if (!specs || typeof specs !== 'object') return '';
  return Object.entries(specs)
    .filter(([k, v]) => v != null && String(v).trim() !== '' && !['unit', 'sku', 'UNIT', 'SKU'].includes(k))
    .slice(0, 12)
    .map(([k, v]) => `${k}: ${safeStr(v, 180)}`)
    .join('. ');
}

const RECOMMENDATION_RICH_RULES = `Eres un consultor senior Fortinet. Salida clara para el cliente (sin marcas de negrita con asteriscos).

Estructura obligatoria:
📋 Orientación de solución
✅ Propuesta principal
- Viñetas con el nombre de la solución recomendada y el motivo en lenguaje claro.

📌 Contexto (opcional, breve)
- Cómo encaja con la necesidad expresada.

Reglas: no inventes productos ni precios; no cambies el motivo determinístico ni el nombre de la solución principal; no menciones SQL ni backends.`;

const COMPARISON_RICH_RULES = `Eres un consultor senior Fortinet. Salida clara y legible.

Estructura obligatoria:
⚖️ Comparación de modelos
🖥️ Modelo A — viñetas con diferencias clave según los datos.
🖥️ Modelo B — igual.
✅ Conclusión para el cliente
- 2–4 viñetas alineadas con la conclusión del sistema (no la contradigas).

Sin tablas HTML; usa viñetas. No inventes especificaciones que no estén en los datos. No menciones SQL.`;

/**
 * @param {{ type: string }} payload
 * @returns {string}
 */
export function buildNaturalPrompt(payload) {
  if (!payload || !payload.type) return '';

  if (payload.type === 'sizing' && payload.technicalSummary) {
    return `${buildSizingAgentInstructions()}

DATOS TÉCNICOS DEL DIMENSIONAMIENTO (no los contradigas ni omitas SKUs/cifras relevantes):

${safeStr(payload.technicalSummary, 4500)}

Entrega la respuesta final al cliente siguiendo la plantilla indicada.`;
  }

  if (payload.type === 'sizing' && payload.result) {
    const m = payload.result.model || {};
    const lic = payload.result.license || {};
    const bun = payload.result.bundle;
    const inp = payload.input || {};
    const bundleLine = bun
      ? `Tipo de bundle o paquete indicado: ${safeStr(bun.type || bun, 200)}.`
      : 'No aplica bundle en esta recomendación.';

    return `${buildSizingAgentInstructions()}

Datos del dimensionamiento (no los contradigas):
- Modelo: ${safeStr(m.UNIT, 120)}; SKU equipo: ${safeStr(m.SKU, 200)}.
- Licencia o servicio: ${safeStr(lic.type, 200)}.
- ${bundleLine}

Contexto declarado por el cliente: ${safeStr(JSON.stringify(inp), 1500)}.

Integra todo en la plantilla de dimensionamiento.`;
  }

  if (payload.type === 'recommendation') {
    const p = payload.product || {};
    return `${RECOMMENDATION_RICH_RULES}

Producto o solución a destacar: ${safeStr(p.UNIT || p.solution, 200)}.
SKU si consta: ${safeStr(p.SKU, 200)}.
Descripción o rol del producto según catálogo interno: ${safeStr(p.description, 800)}

Motivo determinístico de la recomendación (no lo sustituyas por otro argumento): ${safeStr(payload.reason, 1200)}

Necesidad expresada por el usuario (referencia): ${safeStr(payload.userNeed, 800)}

Redacta la respuesta final siguiendo la estructura obligatoria.`;
  }

  if (payload.type === 'comparison' && Array.isArray(payload.products)) {
    const [a, b] = payload.products;
    const ua = safeStr(a?.UNIT || a?.unit, 120);
    const ub = safeStr(b?.UNIT || b?.unit, 120);
    const sa = formatSpecsForPrompt(a?.specs || a);
    const sb = formatSpecsForPrompt(b?.specs || b);

    return `${COMPARISON_RICH_RULES}

Modelos a comparar: ${ua} y ${ub}.

Datos técnicos ${ua}: ${sa || 'solo unidad y SKU en sistema.'}

Datos técnicos ${ub}: ${sb || 'solo unidad y SKU en sistema.'}

Conclusión del sistema (mantén la sustancia): ${safeStr(payload.conclusion, 1500)}

Genera la respuesta final con la estructura indicada.`;
  }

  return '';
}

/**
 * Texto técnico breve para el prompt de comparación (determinístico).
 * @param {object[]} comparisonTable - filas de comparison.service
 */
export function buildComparisonConclusion(comparisonTable) {
  if (!Array.isArray(comparisonTable) || comparisonTable.length < 2) {
    return 'Se requieren al menos dos modelos con datos en catálogo para una comparación útil.';
  }
  const a = comparisonTable[0];
  const b = comparisonTable[1];
  const keys = [
    'NGFW_Throughput_Enterprise_Mix',
    'Threat_Protection_Throughput',
    'Firewall_Throughput_UDP',
    'Concurrent_Sessions',
    'Form_Factor',
  ];
  const parts = [];
  for (const k of keys) {
    const va = a[k];
    const vb = b[k];
    if (va != null && vb != null && String(va).trim() !== '' && String(vb).trim() !== '') {
      if (String(va) !== String(vb)) {
        parts.push(
          `En ${k}, ${a.unit} ofrece ${String(va).trim()} y ${b.unit} ofrece ${String(vb).trim()}.`,
        );
      }
    }
  }
  if (!parts.length) {
    return `Ambos modelos, ${a.unit} y ${b.unit}, tienen fichas cargadas; la elección dependerá del rendimiento requerido, factor de forma y ciclo de vida en tu entorno.`;
  }
  return parts.join(' ');
}

export default { buildNaturalPrompt, buildComparisonConclusion };
