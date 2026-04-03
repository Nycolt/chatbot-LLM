import { getGlobalVariable, getResolvedApiBase, localStorageKeys } from '../config/variables.js';
import { getTokenStorage } from "../config/localStorage.js";

class PriceListService {
  /**
   * Sube el Excel oficial Fortinet (Main Price List) y ejecuta el flujo completo en backend.
   * @param {File} file
   * @returns {Promise<any>}
   */
  async uploadFortinetPriceList(file) {
    const apiUrl = getGlobalVariable('apiUrl') || getResolvedApiBase();
    const token = getTokenStorage(localStorageKeys.tokenAuth);

    if (!file) throw new Error("No se recibió el archivo para subir");

    const formData = new FormData();
    // Campo esperado por multer: `upload.single('file')`
    formData.append("file", file, file.name);

    const res = await fetch(`${apiUrl}/price-list/upload`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: formData,
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      const msg =
        data?.message ||
        data?.error_message ||
        data?.data?.message ||
        `Error ${res.status} al subir la price list`;
      throw new Error(msg);
    }

    return data;
  }
}

export default new PriceListService();

