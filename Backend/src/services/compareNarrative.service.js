/**
 * Narrativa post-comparación con LLM (datos objetivos de modelCompare → texto para el usuario).
 */

import llmService from './llm.service.js';
import { logger } from '../config/logger.js';
import { generateFallbackRecommendation } from './compareFallbackRecommendation.js';

const LLM_TIMEOUT_MS = Number(process.env.COMPARE_NARRATIVE_LLM_MS) || 45000;

const SOLUTION_LABELS = {
  fortigate: 'FortiGate (firewall / SD-WAN)',
  fortianalyzer: 'FortiAnalyzer (logs y analítica)',
  fortimanager: 'FortiManager (gestión centralizada)',
  fortiswitch: 'FortiSwitch (switching)',
};

/**
 * @param {unknown} msg — respuesta de generateMessages (string u objeto con content)
 */
function extractChatContent(msg) {
  if (msg == null) return '';
  if (typeof msg === 'string') return msg;
  if (typeof msg === 'object' && msg.content != null) return String(msg.content);
  return String(msg);
}

/**
 * Resume el payload de POST /compare para el prompt (sin filas SQL crudas).
 */
export function compactComparisonForLLM(payload) {
  if (!payload || typeof payload !== 'object') return {};
  const {
    solution,
    models,
    resolvedUnits,
    winner,
    wins,
    comparison,
    notFound,
    error,
  } = payload;

  const sol = String(solution || '').toLowerCase();
  const metrics = Object.entries(comparison || {}).map(([key, m]) => {
    if (!m || typeof m !== 'object') return { metric: key, raw: {}, best: null };
    return {
      metric: m.label || key,
      valores_tabla: m.raw ?? {},
      mejor_en_esta_metrica: m.best ?? null,
      valores_numericos_parseados: m.numeric ?? {},
    };
  });

  return {
    solucion: SOLUTION_LABELS[sol] || solution || '',
    modelos_solicitados: models,
    unidades_comparadas: resolvedUnits,
    ganador_por_conteo_de_metricas: winner ?? null,
    victorias_por_modelo: wins ?? {},
    metricas: metrics,
    no_encontrados_en_bd: notFound ?? [],
    aviso_payload: error ?? null,
  };
}

const SYSTEM_PROMPT = `Actúa como un ingeniero de preventa especializado en soluciones Fortinet.

Recibirás un JSON con datos objetivos de comparación entre modelos (procedentes de fichas / tablas specs en base de datos). Ese JSON es la única fuente de hechos sobre capacidades y resultados por métrica.

Tu tarea es generar una recomendación inteligente: NO basta con decir cuál es “mejor” en una sola frase.

IMPORTANTE:
- No inventes datos, cifras, SKU ni características que no estén en el JSON.
- No cambies ni reinterpretes los valores numéricos o textuales del JSON; solo explícalos y conecta ideas.
- Si hay empate o no hay ganador claro (ganador_por_conteo_de_metricas nulo), dilo y razona con victorias_por_modelo y metricas.
- Usa lenguaje natural y profesional en español.
- Enfócate en impacto real cuando sea razonable derivarlo de los datos: usuarios, tráfico, crecimiento, operación (sin inventar números).
- Incluye al menos una frase con tono ilustrativo del estilo: "En entornos con alto volumen de tráfico..." (adáptala al tipo de solución: firewall, analítica, gestión, switching, etc.).
- Puedes usar **negrita** solo para nombres de modelos. No uses HTML ni títulos con #.`;

/**
 * @param {object} payload — mismo objeto que devuelve compareModelsFromDb (sin envolver en ok)
 * @returns {Promise<string>} texto plano (secciones) para mostrar en el chat
 */
export async function generateCompareNarrative(payload) {
  const compact = compactComparisonForLLM(payload);
  const userPrompt = `Datos de comparación (JSON). Úsalos todos los que apliquen.

${JSON.stringify(compact)}

Redacta la recomendación siguiendo EXACTAMENTE esta estructura obligatoria (cinco apartados numerados 1. a 5.):

1. Explica qué modelo tiene mejor rendimiento (basado en datos), citando qué métricas del JSON apoyan esa conclusión. No añadas cifras que no aparezcan.

2. Indica en qué escenarios ese modelo es ideal, conectando con las métricas donde destaca (p. ej. en analítica: ingest de logs; en firewall: throughput o sesiones; etc., solo si aplica según el JSON).

3. Explica por qué el otro modelo (o los demás comparados) aún puede ser válido, usando empates o métricas donde no queda rezagado.

4. Da una recomendación por tipo de cliente o uso (p. ej. sede central vs sucursales, prioridad coste vs margen de crecimiento, operación más simple) sin inventar requisitos; ató todo a lo que permiten los datos.

5. Cierra indicando que la decisión final depende del contexto (licenciamiento, diseño de red, cumplimiento, presupuesto, soporte y validación con un partner Fortinet).

No uses conclusiones vacías del tipo "este es mejor" sin argumentos tomados del JSON.`;

  const raw = await llmService.generateMessages(
    [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    {
      temperature: 0.4,
      num_predict: 1400,
      stop: [],
    },
  );

  let text = extractChatContent(raw).trim();
  if (!text && raw && typeof raw === 'object' && typeof raw.thinking === 'string') {
    text = String(raw.thinking).trim();
  }
  if (!text) {
    throw new Error('El modelo devolvió una narrativa vacía');
  }
  return text;
}

/**
 * Intenta LLM con timeout; si falla o expira → texto determinista (sin errores al cliente).
 * @returns {Promise<{ narrative: string, source: 'llm' | 'fallback' }>}
 */
export async function generateCompareNarrativeSafe(payload) {
  const units = payload?.resolvedUnits;
  const comparison = payload?.comparison;
  const fallbackOnly = () => ({
    narrative: generateFallbackRecommendation(payload),
    source: 'fallback',
  });

  if (!Array.isArray(units) || units.length < 2) {
    return fallbackOnly();
  }
  if (!comparison || typeof comparison !== 'object' || Object.keys(comparison).length === 0) {
    return fallbackOnly();
  }

  try {
    const narrative = await Promise.race([
      generateCompareNarrative(payload),
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error('LLM_TIMEOUT')), LLM_TIMEOUT_MS);
      }),
    ]);
    const text = String(narrative || '').trim();
    if (!text) {
      return fallbackOnly();
    }
    return { narrative: text, source: 'llm' };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.warn(`[compareNarrative] LLM fallback (${msg})`);
    return fallbackOnly();
  }
}

export { generateFallbackRecommendation } from './compareFallbackRecommendation.js';

export default {
  generateCompareNarrative,
  generateCompareNarrativeSafe,
  compactComparisonForLLM,
};
