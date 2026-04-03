/**
 * Debe mantenerse alineado con Backend/src/services/compareFallbackRecommendation.js
 * (fallback si falla la red o el endpoint).
 */
export function generateFallbackRecommendation(data) {
  if (!data || typeof data !== 'object') {
    return 'Compare los valores de la tabla según la prioridad de su proyecto y valide licencias y diseño con un partner Fortinet.';
  }

  const units = Array.isArray(data.resolvedUnits) ? data.resolvedUnits.map((u) => String(u).trim()).filter(Boolean) : [];
  const winner = data.winner != null ? String(data.winner).trim() : '';
  const wins = data.wins && typeof data.wins === 'object' ? data.wins : {};

  if (units.length < 2) {
    return 'Seleccione al menos dos modelos comparables para obtener una recomendación orientativa junto a la tabla.';
  }

  const winVals = units.map((u) => Number(wins[u]) || 0);
  const maxW = Math.max(...winVals, 0);
  const leaders = units.filter((u) => (Number(wins[u]) || 0) === maxW && maxW > 0);

  if (winner && units.includes(winner)) {
    const others = units.filter((u) => u !== winner);
    const winCount = Number(wins[winner]) || 0;
    let block = `**${winner}** muestra mejor desempeño general en las métricas de esta comparación`;
    if (winCount > 0) {
      block += `, con ventaja en ${winCount} métrica${winCount === 1 ? '' : 's'} según los datos mostrados`;
    }
    block += '. Suele encajar mejor en entornos con mayor carga, más margen de crecimiento o requisitos más exigentes en esas capacidades.\n\n';

    if (others.length === 1) {
      block += `**${others[0]}** sigue siendo una opción válida cuando la carga prevista es menor, el presupuesto es más ajustado o las métricas actuales son suficientes para el caso de uso.\n\n`;
    } else if (others.length > 1) {
      block += `Los modelos **${others.join('**, **')}** pueden ser adecuados cuando el escenario es menos exigente o se prioriza otro equilibrio coste/capacidad frente al líder en la tabla.\n\n`;
    }

    block += '**Recomendación orientativa:**\n';
    block += `• Mayor tráfico, crecimiento previsto o más exigencia en las métricas donde destaca → **${winner}**\n`;
    if (others.length === 1) {
      block += `• Carga moderada, sedes pequeñas o prioridad en contención de coste → valorar **${others[0]}**\n`;
    } else {
      block += `• Carga moderada o necesidad de equilibrar inversión → revisar los demás modelos según la tabla\n`;
    }
    block += '\nLa decisión final depende del contexto: licenciamiento, diseño de red, cumplimiento y validación con un partner Fortinet.';
    return block;
  }

  if (!winner && leaders.length >= 2 && maxW > 0) {
    return `Hay un equilibrio cercano entre **${leaders.join('** y **')}** en el recuento de métricas. Compare los valores fila a fila según su prioridad (rendimiento, capacidad, interfaces, etc.) y valide con su entorno y un partner Fortinet.`;
  }

  if (!winner && maxW === 0) {
    return 'No hay métricas con diferencias claras en esta comparación. Use la tabla para priorizar según su caso (rendimiento, logs, switching, etc.) y confirme licencias y diseño con un partner Fortinet.';
  }

  return 'Compare los valores de la tabla según la prioridad de su proyecto y valide licencias y diseño con un partner Fortinet.';
}

export default { generateFallbackRecommendation };
