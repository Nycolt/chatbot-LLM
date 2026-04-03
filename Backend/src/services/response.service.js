/**
 * Capa de naturalización: el backend decide; el LLM solo redacta.
 */

import llmService from './llm.service.js';
import { logger } from '../config/logger.js';
import { buildNaturalPrompt } from '../utils/recommendationFormatter.js';

/**
 * Genera texto natural a partir de un payload tipado (sizing | recommendation | comparison).
 * @param {object} payload
 * @param {{ temperature?: number, num_predict?: number, top_p?: number }} [options] — opciones extra se reenvían a Ollama/OpenRouter
 * @returns {Promise<{ ok: boolean, text: string | null, skipped?: boolean, error?: string }>}
 */
export async function generateNaturalResponse(payload, options = {}) {
  const { temperature = 0.7, ...llmOpts } = options;
  try {
    const prompt = buildNaturalPrompt(payload);
    if (!prompt) {
      return { ok: false, text: null, skipped: true };
    }
    const raw = await llmService.generate(prompt, { temperature, ...llmOpts });
    const text = String(raw || '').trim();
    if (!text) return { ok: false, text: null, error: 'empty_model_output' };
    return { ok: true, text };
  } catch (e) {
    logger.warn({ err: e?.message }, '[response.service] generateNaturalResponse');
    return { ok: false, text: null, error: e?.message || 'llm_error' };
  }
}

/**
 * Desactivar naturalización (tests, Ollama caído): AGENT_NATURALIZE=0
 */
export function isNaturalizationEnabled() {
  return String(process.env.AGENT_NATURALIZE || '1').trim() !== '0';
}

/**
 * Añade mensaje de asistente; si el LLM responde, sustituye el contenido mostrado al usuario.
 * @param {object[]} Messages
 * @param {{ promptPayload: object, technical?: object }} spec — technical = resultado determinístico (JSON) para el cliente/API
 * @returns {Promise<{ body: { messages: object[], technical: object, naturalized: boolean }, apiMessage: string }>}
 */
export async function buildAgentAssistantPayload(
  Messages,
  { promptPayload, technical = null },
  fallbackAssistantText,
  apiMessage,
  genOptions = {},
) {
  let content = fallbackAssistantText;
  let naturalized = false;

  const promptText = promptPayload ? buildNaturalPrompt(promptPayload) : '';
  const hasPrompt = promptText.length > 0;

  const { skipNaturalization, ...llmGenOptions } = genOptions;

  if (
    isNaturalizationEnabled() &&
    hasPrompt &&
    skipNaturalization !== true
  ) {
    const r = await generateNaturalResponse(promptPayload, llmGenOptions);
    if (r.ok && r.text) {
      content = r.text;
      naturalized = true;
    }
  }

  const baseTechnical =
    technical && typeof technical === 'object' && !Array.isArray(technical)
      ? { ...technical }
      : { raw: technical };

  return {
    body: {
      messages: [...Messages, { role: 'assistant', content }],
      technical: {
        ...baseTechnical,
        naturalized,
      },
      naturalized,
    },
    apiMessage: apiMessage || 'Respuesta generada correctamente',
  };
}

export default {
  generateNaturalResponse,
  isNaturalizationEnabled,
  buildAgentAssistantPayload,
};
