/**
 * Validación suave: avisar si el nombre o un extracto del PDF sugiere otra solución
 * distinta a la elegida por el usuario (no bloquea el ingest).
 */

/** Patrones por código de solución (excluir el seleccionado en la comparación) */
const SOLUTION_SIGNALS = {
  fortigate: {
    file: [/fortigate(?!_vm)/i, /\bfgt\b/i, /\bfg-\d/i],
    text: [/fortigate(?!_vm)/i, /\bfortigate\s+\d/i, /\bFG-\d/i],
  },
  fortigate_vm: {
    file: [/fortigate[\s_-]*vm/i, /\bfgt[\s_-]*vm/i, /fortigate.*virtual/i],
    text: [/fortigate\s*vm/i, /\bvm\s+fortigate/i, /fortigate.*virtual/i],
  },
  fortiwifi: {
    file: [/fortiwifi/i, /\bfwf-/i],
    text: [/fortiwifi/i, /\bFWF-/i],
  },
  fortianalyzer: {
    file: [/fortianalyzer/i, /\bfaz\b/i, /\bfaz-/i],
    text: [/fortianalyzer/i, /\bFAZ\b/],
  },
  fortimanager: {
    file: [/fortimanager/i, /\bfmg\b/i, /\bfmg-/i],
    text: [/fortimanager/i, /\bFMG\b/],
  },
  fortiswitch: {
    file: [/fortiswitch/i, /\bfsw\b/i, /\bfsw-/i],
    text: [/fortiswitch/i, /\bFSW-/i],
  },
  fortiap: {
    file: [/fortiap/i, /\bfap\b/i, /\bfap-/i, /forti\s*ap/i],
    text: [/fortiap/i, /\bFAP-/i, /forti\s*access\s*point/i],
  },
  fortimail: {
    file: [/fortimail/i, /\bfml\b/i],
    text: [/fortimail/i],
  },
  fortiweb: {
    file: [/fortiweb/i, /\bfwb\b/i],
    text: [/fortiweb/i],
  },
};

/**
 * @param {object} params
 * @param {string} params.solutionType - solución elegida por el usuario
 * @param {string} params.fileName
 * @param {string} params.text - texto extraído del PDF (puede ser largo; se recorta dentro)
 * @returns {Array<{ code: string, message: string, hint_for?: string, severity: string }>}
 */
export function buildPdfSolutionConsistencyWarnings({ solutionType, fileName, text }) {
  const warnings = [];
  const fname = String(fileName || '').toLowerCase();
  const sample = String(text || '')
    .slice(0, 24000)
    .toLowerCase();

  for (const [code, sig] of Object.entries(SOLUTION_SIGNALS)) {
    if (code === solutionType) continue;

    const fileHit = sig.file.some((re) => {
      try {
        return re.test(fname);
      } catch {
        return false;
      }
    });
    const textHit = sig.text.some((re) => {
      try {
        return re.test(sample);
      } catch {
        return false;
      }
    });

    if (fileHit || textHit) {
      const where = fileHit && textHit ? 'nombre y contenido' : fileHit ? 'nombre del archivo' : 'contenido del PDF';
      warnings.push({
        code: 'solution_mismatch_hint',
        message: `Aviso: ${where} sugieren "${code}" pero la solución seleccionada es "${solutionType}". Comprueba que sea el documento correcto.`,
        hint_for: code,
        severity: 'soft',
      });
    }
  }

  return warnings.slice(0, 5);
}
