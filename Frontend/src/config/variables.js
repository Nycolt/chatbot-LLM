/***
 * Variables del local storage
 */
export const localStorageKeys = {
  tokenAuth: "token_auth",
}


/***
 * Inicializa las variables globales en el objeto window
 */
export const initVariales = () => {
  window.apiUrl = "http://localhost:3000/api/v1";
  window.agentName = "Ramirez";
}

/**
 * Obtener una variable global del objeto window
 * @param {string} key 
 * @returns 
 */
export const getGlobalVariable = (key) => {
  return window[key];
}

/**
 * Establece una variable global en el objeto window
 * @param {string} key 
 * @param {*} value 
 */
export const setGlobalVariable = (key, value) => {
  window[key] = value;
}


