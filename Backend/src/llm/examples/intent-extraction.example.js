/**
 * Ejemplo completo de uso del módulo LLM
 * 
 * Demuestra el flujo completo:
 * 1. Recibir pregunta del usuario
 * 2. Extraer intención usando el LLM
 * 3. Validar la respuesta
 * 4. Manejar errores
 * 
 * Ejecutar con: node src/llm/examples/intent-extraction.example.js
 */

import llmService from '../../services/llm.service.js';
import intentValidator from '../validators/intent.validator.js';

/**
 * Función principal que orquesta el proceso completo
 * 
 * @param {string} userQuestion - Pregunta del usuario
 * @returns {Promise<Object>} - Intención validada
 */
async function extractAndValidateIntent(userQuestion) {
  console.log('\n=== EXTRACCIÓN DE INTENCIÓN ===');
  console.log('Pregunta del usuario:', userQuestion);
  console.log('\nProcesando...\n');

  try {
    // Paso 1: Extraer intención usando el LLM
    console.log('[1/3] Enviando pregunta al LLM (auto-detectado)...');
    const rawIntent = await llmService.extractIntentWithRetry(userQuestion);
    
    console.log('[1/3] ✓ Respuesta recibida del LLM:');
    console.log(JSON.stringify(rawIntent, null, 2));

    // Paso 2: Validar la intención con el schema
    console.log('\n[2/3] Validando respuesta contra schema...');
    const validatedIntent = intentValidator.validateOrThrow(rawIntent);
    
    console.log('[2/3] ✓ Respuesta validada exitosamente');

    // Paso 3: Retornar intención validada
    console.log('\n[3/3] ✓ Intención estructurada lista para usar:');
    console.log(JSON.stringify(validatedIntent, null, 2));

    return validatedIntent;

  } catch (error) {
    console.error('\n❌ Error en el proceso:');
    console.error(error.message);
    throw error;
  }
}

/**
 * Ejecuta múltiples ejemplos para demostrar diferentes casos
 */
async function runExamples() {
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║  EJEMPLOS DE EXTRACCIÓN DE INTENCIONES CON OLLAMA       ║');
  console.log('╚══════════════════════════════════════════════════════════╝');

  // Lista de preguntas de ejemplo
  const examples = [
    '¿Cuántos puertos tiene el forti32h?',
    '¿Cuál es el precio del Cisco 2960?',
    'Dame información del router Mikrotik RB3011',
    '¿Hay stock de switches HP?'
  ];

  // Ejecutar cada ejemplo
  for (let i = 0; i < examples.length; i++) {
    const question = examples[i];
    
    try {
      await extractAndValidateIntent(question);
      
      if (i < examples.length - 1) {
        console.log('\n' + '─'.repeat(60) + '\n');
        // Pequeña pausa entre ejemplos
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error(`Ejemplo ${i + 1} falló`);
    }
  }

  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║  FIN DE LOS EJEMPLOS                                     ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');
}

/**
 * Función de uso programático (para importar en otros módulos)
 * 
 * @param {string} userQuestion - Pregunta del usuario
 * @returns {Promise<Object>} - Intención validada
 */
async function processUserQuestion(userQuestion) {
  // Extraer intención del LLM
  const rawIntent = await llmService.extractIntentWithRetry(userQuestion);
  
  // Validar la intención
  const validatedIntent = intentValidator.validateOrThrow(rawIntent);
  
  return validatedIntent;
}

// Ejecutar ejemplos si se ejecuta directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  runExamples()
    .then(() => {
      console.log('✓ Todos los ejemplos completados');
      process.exit(0);
    })
    .catch(error => {
      console.error('✗ Error fatal:', error.message);
      process.exit(1);
    });
}

// Exportar función para uso en otros módulos
export {
  processUserQuestion,
  extractAndValidateIntent
};

export default {
  processUserQuestion,
  extractAndValidateIntent
};
