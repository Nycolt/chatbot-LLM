/**
 * Servicio de recomendación de solución Fortinet por descripción (keywords + expansión LLM opcional)
 */

import { recommendSolutionByKeywords } from '../config/solutionKeywords.js';
import {
  LEARNING_FALLBACK_MESSAGE,
  RECOMMENDATION_SCORE_THRESHOLD,
} from '../config/recommendationLearning.js';
import llmService from './llm.service.js';
import { checkLearnedIntent } from './learnedSolutionKeywords.service.js';

const EXPAND_KEYWORDS_SYSTEM = `Eres un asistente de preventa Fortinet. El usuario describe una necesidad de ciberseguridad o redes en español (o mezcla con inglés técnico).

Devuelve ÚNICAMENTE un array JSON de strings: hasta 10 palabras o frases cortas (términos relacionados, sinónimos o reformulaciones) que ayuden a emparejar la necesidad con productos Fortinet (NGFW, logs, SIEM, correo, WiFi, SD-WAN, etc.).

Reglas:
- Salida: solo el array JSON, sin markdown, sin comentarios, sin texto antes ni después.
- Cada elemento debe ser corto (idealmente 1–3 palabras).
- Ejemplo válido: ["registros","logs","visibilidad","auditoría","cumplimiento"]`;

/**
 * Extrae un array de strings desde la respuesta del modelo (JSON o bloque con corchetes).
 * @param {string} raw
 * @returns {string[]}
 */
function parseKeywordArrayFromLlm(raw) {
  if (!raw || typeof raw !== 'string') return [];
  let s = raw.trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) s = fence[1].trim();
  const bracket = s.match(/\[[\s\S]*\]/);
  if (!bracket) return [];
  try {
    const parsed = JSON.parse(bracket[0]);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((x) => typeof x === 'string' && x.trim().length > 0)
      .map((x) => x.trim())
      .slice(0, 10);
  } catch {
    return [];
  }
}

/**
 * Expande la necesidad del usuario con términos relacionados vía LLM (sinónimos / contexto Fortinet).
 * Si el LLM no está disponible o falla, devuelve array vacío.
 * @param {string} userText
 * @returns {Promise<string[]>}
 */
export async function expandWithAgent(userText) {
  const t = String(userText || '').trim();
  if (!t) return [];
  if (String(process.env.AGENT_EXPAND_KEYWORDS || '1').trim() === '0') {
    return [];
  }

  try {
    const reply = await llmService.generateMessages(
      [
        { role: 'system', content: EXPAND_KEYWORDS_SYSTEM },
        {
          role: 'user',
          content: `Necesidad del cliente:\n"""${t}"""\n\nResponde solo con el array JSON.`,
        },
      ],
      // JSON corto: pocas predicciones = menos tiempo en Ollama local (p. ej. phi3)
      { temperature: 0.1, num_predict: 96 },
    );
    const rawContent =
      typeof reply === 'string' ? reply : reply?.content != null ? String(reply.content) : '';
    const expandedKeywords = parseKeywordArrayFromLlm(rawContent);
    if (expandedKeywords.length) {
      console.log('Expanded keywords:', expandedKeywords);
    }
    return expandedKeywords;
  } catch {
    return [];
  }
}

/** Nombre de solución → solutionType del formulario (solo las que el chat dimensiona por UI) */
export const SOLUTION_TO_DIMENSION_TYPE = {
  FortiGate: 1,
  'FortiGate VM': 2,
  FortiWiFi: 3,
  FortiAnalyzer: 4,
  FortiManager: 5,
  FortiSwitch: 6,
};

// Descripción corta por solución para respuestas más naturales
export const SOLUTION_DESCRIPTIONS = {
  FortiGate:
    'Plataforma de firewall de nueva generación (NGFW) para proteger el perímetro, habilitar VPN/SD-WAN y segmentar la red.',
  'FortiGate VM':
    'Versión virtual de FortiGate para entornos de nube y virtualización (AWS, Azure, GCP, VMware, etc.).',
  FortiWiFi:
    'Appliance FortiGate con Wi-Fi integrado, ideal para oficinas pequeñas y sucursales que necesitan seguridad y conectividad inalámbrica en un solo equipo.',
  FortiAnalyzer:
    'Plataforma de análisis y almacenamiento de logs que permite correlacionar eventos, generar reportes y mejorar la visibilidad de seguridad.',
  FortiManager:
    'Consola de administración centralizada para gestionar múltiples FortiGate y otros equipos Fortinet desde un único punto.',
  FortiSwitch:
    'Familia de switches gestionados que se integran con FortiGate para ofrecer una LAN segura y segmentada.',
  FortiAP:
    'Puntos de acceso Wi-Fi seguros que se integran con FortiGate o controladores inalámbricos Fortinet para ofrecer cobertura inalámbrica segura.',
  FortiMail:
    'Gateway de seguridad de correo electrónico que protege frente a spam, phishing y malware en el correo corporativo.',
  FortiWeb:
    'Firewall de aplicaciones web (WAF) diseñado para proteger aplicaciones HTTP/HTTPS frente a ataques, vulnerabilidades y bots.',
};

// Frases de apertura para que la respuesta sea más orgánica
const OPENING_TEMPLATES = [
  (solution) => `Por lo que comentas, veo que ${solution} encaja muy bien con tu necesidad.`,
  (solution) => `A partir de tu descripción, ${solution} parece una de las mejores opciones a considerar.`,
  (solution) => `Tu escenario se alinea bastante con lo que ofrece ${solution}.`,
];

const LEARNED_SCORE = 999;

/**
 * @param {Array<{ solution: string, score: number }>} solutions
 * @param {boolean} usedLlmExpansion
 * @param {{ fromLearned?: boolean }} [meta]
 */
function buildRecommendationFromSolutions(solutions, usedLlmExpansion, meta = {}) {
  if (!solutions?.length) {
    return {
      message: LEARNING_FALLBACK_MESSAGE,
      solutions: [],
      usedLlmExpansion,
      learning: true,
      ...meta,
    };
  }

  const top = solutions[0];
  const rest = solutions.slice(1);
  const openerFn =
    OPENING_TEMPLATES[Math.floor(Math.random() * OPENING_TEMPLATES.length)] ||
    ((solution) => `Según tu descripción, te recomiendo considerar ${solution}.`);

  let message = `📋 Orientación de solución Fortinet\n\n`;
  message += `✅ Propuesta principal: ${top.solution}\n\n`;
  if (meta.fromLearned) {
    message += `Esta recomendación coincide con un caso que ya validamos antes en el buzón de necesidades.\n\n`;
  }
  message += `${openerFn(top.solution)}\n\n`;

  const desc = SOLUTION_DESCRIPTIONS[top.solution];
  if (desc) {
    message += `📌 En qué ayuda\n${desc}\n\n`;
  }

  if (rest.length) {
    message += `🔎 Otras opciones a valorar\n`;
    message += `${rest.map((s) => `- ${s.solution}`).join('\n')}\n\n`;
  }

  message += '🔗 Más información\nhttps://www.fortinet.com/lat/products\n\n';

  const canBeDimensioned = SOLUTION_TO_DIMENSION_TYPE[top.solution] != null;
  if (canBeDimensioned) {
    message += `⚙️ Siguiente paso — dimensionamiento\n`;
    message += `Puedo ayudarte a dimensionar ${top.solution}. Responde:\n`;
    message += `- 1 = Sí, quiero dimensionar ahora.\n`;
    message += `- 2 = No, por ahora solo la recomendación.\n`;
  }

  return { message, solutions, usedLlmExpansion, learning: false, ...meta };
}

/**
 * Genera mensaje de recomendación a partir del texto del usuario.
 * Orden: 1) aprendizaje (buzón), 2) diccionario, 3) expansión LLM + diccionario.
 * @param {string} userText
 * @returns {Promise<{ message: string, solutions: Array<{ solution: string, score: number }>, usedLlmExpansion: boolean, fromLearned?: boolean }>}
 */
async function recommendFromDescription(userText) {
  const raw = String(userText || '').trim();

  const learned = checkLearnedIntent(raw);
  if (learned?.solution) {
    return buildRecommendationFromSolutions(
      [{ solution: learned.solution, score: LEARNED_SCORE }],
      false,
      { fromLearned: true },
    );
  }

  let solutions = recommendSolutionByKeywords(raw);
  let usedLlmExpansion = false;

  if (solutions.length === 0) {
    const expandedKeywords = await expandWithAgent(raw);
    usedLlmExpansion = expandedKeywords.length > 0;
    const enrichedText =
      expandedKeywords.length > 0 ? `${raw} ${expandedKeywords.join(' ')}` : raw;
    solutions = recommendSolutionByKeywords(enrichedText);
  }

  if (solutions.length === 0) {
    return buildRecommendationFromSolutions([], usedLlmExpansion);
  }

  const top = solutions[0];
  if (top.score < RECOMMENDATION_SCORE_THRESHOLD) {
    return {
      message: LEARNING_FALLBACK_MESSAGE,
      solutions,
      usedLlmExpansion,
      learning: true,
    };
  }

  return buildRecommendationFromSolutions(solutions, usedLlmExpansion);
}

export default {
  recommendFromDescription,
  recommendSolutionByKeywords,
  expandWithAgent,
  checkLearnedIntent,
};

export { LEARNING_FALLBACK_MESSAGE, RECOMMENDATION_SCORE_THRESHOLD } from '../config/recommendationLearning.js';
