/**
 * Clasificador de tipo de oferta para listas de precios Fortinet.
 * Usado por el ETL al pasar de price_list_staging a solution_offers.
 *
 * Reglas:
 * - SKU inicia con FC- => license
 * - SKU o description contienen "bundle" o "BDL" => bundle
 * - Cualquier otro caso => hardware
 */

export const OFFER_TYPES = Object.freeze({
  HARDWARE: 'hardware',
  LICENSE: 'license',
  BUNDLE: 'bundle',
});

/**
 * Normaliza un valor para comparación: string en minúsculas sin espacios extra; null/undefined => ''.
 * @param {string|null|undefined} value
 * @returns {string}
 */
export function normalizeString(value) {
  if (value == null) return '';
  const s = String(value).trim();
  return s.toLowerCase();
}

/**
 * Clasifica el tipo de oferta según SKU y descripción.
 * Maneja null/undefined y normaliza strings antes de aplicar reglas.
 *
 * @param {string|null|undefined} sku - Código SKU (ej. FG-40F, FC-10-00040-112-02-12)
 * @param {string|null|undefined} description - Descripción del ítem
 * @returns {'hardware'|'license'|'bundle'}
 */
export function classifyOfferType(sku, description) {
  const skuNorm = normalizeString(sku);
  const descNorm = normalizeString(description);

  // SKU inicia con FC- => license
  if (skuNorm.startsWith('fc-')) {
    return OFFER_TYPES.LICENSE;
  }

  // SKU o description contienen "bundle" o "BDL" => bundle
  const hasBundle = /bundle|bdl/.test(skuNorm) || /bundle|bdl/.test(descNorm);
  if (hasBundle) {
    return OFFER_TYPES.BUNDLE;
  }

  // Cualquier otro caso => hardware
  return OFFER_TYPES.HARDWARE;
}

export default classifyOfferType;
