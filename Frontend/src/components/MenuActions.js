//Componentes y funciones
import { settingsBtn } from "./ComponentesFormulario.js";
import { CargarProducto, handleCerrarSesion, CargarDatasheet } from "./MenuActions.fun.js";
import { ModalAutenticacion } from "../modal/ModalAutenticacion.js";
import { setTokenAuth } from "../config/fetch.js";
import {
    createMenuConfiguracion,
    closeMenuConfiguracion,
    isMenuOpen
} from "./MenuConfiguracion.js";

//Servicios
import AuthService from "../services/AuthService.js";


/***
 * Opciones del menu - Button
 */
const OptionsMenu = [
    {
        label: "Cargar Productos",
        icon: `
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
            </svg>
        `,
        action: () => {
            CargarProducto();
        },
    },
    {
        label: "Cargar Datasheets",
        icon: `
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
            </svg>
        `,
        action: () => {
            CargarDatasheet(); // Implementar función de cargar datasheets
        },
    },
    {
        label: "Cerrar Sesión",
        icon: `
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
            </svg>
        `,
        action: () => {
            handleCerrarSesion();
        },
    }
    // ... Mas opciones si es necesario
]

/**
 * Edita una propiedad de un objeto del array OptionsMenu
 * @param {number} index - Índice del objeto a editar
 * @param {string} property - Nombre de la propiedad a editar
 * @param {*} value - Nuevo valor para la propiedad
 * @returns {boolean} - true si se editó correctamente, false en caso contrario
 */
const editMenuOption = (index, property, value) => {
    if (index < 0 || index >= OptionsMenu.length) {
        console.error('Índice fuera de rango');
        return false;
    }

    OptionsMenu[index][property] = value;
    return true;
};


/**
 * Configuración de acciones de botones
 */
const configPopUpButton = () => {
    // Configurar apertura del modal de autenticación si existe el botón
    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            const isLogged = AuthService.isLogged();

            if (isLogged) {

                // Si el menú ya está abierto, cerrarlo
                if (isMenuOpen()) {
                    closeMenuConfiguracion();
                    return;
                }

                // Mostrar menú desplegable de configuración
                createMenuConfiguracion();

            } else {

                // Si no está logueado, abrir modal de autenticación
                ModalAutenticacion(
                    (response) => {
                        // Usuario autenticado con éxito
                        //Establecer el token de autenticación
                        const token = response.token;
                        setTokenAuth(token);
                        // Mostrar menú desplegable después de autenticarse
                        createMenuConfiguracion();
                    },
                    () => { console.error('Usuario no autorizado'); },
                    (err) => { console.error('Error en autenticación', err); }
                );

            }
        });
    }
}

export {
    editMenuOption,
    configPopUpButton,
    OptionsMenu
}