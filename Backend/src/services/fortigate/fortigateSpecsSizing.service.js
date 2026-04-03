/**
 * Consultas por UNIT: tabla `fortigate_specs` (PascalCase); SP legacy opcional si sigue existiendo.
 * Dimensionamiento: `getFortiGateCandidates()` en `fortigateCatalog.read.service.js`.
 */

import FortigateSpecs from '../../models/FortigateSpecs.model.js';

export {
  isFortigateUnitOrSkuRow,
  pascalDatasheetRowToFortigateSpecColumns,
  mapFortigateSpecToLegacyEvalRow,
} from './fortigateSpecRowMap.js';

export {
  getFortiGateSpecs,
  getFortiGateCandidates,
  getFortigateModelsForSizing,
} from './fortigateCatalog.read.service.js';

/**
 * Filas para un UNIT: primero `fortigate_specs`, luego callback (p. ej. SP) si no hay coincidencias.
 */
export async function getDatasheetRowsByUnitPreferCatalog(unit, fetchFromSp) {
  const trimmed = String(unit || '').trim();
  if (!trimmed) return [];

  const rows = await FortigateSpecs.findAll({
    where: { UNIT: trimmed },
    raw: true,
  });

  if (rows?.length) {
    return rows;
  }

  if (typeof fetchFromSp === 'function') {
    return fetchFromSp();
  }
  return [];
}
