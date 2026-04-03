/***
 * Variables del local storage
 */
export const localStorageKeys = {
  tokenAuth: 'token_auth',
};

/**
 * URL base del API sin barra final.
 * Orden: meta `api-base` en index.html → window.__API_BASE_URL__ → default (alineado con Backend/.env típico PORT=8000).
 */
export function getResolvedApiBase() {
  if (typeof window !== 'undefined' && window.__API_BASE_URL__) {
    return String(window.__API_BASE_URL__).replace(/\/$/, '');
  }
  const meta =
    typeof document !== 'undefined'
      ? document.querySelector('meta[name="api-base"]')?.getAttribute('content')?.trim()
      : '';
  if (meta) return meta.replace(/\/$/, '');
  return 'http://localhost:8000/api/v1';
}

/***
 * Inicializa las variables globales en el objeto window
 */
export const initVariales = () => {
  window.apiUrl = getResolvedApiBase();
  window.agentName = 'Ramirez';
};

/**
 * Obtener una variable global del objeto window
 * @param {string} key
 * @returns
 */
export const getGlobalVariable = (key) => {
  return window[key];
};

/**
 * Establece una variable global en el objeto window
 * @param {string} key
 * @param {*} value
 */
export const setGlobalVariable = (key, value) => {
  window[key] = value;
};
