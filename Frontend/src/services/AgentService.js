import { getGlobalVariable } from "../config/variables.js";
import getPrompt from "../Agent/prompt.js";
import { httpService } from "../config/fetch.js";

class AgentService {
    
    constructor() {
        this.agentName = getGlobalVariable('agentName') || 'Armando';
        this.maxMessages = 20; // Límite total de mensajes (1 system + 19 user/assistant)
        // No llamar configChat aquí para evitar dependencia circular
    }

    configChat = async () => {
    
        // Inicializar los mensajes del chat con el mensaje del sistema
        this.messages = [];

        // Obtener el prompt del agente
        const promptContent = getPrompt(this.agentName);

        // Añadir el mensaje del sistema al chat
        const systemMessage = {
            role: 'system',
            content: promptContent
        };
        this.messages.push(systemMessage);

        // Enviar el mensaje al agente
        const response = await this.generateAgentResponse(this.messages);
        this.setMessages(response);

        return this.messages;
    }

    /**
     * Establecer mensajes del chat
     * @param {Array []} messages 
     */
    setMessages = (messages) =>{
        this.messages = messages;
    }

    /***
     * Obtener mensajes del chat
     * @returns {Array []} messages
     */
    getMessages = () =>{
        return this.messages;
    }

    /**
     * Añadir mensaje al chat
     * @param {Object} message 
     */
    addMessage = (message) =>{
        this.messages.push(message);
    }

    /**
     * Añadir mensaje y retornar todos los mensajes
     * @param {Object} message 
     * @returns {Array []} messages
     */
    addMessageAndReturn = (message) =>{
        this.messages.push(message);
        return this.messages;
    }

    /**
     * Optimiza el array de mensajes usando sliding window
     * Mantiene el mensaje system + últimos N mensajes de user/assistant
     * @param {Array} messages - Array de mensajes a optimizar
     * @returns {Array} - Array optimizado
     */
    optimizeMessages = (messages) => {
        // Separar mensaje system de los demás
        const systemMessages = messages.filter(msg => msg.role === 'system');
        const conversationMessages = messages.filter(msg => msg.role !== 'system');

        // Si no superamos el límite, retornar todos
        if (messages.length <= this.maxMessages) {
            return messages;
        }

        // Calcular cuántos mensajes de conversación mantener
        const maxConversationMessages = this.maxMessages - systemMessages.length;
        
        // Tomar solo los últimos N mensajes de la conversación
        const recentMessages = conversationMessages.slice(-maxConversationMessages);

        // Retornar: system messages + mensajes recientes
        return [...systemMessages, ...recentMessages];
    }

    /**
     * Pregunta al agente
     * @param {Array} Message 
     * @returns {Array} Message 
     */
    generateAgentResponse = async (Message) => {
        // Optimizar mensajes antes de enviar
        const optimizedMessages = this.optimizeMessages(Message);
        
        const response = await httpService.post('/agent/ask', optimizedMessages);
        return response.data.data;
    }

    run = () => {
        console.log("✅ Agente conectado");
    }
}

export default new AgentService();