/**
 * Servicio Buzón de Necesidades (needs_inbox)
 * Crear registros desde el chatbot y consultar/actualizar desde el panel admin.
 */

import NeedsInbox from '../models/NeedsInbox.model.js';
import { sequelize } from '../config/database.js';
import { recommendSolutionByKeywordsWithDetails } from '../config/solutionKeywords.js';
import {
  upsertLearnedFromInbox,
  removeLearnedByInboxId,
} from './learnedSolutionKeywords.service.js';
import { Op } from 'sequelize';

const REVIEW_STATUSES = ['pendiente', 'auto_clasificado', 'requiere_revision', 'confirmado', 'descartado'];

/**
 * Calcula el estado de revisión sugerido según las soluciones detectadas.
 * @param {Array<{ solution: string, score: number }>} solutions
 * @returns {'pendiente'|'auto_clasificado'|'requiere_revision'}
 */
function suggestReviewStatus(solutions) {
  if (!solutions || solutions.length === 0) return 'pendiente';
  if (solutions.length === 1) return 'auto_clasificado';
  const [first, second] = solutions;
  const diff = first.score - (second?.score ?? 0);
  if (diff >= 1) return 'auto_clasificado';
  return 'requiere_revision';
}

/**
 * Obtiene detección completa (soluciones con keywords) y estado sugerido.
 * @param {string} userText
 * @returns {{ solutionsWithDetails: Array<{ solution, score, matchedKeywords }>, detected_category: string|null, review_status: string }}
 */
export function getDetectionForInbox(userText) {
  const solutionsWithDetails = recommendSolutionByKeywordsWithDetails(userText);
  const detected_category = solutionsWithDetails.length ? solutionsWithDetails[0].solution : null;
  const review_status = suggestReviewStatus(solutionsWithDetails);
  return { solutionsWithDetails, detected_category, review_status };
}

/**
 * Crea un registro en el buzón a partir de la pregunta del usuario.
 * Ejecuta la detección internamente para no duplicar lógica en el controller.
 * @param {string} userQuestion
 * @returns {Promise<import('../models/NeedsInbox.model.js').default>}
 */
export async function createFromUserQuestion(userQuestion) {
  const { solutionsWithDetails, detected_category, review_status } = getDetectionForInbox(userQuestion);
  const detected_solutions = solutionsWithDetails.map((s) => s.solution);
  const detected_scores = solutionsWithDetails.map((s) => ({ solution: s.solution, score: s.score }));
  const matched_keywords = solutionsWithDetails.reduce((acc, s) => {
    acc[s.solution] = s.matchedKeywords || [];
    return acc;
  }, {});

  const record = await NeedsInbox.create({
    user_question: userQuestion,
    detected_solutions,
    matched_keywords,
    detected_scores,
    detected_category,
    review_status,
  });
  return record;
}

/**
 * Lista registros con filtros y paginación.
 * @param {object} options
 * @param {string} [options.status] - review_status
 * @param {string} [options.category] - detected_category
 * @param {string} [options.solution] - solución en detected_solutions o confirmed_solution
 * @param {string} [options.search] - búsqueda en user_question
 * @param {number} [options.limit=50]
 * @param {number} [options.offset=0]
 */
export async function findAll(options = {}) {
  const { status, category, solution, search, limit = 50, offset = 0 } = options;
  const where = {};

  if (status && REVIEW_STATUSES.includes(status)) {
    where.review_status = status;
  }
  if (category) {
    where.detected_category = { [Op.like]: `%${category}%` };
  }
  if (solution) {
    where[Op.or] = [
      { detected_category: { [Op.like]: `%${solution}%` } },
      { confirmed_solution: { [Op.like]: `%${solution}%` } },
    ];
  }
  if (search && search.trim()) {
    where.user_question = { [Op.like]: `%${search.trim()}%` };
  }

  const limitN = Math.min(Number(limit) || 50, 200);
  const offsetN = Number(offset) || 0;
  const total = await NeedsInbox.count({ where });
  const rows = await NeedsInbox.findAll({
    where,
    order: [['createdAt', 'DESC']],
    limit: limitN,
    offset: offsetN,
  });
  return { data: rows, total };
}

/**
 * Obtiene un registro por id.
 */
export async function findById(id) {
  const record = await NeedsInbox.findByPk(id);
  return record;
}

/**
 * Actualiza revisión manual: confirmed_solution, review_status, observations.
 */
export async function updateReview(id, payload) {
  const record = await NeedsInbox.findByPk(id);
  if (!record) return null;
  const prevStatus = record.review_status;
  const { confirmed_solution, review_status, observations, learning_phrase } = payload;
  if (confirmed_solution !== undefined) record.confirmed_solution = confirmed_solution || null;
  if (review_status !== undefined && REVIEW_STATUSES.includes(review_status)) {
    record.review_status = review_status;
  }
  if (observations !== undefined) record.observations = observations || null;

  if (
    record.review_status === 'confirmado' &&
    !(record.confirmed_solution && String(record.confirmed_solution).trim()) &&
    record.detected_category
  ) {
    record.confirmed_solution = record.detected_category;
  }

  await record.save();

  const st = record.review_status;
  if (st === 'descartado') {
    await removeLearnedByInboxId(id);
  } else if (st === 'confirmado' && String(record.confirmed_solution || '').trim()) {
    const plain = { ...record.get({ plain: true }) };
    await upsertLearnedFromInbox(plain, learning_phrase);
  } else if (prevStatus === 'confirmado' && st !== 'confirmado') {
    await removeLearnedByInboxId(id);
  }

  return record;
}

/**
 * Actualiza solo el estado (alias para updateReview con solo review_status).
 */
export async function updateStatus(id, review_status) {
  if (!REVIEW_STATUSES.includes(review_status)) return null;
  return updateReview(id, { review_status });
}

/**
 * Métricas para el dashboard.
 */
export async function getStats() {
  const [total, byStatus, topSolutions] = await Promise.all([
    NeedsInbox.count(),
    NeedsInbox.findAll({
      attributes: ['review_status', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
      group: ['review_status'],
      raw: true,
    }),
    getTopDetectedSolutions(10),
  ]);

  const statusCounts = { pendiente: 0, auto_clasificado: 0, requiere_revision: 0, confirmado: 0, descartado: 0 };
  byStatus.forEach((row) => {
    statusCounts[row.review_status] = Number(row.count);
  });

  return { total, byStatus: statusCounts, topSolutions };
}

/**
 * Soluciones más detectadas (por detected_category y confirmed_solution).
 */
async function getTopDetectedSolutions(limit = 10) {
  const records = await NeedsInbox.findAll({
    attributes: ['detected_category', 'confirmed_solution'],
    where: { review_status: { [Op.ne]: 'descartado' } },
    raw: true,
  });
  const count = {};
  records.forEach((r) => {
    const key = r.confirmed_solution || r.detected_category || 'Sin clasificar';
    count[key] = (count[key] || 0) + 1;
  });
  return Object.entries(count)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([solution, count]) => ({ solution, count }));
}

export default {
  getDetectionForInbox,
  createFromUserQuestion,
  findAll,
  findById,
  updateReview,
  updateStatus,
  getStats,
};
