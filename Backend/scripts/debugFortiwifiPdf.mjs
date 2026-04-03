/**
 * Uso: node scripts/debugFortiwifiPdf.mjs "ruta/al/archivo.pdf"
 */
import fs from 'fs';
import { extractTextFromPdfBuffer } from '../src/services/datasheetPdf/pdfExtract.service.js';

const path = process.argv[2];
if (!path) {
  console.error('Falta ruta PDF');
  process.exit(1);
}
const buf = fs.readFileSync(path);
const fullPdf = process.env.FULL_PDF === '1';
const { text, numpages, specs_anchor_found, specs_anchor_offset } = await extractTextFromPdfBuffer(buf, {
  skipSpecificationsSlice: fullPdf,
});
const t = text.replace(/\r/g, '\n');
console.log(
  'pages',
  numpages,
  'chars',
  t.length,
  fullPdf ? '(FULL_PDF=1)' : '',
  specs_anchor_found ? `anchor@${specs_anchor_offset}` : '(sin ancla Specifications)',
);
const fwf = [...t.matchAll(/\bFWF-[0-9A-Z0-9-]+\b/gi)].map((m) => m[0]);
console.log('FWF unique:', [...new Set(fwf)]);
console.log('\n--- líneas con métricas ---\n');
for (const line of t.split('\n')) {
  const s = line.trim();
  if (
    s.length > 3 &&
    s.length < 220 &&
    /IPS|NGFW|Threat|Concurrent|Session|IPsec|SSL|FortiAP|FortiSwitch|Throughput|Gbps|Mbps/i.test(s)
  ) {
    console.log(s);
  }
}
