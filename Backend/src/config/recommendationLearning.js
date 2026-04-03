/**
 * Respuesta cuando no hay clasificación fiable o el score es bajo (needs_inbox ya recibe la consulta en el agente).
 */

export const LEARNING_FALLBACK_MESSAGE = `🤖 Estoy mejorando para entender este tipo de necesidades.

He guardado tu solicitud para revisarla y darte una mejor recomendación.

Te sugiero intentarlo nuevamente más adelante o dar un poco más de detalle para ayudarte mejor 🚀`;

/** Puntuación mínima del mejor candidato para aceptar la recomendación (suma keywords × peso). */
export const RECOMMENDATION_SCORE_THRESHOLD = Math.max(
  1,
  Number(process.env.RECOMMENDATION_SCORE_THRESHOLD) || 3,
);
