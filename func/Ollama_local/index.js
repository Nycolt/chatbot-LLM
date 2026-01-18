/**
 * Configuración y uso de modelos con Ollama
 * 
 * Este script permite:
 * 1. Ver modelos disponibles en Ollama Library
 * 2. Seleccionar e instalar modelos interactivamente
 * 3. Cambiar entre modelos instalados
 * 4. Gestionar modelos desde la terminal
 */

import readline from 'readline';

const OLLAMA_BASE_URL = 'http://localhost:11434';

// Interfaz para input de usuario
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

/**
 * Pregunta al usuario con prompt
 */
const question = (prompt) => new Promise(resolve => rl.question(prompt, resolve));

/**
 * Verifica si Ollama está corriendo
 */
const checkOllamaStatus = async () => {
    try {
        const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`);
        if (!response.ok) throw new Error('Ollama no está respondiendo');

        const data = await response.json();
        console.log('✅ Ollama está corriendo');
        return data.models || [];
    } catch (error) {
        console.error('❌ Error: Ollama no está corriendo. Inicia Docker primero.');
        console.error('   Ejecuta: docker-compose up -d ollama');
        throw error;
    }
};

/**
 * Obtiene lista de modelos instalados localmente
 */
const getInstalledModels = async () => {
    const models = await checkOllamaStatus();
    return models.map(m => ({
        name: m.name,
        size: (m.size / (1024 ** 3)).toFixed(2) + ' GB',
        modified: new Date(m.modified_at).toLocaleDateString()
    }));
};

/**
 * Lista de modelos populares disponibles en Ollama Library
 * Fuente: https://ollama.com/library
 * 
 * Requisitos de hardware:
 * - RAM: Memoria del sistema requerida (CPU mode)
 * - VRAM: Memoria de GPU requerida (GPU mode - más rápido)
 * - Contexto: Tamaño máximo de ventana de contexto (tokens)
 */
const AVAILABLE_MODELS = [
    { 
        name: 'llama3.2', 
        size: '2GB', 
        description: 'Meta Llama 3.2 - Rápido y eficiente',
        specs: {
            ram: '8GB',
            vram: '4GB',
            context: '128K',
            speed: '⚡⚡⚡'
        }
    },
    { 
        name: 'phi3', 
        size: '2.3GB', 
        description: 'Microsoft Phi-3 - Optimizado para tareas específicas',
        specs: {
            ram: '8GB',
            vram: '4GB',
            context: '128K',
            speed: '⚡⚡⚡'
        }
    },
    { 
        name: 'mistral', 
        size: '4.1GB', 
        description: 'Mistral 7B - Balance rendimiento/calidad',
        specs: {
            ram: '16GB',
            vram: '6GB',
            context: '32K',
            speed: '⚡⚡'
        }
    },
    { 
        name: 'gemma2', 
        size: '5.4GB', 
        description: 'Google Gemma 2 - Modelo ligero de Google',
        specs: {
            ram: '16GB',
            vram: '8GB',
            context: '8K',
            speed: '⚡⚡'
        }
    },
    { 
        name: 'llama3.1', 
        size: '4.7GB', 
        description: 'Meta Llama 3.1 - Versión mejorada',
        specs: {
            ram: '16GB',
            vram: '6GB',
            context: '128K',
            speed: '⚡⚡'
        }
    },
    { 
        name: 'codellama', 
        size: '3.8GB', 
        description: 'Code Llama - Especializado en programación',
        specs: {
            ram: '12GB',
            vram: '6GB',
            context: '16K',
            speed: '⚡⚡⚡'
        }
    },
    { 
        name: 'qwen2.5', 
        size: '4.4GB', 
        description: 'Qwen 2.5 - Modelo multilingüe chino',
        specs: {
            ram: '16GB',
            vram: '6GB',
            context: '32K',
            speed: '⚡⚡'
        }
    },
    { 
        name: 'deepseek-coder', 
        size: '5.1GB', 
        description: 'DeepSeek Coder - Excelente para código',
        specs: {
            ram: '16GB',
            vram: '8GB',
            context: '16K',
            speed: '⚡⚡'
        }
    }
];

/**
 * Muestra lista de modelos disponibles
 */
const displayAvailableModels = () => {
    console.log('\n📚 MODELOS DISPONIBLES EN OLLAMA LIBRARY:\n');
    console.log('   Nombre              | Descarga | RAM    | VRAM   | Contexto | Velocidad');
    console.log('   ─────────────────────────────────────────────────────────────────────────');
    
    AVAILABLE_MODELS.forEach((model, index) => {
        const num = `${index + 1}.`.padEnd(3);
        const name = model.name.padEnd(17);
        const size = model.size.padEnd(8);
        const ram = model.specs.ram.padEnd(6);
        const vram = model.specs.vram.padEnd(6);
        const context = model.specs.context.padEnd(8);
        const speed = model.specs.speed;
        
        console.log(`${num}${name} | ${size} | ${ram} | ${vram} | ${context} | ${speed}`);
    });
    
    console.log('\n💡 Velocidad: ⚡⚡⚡ = Rápido | ⚡⚡ = Moderado | ⚡ = Lento');
    console.log('💡 VRAM solo si usas GPU (más rápido). En CPU usa RAM.\n');
    console.log('0. Ver modelos instalados');
    console.log('q. Salir\n');
}

/**
 * Muestra lista de modelos instalados
 */
const displayInstalledModels = async () => {
    const installed = await getInstalledModels();
    
    if (installed.length === 0) {
        console.log('\n⚠️  No hay modelos instalados aún\n');
        return [];
    }

    console.log('\n💾 MODELOS INSTALADOS LOCALMENTE:\n');
    installed.forEach((model, index) => {
        console.log(`${index + 1}. ${model.name.padEnd(30)} | ${model.size.padEnd(10)} | ${model.modified}`);
    });
    console.log('\nd. Eliminar un modelo');
    console.log('b. Volver al menú principal\n');
    
    return installed;
}

/**
 * Descarga/Pull de un modelo desde Ollama
 */
const pullModel = async (modelName) => {
    console.log(`\n📥 Descargando modelo "${modelName}"...`);
    console.log('⏳ Esto puede tardar varios minutos dependiendo del tamaño\n');

    try {
        const response = await fetch(`${OLLAMA_BASE_URL}/api/pull`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: modelName })
        });

        if (!response.ok) {
            throw new Error(`Error HTTP ${response.status}`);
        }

        // Leer respuesta en streaming para mostrar progreso
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let lastStatus = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n').filter(l => l.trim());

            for (const line of lines) {
                try {
                    const json = JSON.parse(line);
                    if (json.status && json.status !== lastStatus) {
                        lastStatus = json.status;
                        const progress = json.completed && json.total 
                            ? ` (${(json.completed / json.total * 100).toFixed(1)}%)`
                            : '';
                        process.stdout.write(`\r${json.status}${progress}                    `);
                    }
                } catch (e) {
                    // Ignorar líneas mal formadas
                }
            }
        }

        console.log('\n\n✅ Modelo descargado e instalado exitosamente en Docker');
        return true;
    } catch (error) {
        console.error('\n❌ Error descargando modelo:', error.message);
        return false;
    }
}

/**
 * Elimina un modelo instalado
 */
const deleteModel = async (modelName) => {
    console.log(`\n🗑️  Eliminando modelo "${modelName}"...`);

    try {
        const response = await fetch(`${OLLAMA_BASE_URL}/api/delete`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: modelName })
        });

        if (!response.ok) {
            throw new Error(`Error HTTP ${response.status}`);
        }

        console.log('✅ Modelo eliminado exitosamente');
        return true;
    } catch (error) {
        console.error('❌ Error eliminando modelo:', error.message);
        return false;
    }
}

/**
 * Menú principal interactivo
 */
const mainMenu = async () => {
    while (true) {
        displayAvailableModels();
        const choice = await question('Selecciona una opción: ');

        if (choice.toLowerCase() === 'q') {
            console.log('\n👋 ¡Hasta luego!\n');
            rl.close();
            process.exit(0);
        }

        if (choice === '0') {
            await installedModelsMenu();
            continue;
        }

        const index = parseInt(choice) - 1;
        if (index >= 0 && index < AVAILABLE_MODELS.length) {
            const selectedModel = AVAILABLE_MODELS[index];
            console.log(`\n📦 MODELO SELECCIONADO: ${selectedModel.name}`);
            console.log(`   ${selectedModel.description}`);
            console.log(`\n   📊 ESPECIFICACIONES:`);
            console.log(`   ├─ Tamaño descarga: ${selectedModel.size}`);
            console.log(`   ├─ RAM requerida:   ${selectedModel.specs.ram} (modo CPU)`);
            console.log(`   ├─ VRAM requerida:  ${selectedModel.specs.vram} (modo GPU)`);
            console.log(`   ├─ Ventana contexto: ${selectedModel.specs.context} tokens`);
            console.log(`   └─ Velocidad:       ${selectedModel.specs.speed}\n`);

            const confirm = await question('¿Deseas instalar este modelo? (s/n): ');
            if (confirm.toLowerCase() === 's') {
                const success = await pullModel(selectedModel.name);
                if (success) {
                    await question('\nPresiona Enter para continuar...');
                }
            }
        } else {
            console.log('\n❌ Opción inválida\n');
        }
    }
}

/**
 * Menú de modelos instalados
 */
const installedModelsMenu = async () => {
    while (true) {
        const installed = await displayInstalledModels();
        
        if (installed.length === 0) {
            await question('Presiona Enter para volver...');
            return;
        }

        const choice = await question('Selecciona una opción: ');

        if (choice.toLowerCase() === 'b') {
            return;
        }

        if (choice.toLowerCase() === 'd') {
            const modelIndex = parseInt(await question('Número del modelo a eliminar: ')) - 1;
            if (modelIndex >= 0 && modelIndex < installed.length) {
                const confirm = await question(`¿Seguro que deseas eliminar "${installed[modelIndex].name}"? (s/n): `);
                if (confirm.toLowerCase() === 's') {
                    await deleteModel(installed[modelIndex].name);
                    await question('\nPresiona Enter para continuar...');
                }
            }
            continue;
        }

        const index = parseInt(choice) - 1;
        if (index >= 0 && index < installed.length) {
            console.log(`\n✅ Modelo seleccionado: ${installed[index].name}`);
            console.log('   Puedes usar este modelo en tus aplicaciones');
            await question('\nPresiona Enter para continuar...');
        }
    }
}

/**
 * Función principal
 */
const main = async () => {
    console.log('\n🤖 GESTOR DE MODELOS OLLAMA\n');
    console.log('═══════════════════════════════════════════════════════════════\n');

    try {
        // Verificar que Ollama esté corriendo
        await checkOllamaStatus();
        
        // Iniciar menú interactivo
        await mainMenu();

    } catch (error) {
        console.error('\n❌ Error fatal:', error.message);
        rl.close();
        process.exit(1);
    }
}

// Ejecutar
main();
