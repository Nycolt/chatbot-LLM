/**
 * Bundles BDL FortiWiFi / FWF desde solution_offers.
 */

import { sequelize } from '../../config/database.js';
import { logger } from '../../config/logger.js';

function norm(s) {
  return String(s || '').toLowerCase();
}

function scoreBundleForTier(offer, tier) {
  const sku = String(offer.sku || '').toUpperCase();
  const desc = norm(offer.description);
  let score = 0;
  if (!sku.includes('BDL')) return -100;
  if (sku.includes('FWF') || norm(offer.unit).includes('fwf') || norm(offer.solution_type) === 'fortiwifi')
    score += 30;
  if (tier === 'enterprise') {
    if (desc.includes('enterprise') || sku.includes('928') || sku.includes('974')) score += 25;
  } else if (tier === 'utp') {
    if (desc.includes('utp') || desc.includes('unified') || sku.includes('916') || sku.includes('917'))
      score += 25;
  } else {
    if (desc.includes('basic') || desc.includes('hardware') || sku.includes('748')) score += 20;
  }
  return score;
}

/**
 * @param {string} modelUnit ej. FWF-60F
 * @param {'basic'|'utp'|'enterprise'} tier
 */
export async function loadFortiwifiBundleOffers() {
  try {
    const [rows] = await sequelize.query(
      `
      SELECT id, unit, sku, solution_type, offer_type, description, is_active, updatedAt
      FROM solution_offers
      WHERE (is_active = 1 OR is_active = true)
        AND UPPER(TRIM(sku)) LIKE '%BDL%'
        AND (
          LOWER(TRIM(solution_type)) = 'fortiwifi'
          OR UPPER(COALESCE(unit, '')) LIKE '%FWF%'
          OR UPPER(TRIM(sku)) LIKE '%FWF%'
        )
      ORDER BY updatedAt DESC
      LIMIT 300
    `,
    );
    return rows || [];
  } catch (e) {
    logger.warn({ err: e?.message }, '[fortiwifi.bundles] loadFortiwifiBundleOffers failed');
    return [];
  }
}

export function selectFortiwifiBundleOffer(modelUnit, tier, offers) {
  const core = String(modelUnit || '')
    .toUpperCase()
    .replace(/^FORTIWIFI-/, 'FWF-')
    .replace(/\s+/g, '');
  const candidates = (offers || []).filter((o) => {
    const sku = String(o.sku || '').toUpperCase();
    const u = String(o.unit || '').toUpperCase();
    if (!sku.includes('BDL')) return false;
    const modelPart = core.replace('FWF-', '');
    return sku.includes(core) || sku.includes(`FWF-${modelPart}`) || u.includes(core);
  });
  const pool = candidates.length ? candidates : offers || [];
  const ranked = [...pool].sort(
    (a, b) => scoreBundleForTier(b, tier) - scoreBundleForTier(a, tier),
  );
  return ranked[0] || null;
}
