/**
 * Orquestación: PDF → datasheet_sources + datasheet_model_map + product_models + *_specs.
 * No modifica atributos comerciales (p. ej. sku_base) en modelos existentes.
 *
 * Fases:
 * 1) Registro en datasheet_sources con processing_status = uploaded (commit).
 * 2) Procesamiento en transacción; al éxito → processed; ante error → failed (fila conservada).
 */

import crypto from 'crypto';
import { sequelize } from '../../config/database.js';
import { logger } from '../../config/logger.js';
import Solution from '../../models/Solution.model.js';
import DatasheetSource from '../../models/DatasheetSource.model.js';
import DatasheetModelMap from '../../models/DatasheetModelMap.model.js';
import ProductModel from '../../models/ProductModel.model.js';
import SolutionOffer from '../../models/SolutionOffer.model.js';
import ModelOfferLink from '../../models/ModelOfferLink.model.js';
import {
  PDF_INGEST_SOLUTION_TYPES,
  EXTRACTOR_VERSION,
  COMPLETENESS_VERIFIED_MIN,
  COMPLETENESS_PARTIAL_MIN,
} from './pdfConstants.js';
import { extractTextFromPdfBuffer } from './pdfExtract.service.js';
import {
  identifyModelsInPdfText,
  normalizeCatalogUnit,
  guessFamilyNameFromSolutionType,
} from './pdfModelIdentify.service.js';
import {
  extractMetricsForSolution,
  countFilledMetrics,
  inferCompletenessStatus,
  mergeCompletenessStatus,
} from './pdfMetrics.service.js';
import { upsertTechnicalSpecForModel } from './pdfSpecUpsert.service.js';
import { buildPdfSolutionConsistencyWarnings } from './pdfSolutionConsistency.service.js';
import {
  extractFortigateVMSpecsFromPDF,
  saveFortigateVMSpecs,
} from '../fortigateVM/fortigateVM.extractor.js';
import {
  extractFortiWiFiSpecsFromPDF,
  upsertFortiWiFiSpecs,
} from '../fortiwifi/fortiwifi.extractor.js';
import {
  extractFortiAnalyzerSpecsFromPDF,
  upsertFortiAnalyzerSpecs,
} from '../fortianalyzer/fortianalyzer.extractor.js';
import {
  extractFortiManagerSpecsFromPDF,
  linkFortiManagerRecordsToCatalog,
} from '../fortimanager/fortimanager.extractor.js';
import {
  extractFortiSwitchSpecRecordsFromPDF,
  linkFortiSwitchRecordsToCatalog,
} from '../fortiswitch/fortiswitch.extractor.js';
import normalizeUnit from '../../utils/normalizeUnit.js';

let datasheetSourceColumnsCache = null;
let productModelSchemaCache = null;

async function getDatasheetSourceColumns() {
  if (datasheetSourceColumnsCache) return datasheetSourceColumnsCache;
  const table = await sequelize.getQueryInterface().describeTable('datasheet_sources');
  datasheetSourceColumnsCache = new Set(Object.keys(table || {}));
  return datasheetSourceColumnsCache;
}

async function getProductModelSchema() {
  if (productModelSchemaCache) return productModelSchemaCache;
  productModelSchemaCache = await sequelize.getQueryInterface().describeTable('product_models');
  return productModelSchemaCache;
}

function withExistingColumns(columns, payload) {
  const out = {};
  for (const [key, value] of Object.entries(payload || {})) {
    if (columns.has(key)) out[key] = value;
  }
  return out;
}

function parseEnumValues(typeString) {
  const t = String(typeString || '');
  const matches = [...t.matchAll(/'([^']+)'/g)];
  return matches.map((m) => m[1]);
}

function chooseSourceOriginValue(schema) {
  const values = parseEnumValues(schema?.source_origin?.Type);
  if (values.includes('pdf')) return 'pdf';
  if (values.includes('datasheet')) return 'datasheet';
  if (values.includes('manual')) return 'manual';
  return null;
}

function chooseTechnicalStatusValue(schema) {
  const values = parseEnumValues(schema?.technical_completeness_status?.Type);
  if (values.includes('verified')) return 'verified';
  if (values.includes('complete')) return 'complete';
  if (values.includes('partial')) return 'partial';
  if (values.includes('commercial_only')) return 'commercial_only';
  if (values.includes('missing')) return 'missing';
  return null;
}

/**
 * @typedef {object} IngestPdfParams
 * @property {Buffer} buffer
 * @property {string} fileName
 * @property {string} solutionType - code en tabla solutions
 * @property {string} [version]
 * @property {string[]|null} [unitsOverride] - UNIT explícitos si el parser no detecta modelos
 * @property {number|null} [uploadedBy] - Usuario.id
 * @property {boolean} [fortimanagerAppliancesOnly] - si true, extract FortiManager sin bloque VM
 * @property {boolean} [fortianalyzerAppliancesOnly] - si false, incluye FAZ-VM-*; si undefined, solo appliances (FAZ-NNNG)
 */

/**
 * @param {IngestPdfParams} params
 * @returns {Promise<object>}
 */
export async function ingestPdfDatasheet(params) {
  const {
    buffer,
    fileName,
    solutionType,
    version,
    unitsOverride,
    uploadedBy,
    fortimanagerAppliancesOnly,
    fortianalyzerAppliancesOnly,
  } = params;

  if (!buffer || !Buffer.isBuffer(buffer)) {
    throw new Error('Buffer PDF requerido');
  }
  if (!solutionType || !PDF_INGEST_SOLUTION_TYPES.has(solutionType)) {
    throw new Error(
      `solution_type inválido. Use uno de: ${[...PDF_INGEST_SOLUTION_TYPES].join(', ')}`,
    );
  }

  const solution = await Solution.findOne({
    where: { code: solutionType, is_active: 1 },
  });
  if (!solution) {
    throw new Error(
      `No existe solución activa con code="${solutionType}". Cree la fila en tabla solutions antes de cargar PDF.`,
    );
  }

  const { text, numpages, specs_anchor_found, specs_anchor_offset } =
    await extractTextFromPdfBuffer(buffer);
  const fileHash = crypto.createHash('sha256').update(buffer).digest('hex');

  const consistencyWarnings = buildPdfSolutionConsistencyWarnings({
    solutionType,
    fileName: fileName || '',
    text,
  });

  const extraction = extractMetricsForSolution(text, solutionType);
  const filledMetrics = countFilledMetrics(extraction.metrics);

  let models =
    Array.isArray(unitsOverride) && unitsOverride.length > 0
      ? unitsOverride.map((u) => ({
          unit: normalizeCatalogUnit(u),
          display_label: String(u).trim(),
        }))
      : identifyModelsInPdfText(text, solutionType);

  models = models.filter((m) => m.unit && m.unit.length >= 2);

  const report = {
    extractor: EXTRACTOR_VERSION,
    file_name: fileName,
    file_sha256: fileHash,
    pages: numpages,
    text_length: text.length,
    specs_section_from_anchor: Boolean(specs_anchor_found),
    ...(specs_anchor_found ? { specs_skipped_prefix_chars: specs_anchor_offset } : {}),
    solution_type: solutionType,
    models_detected: models.length,
    metrics_matched: extraction.matched_rule_count ?? 0,
    metrics_expected_slots: extraction.expected_slots ?? 1,
    pending_review: [...(extraction.pending_review || [])],
    warnings: [...consistencyWarnings],
  };

  if (!specs_anchor_found && text.length > 400) {
    report.warnings.push({
      code: 'specifications_section_not_found',
      message:
        'No se encontró "Technical Specifications" / "Specifications" al inicio del texto; se usó el PDF completo. Si el parse falla, compruebe que el PDF incluya esa sección.',
    });
  }

  if (models.length > 1 && filledMetrics > 0) {
    report.warnings.push({
      code: 'shared_metrics_across_models',
      message:
        'Varios modelos detectados; las mismas métricas extraídas se aplican a todos (típico de PDF matrix). Validar por modelo si es necesario.',
    });
  }

  if (models.length === 0) {
    report.warnings.push({
      code: 'no_models_identified',
      message:
        'No se identificaron modelos en el texto. Puede enviar el campo form-data "units_override" como JSON array de UNITs.',
    });
  }

  const source = await sequelize.transaction(async (transaction) =>
    DatasheetSource.create(
      withExistingColumns(await getDatasheetSourceColumns(), {
        solution_id: solution.id,
        solution_type: solutionType,
        file_name: fileName || 'datasheet.pdf',
        version: version || null,
        uploaded_at: new Date(),
        source_type: 'pdf',
        processing_status: 'uploaded',
        uploaded_by: uploadedBy ?? null,
        notes: null,
      }),
      { transaction },
    ),
  );

  if (solutionType === 'fortigate_vm') {
    try {
      const records = await extractFortigateVMSpecsFromPDF(buffer);
      const dsColumns = await getDatasheetSourceColumns();
      const family = guessFamilyNameFromSolutionType(solutionType);

      const out = await sequelize.transaction(async (transaction) => {
        const processingPatch = withExistingColumns(dsColumns, { processing_status: 'processing' });
        if (Object.keys(processingPatch).length) {
          await DatasheetSource.update(processingPatch, { where: { id: source.id }, transaction });
        }

        const saved = await saveFortigateVMSpecs(records, { transaction });
        const linked = await linkFortigateVmRecordsToCatalog({
          solution,
          sourceId: source.id,
          family,
          records: saved,
          transaction,
        });

        const finalPatch = withExistingColumns(dsColumns, {
            notes: JSON.stringify({
              extractor: 'fortigate_vm_pdf_matrix_v1',
              datasheet_source_id: source.id,
              file_name: fileName || 'datasheet.pdf',
              solution_type: solutionType,
              records_detected: records.length,
              records_saved: saved.length,
              catalog_linked: linked.length,
              units: saved.map((r) => r.UNIT),
            }),
            processing_status: 'processed',
          });
        if (Object.keys(finalPatch).length) {
          await DatasheetSource.update(finalPatch, { where: { id: source.id }, transaction });
        }

        return { saved, linked };
      });

      return {
        success: true,
        datasheet_source_id: source.id,
        solution_type: solutionType,
        models_processed: out.saved.length,
        results: out.linked.map((row) => ({
          unit: row.unit,
          product_model_id: row.product_model_id,
          sku_base: row.sku_base,
          linked_offers: row.linked_offers,
        })),
        report: {
          extractor: 'fortigate_vm_pdf_matrix_v1',
          datasheet_source_id: source.id,
          models_processed: out.saved.length,
          units: out.saved.map((row) => row.UNIT),
        },
      };
    } catch (err) {
      const msg = err?.message ?? String(err);
      logger.error('[datasheetPdf] fortigate_vm ingest failed source=%s: %s', source.id, msg);
      try {
        const failedPatch = withExistingColumns(await getDatasheetSourceColumns(), {
            processing_status: 'failed',
            notes: JSON.stringify({
              error: msg,
              datasheet_source_id: source.id,
              solution_type: solutionType,
            }),
          });
        if (Object.keys(failedPatch).length) {
          await DatasheetSource.update(failedPatch, { where: { id: source.id } });
        }
      } catch (e) {
        logger.error('[datasheetPdf] could not mark fortigate_vm source failed id=%s: %s', source.id, e?.message);
      }
      throw err;
    }
  }

  if (solutionType === 'fortiwifi') {
    try {
      const records = await extractFortiWiFiSpecsFromPDF(buffer);
      const dsColumns = await getDatasheetSourceColumns();
      const family = guessFamilyNameFromSolutionType(solutionType);

      const out = await sequelize.transaction(async (transaction) => {
        const processingPatch = withExistingColumns(dsColumns, { processing_status: 'processing' });
        if (Object.keys(processingPatch).length) {
          await DatasheetSource.update(processingPatch, { where: { id: source.id }, transaction });
        }

        const saved = await upsertFortiWiFiSpecs(records, { transaction });
        const linked = await linkFortiwifiRecordsToCatalog({
          solution,
          sourceId: source.id,
          family,
          records: saved,
          transaction,
        });

        const finalPatch = withExistingColumns(dsColumns, {
          notes: JSON.stringify({
            extractor: 'fortiwifi_pdf_matrix_v1',
            datasheet_source_id: source.id,
            file_name: fileName || 'datasheet.pdf',
            solution_type: solutionType,
            records_detected: records.length,
            records_saved: saved.length,
            catalog_linked: linked.length,
            units: saved.map((r) => r.UNIT),
          }),
          processing_status: 'processed',
        });
        if (Object.keys(finalPatch).length) {
          await DatasheetSource.update(finalPatch, { where: { id: source.id }, transaction });
        }

        return { saved, linked };
      });

      return {
        success: true,
        datasheet_source_id: source.id,
        solution_type: solutionType,
        models_processed: out.saved.length,
        results: out.linked.map((row) => ({
          unit: row.unit,
          product_model_id: row.product_model_id,
        })),
        report: {
          extractor: 'fortiwifi_pdf_matrix_v1',
          datasheet_source_id: source.id,
          models_processed: out.saved.length,
          units: out.saved.map((r) => r.UNIT),
        },
      };
    } catch (err) {
      const msg = err?.message ?? String(err);
      logger.error('[datasheetPdf] fortiwifi ingest failed source=%s: %s', source.id, msg);
      try {
        const failedPatch = withExistingColumns(await getDatasheetSourceColumns(), {
          processing_status: 'failed',
          notes: JSON.stringify({
            error: msg,
            datasheet_source_id: source.id,
            solution_type: solutionType,
          }),
        });
        if (Object.keys(failedPatch).length) {
          await DatasheetSource.update(failedPatch, { where: { id: source.id } });
        }
      } catch (e) {
        logger.error('[datasheetPdf] could not mark fortiwifi source failed id=%s: %s', source.id, e?.message);
      }
      throw err;
    }
  }

  if (solutionType === 'fortianalyzer') {
    try {
      const faAppliancesOnly = fortianalyzerAppliancesOnly !== false;
      const records = await extractFortiAnalyzerSpecsFromPDF(buffer, {
        appliancesOnly: faAppliancesOnly,
      });
      const dsColumns = await getDatasheetSourceColumns();
      const family = guessFamilyNameFromSolutionType(solutionType);

      const out = await sequelize.transaction(async (transaction) => {
        const processingPatch = withExistingColumns(dsColumns, { processing_status: 'processing' });
        if (Object.keys(processingPatch).length) {
          await DatasheetSource.update(processingPatch, { where: { id: source.id }, transaction });
        }

        const saved = await upsertFortiAnalyzerSpecs(records, { transaction });
        const linked = await linkFortianalyzerRecordsToCatalog({
          solution,
          sourceId: source.id,
          family,
          records: saved,
          transaction,
        });

        const finalPatch = withExistingColumns(dsColumns, {
          notes: JSON.stringify({
            extractor: 'fortianalyzer_pdf_matrix_v1',
            datasheet_source_id: source.id,
            file_name: fileName || 'datasheet.pdf',
            solution_type: solutionType,
            records_detected: records.length,
            records_saved: saved.length,
            catalog_linked: linked.length,
            units: saved.map((r) => r.UNIT),
          }),
          processing_status: 'processed',
        });
        if (Object.keys(finalPatch).length) {
          await DatasheetSource.update(finalPatch, { where: { id: source.id }, transaction });
        }

        return { saved, linked };
      });

      return {
        success: true,
        datasheet_source_id: source.id,
        solution_type: solutionType,
        models_processed: out.saved.length,
        results: out.linked.map((row) => ({
          unit: row.unit,
          product_model_id: row.product_model_id,
        })),
        report: {
          extractor: 'fortianalyzer_pdf_matrix_v1',
          datasheet_source_id: source.id,
          models_processed: out.saved.length,
          units: out.saved.map((r) => r.UNIT),
        },
      };
    } catch (err) {
      const msg = err?.message ?? String(err);
      logger.error('[datasheetPdf] fortianalyzer ingest failed source=%s: %s', source.id, msg);
      try {
        const failedPatch = withExistingColumns(await getDatasheetSourceColumns(), {
          processing_status: 'failed',
          notes: JSON.stringify({
            error: msg,
            datasheet_source_id: source.id,
            solution_type: solutionType,
          }),
        });
        if (Object.keys(failedPatch).length) {
          await DatasheetSource.update(failedPatch, { where: { id: source.id } });
        }
      } catch (e) {
        logger.error('[datasheetPdf] could not mark fortianalyzer source failed id=%s: %s', source.id, e?.message);
      }
      throw err;
    }
  }

  if (solutionType === 'fortimanager') {
    try {
      const records = await extractFortiManagerSpecsFromPDF(buffer, {
        appliancesOnly: Boolean(fortimanagerAppliancesOnly),
      });
      const dsColumns = await getDatasheetSourceColumns();
      const family = guessFamilyNameFromSolutionType(solutionType);

      const out = await sequelize.transaction(async (transaction) => {
        const processingPatch = withExistingColumns(dsColumns, { processing_status: 'processing' });
        if (Object.keys(processingPatch).length) {
          await DatasheetSource.update(processingPatch, { where: { id: source.id }, transaction });
        }

        const linked = await linkFortiManagerRecordsToCatalog({
          solution,
          sourceId: source.id,
          family,
          records,
          transaction,
        });

        const finalPatch = withExistingColumns(dsColumns, {
          notes: JSON.stringify({
            extractor: 'fortimanager_pdf_sizing_v1',
            datasheet_source_id: source.id,
            file_name: fileName || 'datasheet.pdf',
            solution_type: solutionType,
            records_detected: records.length,
            catalog_linked: linked.length,
            units: linked.map((r) => r.unit),
          }),
          processing_status: 'processed',
        });
        if (Object.keys(finalPatch).length) {
          await DatasheetSource.update(finalPatch, { where: { id: source.id }, transaction });
        }

        return { linked };
      });

      return {
        success: true,
        datasheet_source_id: source.id,
        solution_type: solutionType,
        models_processed: out.linked.length,
        results: out.linked.map((row) => ({
          unit: row.unit,
          product_model_id: row.product_model_id,
        })),
        report: {
          extractor: 'fortimanager_pdf_sizing_v1',
          datasheet_source_id: source.id,
          models_processed: out.linked.length,
          units: out.linked.map((r) => r.unit),
        },
      };
    } catch (err) {
      const msg = err?.message ?? String(err);
      logger.error('[datasheetPdf] fortimanager ingest failed source=%s: %s', source.id, msg);
      try {
        const failedPatch = withExistingColumns(await getDatasheetSourceColumns(), {
          processing_status: 'failed',
          notes: JSON.stringify({
            error: msg,
            datasheet_source_id: source.id,
            solution_type: solutionType,
          }),
        });
        if (Object.keys(failedPatch).length) {
          await DatasheetSource.update(failedPatch, { where: { id: source.id } });
        }
      } catch (e) {
        logger.error('[datasheetPdf] could not mark fortimanager source failed id=%s: %s', source.id, e?.message);
      }
      throw err;
    }
  }

  if (solutionType === 'fortiswitch') {
    try {
      const records = await extractFortiSwitchSpecRecordsFromPDF(buffer, { filterExpected: false });
      const dsColumns = await getDatasheetSourceColumns();
      const family = guessFamilyNameFromSolutionType(solutionType);

      const out = await sequelize.transaction(async (transaction) => {
        const processingPatch = withExistingColumns(dsColumns, { processing_status: 'processing' });
        if (Object.keys(processingPatch).length) {
          await DatasheetSource.update(processingPatch, { where: { id: source.id }, transaction });
        }

        const linked = await linkFortiSwitchRecordsToCatalog({
          solution,
          sourceId: source.id,
          family,
          records,
          transaction,
        });

        const finalPatch = withExistingColumns(dsColumns, {
          notes: JSON.stringify({
            extractor: 'fortiswitch_pdf_matrix_v1',
            datasheet_source_id: source.id,
            file_name: fileName || 'datasheet.pdf',
            solution_type: solutionType,
            records_detected: records.length,
            catalog_linked: linked.length,
            units: linked.map((r) => r.unit),
          }),
          processing_status: 'processed',
        });
        if (Object.keys(finalPatch).length) {
          await DatasheetSource.update(finalPatch, { where: { id: source.id }, transaction });
        }

        return { linked };
      });

      return {
        success: true,
        datasheet_source_id: source.id,
        solution_type: solutionType,
        models_processed: out.linked.length,
        results: out.linked.map((row) => ({
          unit: row.unit,
          product_model_id: row.product_model_id,
        })),
        report: {
          extractor: 'fortiswitch_pdf_matrix_v1',
          datasheet_source_id: source.id,
          models_processed: out.linked.length,
          units: out.linked.map((r) => r.unit),
        },
      };
    } catch (err) {
      const msg = err?.message ?? String(err);
      logger.error('[datasheetPdf] fortiswitch ingest failed source=%s: %s', source.id, msg);
      try {
        const failedPatch = withExistingColumns(await getDatasheetSourceColumns(), {
          processing_status: 'failed',
          notes: JSON.stringify({
            error: msg,
            datasheet_source_id: source.id,
            solution_type: solutionType,
          }),
        });
        if (Object.keys(failedPatch).length) {
          await DatasheetSource.update(failedPatch, { where: { id: source.id } });
        }
      } catch (e) {
        logger.error('[datasheetPdf] could not mark fortiswitch source failed id=%s: %s', source.id, e?.message);
      }
      throw err;
    }
  }

  try {
    const out = await sequelize.transaction(async (transaction) => {
      const dsColumns = await getDatasheetSourceColumns();
      const processingPatch = withExistingColumns(dsColumns, { processing_status: 'processing' });
      if (Object.keys(processingPatch).length) {
        await DatasheetSource.update(processingPatch, { where: { id: source.id }, transaction });
      }

      const results = [];
      const family = guessFamilyNameFromSolutionType(solutionType);

      let inferredCompleteness = null;
      if (filledMetrics > 0) {
        inferredCompleteness = inferCompletenessStatus(
          filledMetrics,
          extraction.expected_slots || 1,
          COMPLETENESS_VERIFIED_MIN,
          COMPLETENESS_PARTIAL_MIN,
        );
      }

      for (const m of models) {
        const [pm, created] = await ProductModel.findOrCreate({
          where: { solution_id: solution.id, unit: m.unit },
          defaults: {
            solution_id: solution.id,
            solution_type: solutionType,
            unit: m.unit,
            sku_base: null,
            model_name: m.display_label || m.unit,
            family_name: family,
            deployment_type: null,
            has_datasheet: true,
            source_origin: 'pdf',
            technical_completeness_status: inferredCompleteness || 'commercial_only',
            is_active: 1,
          },
          transaction,
        });

        const pmUpdates = { has_datasheet: true };

        if (!created) {
          if (pm.model_name == null || String(pm.model_name).trim() === '') {
            pmUpdates.model_name = m.display_label || m.unit;
          }
          if (family && (pm.family_name == null || String(pm.family_name).trim() === '')) {
            pmUpdates.family_name = family;
          }
        }

        if (inferredCompleteness) {
          pmUpdates.technical_completeness_status = mergeCompletenessStatus(
            pm.technical_completeness_status,
            inferredCompleteness,
          );
        }

        await pm.update(pmUpdates, { transaction });

        await DatasheetModelMap.findOrCreate({
          where: {
            datasheet_source_id: source.id,
            product_model_id: pm.id,
          },
          defaults: {
            datasheet_source_id: source.id,
            product_model_id: pm.id,
            page_reference: null,
            extracted_by: EXTRACTOR_VERSION,
            verified_manually: 0,
          },
          transaction,
        });

        const specRes = await upsertTechnicalSpecForModel({
          solutionType,
          productModelId: pm.id,
          metrics: extraction.metrics,
          transaction,
        });

        results.push({
          unit: m.unit,
          product_model_id: pm.id,
          product_model_created: created,
          spec: specRes,
        });
      }

      const finalNotes = JSON.stringify({
        ...report,
        datasheet_source_id: source.id,
        models_processed: results.length,
        results_summary: results.map((r) => ({
          unit: r.unit,
          id: r.product_model_id,
          created: r.product_model_created,
          spec_created: r.spec.created,
          spec_updated: r.spec.updated,
        })),
      });

      const finalPatch = withExistingColumns(dsColumns, {
          notes: finalNotes,
          processing_status: 'processed',
        });
      if (Object.keys(finalPatch).length) {
        await DatasheetSource.update(finalPatch, { where: { id: source.id }, transaction });
      }

      logger.info(
        '[datasheetPdf] source=%s solution=%s models=%s metrics=%s/%s',
        source.id,
        solutionType,
        results.length,
        filledMetrics,
        extraction.expected_slots,
      );

      return {
        results,
        report: { ...report, datasheet_source_id: source.id, models_processed: results.length },
      };
    });

    return {
      success: true,
      datasheet_source_id: source.id,
      solution_type: solutionType,
      models_processed: out.results.length,
      results: out.results,
      report: out.report,
    };
  } catch (err) {
    const msg = err?.message ?? String(err);
    logger.error('[datasheetPdf] ingest failed source=%s: %s', source.id, msg);
    try {
      const failedPatch = withExistingColumns(await getDatasheetSourceColumns(), {
          processing_status: 'failed',
          notes: JSON.stringify({
            error: msg,
            datasheet_source_id: source.id,
            partial_report: report,
          }),
        });
      if (Object.keys(failedPatch).length) {
        await DatasheetSource.update(failedPatch, { where: { id: source.id } });
      }
    } catch (e) {
      logger.error('[datasheetPdf] could not mark source failed id=%s: %s', source.id, e?.message);
    }
    throw err;
  }
}

function buildFortigateVmOfferPatterns(unit) {
  const m = String(unit || '').toUpperCase().match(/^VM-(01|02|04|08|16|32|UL)S$/);
  if (!m) return null;

  const code = m[1];
  const seatMap = { '01': '1', '02': '2', '04': '3', '08': '4', '16': '5', '32': '6', UL: '7' };
  const compact = code === 'UL' ? 'UL' : String(Number(code));

  const skuFragments = [
    `FC${seatMap[code]}-10-FGVVS-`,
    code === 'UL' ? 'FULVM' : compact.length <= 1 ? `FG${compact}VM` : `F${code}VM`,
    `FVM${code}`,
  ];

  const unitVariants = [
    `FORTIGATE-VM${code}-S`,
    `FORTIGATE-VM${code}S`,
    `FORTIGATE-VM${code}V`,
    `FORTIGATE-VM${code}`,
  ];

  return { code, skuFragments, unitVariants };
}

function dedupeOffersBySku(rows) {
  const seen = new Set();
  const out = [];
  for (const row of rows || []) {
    const sku = String(row?.sku || '').trim().toUpperCase();
    if (!sku || seen.has(sku)) continue;
    seen.add(sku);
    out.push(row);
  }
  return out;
}

function pickPrimaryVmSku(offers, patternInfo) {
  const list = dedupeOffersBySku(offers);
  for (const frag of patternInfo?.skuFragments || []) {
    const match = list.find((o) => String(o.sku || '').toUpperCase().includes(frag));
    if (match) return match;
  }
  return list[0] || null;
}

async function findMatchingVmOffers(unit, transaction) {
  const patternInfo = buildFortigateVmOfferPatterns(unit);
  if (!patternInfo) return { offers: [], primary: null };

  const [offers] = await sequelize.query(
    `
    SELECT id, unit, sku, solution_type, offer_type, description, is_active, updatedAt
    FROM solution_offers
    WHERE solution_type = 'fortigate_vm' AND is_active = 1
    ORDER BY updatedAt DESC
  `,
    { transaction },
  );

  const filtered = dedupeOffersBySku(
    (offers || []).filter((offer) => {
      const sku = String(offer.sku || '').toUpperCase();
      const offerUnit = String(offer.unit || '').toUpperCase();
      return (
        patternInfo.skuFragments.some((frag) => sku.includes(frag)) ||
        patternInfo.unitVariants.some((variant) => offerUnit.includes(variant))
      );
    }),
  );

  return { offers: filtered, primary: pickPrimaryVmSku(filtered, patternInfo) };
}

async function findLegacyCompatibleProductModel({ solutionId, unit, transaction }) {
  const [rows] = await sequelize.query(
    `
    SELECT *
    FROM product_models
    WHERE solution_id = :solutionId AND unit = :unit
    LIMIT 1
  `,
    {
      replacements: { solutionId: String(solutionId), unit },
      transaction,
    },
  );
  return rows[0] || null;
}

async function createLegacyCompatibleProductModel({
  solution,
  unit,
  primarySku,
  family,
  transaction,
}) {
  const schema = await getProductModelSchema();
  const columns = [];
  const values = [];
  const replacements = {};

  const push = (column, value) => {
    if (!schema[column] || value == null) return;
    columns.push(`\`${column}\``);
    values.push(`:${column}`);
    replacements[column] = value;
  };

  push('solution_id', String(solution.id));
  push('solution_type', 'fortigate_vm');
  push('unit', unit);
  push('sku_base', primarySku || null);
  push('model_name', unit);
  push('family_name', family || null);
  push('deployment_type', 'virtual');
  if (schema.has_datasheet) push('has_datasheet', 1);

  const sourceOrigin = chooseSourceOriginValue(schema);
  if (sourceOrigin) push('source_origin', sourceOrigin);

  const techStatus = chooseTechnicalStatusValue(schema);
  if (techStatus) push('technical_completeness_status', techStatus);

  if (schema.is_active) push('is_active', 1);

  const [result] = await sequelize.query(
    `
    INSERT INTO product_models (${columns.join(', ')})
    VALUES (${values.join(', ')})
  `,
    { replacements, transaction },
  );

  return findLegacyCompatibleProductModel({
    solutionId: solution.id,
    unit,
    transaction,
  });
}

async function updateLegacyCompatibleProductModel({
  modelId,
  primarySku,
  family,
  transaction,
}) {
  const schema = await getProductModelSchema();
  const sets = [];
  const replacements = { id: modelId };

  if (schema.sku_base && primarySku) {
    sets.push('`sku_base` = COALESCE(NULLIF(`sku_base`, \'\'), :sku_base)');
    replacements.sku_base = primarySku;
  }
  if (schema.family_name && family) {
    sets.push('`family_name` = COALESCE(NULLIF(`family_name`, \'\'), :family_name)');
    replacements.family_name = family;
  }
  if (schema.model_name) {
    sets.push('`model_name` = COALESCE(NULLIF(`model_name`, \'\'), `model_name`)');
  }
  if (schema.has_datasheet) {
    sets.push('`has_datasheet` = 1');
  }
  const sourceOrigin = chooseSourceOriginValue(schema);
  if (schema.source_origin && sourceOrigin) {
    sets.push('`source_origin` = COALESCE(`source_origin`, :source_origin)');
    replacements.source_origin = sourceOrigin;
  }
  const techStatus = chooseTechnicalStatusValue(schema);
  if (schema.technical_completeness_status && techStatus) {
    sets.push('`technical_completeness_status` = COALESCE(`technical_completeness_status`, :technical_status)');
    replacements.technical_status = techStatus;
  }

  if (!sets.length) return;

  await sequelize.query(
    `
    UPDATE product_models
    SET ${sets.join(', ')}
    WHERE id = :id
  `,
    { replacements, transaction },
  );
}

async function linkFortiwifiRecordsToCatalog({ solution, sourceId, family, records, transaction }) {
  const results = [];
  for (const rec of records || []) {
    const unit = normalizeUnit(rec.UNIT);
    if (!unit) continue;

    const [pm, created] = await ProductModel.findOrCreate({
      where: { solution_id: solution.id, unit },
      defaults: {
        solution_id: solution.id,
        solution_type: 'fortiwifi',
        unit,
        sku_base: null,
        model_name: unit,
        family_name: family || 'FortiWiFi',
        deployment_type: 'appliance',
        has_datasheet: true,
        source_origin: 'pdf',
        technical_completeness_status: 'verified',
        is_active: 1,
      },
      transaction,
    });

    await pm.update({ has_datasheet: true }, { transaction });

    try {
      await DatasheetModelMap.findOrCreate({
        where: {
          datasheet_source_id: sourceId,
          product_model_id: pm.id,
        },
        defaults: {
          datasheet_source_id: sourceId,
          product_model_id: pm.id,
          page_reference: null,
          extracted_by: EXTRACTOR_VERSION,
          verified_manually: 0,
        },
        transaction,
      });
    } catch (e) {
      logger.warn(
        '[datasheetPdf] fortiwifi omite datasheet_model_map source=%s unit=%s: %s',
        sourceId,
        unit,
        e?.message || e,
      );
    }

    results.push({ unit, product_model_id: pm.id, created });
  }
  return results;
}

async function linkFortianalyzerRecordsToCatalog({ solution, sourceId, family, records, transaction }) {
  const results = [];
  for (const rec of records || []) {
    const unit = normalizeUnit(rec.UNIT);
    if (!unit) continue;

    const [pm, created] = await ProductModel.findOrCreate({
      where: { solution_id: solution.id, unit },
      defaults: {
        solution_id: solution.id,
        solution_type: 'fortianalyzer',
        unit,
        sku_base: null,
        model_name: unit,
        family_name: family || 'FortiAnalyzer',
        deployment_type: 'appliance',
        has_datasheet: true,
        source_origin: 'pdf',
        technical_completeness_status: 'verified',
        is_active: 1,
      },
      transaction,
    });

    await pm.update({ has_datasheet: true }, { transaction });

    try {
      await DatasheetModelMap.findOrCreate({
        where: {
          datasheet_source_id: sourceId,
          product_model_id: pm.id,
        },
        defaults: {
          datasheet_source_id: sourceId,
          product_model_id: pm.id,
          page_reference: null,
          extracted_by: EXTRACTOR_VERSION,
          verified_manually: 0,
        },
        transaction,
      });
    } catch (e) {
      logger.warn(
        '[datasheetPdf] fortianalyzer omite datasheet_model_map source=%s unit=%s: %s',
        sourceId,
        unit,
        e?.message || e,
      );
    }

    results.push({ unit, product_model_id: pm.id, created });
  }
  return results;
}

async function linkFortigateVmRecordsToCatalog({ solution, sourceId, family, records, transaction }) {
  const results = [];

  for (const record of records || []) {
    const unit = normalizeUnit(record.UNIT);
    if (!unit) continue;

    const { offers, primary } = await findMatchingVmOffers(unit, transaction);
    let pm = await findLegacyCompatibleProductModel({
      solutionId: solution.id,
      unit,
      transaction,
    });
    const created = !pm;
    if (!pm) {
      pm = await createLegacyCompatibleProductModel({
        solution,
        unit,
        primarySku: primary?.sku || null,
        family,
        transaction,
      });
    } else {
      await updateLegacyCompatibleProductModel({
        modelId: pm.id,
        primarySku: primary?.sku || null,
        family,
        transaction,
      });
      pm = await findLegacyCompatibleProductModel({
        solutionId: solution.id,
        unit,
        transaction,
      });
    }

    try {
      await DatasheetModelMap.findOrCreate({
        where: {
          datasheet_source_id: sourceId,
          product_model_id: pm.id,
        },
        defaults: {
          datasheet_source_id: sourceId,
          product_model_id: pm.id,
          page_reference: null,
          extracted_by: EXTRACTOR_VERSION,
          verified_manually: 0,
        },
        transaction,
      });
    } catch (e) {
      logger.warn(
        '[datasheetPdf] fortigate_vm omite datasheet_model_map source=%s unit=%s: %s',
        sourceId,
        unit,
        e?.message || e,
      );
    }

    let linkedOffers = 0;
    for (const offer of offers) {
      const linkType =
        primary && String(primary.sku || '').toUpperCase() === String(offer.sku || '').toUpperCase()
          ? 'primary_sku'
          : 'related_sku';
      try {
        await ModelOfferLink.findOrCreate({
          where: {
            product_model_id: pm.id,
            solution_offer_id: offer.id,
            link_type: linkType,
          },
          defaults: {
            product_model_id: pm.id,
            solution_offer_id: offer.id,
            link_type: linkType,
          },
          transaction,
        });
        linkedOffers += 1;
      } catch (e) {
        logger.warn(
          '[datasheetPdf] fortigate_vm omite model_offer_link unit=%s offer=%s: %s',
          unit,
          offer?.sku,
          e?.message || e,
        );
      }
    }

    results.push({
      unit,
      product_model_id: pm.id,
      created,
      sku_base: primary?.sku || pm?.sku_base || null,
      linked_offers: linkedOffers,
    });
  }

  return results;
}

export default { ingestPdfDatasheet };
