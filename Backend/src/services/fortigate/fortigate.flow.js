import { getFortiGateCandidates } from './fortigateCatalog.read.service.js';
import { listOptions, pickOptionByNumber } from './fortigate.ranges.js';
import {
  selectBestModel,
  hasUnknownSizingInputsV2,
} from './fortigate.engine.js';
import {
  FORTIGATE_WAN_OPTIONS,
  FORTIGATE_USERS_OPTIONS,
  FORTIGATE_SECURITY_LEVEL_OPTIONS,
  FORTIGATE_TRAFFIC_OPTIONS,
  FORTIGATE_VPN_TYPE_OPTIONS,
  fortigateVpnTypeNeedsSslUsers,
  fortigateVpnTypeNeedsIpsec,
  FORTIGATE_SSL_VPN_USERS_OPTIONS,
  FORTIGATE_IPSEC_TUNNEL_OPTIONS,
  FORTIGATE_SSL_OPTIONS,
  FORTIGATE_VDOM_OPTIONS,
} from './fortigate.sizing.definitions.js';
import {
  loadFortigateOffersForUnit,
  selectBundleFromOffers,
  deriveTechnicalNeedsFromAnswers,
  selectAddonOffers,
  formatOfferLine,
} from './fortigateOffers.service.js';

const TOTAL_STEPS = 12;
const HR = 0.85;

/** Bloque 5 – bundle (state.answers.bundleType); selección vía selectBundleFromOffers + reglas opcionales */
export const BUNDLE_TYPE_OPTIONS = [
  { id: 'hardware', label: 'Solo hardware' },
  { id: 'basic', label: 'Protección básica' },
  { id: 'utp', label: 'Protección completa (UTP)' },
  { id: 'enterprise', label: 'Protección avanzada (Enterprise)' },
  { id: 'auto', label: 'No estoy seguro (recomendación automática)' },
];

/** Bloque 6 – upsell (state.answers.addons) */
export const ADDONS_OPTIONS = [
  { id: 'yes', label: 'Sí' },
  { id: 'no', label: 'No' },
];

/** @deprecated usar ADDONS_OPTIONS */
export const ADDONS_DECISION_OPTIONS = ADDONS_OPTIONS;

export const ADDON_TYPE_OPTIONS = [
  {
    id: 'advanced_security',
    label:
      'Mayor protección frente a amenazas avanzadas (ideal si necesitas prevenir ransomware, malware desconocido o ataques sofisticados)',
  },
  {
    id: 'monitoring',
    label: 'Mayor visibilidad y control de la red (ideal si necesitas monitoreo, análisis de tráfico y generación de reportes)',
  },
  {
    id: 'support',
    label: 'Continuidad y soporte del servicio (ideal si necesitas atención técnica, reemplazo de equipos y soporte prioritario)',
  },
  {
    id: 'management',
    label: 'Administración centralizada (ideal si gestionas múltiples dispositivos desde una sola plataforma)',
  },
  {
    id: 'ztna',
    label: 'Acceso seguro a usuarios y aplicaciones (ideal para VPN, trabajo remoto, Zero Trust o SASE)',
  },
];

function runFortigateSizingEngine(answersSnapshot, fortigates) {
  const { best, passing, failing } = selectBestModel(fortigates, answersSnapshot, HR);
  return {
    bestEval: best,
    passing,
    failing,
    recommended: best?.model ?? null,
    req: best?.neededMbps ?? null,
  };
}

function formatTechnicalSizingBlock(answersSnapshot, recommended, req) {
  const vt = answersSnapshot.vpnType ?? answersSnapshot.vpn;
  const lines = [
    `- Throughput objetivo: ~${req ?? 'N/A'} Mbps`,
    `- WAN: ${answersSnapshot.wan?.label ?? 'N/A'}`,
    `- Usuarios: ${answersSnapshot.users?.estimatedUsers ?? answersSnapshot.users?.label ?? 'N/A'}`,
    `- Nivel de seguridad: ${answersSnapshot.securityLevel?.label ?? 'N/A'}`,
    `- Tráfico: ${answersSnapshot.trafficType?.label ?? 'N/A'}`,
  ];
  if (vt && vt.id !== 'none') {
    lines.push(`- VPN: ${vt.label ?? vt.id}`);
    if (fortigateVpnTypeNeedsSslUsers(vt)) {
      lines.push(
        `- SSL VPN (simult.): ${answersSnapshot.sslVpnUsers?.label ?? answersSnapshot.vpnUsers?.label ?? 'N/A'}`,
      );
    }
    if (fortigateVpnTypeNeedsIpsec(vt)) {
      lines.push(`- IPsec site-to-site: ${answersSnapshot.ipsecTunnels?.label ?? 'N/A'}`);
    }
  } else {
    lines.push(`- VPN: sin requisitos adicionales declarados`);
  }
  lines.push(`- Inspección HTTPS: ${answersSnapshot.sslInspection?.label ?? 'N/A'}`);
  lines.push(`- VDOMs: ${answersSnapshot.vdoms?.label ?? 'N/A'}`);
  lines.push(`- Modelo elegido (referencia): ${recommended?.UNIT || 'N/A'} — \`${recommended?.SKU || 'N/A'}\``);
  return `${lines.join('\n')}\n`;
}

function formatExecutiveSummaryLine(bestEval, bundleOffer, addonOffers) {
  const unit = bestEval?.model?.UNIT || 'N/A';
  const sku = bestEval?.model?.SKU;
  const tput = bestEval?.neededMbps ?? 'N/A';
  const metric = bestEval?.primaryLabel || 'métrica principal';
  const bundleTxt = bundleOffer?.description
    ? String(bundleOffer.description).trim().slice(0, 160)
    : bundleOffer?.sku
      ? String(bundleOffer.sku)
      : 'referencia alineada con catálogo';
  const lines = [
    `- Modelo: ${unit}${sku ? ` — SKU \`${sku}\`` : ''}`,
    `- Throughput de referencia: ~${tput} Mbps (${metric})`,
    `- Bundle indicado: ${bundleTxt}`,
    `- Encaja con el rendimiento y el perfil de seguridad que declaraste según la ficha cargada.`,
  ];
  if (addonOffers?.length) {
    const o = addonOffers[0];
    const d = o?.description ? String(o.description).trim().slice(0, 140) : o?.sku;
    if (d) lines.push(`- Complemento sugerido: ${d}`);
  }
  return `${lines.join('\n')}\n`;
}

function formatCommercialBlock(bundleOffer, addonOffers) {
  const lines = [];
  if (bundleOffer) {
    lines.push(`- Bundle (solution_offers): ${formatOfferLine(bundleOffer)}`);
  } else {
    lines.push(
      `- Bundle: _Sin referencia clara en catálogo para esta combinación; valida el SKU en lista de precios._`,
    );
  }
  if (addonOffers?.length) {
    lines.push(`- Servicio adicional: ${formatOfferLine(addonOffers[0])}`);
  }
  return lines.length ? `${lines.join('\n')}\n` : `_Sin líneas comerciales adicionales._\n`;
}

/** Mensaje final: mismo esqueleto visual que el resto de soluciones de dimensionamiento. */
function composeFortigateFinalSizingMessage(estimatedPrefix, exec, tech, commercial) {
  return (
    `${estimatedPrefix || ''}` +
    `📊 FortiGate — recomendación\n\n` +
    `✅ Resumen ejecutivo\n${exec}\n` +
    `📋 Tu escenario (criterios)\n${tech}\n` +
    `💼 Propuesta comercial\n${commercial}\n`
  );
}

const sessions = new Map();

function getSession(sessionId = 'default') {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, { mode: 'idle', step: 0, answers: {} });
  }
  return sessions.get(sessionId);
}

function resetSession(sessionId = 'default') {
  sessions.set(sessionId, { mode: 'idle', step: 0, answers: {} });
}

export function resetFortiGateSession(sessionId = 'default') {
  resetSession(sessionId);
}

/** True si hay un dimensionamiento FortiGate (appliance) en curso para esta sesión. */
export function isFortigateSizingActive(sessionId = 'default') {
  const s = sessions.get(sessionId);
  return s?.mode === 'sizing';
}

export async function handleFortigateSizingFlow({ sessionId = 'default', userText }) {
  const state = getSession(sessionId);
  const text = String(userText || '').trim();
  const lower = text.toLowerCase();

  const q1 = () =>
    `Bloque 1 – Capacidad base\n` +
    `Pregunta 1/${TOTAL_STEPS}: ¿Cuál es el ancho de banda de tu conexión principal a internet (WAN)?\n` +
    `${listOptions(FORTIGATE_WAN_OPTIONS)}\n\n` +
    `Responde SOLO con el número.`;

  const isHardStart = text === '__START_FORTIGATE_SIZING__';
  if (isHardStart) {
    resetSession(sessionId);
    const s = getSession(sessionId);
    s.mode = 'sizing';
    s.step = 1;
    s.answers = {};
    return {
      done: true,
      assistantMessage: `✅ Listo. Vamos a dimensionar un FortiGate.\n\n${q1()}`,
      state: s,
    };
  }

  const wantsSizing =
    /dimension(ar|amiento)?|sizing|recomendar.*fortigate|recomiendame.*fortigate/i.test(text) ||
    lower.includes('__start_fortigate_sizing__');

  if (state.mode === 'idle' && !wantsSizing) {
    return { done: false, assistantMessage: null, state };
  }

  if (state.mode === 'idle' && wantsSizing) {
    state.mode = 'sizing';
    state.step = 1;
    state.answers = {};
    return {
      done: true,
      assistantMessage: `✅ Listo. Vamos a dimensionar un FortiGate.\n\n${q1()}`,
      state,
    };
  }

  if (state.mode === 'sizing' && /cancel|salir|parar|reset/.test(lower)) {
    resetSession(sessionId);
    return {
      done: true,
      assistantMessage: 'Listo ✅ Cancelé el dimensionamiento.',
      state: getSession(sessionId),
    };
  }

  // Paso 1: WAN → state.answers.wan
  if (state.step === 1) {
    const picked = pickOptionByNumber(text, FORTIGATE_WAN_OPTIONS);
    if (!picked) {
      return {
        done: true,
        assistantMessage: `Responde con un número válido (1 a ${FORTIGATE_WAN_OPTIONS.length}).`,
        state,
      };
    }

    state.answers.wan = picked;
    state.step = 2;

    return {
      done: true,
      assistantMessage:
        `Perfecto ✅ WAN: ${picked.label}\n\n` +
        `Pregunta 2/${TOTAL_STEPS}: ¿Cuántos usuarios utilizarán la red aproximadamente?\n` +
        `${listOptions(FORTIGATE_USERS_OPTIONS)}\n\n` +
        `Responde SOLO con el número.`,
      state,
    };
  }

  // Paso 2: Usuarios → state.answers.users
  if (state.step === 2) {
    const picked = pickOptionByNumber(text, FORTIGATE_USERS_OPTIONS);
    if (!picked) {
      return {
        done: true,
        assistantMessage: `Responde con un número válido (1 a ${FORTIGATE_USERS_OPTIONS.length}).`,
        state,
      };
    }

    state.answers.users = picked;
    state.step = 3;

    const estimatedNote =
      picked?.id === 'u_unknown'
        ? `ℹ️ Usaré un valor estimado moderado para continuar.\n\n`
        : '';

    return {
      done: true,
      assistantMessage:
        `${estimatedNote}` +
        `Listo ✅ Usuarios: ${picked.label}\n\n` +
        `Pregunta 3/${TOTAL_STEPS}: ¿Qué nivel de seguridad deseas aplicar al tráfico?\n` +
        `${listOptions(FORTIGATE_SECURITY_LEVEL_OPTIONS)}\n\n` +
        `Responde SOLO con el número.`,
      state,
    };
  }

  // Paso 3: Nivel seguridad → state.answers.securityLevel
  if (state.step === 3) {
    const picked = pickOptionByNumber(text, FORTIGATE_SECURITY_LEVEL_OPTIONS);
    if (!picked) {
      return {
        done: true,
        assistantMessage: `Responde con un número válido (1 a ${FORTIGATE_SECURITY_LEVEL_OPTIONS.length}).`,
        state,
      };
    }

    state.answers.securityLevel = picked;
    state.step = 4;

    return {
      done: true,
      assistantMessage:
        `Ok ✅ Nivel de seguridad: ${picked.label}\n\n` +
        `Pregunta 4/${TOTAL_STEPS}: ¿Qué tipo de tráfico predomina en tu red?\n` +
        `${listOptions(FORTIGATE_TRAFFIC_OPTIONS)}\n\n` +
        `Responde SOLO con el número.`,
      state,
    };
  }

  // Paso 4: Tráfico → state.answers.trafficType
  if (state.step === 4) {
    const picked = pickOptionByNumber(text, FORTIGATE_TRAFFIC_OPTIONS);
    if (!picked) {
      return {
        done: true,
        assistantMessage: `Responde con un número válido (1 a ${FORTIGATE_TRAFFIC_OPTIONS.length}).`,
        state,
      };
    }

    state.answers.trafficType = picked;
    state.step = 5;

    const estimatedNote =
      picked?.id === 'tr_unknown' ? `ℹ️ Usaré un factor de tráfico estimado.\n\n` : '';

    return {
      done: true,
      assistantMessage:
        `${estimatedNote}` +
        `Perfecto ✅ Tráfico: ${picked.label}\n\n` +
        `Bloque 2 – VPN\n` +
        `Pregunta 5/${TOTAL_STEPS}: ¿Qué tipo de conectividad VPN necesitas?\n` +
        `${listOptions(FORTIGATE_VPN_TYPE_OPTIONS)}\n\n` +
        `Responde SOLO con el número.`,
      state,
    };
  }

  // Paso 5: vpnType → condicional SSL / IPsec
  if (state.step === 5) {
    const picked = pickOptionByNumber(text, FORTIGATE_VPN_TYPE_OPTIONS);
    if (!picked) {
      return {
        done: true,
        assistantMessage: `Responde con un número válido (1 a ${FORTIGATE_VPN_TYPE_OPTIONS.length}).`,
        state,
      };
    }

    state.answers.vpnType = picked;
    state.answers.vpn = picked;

    const skipSsl = { id: 'skipped', label: 'N/A (sin SSL VPN)', count: 0 };
    const skipIpsec = { id: 'skipped', label: 'N/A (sin IPsec)', count: 0 };

    if (picked.id === 'none') {
      state.answers.sslVpnUsers = skipSsl;
      state.answers.vpnUsers = skipSsl;
      state.answers.ipsecTunnels = skipIpsec;
      state.step = 8;
      return {
        done: true,
        assistantMessage:
          `Perfecto ✅ ${picked.label}\n\n` +
          `Bloque 3 – Inspección HTTPS\n` +
          `Pregunta 8/${TOTAL_STEPS}: ¿Qué nivel de inspección HTTPS (SSL) necesitas?\n` +
          `${listOptions(FORTIGATE_SSL_OPTIONS)}\n\n` +
          `Responde SOLO con el número.`,
        state,
      };
    }

    if (picked.id === 'ipsec_s2s') {
      state.answers.sslVpnUsers = skipSsl;
      state.answers.vpnUsers = skipSsl;
      state.step = 7;
      return {
        done: true,
        assistantMessage:
          `Perfecto ✅ ${picked.label}\n\n` +
          `Pregunta 7/${TOTAL_STEPS}: ¿Cuántas conexiones site-to-site necesitas?\n` +
          `${listOptions(FORTIGATE_IPSEC_TUNNEL_OPTIONS)}\n\n` +
          `Responde SOLO con el número.`,
        state,
      };
    }

    state.answers.ipsecTunnels =
      picked.id === 'ssl_remote' ? skipIpsec : undefined;
    if (picked.id === 'ssl_remote') {
      state.step = 6;
      return {
        done: true,
        assistantMessage:
          `Perfecto ✅ ${picked.label}\n\n` +
          `Pregunta 6/${TOTAL_STEPS}: ¿Cuántos usuarios remotos se conectarán simultáneamente?\n` +
          `${listOptions(FORTIGATE_SSL_VPN_USERS_OPTIONS)}\n\n` +
          `Responde SOLO con el número.`,
        state,
      };
    }

    state.step = 6;
    return {
      done: true,
      assistantMessage:
        `Perfecto ✅ ${picked.label}\n\n` +
        `Pregunta 6/${TOTAL_STEPS}: ¿Cuántos usuarios remotos se conectarán simultáneamente?\n` +
        `${listOptions(FORTIGATE_SSL_VPN_USERS_OPTIONS)}\n\n` +
        `Responde SOLO con el número.`,
      state,
    };
  }

  // Paso 6: usuarios SSL VPN → state.answers.sslVpnUsers
  if (state.step === 6) {
    const picked = pickOptionByNumber(text, FORTIGATE_SSL_VPN_USERS_OPTIONS);
    if (!picked) {
      return {
        done: true,
        assistantMessage: `Responde con un número válido (1 a ${FORTIGATE_SSL_VPN_USERS_OPTIONS.length}).`,
        state,
      };
    }

    state.answers.sslVpnUsers = picked;
    state.answers.vpnUsers = picked;

    const vt = state.answers.vpnType;
    const estimatedNote =
      picked?.id === 'vu_unknown' ? `ℹ️ Usaré una estimación conservadora de usuarios SSL VPN.\n\n` : '';

    if (fortigateVpnTypeNeedsIpsec(vt)) {
      state.step = 7;
      return {
        done: true,
        assistantMessage:
          `${estimatedNote}` +
          `Listo ✅ Usuarios remotos SSL VPN: ${picked.label}\n\n` +
          `Pregunta 7/${TOTAL_STEPS}: ¿Cuántas conexiones site-to-site necesitas?\n` +
          `${listOptions(FORTIGATE_IPSEC_TUNNEL_OPTIONS)}\n\n` +
          `Responde SOLO con el número.`,
        state,
      };
    }

    state.step = 8;
    return {
      done: true,
      assistantMessage:
        `${estimatedNote}` +
        `Listo ✅ Usuarios remotos SSL VPN: ${picked.label}\n\n` +
        `Bloque 3 – Inspección HTTPS\n` +
        `Pregunta 8/${TOTAL_STEPS}: ¿Qué nivel de inspección HTTPS (SSL) necesitas?\n` +
        `${listOptions(FORTIGATE_SSL_OPTIONS)}\n\n` +
        `Responde SOLO con el número.`,
      state,
    };
  }

  // Paso 7: site-to-site → state.answers.ipsecTunnels
  if (state.step === 7) {
    const picked = pickOptionByNumber(text, FORTIGATE_IPSEC_TUNNEL_OPTIONS);
    if (!picked) {
      return {
        done: true,
        assistantMessage: `Responde con un número válido (1 a ${FORTIGATE_IPSEC_TUNNEL_OPTIONS.length}).`,
        state,
      };
    }

    state.answers.ipsecTunnels = picked;
    state.step = 8;

    const estimatedNote =
      picked?.id === 't_unknown' ? `ℹ️ Usaré una estimación conservadora de túneles.\n\n` : '';

    return {
      done: true,
      assistantMessage:
        `${estimatedNote}` +
        `Perfecto ✅ Conexiones site-to-site: ${picked.label}\n\n` +
        `Bloque 3 – Inspección HTTPS\n` +
        `Pregunta 8/${TOTAL_STEPS}: ¿Qué nivel de inspección HTTPS (SSL) necesitas?\n` +
        `${listOptions(FORTIGATE_SSL_OPTIONS)}\n\n` +
        `Responde SOLO con el número.`,
      state,
    };
  }

  // Paso 8: SSL → state.answers.sslInspection
  if (state.step === 8) {
    const picked = pickOptionByNumber(text, FORTIGATE_SSL_OPTIONS);
    if (!picked) {
      return {
        done: true,
        assistantMessage: `Responde con un número válido (1 a ${FORTIGATE_SSL_OPTIONS.length}).`,
        state,
      };
    }

    state.answers.sslInspection = picked;
    state.step = 9;

    const estimatedNote =
      picked?.id === 'ssl_unknown' ? `ℹ️ Usaré un perfil SSL conservador.\n\n` : '';

    return {
      done: true,
      assistantMessage:
        `${estimatedNote}` +
        `Listo ✅ Inspección SSL: ${picked.label}\n\n` +
        `Bloque 4 – Segmentación\n` +
        `Pregunta 9/${TOTAL_STEPS}: ¿Necesitas segmentar tu red (VDOMs)?\n` +
        `${listOptions(FORTIGATE_VDOM_OPTIONS)}\n\n` +
        `Responde SOLO con el número.`,
      state,
    };
  }

  // Paso 9: VDOMs + motor (fortigate_specs)
  if (state.step === 9) {
    const picked = pickOptionByNumber(text, FORTIGATE_VDOM_OPTIONS);
    if (!picked) {
      return {
        done: true,
        assistantMessage: `Responde con un número válido (1 a ${FORTIGATE_VDOM_OPTIONS.length}).`,
        state,
      };
    }

    state.answers.vdoms = picked;

    const fortigates = await getFortiGateCandidates();
    if (!fortigates.length) {
      resetSession(sessionId);
      return {
        done: true,
        assistantMessage:
          'No hay modelos FortiGate disponibles en el catálogo técnico cargado. Comprueba la base de datos o vuelve a intentarlo más tarde.',
        state: getSession(sessionId),
      };
    }

    const answersSnapshot = { ...state.answers };
    const { bestEval, failing, recommended, req } = runFortigateSizingEngine(
      answersSnapshot,
      fortigates,
    );

    if (!bestEval) {
      resetSession(sessionId);

      const topFailures = failing
        .slice(0, 10)
        .map((f) => {
          const name = f?.model?.UNIT || 'Modelo';
          const reasons = f?.issues?.slice(0, 2).join(' | ') || 'Sin detalle';
          return `- ${name}: ${reasons}`;
        })
        .join('\n');

      const estimatedMessage = hasUnknownSizingInputsV2(answersSnapshot)
        ? `ℹ️ Parte de las respuestas eran estimadas o “no estoy seguro”.\n\n`
        : '';

      return {
        done: true,
        assistantMessage:
          `${estimatedMessage}` +
          `📊 FortiGate — resultado del dimensionamiento\n\n` +
          `⚠️ Ningún modelo del catálogo cargado cumple con tus requisitos.\n\n` +
          `📋 Tu escenario\n` +
          `- WAN: ${answersSnapshot.wan?.label}\n` +
          `- Usuarios: ${answersSnapshot.users?.label}\n` +
          `- Seguridad: ${answersSnapshot.securityLevel?.label}\n` +
          `- Tráfico: ${answersSnapshot.trafficType?.label}\n` +
          `- VPN: ${(answersSnapshot.vpnType ?? answersSnapshot.vpn)?.label}\n` +
          (fortigateVpnTypeNeedsSslUsers(answersSnapshot.vpnType ?? answersSnapshot.vpn)
            ? `- SSL VPN: ${answersSnapshot.sslVpnUsers?.label ?? answersSnapshot.vpnUsers?.label}\n`
            : '') +
          (fortigateVpnTypeNeedsIpsec(answersSnapshot.vpnType ?? answersSnapshot.vpn)
            ? `- IPsec site-to-site: ${answersSnapshot.ipsecTunnels?.label}\n`
            : '') +
          `- Inspección SSL: ${answersSnapshot.sslInspection?.label}\n` +
          `- VDOMs: ${answersSnapshot.vdoms?.label}\n\n` +
          `🔍 Ejemplos de rechazo (primeros modelos evaluados)\n${topFailures || '- Sin detalles'}`,
        state: getSession(sessionId),
      };
    }

    let offersCache = [];
    try {
      console.log('MODELO RECOMENDADO COMPLETO:', recommended);
      console.log('UNIT ENVIADO:', recommended?.UNIT);
      console.log('SKU ENVIADO:', recommended?.SKU);
      offersCache = await loadFortigateOffersForUnit(recommended?.UNIT, recommended?.SKU);
    } catch {
      offersCache = [];
    }

    state._sizingContext = {
      answersSnapshot,
      recommended,
      req,
      bestEval,
      usedEstimatedDefaults: !!bestEval?.usedEstimatedDefaults,
    };
    state._offersCache = offersCache;
    state.step = 10;

    const estNote = bestEval?.usedEstimatedDefaults
      ? `ℹ️ Se usaron valores estimados donde no había dato.\n\n`
      : '';

    return {
      done: true,
      assistantMessage:
        `${estNote}` +
        `Perfecto ✅ VDOMs: ${picked.label}\n\n` +
        `Tras cruzar tus respuestas con el catálogo técnico FortiGate, el modelo que mejor encaja es ${recommended?.UNIT || 'N/A'} ` +
        `(${recommended?.SKU || 'N/A'}), con un throughput objetivo de unos ${req} Mbps (${bestEval?.primaryLabel || 'métrica principal'}).\n\n` +
        `Bloque 5 – Bundle\n` +
        `Pregunta 10/${TOTAL_STEPS}: ¿Qué tipo de solución deseas implementar?\n` +
        `${listOptions(BUNDLE_TYPE_OPTIONS)}\n\n` +
        `Responde SOLO con el número.`,
      state,
    };
  }

  // Paso 10: tipo de bundle → solution_offers
  if (state.step === 10) {
    const picked = pickOptionByNumber(text, BUNDLE_TYPE_OPTIONS);
    if (!picked) {
      return {
        done: true,
        assistantMessage: `Responde con un número válido (1 a ${BUNDLE_TYPE_OPTIONS.length}).`,
        state,
      };
    }

    state.answers.bundleType = picked.id;
    const ctx = state._sizingContext;
    const offers = state._offersCache || [];
    const bundleOffer = await selectBundleFromOffers(
      ctx.recommended,
      offers,
      ctx?.answersSnapshot || {},
      picked.id,
    );
    state._bundleOffer = bundleOffer;

    const bundleLine = bundleOffer
      ? `Selección registrada. La referencia de catálogo que mejor encaja con tu elección es:\n${formatOfferLine(bundleOffer)}`
      : `No encontré en catálogo una oferta clara para este modelo; puedes ajustar el SKU con la lista de precios.`;

    state.step = 11;

    return {
      done: true,
      assistantMessage:
        `${bundleLine}\n\n` +
        `Bloque 6 – Servicios adicionales\n` +
        `Pregunta 11/${TOTAL_STEPS}: ¿Deseas agregar servicios adicionales?\n` +
        `${listOptions(ADDONS_OPTIONS)}\n\n` +
        `Responde SOLO con el número.`,
      state,
    };
  }

  // Paso 11: upsell sí/no → state.answers.addons
  if (state.step === 11) {
    const picked = pickOptionByNumber(text, ADDONS_OPTIONS);
    if (!picked) {
      return {
        done: true,
        assistantMessage: `Responde con un número válido (1 a ${ADDONS_OPTIONS.length}).`,
        state,
      };
    }

    state.answers.addons = picked.id;

    if (picked.id === 'no') {
      const ctx = state._sizingContext;
      const est = ctx?.usedEstimatedDefaults
        ? `ℹ️ Se usaron valores estimados donde no había dato.\n\n`
        : '';
      const exec = formatExecutiveSummaryLine(ctx.bestEval, state._bundleOffer, []);
      const tech = formatTechnicalSizingBlock(ctx.answersSnapshot, ctx.recommended, ctx.req);
      const commercial = formatCommercialBlock(state._bundleOffer, []);
      resetSession(sessionId);
      return {
        done: true,
        assistantMessage: `${est}${composeFortigateFinalSizingMessage('', exec, tech, commercial)}`,
        state: getSession(sessionId),
      };
    }

    state.step = 12;
    return {
      done: true,
      assistantMessage:
        `Pregunta 12/${TOTAL_STEPS}: Para complementar la solución, ¿qué aspecto te gustaría fortalecer?\n` +
        `${listOptions(ADDON_TYPE_OPTIONS)}\n\n` +
        `Responde SOLO con el número.`,
      state,
    };
  }

  // Paso 12: tipo de add-on → hasta 3 filas en solution_offers
  if (state.step === 12) {
    const picked = pickOptionByNumber(text, ADDON_TYPE_OPTIONS);
    if (!picked) {
      return {
        done: true,
        assistantMessage: `Responde con un número válido (1 a ${ADDON_TYPE_OPTIONS.length}).`,
        state,
      };
    }

    state.answers.addonType = picked.id;
    const ctx = state._sizingContext;
    const offers = state._offersCache || [];
    const excludeSku = state._bundleOffer?.sku || '';
    const derivedNeeds = deriveTechnicalNeedsFromAnswers(ctx?.answersSnapshot || {});
    const addonOffers = selectAddonOffers(
      offers,
      picked.id,
      excludeSku,
      ctx?.answersSnapshot || {},
      3,
      { derivedNeeds },
    );

    const est = ctx?.usedEstimatedDefaults
      ? `ℹ️ Se usaron valores estimados donde no había dato.\n\n`
      : '';
    const exec = formatExecutiveSummaryLine(ctx.bestEval, state._bundleOffer, addonOffers);
    const tech = formatTechnicalSizingBlock(ctx.answersSnapshot, ctx.recommended, ctx.req);
    const commercial = formatCommercialBlock(state._bundleOffer, addonOffers);
    resetSession(sessionId);
    return {
      done: true,
      assistantMessage: `${est}${composeFortigateFinalSizingMessage('', exec, tech, commercial)}`,
      state: getSession(sessionId),
    };
  }

  return { done: false, assistantMessage: null, state };
}

/**
 * Convierte respuestas de formulario (índices 1-based) al snapshot v2 del motor.
 */
function mapFormAnswersToState(formAnswers) {
  const pick = (key, options) => {
    const idx = formAnswers[key];
    if (idx == null || !Array.isArray(options)) return null;
    const n = Number(idx);
    if (!Number.isInteger(n) || n < 1 || n > options.length) return null;
    return options[n - 1];
  };

  const wan = pick('wan', FORTIGATE_WAN_OPTIONS);
  const users = pick('users', FORTIGATE_USERS_OPTIONS);
  let securityLevel = pick('securityLevel', FORTIGATE_SECURITY_LEVEL_OPTIONS);
  const trafficType = pick('trafficType', FORTIGATE_TRAFFIC_OPTIONS);
  let vpnType =
    pick('vpnType', FORTIGATE_VPN_TYPE_OPTIONS) || pick('vpn', FORTIGATE_VPN_TYPE_OPTIONS);
  let sslVpnUsers = pick('sslVpnUsers', FORTIGATE_SSL_VPN_USERS_OPTIONS);
  let vpnUsers = sslVpnUsers || pick('vpnUsers', FORTIGATE_SSL_VPN_USERS_OPTIONS);
  let ipsecTunnels = pick('ipsecTunnels', FORTIGATE_IPSEC_TUNNEL_OPTIONS);
  const sslInspection = pick('sslInspection', FORTIGATE_SSL_OPTIONS);
  const vdoms = pick('vdoms', FORTIGATE_VDOM_OPTIONS);

  if (!wan || !users || !trafficType || !vpnType || !sslInspection || !vdoms) {
    return null;
  }

  if (!securityLevel && formAnswers.securityProfile != null) {
    const legacyIdx = Number(formAnswers.securityProfile);
    if (legacyIdx >= 1 && legacyIdx <= 4) {
      securityLevel = FORTIGATE_SECURITY_LEVEL_OPTIONS[legacyIdx - 1];
    }
  }
  if (!securityLevel) return null;

  const skipSsl = { id: 'skipped', label: 'N/A (sin SSL VPN)', count: 0 };
  const skipIpsec = { id: 'skipped', label: 'N/A (sin IPsec)', count: 0 };

  if (vpnType.id === 'none') {
    sslVpnUsers = skipSsl;
    vpnUsers = skipSsl;
    ipsecTunnels = skipIpsec;
  } else {
    if (fortigateVpnTypeNeedsSslUsers(vpnType)) {
      if (!sslVpnUsers && !vpnUsers) return null;
      if (!sslVpnUsers) sslVpnUsers = vpnUsers;
      if (!vpnUsers) vpnUsers = sslVpnUsers;
    } else {
      sslVpnUsers = skipSsl;
      vpnUsers = skipSsl;
    }
    if (fortigateVpnTypeNeedsIpsec(vpnType)) {
      if (!ipsecTunnels) return null;
    } else {
      ipsecTunnels = skipIpsec;
    }
  }

  return {
    wan,
    users,
    securityLevel,
    trafficType,
    vpnType,
    sslVpnUsers,
    vpnUsers,
    ipsecTunnels,
    vpn: vpnType,
    sslInspection,
    vdoms,
  };
}

/**
 * Opciones comerciales del formulario (índices 1-based pasos 10–12).
 * Acepta `addons` o `addonsDecision` por compatibilidad.
 */
export function mapFortigateCommercialFormAnswers(formAnswers) {
  const pickId = (key, options) => {
    const idx = formAnswers?.[key];
    if (idx == null || !Array.isArray(options)) return null;
    const n = Number(idx);
    if (!Number.isInteger(n) || n < 1 || n > options.length) return null;
    return options[n - 1]?.id ?? null;
  };

  const bundleType = pickId('bundleType', BUNDLE_TYPE_OPTIONS);
  const addons =
    pickId('addons', ADDONS_OPTIONS) ?? pickId('addonsDecision', ADDONS_OPTIONS);
  const addonTypeRaw = pickId('addonType', ADDON_TYPE_OPTIONS);

  if (!bundleType || !addons) {
    return {
      ok: false,
      message:
        'Faltan respuestas válidas para tipo de bundle o complementos. Revisa las últimas preguntas del formulario.',
    };
  }

  if (addons === 'yes' && !addonTypeRaw) {
    return {
      ok: false,
      message:
        'Elegiste añadir servicios adicionales: indica qué aspecto deseas fortalecer.',
    };
  }

  const addonType = addons === 'yes' ? addonTypeRaw : null;

  return { ok: true, bundleType, addons, addonType, addonsDecision: addons };
}

/**
 * Ejecuta dimensionamiento FortiGate con respuestas en lote (formulario).
 * @param {object} formAnswers - respuestas del formulario (índices 1-based por campo)
 * @returns {Promise<{ done: boolean, assistantMessage: string, recommendation?: object }>}
 */
export async function runFortigateSizingFromPayload(formAnswers) {
  const answersSnapshot = mapFormAnswersToState(formAnswers || {});
  if (!answersSnapshot) {
    return {
      done: true,
      assistantMessage: 'Faltan respuestas válidas en el formulario. Revisa todos los campos.',
    };
  }

  const commercial = mapFortigateCommercialFormAnswers(formAnswers || {});
  if (!commercial.ok) {
    return {
      done: true,
      assistantMessage: commercial.message,
    };
  }

  const fortigates = await getFortiGateCandidates();
  if (!fortigates.length) {
    return {
      done: true,
      assistantMessage:
        'No hay modelos FortiGate disponibles en el catálogo técnico cargado. Comprueba la base de datos o vuelve a intentarlo más tarde.',
    };
  }

  const { bestEval, failing, recommended, req } = runFortigateSizingEngine(
    answersSnapshot,
    fortigates,
  );

  if (bestEval) {
    const estimatedMessage = hasUnknownSizingInputsV2(answersSnapshot)
      ? `ℹ️ Se usaron valores estimados donde no había dato.\n\n`
      : '';

    let offers = [];
    try {
      console.log('MODELO RECOMENDADO COMPLETO:', recommended);
      console.log('UNIT ENVIADO:', recommended?.UNIT);
      console.log('SKU ENVIADO:', recommended?.SKU);
      offers = await loadFortigateOffersForUnit(recommended?.UNIT, recommended?.SKU);
    } catch {
      offers = [];
    }
    const bundleOffer = await selectBundleFromOffers(
      recommended,
      offers,
      answersSnapshot,
      commercial.bundleType,
    );

    const derivedNeeds = deriveTechnicalNeedsFromAnswers(answersSnapshot);
    const addonOffers =
      commercial.addons === 'yes'
        ? selectAddonOffers(
            offers,
            commercial.addonType,
            bundleOffer?.sku || '',
            answersSnapshot,
            3,
            { derivedNeeds },
          )
        : [];

    const exec = formatExecutiveSummaryLine(bestEval, bundleOffer, addonOffers);
    const tech = formatTechnicalSizingBlock(answersSnapshot, recommended, req);
    const commercialBlock = formatCommercialBlock(bundleOffer, addonOffers);

    return {
      done: true,
      assistantMessage: composeFortigateFinalSizingMessage(estimatedMessage, exec, tech, commercialBlock),
      recommendation: recommended
        ? {
            unit: recommended.UNIT,
            sku: recommended.SKU,
            bundleType: commercial.bundleType,
            bundleOffer: bundleOffer || null,
            addons: commercial.addons,
            addonsDecision: commercial.addons,
            addonType: commercial.addonType,
            addonOffers: addonOffers.length ? addonOffers : undefined,
          }
        : null,
    };
  }

  const topFailures = failing
    .slice(0, 5)
    .map((f) => `- ${f?.model?.UNIT || 'N/A'}: ${(f?.issues || []).slice(0, 2).join(' | ')}`)
    .join('\n');
  return {
    done: true,
    assistantMessage:
      `📊 FortiGate — resultado del dimensionamiento\n\n` +
      `⚠️ Ningún modelo del catálogo cumple con los requisitos indicados.\n\n` +
      `📋 Resumen rápido\n` +
      `- WAN: ${answersSnapshot.wan?.label}\n` +
      `- Usuarios: ${answersSnapshot.users?.label}\n` +
      `- Seguridad: ${answersSnapshot.securityLevel?.label}\n\n` +
      `🔍 Ejemplos de rechazo\n${topFailures || '-'}`,
  };
}