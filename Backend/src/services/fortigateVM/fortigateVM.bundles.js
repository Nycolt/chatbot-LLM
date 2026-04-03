/**
 * Bundles FortiGate VM (FGVVS 814 / 990 / 993) — no BDL.
 */

import { sequelize } from '../../config/database.js';
import { logger } from '../../config/logger.js';

const VM_BUNDLE_CODES = ['814', '990', '993'];

function extractVmCodeFromSku(sku) {
  const m = String(sku || '').toUpperCase().match(/-(\d{2,4})-02-DD$/);
  return m ? m[1] : null;
}

function extractVmSeatRank(sku) {
  const m = String(sku || '').toUpperCase().match(/^FC(\d+)-/);
  if (!m) return 999;
  return Number(m[1]);
}

function rankBundleOffer(offer, code) {
  let score = 0;
  if (String(offer.offer_type || '').toLowerCase() === 'bundle' && ['814', '990', '993'].includes(code)) score += 50;
  if (String(offer.solution_type || '').toLowerCase() === 'fortigate_vm') score += 20;
  score -= extractVmSeatRank(offer.sku);
  return score;
}

export async function loadFortigateVmBundleOffers() {
  const whereSql = VM_BUNDLE_CODES.map((_, i) => `sku LIKE :code${i}`).join(' OR ');
  const replacements = Object.fromEntries(VM_BUNDLE_CODES.map((code, i) => [`code${i}`, `%-${code}-%`]));
  try {
    const [rows] = await sequelize.query(
      `
      SELECT id, unit, sku, solution_type, offer_type, description, is_active, updatedAt
      FROM solution_offers
      WHERE sku LIKE '%FGVVS%'
        AND (is_active = 1 OR is_active = true)
        AND (${whereSql})
      ORDER BY updatedAt DESC
      LIMIT 200
    `,
      { replacements },
    );
    return rows || [];
  } catch (e) {
    logger.warn({ err: e?.message }, '[fortigateVM.bundles] loadFortigateVmBundleOffers failed');
    return [];
  }
}

export function selectVmBundleOffer(bundleCode, offers) {
  const candidates = (offers || []).filter((offer) => extractVmCodeFromSku(offer.sku) === bundleCode);
  if (!candidates.length) return null;
  return [...candidates].sort((a, b) => rankBundleOffer(b, bundleCode) - rankBundleOffer(a, bundleCode))[0];
}
