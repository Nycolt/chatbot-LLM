/**
 * Carga specs FortiWiFi y elige el modelo más pequeño que cumple requisitos.
 */

import { sequelize } from '../../config/database.js';
import { logger } from '../../config/logger.js';
import { rowMeetsRequirements, rankFortiWifiUnit } from './fortiwifi.engine.js';

export async function loadFortiwifiSpecRows() {
  try {
    const [rows] = await sequelize.query(
      `SELECT * FROM fortiwifi_specs WHERE UNIT IS NOT NULL AND TRIM(UNIT) <> '' LIMIT 500`,
    );
    return rows || [];
  } catch (e) {
    logger.warn({ err: e?.message }, '[fortiwifi.modelSelector] loadFortiwifiSpecRows failed');
    return [];
  }
}

/**
 * @param {import('./fortiwifi.engine.js').computeRequirements} requirements
 * @param {object[]} specRows
 */
export function selectBestFortiWifiModel(requirements, specRows) {
  const list = (specRows || []).filter((r) => r?.UNIT);
  const sorted = [...list].sort(
    (a, b) => rankFortiWifiUnit(a.UNIT) - rankFortiWifiUnit(b.UNIT),
  );

  for (const row of sorted) {
    if (rowMeetsRequirements(row, requirements)) {
      return {
        unit: String(row.UNIT).trim(),
        row,
        fromSpecs: true,
      };
    }
  }

  if (sorted.length) {
    const fallback = sorted[sorted.length - 1];
    return {
      unit: String(fallback.UNIT).trim(),
      row: fallback,
      fromSpecs: false,
      fallback: true,
    };
  }

  return { unit: 'FWF-60F', row: null, fromSpecs: false, fallback: true };
}
