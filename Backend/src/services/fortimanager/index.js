/**
 * FortiManager: extracción matriz PDF → fortimanager_specs + product_models.
 */

export {
  normalizeFortiManagerUnit,
  squashPdfHyphens,
  looksLikeCommercialGarbageText,
  tokenizeFmgModelsFromLine,
  splitMatrixRow,
  cleanCell,
  normalizeMatrixValue,
  detectFortiManagerModelColumns,
  extractFortiManagerSpecs,
  extractFortiManagerSpecsFromPDF,
  linkFortiManagerRecordsToCatalog,
  upsertFortiManagerSpecsLinked,
} from './fortimanager.extractor.js';

export {
  FortiManagerEngine,
  runFortiManagerSizingEngine,
  runFortiManagerSizingFromAnswers,
  loadFortiManagerSpecRows,
  normalizeFortiManagerSpecRow,
  LICENSE_SKUS,
  FORTIMANAGER_MODEL_FALLBACK,
} from './fortimanagerSizingEngine.js';
