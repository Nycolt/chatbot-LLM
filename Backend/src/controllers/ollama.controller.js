import ProductService from '../services/product.service.js';
import DatasheetService from '../services/Datasheet.service.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';
import llmService from '../services/llm.service.js';
import { handleSizingFlow, SOLUTION_TYPES } from '../services/sizingDispatcher.service.js';
import solutionRecommendationService, {
  SOLUTION_DESCRIPTIONS,
  SOLUTION_TO_DIMENSION_TYPE,
} from '../services/solutionRecommendation.service.js';
import comparisonService from '../services/comparison.service.js';
import lifecycleService from '../services/lifecycle.service.js';
import needsInboxService from '../services/needsInbox.service.js';
import { buildAgentAssistantPayload, isNaturalizationEnabled } from '../services/response.service.js';
import { buildComparisonConclusion } from '../utils/recommendationFormatter.js';

function buildSessionId(req) {
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || 'unknown-ip';
  const ua = req.headers['user-agent'] || 'unknown-ua';
  return `${ip}::${ua}`.slice(0, 200);
}

function extractUnitsFromText(text) {
  const units = [];
  const fg = text.match(/FortiGate[-\s]*([0-9]{2,4}[a-z]?)/gi) || [];
  const sku = text.match(/\b(FG|FAZ|FMG|FSW|FAP|FML|FWB)[-\s]*([0-9]{2,4}[a-z]?)/gi) || [];
  fg.forEach(m => units.push('FortiGate-' + (m.split(/[-\s]+/).pop() || '').replace(/\s/g, '')));
  sku.forEach(m => {
    const parts = m.replace(/\s/g, '-').split('-').filter(Boolean);
    if (parts[0]?.toLowerCase() === 'fg') units.push('FortiGate-' + (parts[1] || ''));
  });
  return [...new Set(units)].filter(Boolean).slice(0, 4);
}

function detectIntent(userText) {
  const lower = String(userText || '').toLowerCase().trim();
  if (/comparar|vs\.?|versus|comparación|comparar modelos/.test(lower)) return 'compare';
  if (/\beos\b|\beol\b|reemplazo|vigente|discontinuado|end of life|end of sale/.test(lower)) return 'lifecycle';
  // Formato del menú: "Necesito [necesidad]" o "Quiero [necesidad]" → recomendación
  if (/^necesito\s+.+/.test(lower) || /^quiero\s+.+/.test(lower)) return 'recommend_solution';
  if (/recomendar.*solución|qué solución|qué producto|necesito.*proteger|quiero.*centralizar|ayuda.*elegir|qué me recomienda/.test(lower) || (lower.length > 30 && !/FortiGate-\d|FG-\d/.test(lower))) return 'recommend_solution';
  return null;
}

/** Recomendación por keywords: sin LLM por defecto. Opcional redacción LLM si AGENT_NATURALIZE_RECOMMENDATION=1 */
function buildRecommendationGenOptions() {
  const wantPretty =
    String(process.env.AGENT_NATURALIZE_RECOMMENDATION || '0').trim() === '1' &&
    isNaturalizationEnabled();
  if (!wantPretty) {
    return { skipNaturalization: true };
  }
  return { skipNaturalization: false, temperature: 0.35, num_predict: 220 };
}

const askAgent = asyncHandler(async (req, res) => {
  const Messages = req.body;
  if (!Array.isArray(Messages)) {
    return res.status(400).json({ success: false, message: 'Body inválido: se espera un array de mensajes' });
  }

  const userMsgs = Messages.filter(m => m && m.role === 'user');
  const lastUser = userMsgs.length ? userMsgs[userMsgs.length - 1] : null;
  const userText = (lastUser && lastUser.content) ? String(lastUser.content) : '';

  // Buzón de Necesidades: guardar cada consulta para revisión/reclasificación (no bloquea la respuesta)
  if (userText && userText.trim()) {
    needsInboxService.createFromUserQuestion(userText.trim()).catch((err) => {
      console.error('[Agent] needsInbox.createFromUserQuestion:', err?.message || err);
    });
  }

  const sessionId = buildSessionId(req);
  let sizing = null;
  try {
    console.time('[Agent] sizingFlow');
    sizing = await handleSizingFlow({ sessionId, userText, solutionType: SOLUTION_TYPES.FORTIGATE });
    console.timeEnd('[Agent] sizingFlow');
  } catch (err) {
    console.error('[Agent] ERROR en sizingFlow:', err);
    return res.status(500).json({
      success: false,
      message: 'Error en el dimensionamiento',
      error: err?.message || 'Unknown error'
    });
  }

  if (sizing && sizing.done && sizing.assistantMessage) {
    const { body, apiMessage } = await buildAgentAssistantPayload(
      Messages,
      {
        promptPayload: {
          type: 'sizing',
          technicalSummary: sizing.assistantMessage,
        },
        technical: {
          type: 'sizing',
          assistantMessage: sizing.assistantMessage,
          state: sizing.state ?? null,
        },
      },
      sizing.assistantMessage,
      'Respuesta generada correctamente',
    );
    return ApiResponse.created(res, body, apiMessage);
  }

  // 2b) Intención: recomendar solución por descripción
  const intent = detectIntent(userText);
  if (intent === 'recommend_solution') {
    try {
      const rec = await solutionRecommendationService.recommendFromDescription(userText);
      const {
        message,
        solutions,
        usedLlmExpansion,
        fromLearned,
        learning,
      } = rec;

      if (learning) {
        const body = {
          messages: [...Messages, { role: 'assistant', content: message }],
          technical: {
            type: 'learning',
            baselineMessage: message,
            userNeed: userText.slice(0, 800),
            solutions: solutions ?? [],
            usedLlmExpansion: Boolean(usedLlmExpansion),
            fromLearned: Boolean(fromLearned),
          },
          naturalized: false,
        };
        return ApiResponse.created(res, body, 'Respuesta generada');
      }

      const top = solutions[0];
      const rest = solutions.slice(1);
      const reason = fromLearned
        ? `Recomendación por aprendizaje del buzón: necesidad ya validada manualmente → "${top.solution}".`
        : `Clasificación determinística por palabras clave: solución principal "${top.solution}" (puntuación ${top.score}).${
            rest.length
              ? ` Otras opciones en el ranking: ${rest.map((s) => `${s.solution} (${s.score})`).join('; ')}.`
              : ''
          }`;

      const { body, apiMessage } = await buildAgentAssistantPayload(
        Messages,
        {
          promptPayload: {
            type: 'recommendation',
            product: {
              UNIT: top.solution,
              SKU: '',
              description: SOLUTION_DESCRIPTIONS[top.solution] || '',
            },
            reason,
            userNeed: userText.slice(0, 800),
          },
          technical: {
            type: 'recommendation',
            solutions,
            dimensionSolutionType: SOLUTION_TO_DIMENSION_TYPE[top.solution] ?? null,
            baselineMessage: message,
            usedLlmExpansion,
            fromLearned: Boolean(fromLearned),
          },
        },
        message,
        'Recomendación generada',
        // Por defecto sin segunda pasada LLM (respuesta ya armada en backend). Opcional: AGENT_NATURALIZE_RECOMMENDATION=1
        buildRecommendationGenOptions(),
      );
      return ApiResponse.created(res, body, apiMessage);
    } catch (e) {
      console.error('[Agent] recommendFromDescription:', e);
    }
  }

  // 2c) Intención: comparar modelos
  if (intent === 'compare') {
    const units = extractUnitsFromText(userText);
    if (units.length >= 2) {
      try {
        const { comparisonTable, lifecycle } = await comparisonService.compareModels(units, true);
        let content = `⚖️ Comparación de modelos\n\n`;
        comparisonTable.forEach((row, i) => {
          content += `🖥️ ${row.unit} (\`${row.sku || 'N/A'}\`)\n`;
          Object.entries(row).filter(([k]) => !['unit', 'sku'].includes(k)).slice(0, 8).forEach(([k, v]) => { content += `- ${k}: ${v}\n`; });
          if (lifecycle?.[i]?.status !== 'ACTIVE') content += `- Ciclo de vida: ${lifecycle[i].status}${lifecycle[i].replacement ? ` → reemplazo ${lifecycle[i].replacement.unit}` : ''}\n`;
          content += '\n';
        });
        const conclusion = buildComparisonConclusion(comparisonTable);
        content += `✅ Conclusión (sistema)\n${conclusion}\n`;
        const products = comparisonTable.slice(0, 2).map((row) => {
          const { unit, sku, ...specs } = row;
          return { UNIT: unit, sku, specs };
        });

        const { body, apiMessage } = await buildAgentAssistantPayload(
          Messages,
          {
            promptPayload: {
              type: 'comparison',
              products,
              conclusion,
            },
            technical: {
              type: 'comparison',
              units,
              comparisonTable,
              lifecycle: lifecycle || null,
              baselineMessage: content,
            },
          },
          content,
          'Comparación generada',
        );
        return ApiResponse.created(res, body, apiMessage);
      } catch (e) {
        console.error('[Agent] compareModels:', e);
      }
    }
  }

  // 2d) Intención: EOS/EOL y reemplazo
  if (intent === 'lifecycle') {
    const units = extractUnitsFromText(userText);
    if (units.length >= 1) {
      try {
        const u = units[0];
        const result = await lifecycleService.getLifecycleAndReplacement(u);
        let content = `${u}: Estado ${result.status}`;
        if (result.replacement) content += `\nReemplazo sugerido: ${result.replacement.unit}`;
        if (result.eol_date) content += `\nEOL: ${result.eol_date}`;
        if (result.eos_date) content += `\nEOS: ${result.eos_date}`;
        return ApiResponse.created(res, [...Messages, { role: 'assistant', content }], 'Estado consultado');
      } catch (e) {
        console.error('[Agent] lifecycle:', e);
      }
    }
  }

  // 3) flujo normal (producto + LLM)
  const productos = req.productos || null;

  if (productos) {
    const datasheet = await DatasheetService.getDatasheetByUnit(productos.unit);

    const productosObtenidos = productos.variant == null
      ? await ProductService.getProductByUnit(productos.unit)
      : await ProductService.getProductByUnitAndSku(productos.unit, productos.variant);

    if (productosObtenidos && datasheet) {
      Messages.push({
        role: 'system',
        content: `
El usuario mencionó el siguiente producto:
Marca: ${productos.brand}
Unidad: ${productos.unit}
Variante: ${productos.variant}
Campos solicitados: ${(productos.fields || []).join(', ') || 'Ninguno'}

Responde de acuerdo a la siguiente información del producto:
${JSON.stringify(productosObtenidos)}

Y la siguiente hoja de datos:
${JSON.stringify(datasheet)}

No vuelvas a saludar.
        `
      });
    }
  }

  const agentAnswer = await llmService.generateMessages(Messages);

  const responseData = [
    ...Messages,
    agentAnswer
  ];

  return ApiResponse.created(res, responseData, `Respuesta generada correctamente`);
});

export { askAgent };

