/**
 * Catálogo comercial: solution_offers para hardware FAZ y licencias FortiAnalyzer.
 */

import { sequelize } from '../../config/database.js';
import { logger } from '../../config/logger.js';
import normalizeUnit from '../../utils/normalizeUnit.js';
import { LICENSE_TYPES } from './fortianalyzer.engine.js';

export async function loadFortianalyzerSpecRows() {
  try {
    const [rows] = await sequelize.query(
      `SELECT * FROM fortianalyzer_specs
       WHERE UNIT IS NOT NULL AND TRIM(UNIT) <> ''
       ORDER BY UNIT ASC
       LIMIT 500`,
    );
    return rows || [];
  } catch (e) {
    logger.warn({ err: e?.message }, '[fortianalyzer.offers] loadFortianalyzerSpecRows failed');
    return [];
  }
}

/**
 * Hardware activo más reciente por UNIT normalizada.
 * @param {string} unit
 * @returns {Promise<{ sku: string, description: string|null }|null>}
 */
export async function resolveFortianalyzerHardwareSku(unit) {
  const u = normalizeUnit(unit);
  if (!u) return null;
  try {
    const nu = u.replace(/\s/g, '').replace(/-/g, '').toUpperCase();
    const raw = String(unit || '').trim();
    const safe = raw.toUpperCase().replace(/[%_]/g, '');
    const likeSku = `%${safe}%`;
    const [rows] = await sequelize.query(
      `
      SELECT sku, description, unit
      FROM solution_offers
      WHERE (is_active = 1 OR is_active = true)
        AND offer_type = 'hardware'
        AND LOWER(TRIM(COALESCE(solution_type, ''))) = 'fortianalyzer'
        AND (
          UPPER(REPLACE(REPLACE(TRIM(COALESCE(unit,'')), ' ', ''), '-', '')) = :nu
          OR UPPER(TRIM(sku)) LIKE :likeSku
        )
      ORDER BY updatedAt DESC
      LIMIT 5
      `,
      { replacements: { nu, likeSku } },
    );
    const list = rows || [];
    const exact = list.find(
      (r) => normalizeUnit(r.unit) === u || normalizeUnit(r.sku) === u,
    );
    const pick = exact || list[0];
    if (!pick?.sku) return null;
    return { sku: String(pick.sku).trim(), description: pick.description || null };
  } catch (e) {
    logger.warn({ err: e?.message, unit: u }, '[fortianalyzer.offers] resolveFortianalyzerHardwareSku failed');
    return null;
  }
}

/**
 * Licencias fortianalyzer activas (sin bundles).
 */
export async function loadFortianalyzerLicenseOffers() {
  try {
    const [rows] = await sequelize.query(
      `
      SELECT id, unit, sku, solution_type, offer_type, description, is_active, updatedAt
      FROM solution_offers
      WHERE (is_active = 1 OR is_active = true)
        AND offer_type = 'license'
        AND LOWER(TRIM(COALESCE(solution_type, ''))) = 'fortianalyzer'
      ORDER BY updatedAt DESC
      LIMIT 500
    `,
    );
    return rows || [];
  } catch (e) {
    logger.warn({ err: e?.message }, '[fortianalyzer.offers] loadFortianalyzerLicenseOffers failed');
    return [];
  }
}

function rowMatchesLicenseType(row, licenseType) {
  const sku = String(row?.sku || '').toUpperCase();
  const desc = String(row?.description || '').toLowerCase();
  const combined = `${sku} ${desc}`;

  switch (licenseType) {
    case LICENSE_TYPES.PREMIUM:
      return (
        /PREMIUM/i.test(combined) &&
        (/FORTICARE|FC-?/i.test(combined) || /support/i.test(desc)) &&
        !/ELITE/i.test(combined)
      );
    case LICENSE_TYPES.ELITE:
      return /ELITE/i.test(combined) && (/FORTICARE|FC-?/i.test(combined) || /support/i.test(desc));
    case LICENSE_TYPES.UPGRADE_PREMIUM_ELITE:
      return (
        (/UPGRADE/i.test(combined) || /UPLIFT/i.test(combined)) &&
        /PREMIUM/i.test(combined) &&
        /ELITE/i.test(combined)
      );
    case LICENSE_TYPES.RMA_NBD:
      return (
        (/RMA|REPLACEMENT|ADVANCED/i.test(combined) && /NEXT\s*BUSINESS|NBD|DIA\s*HABIL|NEXT\s*DAY/i.test(combined)) ||
        /NBD/i.test(sku)
      );
    case LICENSE_TYPES.RMA_4H:
      return (
        (/RMA|REPLACEMENT|ADVANCED/i.test(combined) && /4\s*-?\s*H(OUR)?|CUATRO\s*HORAS/i.test(combined)) ||
        /4HR|4HOUR/i.test(sku)
      );
    case LICENSE_TYPES.RMA_4H_ONSITE:
      return (
        (/RMA|ONSITE|ON-?SITE|INGENIERO/i.test(combined) && /4\s*-?\s*H/i.test(combined)) ||
        (/ONSITE/i.test(combined) && /4H/i.test(sku))
      );
    case LICENSE_TYPES.SECURE_RMA:
      return /SECURE\s*RMA|SECURERMA/i.test(combined);
    case LICENSE_TYPES.AI_MGMT:
      return (
        /FORTIAI|AI\s*(MGMT|MANAGEMENT)|AUTOMATION\s*SERVICE|INTELIGENT/i.test(combined) ||
        (/AI/i.test(sku) && /FORTI/i.test(sku))
      );
    default:
      return false;
  }
}

/**
 * @param {string} licenseType
 * @param {object[]} licenseRows
 * @returns {{ sku: string, description: string|null }|null}
 */
export function selectFortianalyzerLicenseOffer(licenseType, licenseRows) {
  const rows = licenseRows || [];
  for (const r of rows) {
    if (rowMatchesLicenseType(r, licenseType)) {
      return { sku: String(r.sku || '').trim(), description: r.description || null };
    }
  }
  return null;
}
