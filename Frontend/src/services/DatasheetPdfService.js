import { getGlobalVariable, getResolvedApiBase, localStorageKeys } from '../config/variables.js';
import { getTokenStorage } from '../config/localStorage.js';

/**
 * Subida de datasheet PDF (multipart). Independiente del Excel de precios / productos.
 */
class DatasheetPdfService {
  /**
   * @param {File} file
   * @param {string} solutionType - ej. fortigate, fortigate_vm
   * @returns {Promise<{ success?: boolean, message?: string, data?: object }>}
   */
  async uploadDatasheetPdf(file, solutionType) {
    const apiUrl = getGlobalVariable('apiUrl') || getResolvedApiBase();
    const token = getTokenStorage(localStorageKeys.tokenAuth);

    if (!file) throw new Error('No se recibió el archivo PDF');
    if (!solutionType || String(solutionType).trim() === '') {
      throw new Error('Debes seleccionar la solución del datasheet');
    }

    const formData = new FormData();
    formData.append('file', file, file.name);
    formData.append('solutionType', String(solutionType).trim());

    let res;
    try {
      res = await fetch(`${apiUrl}/datasheet/pdf/upload`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: formData,
      });
    } catch (netErr) {
      const hint =
        'No hay respuesta del servidor. ¿Está el backend arrancado? La URL del API debe coincidir con ' +
        `PORT en Backend/.env (ahora: ${apiUrl}). Ajusta <meta name="api-base" ...> en index.html o ` +
        'window.__API_BASE_URL__ antes de initVariales. CORS: incluye http://127.0.0.1:5500 en CORS_ORIGIN si usas five-server.';
      const wrapped = new Error(
        netErr?.name === 'TypeError' && String(netErr.message || '').toLowerCase().includes('fetch')
          ? hint
          : netErr?.message || String(netErr),
      );
      wrapped.cause = netErr;
      throw wrapped;
    }

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      const msg =
        data?.message ||
        data?.errors?.[0] ||
        `Error ${res.status} al subir el datasheet PDF`;
      const err = new Error(msg);
      err.response = { status: res.status, data };
      throw err;
    }

    return data;
  }
}

export default new DatasheetPdfService();
