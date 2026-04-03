/**
 * Cache en memoria de frases aprendidas (tabla learned_solution_keywords).
 * Se actualiza al arrancar el servidor y tras confirmar/editar en el buzón.
 */

import LearnedSolutionKeyword from '../models/LearnedSolutionKeyword.model.js';
import { logger } from '../config/logger.js';

/** @type {{ solution: string, phrase: string }[]|null} */
let cache = null;

/**
 * Normaliza texto para comparar con la misma regla que guardamos en BD.
 * @param {string} text
 * @returns {string}
 */
export function normalizePhraseForMatch(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 512);
}

/**
 * @returns {Promise<void>}
 */
export async function refreshLearnedKeywordsCache() {
  try {
    const rows = await LearnedSolutionKeyword.findAll({
      attributes: ['solution', 'phrase'],
      raw: true,
    });
    cache = rows.map((r) => ({
      solution: String(r.solution || '').trim(),
      phrase: String(r.phrase || '').trim(),
    })).filter((r) => r.solution && r.phrase);
    logger.info(`[learnedKeywords] cache cargada: ${cache.length} frases`);
  } catch (e) {
    logger.warn({ err: e?.message }, '[learnedKeywords] no se pudo cargar cache (¿tabla creada?)');
    cache = [];
  }
}

/**
 * @returns {{ solution: string, phrase: string }[]}
 */
export function getLearnedPairs() {
  return cache || [];
}

/**
 * Prioridad 1: match contra frases aprendidas (buzón confirmado).
 * Gana la frase normalizada más larga que esté contenida en el texto del usuario.
 * @param {string} userText
 * @returns {{ solution: string, phrase: string } | null}
 */
export function checkLearnedIntent(userText) {
  const norm = normalizePhraseForMatch(userText);
  if (norm.length < 2) return null;
  let best = null;
  let bestLen = 0;
  for (const row of getLearnedPairs()) {
    const { solution, phrase } = row;
    if (!solution || !phrase || phrase.length < 2) continue;
    if (norm.includes(phrase) && phrase.length >= bestLen) {
      best = { solution, phrase };
      bestLen = phrase.length;
    }
  }
  return best;
}

/**
 * Inserta o actualiza frase aprendida desde una fila del buzón confirmada.
 * @param {import('sequelize').Model} inboxRecord - NeedsInbox
 * @param {string} [phraseOverride] - frase manual; si vacío, usa user_question
 */
export async function upsertLearnedFromInbox(inboxRecord, phraseOverride) {
  const solution = String(inboxRecord.confirmed_solution || '').trim();
  if (!solution) return;

  const raw = phraseOverride != null && String(phraseOverride).trim()
    ? String(phraseOverride).trim()
    : String(inboxRecord.user_question || '');
  const phrase = normalizePhraseForMatch(raw);
  if (phrase.length < 3) return;

  const [row, created] = await LearnedSolutionKeyword.findOrCreate({
    where: { solution, phrase },
    defaults: { needs_inbox_id: inboxRecord.id },
  });
  if (!created) {
    row.needs_inbox_id = inboxRecord.id;
    await row.save();
  }
  await refreshLearnedKeywordsCache();
}

/**
 * Elimina aprendizajes ligados a un id de buzón (descartar / reclasificar).
 * @param {number} needsInboxId
 */
export async function removeLearnedByInboxId(needsInboxId) {
  await LearnedSolutionKeyword.destroy({ where: { needs_inbox_id: needsInboxId } });
  await refreshLearnedKeywordsCache();
}

export default {
  normalizePhraseForMatch,
  refreshLearnedKeywordsCache,
  getLearnedPairs,
  checkLearnedIntent,
  upsertLearnedFromInbox,
  removeLearnedByInboxId,
};
