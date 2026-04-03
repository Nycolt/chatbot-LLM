/**
 * Backfill opcional: enlaza offers antiguas (sin solution_id / product_model_id) tras cargas previas al ETL integrado.
 * El flujo normal de upload ya hace catálogo dentro de `processBatchToSolutionOffers`.
 */

import { logger } from '../config/logger.js';
import Solution from '../models/Solution.model.js';
import ProductModel from '../models/ProductModel.model.js';
import SolutionOffer from '../models/SolutionOffer.model.js';

/**
 * @param {number} batchId
 * @returns {Promise<{ linked_offers: number, models_touched: number }>}
 */
export async function linkSolutionOffersToCatalog(batchId) {
  const solutions = await Solution.findAll({
    where: { is_active: 1 },
    attributes: ['id', 'code'],
    raw: true,
  });

  const codeToId = Object.fromEntries(solutions.map((s) => [s.code, s.id]));
  if (Object.keys(codeToId).length === 0) {
    logger.warn('[catalogSync] Tabla solutions vacía o sin filas activas; omito enlace de catálogo.');
    return { linked_offers: 0, models_touched: 0 };
  }

  const offers = await SolutionOffer.findAll({
    where: { batch_id: batchId },
  });

  let linked_offers = 0;
  const touchedModelIds = new Set();

  for (const offer of offers) {
    const st = offer.solution_type;
    const solutionId = st ? codeToId[st] : null;
    let productModelId = null;

    if (solutionId && offer.unit && String(offer.unit).trim() !== '') {
      const unit = String(offer.unit).trim();
      const [pm, created] = await ProductModel.findOrCreate({
        where: { solution_id: solutionId, unit },
        defaults: {
          solution_id: solutionId,
          solution_type: st,
          unit,
          sku_base: offer.offer_type === 'hardware' ? offer.sku : null,
          model_name: unit,
          source_origin: 'excel',
          technical_completeness_status: 'commercial_only',
          is_active: 1,
        },
      });

      productModelId = pm.id;
      if (created) touchedModelIds.add(pm.id);

      if (!created && offer.offer_type === 'hardware' && offer.sku && !pm.sku_base) {
        await pm.update({ sku_base: offer.sku });
        touchedModelIds.add(pm.id);
      }
    }

    await offer.update({
      solution_id: solutionId,
      product_model_id: productModelId,
    });
    linked_offers += 1;
  }

  return { linked_offers, models_touched: touchedModelIds.size };
}

export default { linkSolutionOffersToCatalog };
