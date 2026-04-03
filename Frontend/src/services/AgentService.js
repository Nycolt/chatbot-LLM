import { getGlobalVariable } from "../config/variables.js";
import getPrompt from "../Agent/prompt.js";
import { httpService } from "../config/fetch.js";
import {
  COMPARE_STEP1_HTML,
  buildComparePickerHtml,
} from "../config/compareFlow.config.js";
import {
  buildCompareTableHtml,
  buildCompareNarrativeHtml,
  buildCompareRecommendationLoadingHtml,
} from "../components/CompareTable.js";
import { generateFallbackRecommendation } from "../utils/compareFallbackRecommendation.js";

/**
 * POST /compare/narrative: el backend devuelve siempre texto (LLM o fallback).
 * Si falla la red, se usa el mismo fallback local — sin mensajes técnicos al usuario.
 */
async function fetchCompareNarrativeSection(payload) {
  try {
    const res = await httpService.post("/compare/narrative", payload);
    const d = res.data?.data;
    if (res.data?.success && d?.narrative && String(d.narrative).trim()) {
      const src = d.source === "llm" ? "llm" : "fallback";
      return buildCompareNarrativeHtml(String(d.narrative).trim(), { source: src });
    }
  } catch {
    /* red o 5xx: recomendación local */
  }
  return buildCompareNarrativeHtml(generateFallbackRecommendation(payload), {
    source: "fallback",
  });
}

/** POST /agent/ask: compatibilidad array legacy vs { messages, technical, naturalized } */
export function normalizeAgentAskData(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.messages)) return data.messages;
  return [];
}

/** Mensaje de bienvenida / menú principal (HTML para diseño mejorado) */
export const WELCOME_MESSAGE = {
  role: "assistant",
  content: `<div class="menu-inicio">
  <p class="menu-inicio-saludo">¡Hola! Soy tu Asistente Fortinet👋.</p>
  <p class="menu-inicio-instruction">Elige una opción escribiendo el número:</p>
  <div class="menu-opciones">
    <div class="menu-opcion"><span class="menu-opcion-num">1</span> Dimensionamiento de soluciones Fortinet — Preguntas guiadas para recomendar el modelo por medio de (WAN, usuarios, perfil, VPN). Incluye FortiGate y más.</div>
    <div class="menu-opcion"><span class="menu-opcion-num">2</span> Recomendación según tu contexto — Describe tu necesidad en red o seguridad; te oriento hacia la solución Fortinet adecuada.</div>
    <div class="menu-opcion"><span class="menu-opcion-num">3</span> Comparación entre modelos — Elige la solución y escribe modelos con <em>vs</em> (datos reales desde la base).</div>
  </div>
  <p class="menu-inicio-pie">Escribe <strong>1</strong>, <strong>2</strong> o <strong>3</strong> para continuar.</p>
</div>`,
};

function wantsMainMenu(userText) {
  const t = String(userText || "").toLowerCase().trim();
  return (
    t === "inicio" ||
    t === "menú" ||
    t === "menu" ||
    t === "menú principal" ||
    t === "menu principal" ||
    t === "volver" ||
    t === "volver al inicio" ||
    t === "volver al menú" ||
    t === "principal" ||
    t === "0"
  );
}

const DIMENSIONING_OPTIONS_MESSAGE = {
  role: "assistant",
  content: `<p class="menu-dimension-lead">Perfecto 👍<br>Vamos a realizar un dimensionamiento guiado.</p>
<p class="menu-dimension-intro">Puedo ayudarte a dimensionar las siguientes soluciones Fortinet:</p>
<div class="menu-dimension-list" role="list">
  <div class="menu-dimension-item" role="listitem"><span class="menu-opcion-num menu-dimension-num">1</span><span class="menu-dimension-text">FortiGate</span></div>
  <div class="menu-dimension-item" role="listitem"><span class="menu-opcion-num menu-dimension-num">2</span><span class="menu-dimension-text">FortiGate VM (entornos virtuales y cloud)</span></div>
  <div class="menu-dimension-item" role="listitem"><span class="menu-opcion-num menu-dimension-num">3</span><span class="menu-dimension-text">FortiWiFi</span></div>
  <div class="menu-dimension-item" role="listitem"><span class="menu-opcion-num menu-dimension-num">4</span><span class="menu-dimension-text">FortiAnalyzer</span></div>
  <div class="menu-dimension-item" role="listitem"><span class="menu-opcion-num menu-dimension-num">5</span><span class="menu-dimension-text">FortiManager</span></div>
  <div class="menu-dimension-item" role="listitem"><span class="menu-opcion-num menu-dimension-num">6</span><span class="menu-dimension-text">FortiSwitch</span></div>
</div>
<p class="menu-dimension-prompt">👉 ¿Qué solución deseas dimensionar? (Responde SOLO con el número)</p>`,
};

/** Fragmento único del mensaje del submenú de soluciones (para localizarlo en el historial) */
const DIMENSION_MENU_SNIPPET = "¿Qué solución deseas dimensionar";

function isRecommendationDimensionYes(userText) {
  const s = String(userText || "").toLowerCase().trim();
  if (/^1(\s|[\.\),]|$)/.test(s)) return true;
  if (/^(sí|si|ok|vale|claro|dale|vamos|exacto|correcto)($|[\s,!?.]|,)/.test(s))
    return true;
  if (/^(sí|si)\s*,?\s*(quiero|adelante|por favor)/.test(s)) return true;
  if (/^quiero\s+dimension/.test(s)) return true;
  return false;
}

function isRecommendationDimensionNo(userText) {
  const s = String(userText || "").toLowerCase().trim();
  if (s === "2") return true;
  if (/\bno\b/.test(s)) return true;
  return false;
}

class AgentService {
  constructor() {
    this.agentName = getGlobalVariable("agentName") || "Asistente Fortinet";
    this.maxMessages = 20;
    this.messages = [];

    // ✅ Estados claros para evitar que el menú "se reviva"
    // idle: chat normal
    // dimension_menu: menú local (frontend)
    // sizing_flow: ya estamos en dimensionamiento, no se intercepta nada más en frontend
    this.uiState = "idle"; // idle | dimension_menu | sizing_form | sizing_flow | compare_pick | compare_select

    /** Tras una recomendación con oferta de dimensionar: solutionType 1–6 o null */
    this.pendingDimensionFromRecommendation = null;
    /** Origen del formulario abierto (para Cancelar) */
    this.sizingFormEntry = null; // null | "dimension_menu" | "recommendation"
    /** Comparación (opción 3): clave API fortigate | fortianalyzer | … */
    this.compareSolution = null;
  }

  // ✅ Solo arma el system prompt (NO llama al backend)
  configChat = async () => {
    this.messages = [];
    this.uiState = "idle";
    this.pendingDimensionFromRecommendation = null;
    this.sizingFormEntry = null;
    this.compareSolution = null;

    const promptContent = getPrompt(this.agentName);
    this.messages.push({ role: "system", content: promptContent });

    return this.messages;
  };

  setMessages = (messages) => {
    this.messages = messages;
  };

  getMessages = () => {
    return this.messages;
  };

  addMessageAndReturn = (message) => {
    this.messages.push(message);
    return this.messages;
  };

  optimizeMessages = (messages) => {
    const systemMessages = messages.filter((m) => m && m.role === "system");
    const convoMessages = messages.filter((m) => m && m.role !== "system");

    if (messages.length <= this.maxMessages) return messages;

    const maxConvo = this.maxMessages - systemMessages.length;
    const recent = convoMessages.slice(-maxConvo);

    return systemMessages.concat(recent);
  };

  /** Respuesta /agent/ask: actualiza oferta de dimensionar tras recomendación */
  applyAgentResponseMetadata = (data) => {
    if (!data || typeof data !== "object" || Array.isArray(data)) return;
    const t = data.technical;
    if (t && t.type === "learning") {
      this.pendingDimensionFromRecommendation = null;
      return;
    }
    if (t && t.type === "recommendation") {
      const d = t.dimensionSolutionType;
      this.pendingDimensionFromRecommendation =
        d != null && Number.isFinite(Number(d)) ? Number(d) : null;
    }
  };

  openSizingFormReturn = (solutionType, entry) => {
    this.uiState = "sizing_form";
    this.sizingFormEntry = entry;
    return {
      messages: this.messages,
      showForm: true,
      solutionType,
    };
  };

  /**
   * Ejecuta POST /compare tras elegir modelos con botones (no pasa por el input de texto).
   * @param {(messages: object[]) => void} [onAfterTableReady] — tras pintar tabla + "Generando recomendación…"
   */
  finishCompareFromPicker = async (solution, models, onAfterTableReady) => {
    try {
      const res = await httpService.post("/compare", { solution, models });
      const payload = res.data?.data;
      if (!res.data?.success || !payload) {
        throw new Error(res.data?.message || "Respuesta inválida del servidor");
      }
      this.messages.push({
        role: "user",
        content: `Comparación: ${models.join(" vs ")}`,
      });
      const intro = `<div class="compare-flow-intro">Resultado de la comparación (datos en base):</div>`;
      const tableHtml = buildCompareTableHtml(payload);
      const base = intro + tableHtml;
      const loading = buildCompareRecommendationLoadingHtml();
      this.messages.push({
        role: "assistant",
        content: base + loading,
      });
      if (typeof onAfterTableReady === "function") {
        onAfterTableReady(this.messages);
      }
      const narrativeHtml = await fetchCompareNarrativeSection(payload);
      const last = this.messages[this.messages.length - 1];
      if (last && last.role === "assistant") {
        last.content = base + narrativeHtml;
      }
      this.uiState = "idle";
      this.compareSolution = null;
      return this.messages;
    } catch (err) {
      const msg =
        err?.response?.data?.message || err?.message || "No se pudo comparar.";
      this.messages.push({
        role: "assistant",
        content: `⚠️ ${msg}`,
      });
      this.uiState = "compare_select";
      return this.messages;
    }
  };

  generateAgentResponse = async (Message) => {
    const userMessages = Array.isArray(Message)
      ? Message.filter((m) => m && m.role === "user")
      : [];

    const lastMessage = userMessages.length
      ? userMessages[userMessages.length - 1]
      : null;

    const userText = lastMessage?.content
      ? String(lastMessage.content).toLowerCase().trim()
      : "";

    const saysFortigate = userText.includes("fortigate");

    // 🔎 Debug
    console.log("[AgentService] uiState:", this.uiState, "userText:", userText);

    // ✅ Volver al menú principal (desde cualquier estado)
    if (wantsMainMenu(userText)) {
      return this.resetToMainMenu();
    }

    // ✅ Comparación — texto con "vs" (mismo paso que los botones)
    if (this.uiState === "compare_select" && this.compareSolution) {
      const rawInput =
        lastMessage?.content != null ? String(lastMessage.content).trim() : "";
      if (/\bvs\b/i.test(rawInput)) {
        const models = rawInput
          .split(/\bvs\b/i)
          .map((s) => s.trim())
          .filter(Boolean);
        if (models.length >= 2) {
          try {
            const res = await httpService.post("/compare", {
              solution: this.compareSolution,
              models,
            });
            const payload = res.data?.data;
            if (!res.data?.success || !payload) {
              throw new Error(res.data?.message || "Respuesta inválida del servidor");
            }
            this.uiState = "idle";
            this.compareSolution = null;
            const intro = `<div class="compare-flow-intro">Resultado de la comparación (datos en base):</div>`;
            const tableBlock = buildCompareTableHtml(payload);
            const narrativeHtml = await fetchCompareNarrativeSection(payload);
            return this.addMessageAndReturn({
              role: "assistant",
              content: intro + tableBlock + narrativeHtml,
            });
          } catch (err) {
            const msg =
              err?.response?.data?.message || err?.message || "No se pudo comparar.";
            return this.addMessageAndReturn({
              role: "assistant",
              content: `⚠️ ${msg}`,
            });
          }
        }
        return this.addMessageAndReturn({
          role: "assistant",
          content:
            "Necesitas **al menos dos** modelos separados por **vs**. Ejemplo: `FG-100F vs FG-200F`.",
        });
      } else if (rawInput.length > 0) {
        return this.addMessageAndReturn({
          role: "assistant",
          content:
            "Usa los **botones** (elige 2+ modelos y **Comparar**) o escribe en el chat con **vs**, por ejemplo: `FG-100F vs FG-200F`.",
        });
      }
    }

    if (this.uiState === "compare_pick") {
      const pickMap = {
        "1": "fortigate",
        "2": "fortianalyzer",
        "3": "fortimanager",
        "4": "fortiswitch",
      };
      const pick = pickMap[userText];
      if (pick) {
        try {
          const res = await httpService.get(
            `/compare/units/${encodeURIComponent(pick)}`
          );
          const units = res.data?.data?.units;
          if (!Array.isArray(units) || units.length === 0) {
            return this.addMessageAndReturn({
              role: "assistant",
              content:
                "⚠️ No hay modelos en la base para esta solución. Carga un **datasheet PDF** o datos en la tabla de especificaciones correspondiente.",
            });
          }
          this.compareSolution = pick;
          this.uiState = "compare_select";
          return this.addMessageAndReturn({
            role: "assistant",
            content: buildComparePickerHtml(pick, units),
          });
        } catch (err) {
          const msg =
            err?.response?.data?.message ||
            err?.message ||
            "No se pudo cargar el listado de modelos.";
          return this.addMessageAndReturn({
            role: "assistant",
            content: `⚠️ ${msg}`,
          });
        }
      }
      return this.addMessageAndReturn({
        role: "assistant",
        content:
          "Responde con un número del **1** al **4**. Escribe **inicio** para volver al menú principal.",
      });
    }

    // ✅ Menú inicial: aceptar 1, 2 o 3 (o palabras clave)
    if (this.uiState === "idle") {
      if (
        this.pendingDimensionFromRecommendation != null &&
        isRecommendationDimensionYes(userText)
      ) {
        const st = this.pendingDimensionFromRecommendation;
        this.pendingDimensionFromRecommendation = null;
        return this.openSizingFormReturn(st, "recommendation");
      }
      if (
        this.pendingDimensionFromRecommendation != null &&
        isRecommendationDimensionNo(userText)
      ) {
        this.pendingDimensionFromRecommendation = null;
        return this.addMessageAndReturn({
          role: "assistant",
          content:
            "Entendido. Si más adelante quieres dimensionar esta u otra solución, elige la opción 1 en el menú principal o vuelve a describir tu necesidad.",
        });
      }

      const option1 = userText === "1" || userText === "dimensionar" || userText === "dimensionamiento";
      const option2 = userText === "2" || userText === "recomendación" || userText === "recomendación de soluciones" || userText === "recomendar";
      const option3 = userText === "3" || userText === "comparar" || userText === "comparación" || userText === "comparación entre modelos";

      if (option1 && !saysFortigate) {
        this.uiState = "dimension_menu";
        return this.addMessageAndReturn(DIMENSIONING_OPTIONS_MESSAGE);
      }
      if (option2) {
        return this.addMessageAndReturn({
          role: "assistant",
          content:
            '💬 Cuéntame qué necesitas en tu red o en seguridad.\n\nPuedes escribirlo de forma sencilla empezando con "Necesito…" y describiendo lo que buscas.\n\nTe ayudaré a identificar la solución Fortinet más adecuada 🚀',
        });
      }
      if (option3) {
        this.uiState = "compare_pick";
        return this.addMessageAndReturn({
          role: "assistant",
          content: COMPARE_STEP1_HTML,
        });
      }
      // Si parece un intento de elegir opción (muy corto) pero no es 1/2/3, recordar el menú
      if (userText.length > 0 && userText.length <= 6) {
        return this.addMessageAndReturn({
          role: "assistant",
          content: "Responde con 1, 2 o 3 para elegir:\n\n1 = Dimensionamiento\n2 = Recomendación de soluciones\n3 = Comparación entre modelos",
        });
      }
    }

    // ✅ Submenú dimensionamiento: 1 = FG; 2 = FGV; 3 = FWF; 4 = FAZ; …
    if (this.uiState === "dimension_menu") {
      if (userText === "1") {
        return this.openSizingFormReturn(1, "dimension_menu");
      }
      if (userText === "2") {
        return this.openSizingFormReturn(2, "dimension_menu");
      }
      if (userText === "3") {
        return this.openSizingFormReturn(3, "dimension_menu");
      }
      if (userText === "4") {
        return this.openSizingFormReturn(4, "dimension_menu");
      }
      if (userText === "5") {
        return this.openSizingFormReturn(5, "dimension_menu");
      }
      if (userText === "6") {
        return this.openSizingFormReturn(6, "dimension_menu");
      }
      return this.addMessageAndReturn({
        role: "assistant",
        content:
          "Responde con un número del 1 al 6: FortiGate (1), FortiGate VM (2), FortiWiFi (3), FortiAnalyzer (4), FortiManager (5) o FortiSwitch (6). Escribe inicio o menú para volver al menú principal.",
      });
    }

    // ✅ 3) Si el usuario escribe directamente "dimensionar fortigate" -> backend directo
    // Nota: aquí NO cambiamos estados; el backend maneja pasos y el frontend no interviene.
    if (userText.includes("dimensionar") && saysFortigate) {
      this.uiState = "sizing_flow"; // ✅ Asegura que no se vuelva al menú por accidente
      const payload = this.optimizeMessages(Message);
      const response = await httpService.post("/agent/ask", payload);
      const raw = response.data?.data;
      this.applyAgentResponseMetadata(raw);
      return normalizeAgentAskData(raw);
    }

    // ✅ 4) En sizing_flow o sizing_form -> backend normal
    const payload = this.optimizeMessages(Message);
    const response = await httpService.post("/agent/ask", payload);
    const raw = response.data?.data;
    this.applyAgentResponseMetadata(raw);
    return normalizeAgentAskData(raw);
  };

  /** Envío desde formulario: añade mensaje usuario + respuesta y actualiza estado */
  submitSizingFormResult = (userLabel, assistantContent) => {
    this.uiState = "sizing_flow";
    this.sizingFormEntry = null;
    this.messages.push({ role: "user", content: userLabel });
    this.messages.push({ role: "assistant", content: assistantContent });
    return this.messages;
  };

  /** Volver al menú principal: resetea estado y devuelve bienvenida (conserva system si existía) */
  resetToMainMenu = () => {
    this.uiState = "idle";
    this.pendingDimensionFromRecommendation = null;
    this.sizingFormEntry = null;
    this.compareSolution = null;
    const systemMsgs = this.messages.filter((m) => m && m.role === "system");
    this.messages =
      systemMsgs.length > 0 ? [...systemMsgs, WELCOME_MESSAGE] : [WELCOME_MESSAGE];
    return this.messages;
  };

  /**
   * Tras cancelar el formulario: si venía del submenú 1–6, recorta al listado;
   * si venía de una recomendación, vuelve a idle sin forzar el submenú.
   */
  returnToDimensionMenu = () => {
    const entry = this.sizingFormEntry;
    this.sizingFormEntry = null;
    if (entry === "recommendation") {
      this.uiState = "idle";
      return this.messages;
    }
    this.uiState = "dimension_menu";
    let cutIdx = -1;
    for (let i = this.messages.length - 1; i >= 0; i--) {
      const m = this.messages[i];
      if (
        m &&
        m.role === "assistant" &&
        String(m.content || "").includes(DIMENSION_MENU_SNIPPET)
      ) {
        cutIdx = i;
        break;
      }
    }
    if (cutIdx >= 0) {
      this.messages = this.messages.slice(0, cutIdx + 1);
    }
    return this.messages;
  };

  run = () => {
    console.log("✅ Agente conectado");
  };
}

export default new AgentService();

