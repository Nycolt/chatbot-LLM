/**
 * Carga fortiswitch_specs desde datasheet PDF local (Specifications → System/Hardware matrix).
 *
 * Prerrequisito (esquema con `unit` y columnas matrix):
 *   node scripts/applyFortiswitchSpecsMatrix.mjs
 *
 * Uso (desde Backend/):
 *   node scripts/loadFortiSwitch.js [ruta-al.pdf]
 *
 * Por defecto: Documentos/fortiswitch.pdf junto al repo.
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
import { FortiswitchSpec } from '../src/models/SolutionSpecs.models.js';
import {
  extractFortiSwitchSpecsFromText,
  matrixToBulkRows,
  EXPECTED_FS_UNITS,
  linkFortiSwitchRecordsToCatalog,
} from '../src/services/fortiswitch/fortiswitch.extractor.js';

const DEFAULT_PDF = path.join(
  __dirname,
  '..',
  '..',
  'Documentos',
  'fortiswitch.pdf',
);

async function main() {
  const pdfPath = path.resolve(process.argv[2] || DEFAULT_PDF);
  if (!fs.existsSync(pdfPath)) {
    console.error('No existe el PDF:', pdfPath);
    process.exit(1);
  }

  console.log('Conectando a BD…');
  await sequelize.authenticate();

  const buf = fs.readFileSync(pdfPath);
  console.log('Extrayendo texto con pdf-parse…');
  const doc = await pdfParse(buf);
  const { modelsDetected, matrix } = extractFortiSwitchSpecsFromText(doc.text);

  const rows = matrixToBulkRows(matrix, modelsDetected, { filterExpected: true });
  if (rows.length === 0) {
    console.error('No se obtuvieron filas para las unidades esperadas.', { modelsDetected });
    process.exit(1);
  }

  console.log('Filas a cargar:', rows.length, 'unidades:', rows.map((r) => r.unit));
  const missing = [...EXPECTED_FS_UNITS].filter((u) => !rows.some((r) => r.unit === u));
  if (missing.length) {
    console.warn('Unidades esperadas no presentes en el parseo:', missing);
  }

  const solution = await Solution.findOne({ where: { code: 'fortiswitch', is_active: 1 } });
  if (!solution) {
    console.error('No hay fila activa en solutions con code=fortiswitch.');
    process.exit(1);
  }

  await sequelize.transaction(async (transaction) => {
    await FortiswitchSpec.destroy({ where: {}, transaction });
    console.log('Tabla fortiswitch_specs vaciada (transacción).');
    await linkFortiSwitchRecordsToCatalog({
      solution,
      sourceId: null,
      family: 'FortiSwitch',
      records: rows,
      transaction,
    });
  });
  console.log('Enlace catálogo + specs completado.');

  const count = await FortiswitchSpec.count();
  console.log('Filas en fortiswitch_specs:', count);
  await sequelize.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
