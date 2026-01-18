import { getGlobalVariable, localStorageKeys } from './variables.js';
import {setTokenStorage} from './localStorage.js';

/**
 * Configuración base para fetch
 */
const TIMEOUT = 3600000;

/**
 * Obtiene la URL base de la API
 * @returns {string}
 */
const getBaseUrl = () => {
    return getGlobalVariable('apiUrl') || 'http://localhost:3000/api/v1';
};

let authToken = null;

/**s
 * Establece el token de autenticación
 * @param {string} token - Token de autorización
 */
export const setTokenAuth = (token) => {
    setTokenStorage(localStorageKeys.tokenAuth, token);
    authToken = token;
};

/**
 * Crea los headers base para las peticiones
 * @param {object} additionalHeaders - Headers adicionales
 * @returns {object}
 */
const getHeaders = (additionalHeaders = {}) => {
    const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...additionalHeaders
    };

    if (authToken) {
        headers.Authorization = `Bearer ${authToken}`;
    }

    return headers;
};

/**
 * Realiza una petición fetch con timeout y manejo de errores
 * @param {string} url - Endpoint
 * @param {object} options - Opciones de fetch
 * @returns {Promise}
 */
const fetchWithTimeout = async (url, options = {}) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT);

    try {
        const response = await fetch(`${getBaseUrl()}${url}`, {
            ...options,
            signal: controller.signal
        });

        clearTimeout(timeout);

        // Manejo de errores por código de estado
        if (!response.ok) {
            const { status } = response;
            let errorData;

            try {
                errorData = await response.json();
            } catch {
                errorData = { message: 'Error desconocido' };
            }

            switch (status) {
                case 401:
                    console.error('No autenticado');
                    break;
                case 403:
                    console.error('No autorizado');
                    break;
                case 404:
                    console.error('Recurso no encontrado');
                    break;
                case 500:
                    console.error('Error del servidor');
                    break;
                default:
                    console.error('Error:', errorData?.message || 'Error desconocido');
            }

            const error = new Error(errorData.message || `Error ${status}`);
            error.response = {
                status,
                data: errorData
            };
            throw error;
        }

        return response;
    } catch (error) {
        clearTimeout(timeout);

        if (error.name === 'AbortError') {
            const timeoutError = new Error('Timeout: La petición tardó demasiado');
            timeoutError.request = true;
            throw timeoutError;
        }

        if (!error.response) {
            console.error('No hay respuesta del servidor');
            error.request = true;
        }

        throw error;
    }
};

/**
 * Servicio HTTP con métodos simplificados
 */
export const httpService = {
    /**
     * GET request
     * @param {string} url - Endpoint
     * @param {object} config - Configuración adicional
     * @returns {Promise}
     */
    get: async (url, config = {}) => {
        const response = await fetchWithTimeout(url, {
            method: 'GET',
            headers: getHeaders(config.headers),
            ...config
        });
        return { data: await response.json() };
    },

    /**
     * POST request
     * @param {string} url - Endpoint
     * @param {object} data - Datos a enviar
     * @param {object} config - Configuración adicional
     * @returns {Promise}
     */
    post: async (url, data = {}, config = {}) => {
        const response = await fetchWithTimeout(url, {
            method: 'POST',
            headers: getHeaders(config.headers),
            body: JSON.stringify(data),
            ...config
        });
        return { data: await response.json() };
    },

    /**
     * PUT request
     * @param {string} url - Endpoint
     * @param {object} data - Datos a enviar
     * @param {object} config - Configuración adicional
     * @returns {Promise}
     */
    put: async (url, data = {}, config = {}) => {
        const response = await fetchWithTimeout(url, {
            method: 'PUT',
            headers: getHeaders(config.headers),
            body: JSON.stringify(data),
            ...config
        });
        return { data: await response.json() };
    },

    /**
     * PATCH request
     * @param {string} url - Endpoint
     * @param {object} data - Datos a enviar
     * @param {object} config - Configuración adicional
     * @returns {Promise}
     */
    patch: async (url, data = {}, config = {}) => {
        const response = await fetchWithTimeout(url, {
            method: 'PATCH',
            headers: getHeaders(config.headers),
            body: JSON.stringify(data),
            ...config
        });
        return { data: await response.json() };
    },

    /**
     * DELETE request
     * @param {string} url - Endpoint
     * @param {object} config - Configuración adicional
     * @returns {Promise}
     */
    delete: async (url, config = {}) => {
        const response = await fetchWithTimeout(url, {
            method: 'DELETE',
            headers: getHeaders(config.headers),
            ...config
        });
        return { data: await response.json() };
    }
};

/**
 * Manejo de errores con SweetAlert
 * @param {Error} error - Error de fetch
 * @param {string} title - Título personalizado (opcional)
 */
export const handleAxiosError = (error, title = 'Error') => {
    let message = 'Ha ocurrido un error desconocido';

    if (error.response) {
        message = error.response.data?.message ||
            error.response.data?.error ||
            `Error ${error.response.status}`;
    } else if (error.request) {
        message = 'No se pudo conectar con el servidor';
    } else {
        message = error.message;
    }

    Swal.fire({
        icon: 'error',
        title: title,
        text: message,
        background: '#1e293b',
        color: '#fff',
        confirmButtonColor: '#dc2626'
    });
};

