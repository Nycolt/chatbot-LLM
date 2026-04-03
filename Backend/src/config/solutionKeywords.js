/**
 * Mapa de keywords -> solución Fortinet para recomendación por descripción (sin LLM)
 * Inspirado en diccionario extendido (síntomas, casos de uso, frases coloquiales).
 * Cada entrada: { keywords: string[], solution: string, weight: number }
 *
 * Además se fusionan frases de `learned_solution_keywords` (buzón confirmado).
 */

import { getLearnedPairs, normalizePhraseForMatch } from '../services/learnedSolutionKeywords.service.js';

/** Peso de un match aprendido desde el buzón (prioridad alta) */
const LEARNED_MATCH_SCORE = 15;

export const SOLUTION_KEYWORDS = [
  {
    solution: 'FortiWeb',
    weight: 1,
    keywords: [
      // Técnicos / directos
      'waf',
      'web application firewall',
      'aplicaciones web',
      'aplicación web',
      'proteger web',
      'proteger aplicaciones web',
      'seguridad de aplicaciones web',
      'seguridad para aplicaciones expuestas a internet',
      'proteger apis',
      'seguridad para apis',
      'proteger api rest',
      'proteger api graphql',
      'owasp',
      'owasp top 10',
      // Síntomas
      'mi aplicación web fue hackeada',
      'inyeccion sql',
      'sql injection',
      'xss',
      'ataques automatizados contra mi portal',
      'fuerza bruta contra mi aplicacion web',
      'formulario de login está siendo atacado',
      'alguien está haciendo scraping de mi portal',
      'tengo una aplicacion web publicada y no tiene proteccion',
      'cumplimiento pci dss requiere proteccion de aplicaciones web',
    ],
  },
  {
    solution: 'FortiAnalyzer',
    weight: 1,
    keywords: [
      'logs',
      'log',
      'análisis de logs',
      'analisis de logs',
      'eventos',
      'analytics',
      'centralizar logs',
      'centralizar registros',
      'almacenamiento de logs',
      'historial de eventos',
      'reportes de seguridad',
      'reportes de cumplimiento',
      'forense de eventos',
      'siem ligero',
      // Síntomas
      'no tengo logs centralizados',
      'el auditor me pide reportes de seguridad',
      'necesito guardar logs por 1 año',
      'tuve un incidente y no tengo logs para investigarlo',
      'quiero saber qué páginas visitan mis usuarios',
      'no tengo visibilidad de lo que pasó en mi red hace días',
    ],
  },
  {
    solution: 'FortiManager',
    weight: 1,
    keywords: [
      'administración central',
      'gestion centralizada',
      'gestionar fortigate',
      'gestionar varios fortigate',
      'varios fortigate',
      'orquestacion de configuraciones',
      'orquestación de configuraciones',
      'plantillas de configuracion para sedes',
      'single pane of glass para fortigate',
      'control de cambios en firewalls',
      'centralizar administracion de dispositivos fortinet',
      // Síntomas
      'tengo muchos firewalls y es un caos administrarlos',
      'cada firewall tiene configuraciones distintas',
      'necesito estandarizar las politicas en todas mis sedes',
      'cambiar una regla en muchas sucursales me toma dias',
      'necesito auditar quién cambió qué en los firewalls',
    ],
  },
  {
    solution: 'FortiMail',
    weight: 1,
    keywords: [
      'correo',
      'email',
      'mail',
      'correo seguro',
      'email security',
      'antispam',
      'antiphishing',
      'seguridad de correo electronico',
      'seguridad de correo electrónico',
      'protección de correo',
      'proteccion de correo',
      'proteccion de office 365',
      'proteger exchange',
      // Síntomas
      'me llegó un correo de phishing',
      'empleado hizo clic en phishing',
      'mis usuarios reciben mucho spam',
      'alguien está suplantando el dominio de mi empresa',
      'nos llegó un correo con ransomware adjunto',
      'correos maliciosos llegan a la bandeja de mis usuarios',
    ],
  },
  {
    solution: 'FortiAP',
    weight: 1,
    keywords: [
      'wireless',
      'wifi',
      'wi-fi',
      'access point',
      'access points',
      'ap inalambrico',
      'ap inalámbrico',
      'wlan corporativa',
      'cobertura inalámbrica',
      'cobertura inalambrica',
      'wifi empresarial segura',
      'red inalambrica para oficina',
      // Síntomas
      'mi wifi corporativa no tiene cobertura',
      'access points actuales no tienen gestion centralizada',
      'necesito renovar los access points de mi empresa',
      'quiero separar la wifi de empleados de la de visitantes',
    ],
  },
  {
    solution: 'FortiSwitch',
    weight: 1,
    keywords: [
      'switch',
      'switches',
      'puertos',
      'poe',
      'red local',
      'lan cableada',
      'switch empresarial administrable',
      'infraestructura lan cableada',
      'segmentacion en red cableada',
      'segmentación en red cableada',
      'switches para campus y sucursales',
      // Síntomas
      'mis switches son antiguos y no tienen soporte',
      'quiero gestionar los switches desde el mismo panel que el firewall',
      'necesito switches para una nueva sede',
      'mi infraestructura de red cableada es obsoleta',
    ],
  },
  {
    solution: 'FortiGate',
    weight: 1,
    keywords: [
      'firewall',
      'fortigate',
      'ngfw',
      'next generation firewall',
      'seguridad perimetral',
      'perímetro',
      'perimetro',
      'utm',
      'segmentacion interna',
      'segmentación interna',
      'vpn site to site',
      'vpn ssl',
      'sd-wan',
      'sd wan',
      // Casos de uso
      'proteger perimetro de la empresa',
      'control de aplicaciones y filtrado web',
      'inspeccion profunda de trafico',
      'seguridad perimetral con alto rendimiento',
      'consolidar seguridad de red en un solo equipo',
      // Síntomas
      'no tengo control de lo que entra y sale de mi red',
      'usuarios acceden a paginas inapropiadas en el trabajo',
      'mi red fue infectada con ransomware',
      'no tengo visibilidad del trafico en mi red',
      'mi firewall es fin de vida',
      'necesito un firewall para sede o sucursal',
    ],
  },
  {
    solution: 'FortiGate VM',
    weight: 0.8,
    keywords: [
      'vm',
      'virtual',
      'virtualizado',
      'cloud',
      'nube',
      'aws',
      'azure',
      'gcp',
      'vmware',
      'entorno virtual',
      'firewall virtual',
      'ngfw en la nube',
      'firewall para workloads cloud',
      // Síntomas
      'tengo cargas en aws y no tengo firewall entre workloads',
      'mis aplicaciones en la nube no tienen firewall de red',
      'necesito un ngfw en la nube publica',
      'quiero extender mis politicas de seguridad al cloud',
    ],
  },
  {
    solution: 'FortiWiFi',
    weight: 0.8,
    keywords: [
      'pyme',
      'pymes',
      'wifi integrado',
      'wifi integrado en el firewall',
      'fortiwifi',
      'todo en uno',
      'appliance con wifi',
      'firewall con wifi integrado',
      'solucion todo en uno para sucursales pequeñas',
      'oficina pequeña con wifi y firewall',
    ],
  },
];

/**
 * Recomienda solución(es) según texto del usuario
 * @param {string} userText
 * @returns {Array<{ solution: string, score: number }>}
 */
export function recommendSolutionByKeywords(userText) {
  const result = recommendSolutionByKeywordsWithDetails(userText);
  return result.map(({ solution, score }) => ({ solution, score }));
}

/**
 * Igual que recommendSolutionByKeywords pero incluye las palabras clave que coincidieron.
 * Usado por el Buzón de Necesidades para guardar matched_keywords.
 * @param {string} userText
 * @returns {Array<{ solution: string, score: number, matchedKeywords: string[] }>}
 */
export function recommendSolutionByKeywordsWithDetails(userText) {
  const lower = String(userText || '').toLowerCase().trim();
  if (!lower) return [];

  const scored = [];
  for (const { keywords, solution, weight } of SOLUTION_KEYWORDS) {
    const matchedKeywords = [];
    for (const kw of keywords) {
      if (lower.includes(kw)) matchedKeywords.push(kw);
    }
    if (matchedKeywords.length > 0) {
      const score = matchedKeywords.length * (weight || 1);
      const existing = scored.find((s) => s.solution === solution);
      if (existing) {
        existing.score += score;
        existing.matchedKeywords.push(...matchedKeywords);
      } else {
        scored.push({ solution, score, matchedKeywords: [...matchedKeywords] });
      }
    }
  }

  const normUser = normalizePhraseForMatch(userText);
  if (normUser.length >= 3) {
    for (const { solution, phrase } of getLearnedPairs()) {
      if (!solution || !phrase || phrase.length < 3) continue;
      if (normUser.includes(phrase)) {
        const label = `[buzón] ${phrase.length > 60 ? `${phrase.slice(0, 60)}…` : phrase}`;
        const existing = scored.find((s) => s.solution === solution);
        if (existing) {
          existing.score += LEARNED_MATCH_SCORE;
          existing.matchedKeywords.push(label);
        } else {
          scored.push({
            solution,
            score: LEARNED_MATCH_SCORE,
            matchedKeywords: [label],
          });
        }
      }
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 5);
}
