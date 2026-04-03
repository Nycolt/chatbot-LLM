/**
 * Uso: node scripts/debugFortiswitchPdfDump.mjs [ruta.pdf]
 */
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { extractFortiSwitchSpecsFromText } from '../src/services/fortiswitch/fortiswitch.extractor.js';

const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pdfPath =
  process.argv[2] ||
  path.join(__dirname, '..', '..', 'Documentos', 'FortiSwitch_Data_Center_Series.pdf');

const buf = fs.readFileSync(pdfPath);
const doc = await pdfParse(buf);
const t = doc.text;

console.log('PDF', pdfPath);
console.log('text length', t.length, 'pages', doc.numpages);

const markers = ['Specifications', 'Hardware Specifications', 'System Specifications', 'FORTISWITCH', 'FortiSwitch', 'FS-', 'Ordering Information'];
for (const m of markers) {
  const i = t.indexOf(m);
  console.log('indexOf', JSON.stringify(m), i);
}

const iHw = t.search(/\bHardware\s+Specifications\b/i);
console.log('\n--- excerpt from Hardware Specifications (3500 chars) ---\n');
console.log(t.slice(iHw, iHw + 3500));

console.log('\n--- try full extract ---\n');
try {
  const out = extractFortiSwitchSpecsFromText(t);
  console.log('models', out.modelsDetected);
  console.log('matrix keys sample', Object.keys(out.matrix));
  const u = out.modelsDetected[0];
  if (u) console.log('first model cells', out.matrix[u]);
} catch (e) {
  console.error('extractFortiSwitchSpecsFromText error:', e.message);
}
