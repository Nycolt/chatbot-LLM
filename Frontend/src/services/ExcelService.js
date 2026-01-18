import { httpService } from "../config/fetch.js";

class ExcelService {

    /**
     * Login de usuario
     * @param {string} Usuario 
     * @param {string} Credencial 
     * @returns 
     */
    async InsertarProductos(Productos) {
        // Lógica de autenticación (simulada aquí)
        const response = await httpService.post('/product/insertar/masivo', Productos);
        return response.data;
    }

    /**
     * Login de usuario
     * @param {string} Usuario 
     * @param {string} Credencial 
     * @returns 
     */
    async InsertarDatasheets(Datasheets) {
        // Lógica de autenticación (simulada aquí)
        const response = await httpService.post('/datasheet/insertar/masivo', Datasheets);
        return response.data;
    }

}

// Exportar una instancia de la clase
export default new ExcelService();