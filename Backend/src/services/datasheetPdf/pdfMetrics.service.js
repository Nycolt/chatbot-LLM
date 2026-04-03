/**
 * Extracción de métricas técnicas por solution_type (extensible).
 */

import { extractFortigateMetrics, FORTIGATE_EXPECTED_SLOTS } from './metrics/fortigate.metrics.js';

/**
 * @param {string} text
 * @param {string} solutionType
 * @returns {{
 *   metrics: Record<string, string>,
 *   pending_review: Array<object>,
 *   expected_slots: number,
 *   matched_rule_count: number,
 * }}
 */
export function extractMetricsForSolution(text, solutionType) {
  switch (solutionType) {
    case 'fortigate': {
      const r = extractFortigateMetrics(text);
      return {
        metrics: r.metrics,
        pending_review: r.pending_review,
        expected_slots: r.expected_slots,
        matched_rule_count: r.matched_rule_count,
      };
    }
    default:
      return {
        metrics: {},
        pending_review: [
          {
            type: 'parser_not_implemented',
            solution_type: solutionType,
            message:
              'No hay extractor de métricas PDF para esta solución; se registran modelo(s) y trazabilidad; specs requieren carga manual o futuro parser.',
          },
        ],
        expected_slots: 1,
        matched_rule_count: 0,
      };
  }
}

/**
 * @param {Record<string, string>} metrics
 * @returns {number}
 */
export function countFilledMetrics(metrics) {
  if (!metrics) return 0;
  return Object.values(metrics).filter((v) => v != null && String(v).trim() !== '').length;
}

/**
 * @param {number} filled
 * @param {number} expected
 * @param {number} verifiedMin
 * @param {number} partialMin
 * @returns {'verified' | 'partial'}
 */
export function inferCompletenessStatus(filled, expected, verifiedMin, partialMin) {
  const exp = Math.max(expected || 1, 1);
  const ratio = filled / exp;
  if (ratio >= verifiedMin) return 'verified';
  if (ratio >= partialMin) return 'partial';
  return 'partial';
}

/**
 * No bajar de verified → partial por un parse peor.
 * @param {string|null|undefined} current
 * @param {string} inferred
 * @returns {string}
 */
export function mergeCompletenessStatus(current, inferred) {
  const rank = { commercial_only: 0, partial: 1, verified: 2 };
  const a = rank[current] ?? 0;
  const b = rank[inferred] ?? 0;
  if (b > a) return inferred;
  return current || 'commercial_only';
}
