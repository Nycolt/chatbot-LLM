/**
 * Carga fortimanager_specs desde PDF local (solo tabla FORTIMANAGER APPLIANCES, modelos FMG-NNNG).
 *
 * Requisitos: sin frontend, sin multer, lectura con fs + pdf-parse.
 *
 * Uso (desde carpeta Backend):
 *   node scripts/fortimanager.loadFromPdf.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

import { sequelize } from '../src/config/database.js';
import Solution from '../src/models/Solution.model.js';
import ProductModel from '../src/models/ProductModel.model.js';
import { FortimanagerSpec } from '../src/models/SolutionSpecs.models.js';

import {
  findFortiManagerSpecBlocks,
  extractFortiManagerBlock,
  mergeSpecsByUnit,
  tokenizeGluedFmgModels,
  splitMatrixRow,
  normalizeFortiManagerUnit,
} from '../src/services/fortimanager/fortimanager.extractor.js';

/** Ruta fija del datasheet (Windows). */
const PDF_PATH = 'C:\\Users\\nycoa\\Desktop\\chatbot-LLM\\Documentos\\fortimanager.pdf';

const APPLIANCE_UNIT_RE = /^FMG-\d{3,4}G$/i;

function normalizeWhitespace(text) {
  return String(text || '')
    .replace(/\r/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/\t/g, '  ');
}

/**
 * Quita bloque VIRTUAL APPLIANCES y cola comercial; deja solo secciones hardware.
 */
function stripVirtualAndOrdering(text) {
  let t = String(text || '');
  t = t.replace(/VIRTUAL\s+APPLIANCES[\s\S]*?(?=FORTIMANAGER\s+APPLIANCES)/gi, '');
  t = t.replace(/\n\s*Ordering\s+Information[\s\S]*$/i, '');
  return t;
}

function isFortiManagerAppliancesHeader(line) {
  const squashed = String(line || '').replace(/\s+/g, ' ');
  return /FORTIMANAGER\s+APPLIANCES/i.test(squashed) && !/VIRTUAL/i.test(squashed);
}

function coerceDbValue(v) {
  if (v === true) return 'Yes';
  if (v === false) return 'No';
  if (v == null) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

function recordToBulkRow(rec, productModelId) {
  const u = normalizeFortiManagerUnit(rec.UNIT);
  return {
    product_model_id: productModelId,
    unit: u,
    devices_vdoms_default: coerceDbValue(rec.Default_Devices_VDOMs),
    devices_vdoms_maximum: coerceDbValue(rec.Max_Devices_VDOMs),
    gb_per_day: coerceDbValue(rec.Log_GB_per_day),
    sustained_log_rates: coerceDbValue(rec.Sustained_Log_Rates),
    storage_capacity: coerceDbValue(rec.Storage_Capacity),
    usable_storage_after_raid: coerceDbValue(rec.Usable_Storage),
    raid_levels: coerceDbValue(rec.RAID_Levels),
    total_interfaces: coerceDbValue(rec.Total_Interfaces),
    redundant_power: coerceDbValue(rec.Redundant_Power),
    removable_disks: coerceDbValue(rec.Removable_Disks),
    sed: coerceDbValue(rec.SED),
  };
}

async function main() {
  const buffer = fs.readFileSync(PDF_PATH);
  const parsed = await pdfParse(buffer);
  const rawText = typeof parsed.text === 'string' ? parsed.text : '';

  const text = normalizeWhitespace(stripVirtualAndOrdering(rawText));
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

  const rawBlocks = findFortiManagerSpecBlocks(lines);
  const applianceBlocks = rawBlocks.filter((b) => isFortiManagerAppliancesHeader(lines[b.startLine]));

  const allPartial = [];
  for (let bi = 0; bi < applianceBlocks.length; bi++) {
    const { startLine } = applianceBlocks[bi];
    const headerLine = lines[startLine];
    const modelsDetected = tokenizeGluedFmgModels(headerLine).filter((u) => APPLIANCE_UNIT_RE.test(u));
    const endLine = bi + 1 < applianceBlocks.length ? applianceBlocks[bi + 1].startLine : lines.length;

    for (let li = startLine + 1; li < endLine; li++) {
      const row = lines[li];
      const columns = splitMatrixRow(row);
      const ok = modelsDetected.length > 0 && columns.length >= modelsDetected.length + 1;
      const values = columns;
      console.log({ modelsDetected, row, values, splitOk: ok });
    }

    if (modelsDetected.length > 0) {
      allPartial.push(...extractFortiManagerBlock(lines, startLine, endLine, modelsDetected));
    }
  }

  const merged = mergeSpecsByUnit(allPartial).filter((r) => APPLIANCE_UNIT_RE.test(r.UNIT));

  const solution = await Solution.findOne({ where: { code: 'fortimanager' } });
  if (!solution?.id) {
    throw new Error('No existe fila en solutions con code = "fortimanager".');
  }

  await FortimanagerSpec.destroy({ where: {} });

  const bulkRows = [];
  for (const rec of merged) {
    const unit = normalizeFortiManagerUnit(rec.UNIT);
    const [pm] = await ProductModel.findOrCreate({
      where: { solution_id: solution.id, unit },
      defaults: {
        solution_id: solution.id,
        solution_type: 'fortimanager',
        unit,
        sku_base: null,
        model_name: unit,
        family_name: 'FortiManager',
        deployment_type: 'appliance',
        has_datasheet: true,
        source_origin: 'pdf',
        technical_completeness_status: 'verified',
        is_active: 1,
      },
    });
    bulkRows.push(recordToBulkRow(rec, pm.id));
  }

  // MySQL: ON DUPLICATE KEY UPDATE usa la restricción UNIQUE real (product_model_id), no `unit`.
  await FortimanagerSpec.bulkCreate(bulkRows, {
    updateOnDuplicate: [
      'unit',
      'devices_vdoms_default',
      'devices_vdoms_maximum',
      'gb_per_day',
      'sustained_log_rates',
      'storage_capacity',
      'usable_storage_after_raid',
      'raid_levels',
      'total_interfaces',
      'redundant_power',
      'removable_disks',
      'sed',
      'updated_at',
    ],
  });

  console.log('--- Resumen ---');
  console.log('Modelos appliance:', bulkRows.map((r) => r.unit).sort().join(', '));
  for (const r of bulkRows.sort((a, b) => a.unit.localeCompare(b.unit))) {
    console.log(r.unit, 'devices_vdoms_default=', r.devices_vdoms_default);
  }

  await sequelize.close();
}

main().catch(async (e) => {
  console.error(e);
  try {
    await sequelize.close();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
