/**
 * Capa de lectura FortiGate para dimensionamiento.
 * Fuente: tabla `fortigate_specs` (mismo esquema PascalCase que la antigua `Datasheet`).
 */

import FortigateSpecs from '../../models/FortigateSpecs.model.js';
import { logger } from '../../config/logger.js';
import { isFortigateUnitOrSkuRow } from './fortigateSpecRowMap.js';

/**
 * Especificaciones + “productModel” sintético (unit/sku desde la fila).
 * @returns {Promise<Array<{ productModel: object, fortigateSpec: object }>>}
 */
export async function getFortiGateSpecs() {
  const rows = await FortigateSpecs.findAll({ raw: true });
  const filtered = (rows || []).filter(isFortigateUnitOrSkuRow);
  return filtered.map((row) => ({
    productModel: {
      unit: row.UNIT,
      sku_base: row.SKU,
      solution_type: 'fortigate',
    },
    fortigateSpec: row,
  }));
}

/**
 * Candidatos para `evaluateModel`: filas PascalCase (UNIT, SKU, Firewall_Throughput_UDP, …).
 * @returns {Promise<object[]>}
 */
export async function getFortiGateCandidates() {
  const rows = await FortigateSpecs.findAll({ raw: true });
  const filtered = (rows || []).filter(isFortigateUnitOrSkuRow);
  if (filtered.length === 0) {
    logger.info('[fortigateSizing] fortigate_specs sin filas FortiGate detectadas.');
  }
  return filtered;
}

/** @deprecated usar getFortiGateCandidates */
export const getFortigateModelsForSizing = getFortiGateCandidates;
