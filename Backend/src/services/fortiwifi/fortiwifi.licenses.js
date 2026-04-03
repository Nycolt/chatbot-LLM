/**
 * Licencias FC- (sin BDL) para FortiWiFi.
 */

import { sequelize } from '../../config/database.js';
import { logger } from '../../config/logger.js';
import { selectBestLicense } from '../fortigate/fortigateOffers.service.js';

const NEED_TO_ADDON = {
  addon_threat: 'advanced_security',
  addon_monitor: 'monitoring',
  addon_support: 'support',
  addon_remote: 'ztna',
  addon_web: 'management',
};

export async function loadFortiwifiLicenseOffers() {
  try {
    const [rows] = await sequelize.query(
      `
      SELECT id, unit, sku, solution_type, offer_type, description, is_active, updatedAt
      FROM solution_offers
      WHERE (is_active = 1 OR is_active = true)
        AND UPPER(TRIM(sku)) NOT LIKE '%BDL%'
        AND (UPPER(TRIM(sku)) LIKE 'FC-%' OR UPPER(TRIM(sku)) LIKE 'FCI-%')
        AND (
          LOWER(TRIM(solution_type)) = 'fortiwifi'
          OR UPPER(COALESCE(unit, '')) LIKE '%FWF%'
          OR UPPER(TRIM(sku)) LIKE '%FWF%'
        )
      ORDER BY updatedAt DESC
      LIMIT 500
    `,
    );
    return rows || [];
  } catch (e) {
    logger.warn({ err: e?.message }, '[fortiwifi.licenses] loadFortiwifiLicenseOffers failed');
    return [];
  }
}

/**
 * @param {object} answers - snapshot con addons opcional { id }
 */
export function selectFortiwifiAddonLicense(answers, licenseRows) {
  if (answers?.wantsAdditionalServices?.id === 'no') {
    return { offer: null, reason: 'No solicitaste servicios adicionales.' };
  }
  const add = answers?.addons;
  if (!add?.id) {
    return {
      offer: null,
      reason: 'Sin necesidad adicional seleccionada o campo opcional vacío.',
    };
  }
  const addonType = NEED_TO_ADDON[add.id];
  if (!addonType) {
    return { offer: null, reason: 'Tipo de necesidad adicional no mapeado.' };
  }
  const offer = selectBestLicense(addonType, licenseRows, { forFortiWifi: true });
  if (offer) {
    return { offer, reason: `Necesidad adicional: ${add.label || add.id}` };
  }
  return { offer: null, reason: 'Sin SKU FC- adecuada en catálogo para FortiWiFi.' };
}
