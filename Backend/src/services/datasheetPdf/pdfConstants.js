/**
 * Constantes compartidas del pipeline PDF → catálogo + specs.
 */

/** solution_type permitidos para ingest PDF (alineado con solutions + ETL) */
export const PDF_INGEST_SOLUTION_TYPES = new Set([
  'fortigate',
  'fortigate_vm',
  'fortiwifi',
  'fortianalyzer',
  'fortimanager',
  'fortiswitch',
  'fortiap',
  'fortimail',
  'fortiweb',
]);

/** Lista estable para validación y UI (mismo orden que negocio) */
export const PDF_SOLUTION_TYPE_LIST = [...PDF_INGEST_SOLUTION_TYPES];

export function isAllowedPdfSolutionType(value) {
  return typeof value === 'string' && PDF_INGEST_SOLUTION_TYPES.has(value.trim());
}

/** Umbral de campos rellenos para technical_completeness_status (sobre campos “esperados” por parser) */
export const COMPLETENESS_VERIFIED_MIN = 0.55;
export const COMPLETENESS_PARTIAL_MIN = 0.2;

export const EXTRACTOR_VERSION = 'pdf_parser_v1';
