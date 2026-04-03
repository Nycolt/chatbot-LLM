/**
 * Plantilla visual unificada para recomendaciones de dimensionamiento
 * (mensaje determinístico + instrucciones para el agente LLM).
 */

/** Instrucciones que debe seguir el modelo al naturalizar sizing. */
export const SIZING_AGENT_MARKDOWN_TEMPLATE = `
Estructura objetivo. Mantén emojis y títulos claros; usa viñetas (-) para listas. No uses JSON ni marcas de negrita con asteriscos.

📊 [Nombre del producto o solución] — recomendación

✅ Resumen ejecutivo
- 2–4 viñetas con la propuesta clave (modelo, bundle/licencia principal, por qué encaja).

🖥️ Equipo / capacidad
- Modelo, SKU del appliance si consta, throughput o métrica principal cuando aplique.

💼 Bundles y licencias (o 🔐 Licencias / servicios si no hay bundle)
- Cada línea comercial con SKU o descripción tal como viene en los datos.
- Indica si algo es obligatorio u opcional cuando los datos lo digan.

📊 Criterios / justificación técnica
- Viñetas con WAN, usuarios, seguridad, VPN, logs, almacenamiento, etc. según corresponda.
- Solo cifras y etiquetas presentes en los datos técnicos.

⚠️ Avisos (omitir la sección entera si no hay incidencias)

Cierre opcional en cursiva para matices (lista de precios, confirmar con preventa, etc.).
`.trim();

export function buildSizingAgentInstructions() {
  return `${SIZING_AGENT_MARKDOWN_TEMPLATE}

Reglas estrictas:
- No contradigas ni sustituyas modelos, SKUs ni números del texto técnico.
- No inventes precios ni productos que no aparezcan en los datos.
- Si el texto técnico ya trae esta misma estructura con 📊, ✅, etc., conserva las secciones y solo mejora redacción y transiciones sin duplicar títulos.
- No menciones tablas SQL, nombres de tablas ni detalles de implementación del backend.
- Longitud razonable: prioriza claridad; no elimines información comercial útil.`;
}

export default {
  SIZING_AGENT_MARKDOWN_TEMPLATE,
  buildSizingAgentInstructions,
};
