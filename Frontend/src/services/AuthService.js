import { httpService } from "../config/fetch.js";
import { getTokenStorage } from "../config/localStorage.js";
import { localStorageKeys } from "../config/variables.js";

class AuthService {
    
    /**
     * obtener información del usuario desde el token almacenado
     * @returns 
     */
    getUserInfo = () =>{
        const token = getTokenStorage(localStorageKeys.tokenAuth);
        if (!token) return null;

        // Decodificar el token JWT para obtener la información del usuario
        const payloadBase64 = token.split('.')[1];
        const payloadJson = atob(payloadBase64);
        const payload = JSON.parse(payloadJson);
        return payload;
    }

    /**
     * Validar si el usuario está logueado
     * @returns 
     */
    isLogged = () => {
        const token = getTokenStorage(localStorageKeys.tokenAuth);
        return token !== null;
    }

    /**
     * Login de usuario
     * @param {string} Usuario 
     * @param {string} Credencial 
     * @returns 
     */
    async login(Usuario, Credencial) {
        // Lógica de autenticación (simulada aquí)
        const response = await httpService.post('/auth/login', { Usuario, Credencial });
        return response.data;
    }

}

// Exportar una instancia de la clase
export default new AuthService();