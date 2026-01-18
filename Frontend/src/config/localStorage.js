
/* establecer un valor en localStorage */
export const setTokenStorage = (key, value) => {
    localStorage.setItem(key, value);
}

/* obtener un valor de localStorage */
export const getTokenStorage = (key) => {
    return localStorage.getItem(key);
}

/* remover un valor de localStorage */
export const removeTokenStorage = (key) => {
    localStorage.removeItem(key);
}