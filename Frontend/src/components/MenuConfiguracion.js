import AuthService from '../services/AuthService.js';
import { OptionsMenu } from './MenuActions.js';

/**
 * Menú desplegable de configuración
 * Se muestra cuando el usuario hace clic en el botón de configuración (⚙️)
 * Solo se muestra si el usuario está autenticado
 */

let menuElement = null;

/**
 * Icono por defecto para opciones sin icono definido
 */
const defaultIcon = `
    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"></path>
    </svg>
`;

/**
 * Crea el menú desplegable de configuración dinámicamente usando OptionsMenu
 */
export const createMenuConfiguracion = () => {
    
    // Si ya existe el menú, removerlo
    if (menuElement) {
        menuElement.remove();
        menuElement = null;
    }

    // Crear el elemento del menú
    menuElement = document.createElement('div');
    menuElement.id = 'menu-configuracion';
    menuElement.className = 'absolute bottom-24 right-6 bg-black border border-red-600 rounded-lg shadow-xl overflow-hidden z-50 opacity-0 scale-95 transition-all duration-200';
    menuElement.style.minWidth = '250px';

    // Generar los botones dinámicamente desde OptionsMenu
    const menuButtons = OptionsMenu.map((option, index) => {
        const icon = option.icon || defaultIcon;
        const isLogoutButton = option.label.toLowerCase().includes('cerrar sesión');
        const textColor = isLogoutButton ? 'text-red-400' : 'text-white';
        
        return `
            <button data-menu-index="${index}" class="w-full text-left px-4 py-3 ${textColor} hover:bg-gray-900 transition-colors flex items-center gap-3">
                ${icon}
                <span>${option.label}</span>
            </button>
        `;
    }).join('');

    menuElement.innerHTML = `
        <div class="py-2">
            <div class="px-4 py-3 border-b border-gray-700">
                <p class="text-sm text-gray-400">Configuración</p>
            </div>
            ${menuButtons}
        </div>
    `;

    // Agregar al body
    document.body.appendChild(menuElement);

    // Animar entrada
    setTimeout(() => {
        menuElement.classList.remove('opacity-0', 'scale-95');
        menuElement.classList.add('opacity-100', 'scale-100');
    }, 10);

    // Event listeners dinámicos para cada opción del menú
    OptionsMenu.forEach((option, index) => {
        const button = menuElement.querySelector(`[data-menu-index="${index}"]`);
        if (button) {
            button.addEventListener('click', () => {
                closeMenuConfiguracion();
                if (option.action && typeof option.action === 'function') {
                    option.action();
                }
            });
        }
    });

    // Cerrar menú al hacer clic fuera
    setTimeout(() => {
        document.addEventListener('click', handleClickOutside);
    }, 0);

    return menuElement;
};

/**
 * Maneja clics fuera del menú para cerrarlo
 */
const handleClickOutside = (e) => {
    if (menuElement && !menuElement.contains(e.target) && !e.target.closest('#settings-btn')) {
        closeMenuConfiguracion();
    }
};

/**
 * Cierra y remueve el menú de configuración
 */
export const closeMenuConfiguracion = () => {
    if (menuElement) {
        // Animar salida
        menuElement.classList.remove('opacity-100', 'scale-100');
        menuElement.classList.add('opacity-0', 'scale-95');
        
        setTimeout(() => {
            document.removeEventListener('click', handleClickOutside);
            menuElement.remove();
            menuElement = null;
        }, 200);
    }
};

/**
 * Verifica si el menú está abierto
 */
export const isMenuOpen = () => {
    return menuElement !== null;
};
