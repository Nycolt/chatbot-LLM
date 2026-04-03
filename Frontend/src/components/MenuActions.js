//Componentes y funciones
import { settingsBtn } from "./ComponentesFormulario.js";
import { handleCerrarSesion, CargarDatasheetPdf, CargarPriceListFortinet } from "./MenuActions.fun.js";
import { ModalAutenticacion } from "../modal/ModalAutenticacion.js";
import { setTokenAuth } from "../config/fetch.js";
import { openBuzonNecesidades } from "./BuzonNecesidades.js";
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
        label: "Cargar datasheet PDF",
        icon: `
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
        `,
        action: () => {
            CargarDatasheetPdf();
        },
    },
    {
        label: "Cargar Price List Fortinet",
        icon: `
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6l4 2" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        `,
        action: () => {
            CargarPriceListFortinet();
        },
    },
    {
        label: "Buzón de Necesidades",
        icon: `
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path>
            </svg>
        `,
        action: () => {
            openBuzonNecesidades();
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