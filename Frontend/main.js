
//Complementos, funciones, utilidades .etc 
import { initVariales } from "./src/config/variables.js";
import { initSweetAlert } from "./src/config/sweetalert.js";
import { configPopUpButton } from "./src/components/MenuActions.js";
import AgentService from "./src/services/AgentService.js";
import { WELCOME_MESSAGE } from "./src/services/AgentService.js";
import {
    showLoadingIndicator,
    hideLoadingIndicator,
    renderMessages,
    chatbox,
} from "./src/components/ComponentesFormulario.js";
import { ensureComparePickerDelegation } from "./src/components/CompareModelPicker.js";

/**
 * Mostrar alerta informativa sobre precisión de la IA
 */
const showAIDisclaimerAlert = () => {
    Swal.fire({
        title: '<strong>⚠️ Aviso Importante</strong>',
        html: `
            <div style="text-align: left; padding: 10px;">
                <p style="margin-bottom: 15px; font-size: 16px;">
                    La inteligencia artificial es una herramienta de apoyo que puede proporcionar información útil, 
                    sin embargo:
                </p>
                <ul style="list-style: none; padding-left: 0;">
                    <li style="margin-bottom: 10px;">
                        <span style="color: #dc2626;">🤖</span> 
                        <strong>No es 100% precisa</strong> - Puede generar respuestas inexactas o incompletas
                    </li>
                    <li style="margin-bottom: 10px;">
                        <span style="color: #dc2626;">✅</span> 
                        <strong>Favor rectificar</strong> - Siempre verifique la información con fuentes oficiales
                    </li>
                    <li style="margin-bottom: 10px;">
                        <span style="color: #dc2626;">📋</span> 
                        <strong>Consulte con expertos</strong> - Para decisiones críticas, contacte a un especialista
                    </li>
                </ul>
            </div>
        `,
        icon: 'warning',
        iconColor: '#dc2626',
        background: '#1e293b',
        color: '#ffffff',
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#dc2626',
        showClass: {
            popup: 'animate__animated animate__fadeInDown'
        },
        hideClass: {
            popup: 'animate__animated animate__fadeOutUp'
        },
        customClass: {
            popup: 'rounded-3xl border-2 border-red-600',
            title: 'text-2xl font-bold',
            confirmButton: 'rounded-2xl px-6 py-3 font-semibold shadow-lg hover:shadow-xl transition-all duration-200'
        }
    });
};



const configButtons = () => {

    //Configuracion del Popup del boton de configuracion
    configPopUpButton();
    
}

/**
 * Inicializar el chat del agente
 */
const initAgentChat = async () => {
  try {
    // Alinear estado interno con lo que se muestra (menú principal + “Menú principal” / flujos)
    AgentService.uiState = "idle";
    AgentService.compareSolution = null;
    AgentService.setMessages([WELCOME_MESSAGE]);
    renderMessages(AgentService.getMessages());
    ensureComparePickerDelegation(chatbox);
  } catch (error) {
    console.error("Error al inicializar el chat:", error);
  }
};

/***
 * Configuración inicial de la aplicación
 */
const ConfiguracionInicial = () => {

    // Inicializar variables globales
    initVariales();

    // Configurar SweetAlert2 con estilos globales
    initSweetAlert();

    //Inicializar el servicio del agente
    //AgentService.run();

    // Configuracion de acciones de botones
    configButtons();

    // Inicializar el chat del agente (delegación de botones comparación se registra dentro)
    initAgentChat();

    // Mostrar alerta informativa sobre la IA
    setTimeout(() => {
        showAIDisclaimerAlert();
    }, 1000);

}

/**
 * Evento DOMContentLoaded
 */
window.addEventListener("DOMContentLoaded", () => {

    //1. Configuración inicial
    ConfiguracionInicial();

});