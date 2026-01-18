import AgentService from '../services/AgentService.js';

const form = document.getElementById('chat-form');
const chatbox = document.getElementById('chatbox');
const input = document.getElementById('user-input');
const settingsBtn = document.getElementById('settings-btn');

/**
 * Ajusta el scroll del chat al final
 */
const scrollToBottom = () => {
  chatbox.scrollTop = chatbox.scrollHeight;
};

/**
 * Muestra un indicador de carga estilo WhatsApp
 */
const showLoadingIndicator = () => {
  const loadingHtml = `
    <div id="loading-indicator" class="flex items-center justify-center gap-2 p-4 bg-gray-800/90 text-gray-200 rounded-lg shadow-lg mb-4">
      <svg class="animate-spin h-5 w-5 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <span class="text-sm">Cargando...</span>
    </div>
  `;
  chatbox.innerHTML = loadingHtml;
};

/**
 * Oculta el indicador de carga
 */
const hideLoadingIndicator = () => {
  const loadingElement = document.getElementById('loading-indicator');
  if (loadingElement) {
    loadingElement.remove();
  }
};

/**
 * Muestra un indicador de "escribiendo" con animación de 3 puntos
 */
const showTypingIndicator = () => {
  const typingHtml = `
    <div id="typing-indicator" class="text-left mb-4">
      <div class="inline-block bg-gray-800 text-gray-200 px-4 py-3 rounded-2xl border border-red-600">
        <div class="flex gap-1">
          <span class="w-2 h-2 bg-red-600 rounded-full animate-bounce" style="animation-delay: 0s"></span>
          <span class="w-2 h-2 bg-red-600 rounded-full animate-bounce" style="animation-delay: 0.2s"></span>
          <span class="w-2 h-2 bg-red-600 rounded-full animate-bounce" style="animation-delay: 0.4s"></span>
        </div>
      </div>
    </div>
  `;
  chatbox.innerHTML += typingHtml;
  scrollToBottom();
};

/**
 * Oculta el indicador de "escribiendo"
 */
const hideTypingIndicator = () => {
  const typingElement = document.getElementById('typing-indicator');
  if (typingElement) {
    typingElement.remove();
  }
};

/**
 * Renderiza todos los mensajes del chat (solo user y assistant)
 * @param {Array} messages - Array de mensajes del chat
 */
const renderMessages = (messages) => {
  // Limpiar chatbox
  chatbox.innerHTML = '';
  
  // Filtrar solo mensajes de user y assistant
  const visibleMessages = messages.filter(msg => msg.role === 'user' || msg.role === 'assistant');
  
  // Renderizar cada mensaje
  visibleMessages.forEach(msg => {
    const type = msg.role === 'user' ? 'user' : 'agent';
    createMessageBubble(msg.content, type);
  });
};

/**
 * Crea un globo de mensaje en el chat
 * @param {string} message - El mensaje a mostrar
 * @param {string} type - Tipo de mensaje: 'user', 'agent' o 'error'
 */
const createMessageBubble = (message, type = 'user') => {
  const bubbleStyles = {
    user: {
      container: 'text-right',
      bubble: 'inline-block bg-red-600 text-white px-4 py-2 rounded-2xl shadow-md whitespace-pre-wrap break-words'
    },
    agent: {
      container: 'text-left',
      bubble: 'inline-block bg-gray-800 text-gray-200 px-4 py-2 rounded-2xl border border-red-600 whitespace-pre-wrap break-words'
    },
    error: {
      container: 'text-left',
      bubble: 'text-red-400 italic whitespace-pre-wrap break-words'
    }
  };

  const style = bubbleStyles[type] || bubbleStyles.user;
  
  chatbox.innerHTML += `
    <div class="${style.container}">
      <div class="${style.bubble}">${message}</div>
    </div>
  `;
  
  scrollToBottom();
};

/**
 * Maneja el envío del formulario
 * @param {Event} e - Evento del formulario
 */
const handleSubmit = async (e) => {
  e.preventDefault();
  
  const message = input.value.trim();
  if (!message) return;

  // Limpiar input
  input.value = '';

  // Mostrar mensaje del usuario inmediatamente
  createMessageBubble(message, 'user');

  // Mostrar indicador de "escribiendo"
  showTypingIndicator();

  try {
    // Crear objeto de mensaje del usuario
    const userMessage = {
      role: 'user',
      content: message
    };

    // Añadir mensaje del usuario y obtener todos los mensajes
    const updatedMessages = AgentService.addMessageAndReturn(userMessage);

    // Generar respuesta del agente
    const newMessages = await AgentService.generateAgentResponse(updatedMessages);

    // Establecer los nuevos mensajes
    AgentService.setMessages(newMessages);

    // Ocultar indicador de "escribiendo"
    hideTypingIndicator();

    // Renderizar todos los mensajes
    renderMessages(newMessages);

  } catch (err) {
    // Ocultar indicador de "escribiendo" en caso de error
    hideTypingIndicator();
    createMessageBubble('⚠️ No se pudo conectar con el servidor.', 'error');
  }
};

/***
 * Enviar el formulario al presionar Enter
 */
input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    form.requestSubmit();
  }
});

/**
 * Configuracion del envío del formulario
 */
form.addEventListener('submit', handleSubmit);



export {

  //Button
  settingsBtn,

  //Inputs
  chatbox, input,

  //Formulario
  form,

  //Funciones
  createMessageBubble,
  scrollToBottom,
  renderMessages,
  showLoadingIndicator,
  hideLoadingIndicator,
  showTypingIndicator,
  hideTypingIndicator

}