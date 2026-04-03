/**
 * Pool de licencias FortiGate VM (solution_offers) y selección vía selectBestLicense.
 */

import { sequelize } from '../../config/database.js';
import { logger } from '../../config/logger.js';
import { selectBestLicense } from '../fortigate/fortigateOffers.service.js';

const ADDON_ID_TO_TYPE = {
  protection: 'advanced_security',
  visibility: 'monitoring',
  support: 'support',
  management: 'management',
  access: 'ztna',
  dlp: 'dlp',
  ot: 'ot',
};

/** Orden de prioridad al combinar varios add-ons */
const ADDON_PRIORITY_ORDER = ['protection', 'visibility', 'support', 'management', 'access', 'dlp', 'ot'];

export async function loadFortigateVmLicenseOffers() {
  try {
    const [rows] = await sequelize.query(
      `
      SELECT id, unit, sku, solution_type, offer_type, description, is_active, updatedAt
      FROM solution_offers
      WHERE (is_active = 1 OR is_active = true)
        AND UPPER(TRIM(sku)) NOT LIKE '%BDL%'
        AND (
          UPPER(TRIM(sku)) LIKE 'FC-%'
          OR UPPER(TRIM(sku)) LIKE 'FCI-%'
        )
        AND (
          UPPER(sku) LIKE '%FGVVS%'
          OR UPPER(sku) LIKE '%FGVM%'
          OR LOWER(TRIM(solution_type)) = 'fortigate_vm'
          OR UPPER(COALESCE(unit, '')) LIKE '%VM%'
        )
      ORDER BY updatedAt DESC
      LIMIT 800
    `,
    );
    return rows || [];
  } catch (e) {
    logger.warn({ err: e?.message }, '[fortigateVM.licenses] loadFortigateVmLicenseOffers failed');
    return [];
  }
}

/**
 * Licencia FC-/FCI- adicional solo si el usuario pidió servicios complementarios y eligió add-ons.
 *
 * @returns {{ offer: object|null, addonType: string|null, reason: string }}
 */
export function selectPrimaryVmLicense(answers, licenseRows) {
  if (answers.wantsAdditionalServices?.id === 'no') {
    return {
      offer: null,
      addonType: null,
      reason: 'No solicitaste servicios adicionales: la propuesta se centra en modelo VM + bundle.',
    };
  }

  const addons = Array.isArray(answers.addons) ? answers.addons : [];
  if (!addons.length) {
    return {
      offer: null,
      addonType: null,
      reason: 'Indicaste servicios adicionales pero no seleccionaste tipos concretos.',
    };
  }

  for (const addonId of ADDON_PRIORITY_ORDER) {
    const selected = addons.some((a) => a?.id === addonId);
    if (!selected) continue;
    const type = ADDON_ID_TO_TYPE[addonId];
    const offer = selectBestLicense(type, licenseRows, { forFortigateVm: true });
    if (offer) {
      return {
        offer,
        addonType: type,
        reason: `Servicio adicional: «${addonId}»`,
      };
    }
  }

  return { offer: null, addonType: null, reason: 'Sin SKU FC-/FCI- adecuada en catálogo para los add-ons elegidos.' };
}
