/**
 * Motor de dimensionamiento FortiAnalyzer (preventa).
 * Usa modelos normalizados desde fortianalyzer_specs (sin inventar capacidades).
 */

const LICENSE_TYPES = {
  PREMIUM: 'FortiCare Premium',
  ELITE: 'FortiCare Elite',
  UPGRADE_PREMIUM_ELITE: 'Upgrade Premium to Elite',
  RMA_NBD: 'RMA Next Business Day',
  RMA_4H: 'RMA 4-Hour Delivery',
  RMA_4H_ONSITE: 'RMA 4-Hour Onsite Engineer',
  SECURE_RMA: 'Secure RMA',
  AI_MGMT: 'AI Management Service',
};

const REQUIRES_FORTICARE = new Set([
  LICENSE_TYPES.RMA_NBD,
  LICENSE_TYPES.RMA_4H,
  LICENSE_TYPES.RMA_4H_ONSITE,
  LICENSE_TYPES.SECURE_RMA,
]);

export class FortiAnalyzerEngine {
  /**
   * @param {NormalizedFazModel[]} models - filas ya normalizadas (métricas numéricas o null)
   */
  constructor(models) {
    this.models = Array.isArray(models) ? models : [];
  }

  // -----------------------------
  // Normalización desde formulario (índices 1-based)
  // -----------------------------

  /**
   * @param {Record<string, unknown>} input
   */
  normalizeInputs(input) {
    const devicesOpt = Number(input?.devices);
    return {
      logsPerDayGB: this.mapLogs(Number(input?.logsVolume)),
      analyticsFactor: this.mapAnalytics(Number(input?.analyticsLevel)),
      devices: this.mapDevices(devicesOpt),
      devicesOption: Number.isFinite(devicesOpt) ? devicesOpt : 3,
      deviceCollectorStress: this.mapDeviceCollectorStress(devicesOpt),
      retentionDays: this.mapRetention(Number(input?.retention)),
      growth: this.mapGrowth(Number(input?.growth)),
      deployment: Number(input?.deployment) || 3,
      performanceFactor: this.mapPerformance(Number(input?.performance)),
      storageTypeMultiplier: this.mapStorageTypeMultiplier(Number(input?.storageType)),
      licenseOption: Number(input?.licenseOption) || 9,
    };
  }

  mapLogs(option) {
    const map = { 1: 25, 2: 100, 3: 200, 4: 660, 5: 3000, 6: 8300 };
    return map[option] ?? 100;
  }

  mapDevices(option) {
    const map = { 1: 5, 2: 20, 3: 50, 4: 100, 5: 200 };
    return map[option] ?? 50;
  }

  mapRetention(option) {
    const map = { 1: 30, 2: 90, 3: 180, 4: 365, 5: 730 };
    return map[option] ?? 90;
  }

  mapGrowth(option) {
    const map = { 1: 1, 2: 1.3, 3: 1.6, 4: 2 };
    return map[option] ?? 1.3;
  }

  mapAnalytics(option) {
    const map = { 1: 0.5, 2: 1, 3: 1.5, 4: 2 };
    return map[option] ?? 1;
  }

  mapPerformance(option) {
    const map = { 1: 1, 2: 1.2, 3: 1.5, 4: 2 };
    return map[option] ?? 1;
  }

  /** Estrés de ingesta en función de dispositivos (mapea a Collector). */
  mapDeviceCollectorStress(option) {
    const map = { 1: 1, 2: 1.12, 3: 1.28, 4: 1.48, 5: 1.75 };
    return map[option] ?? 1.28;
  }

  /** Refuerzo de almacenamiento requerido según tipo de storage declarado. */
  mapStorageTypeMultiplier(option) {
    const map = { 1: 1, 2: 1.35, 3: 1.15 };
    return map[option] ?? 1;
  }

  applySafetyMargin(value, factor = 1.3) {
    return value * factor;
  }

  // -----------------------------
  // Requisitos
  // -----------------------------

  /**
   * @param {ReturnType<FortiAnalyzerEngine['normalizeInputs']>} input
   */
  calculateRequirements(input) {
    const baseLps = (input.logsPerDayGB * 1024) / 86400;

    const storageMult = input.storageTypeMultiplier;

    const logsPerSecond = this.applySafetyMargin(
      baseLps * input.analyticsFactor * input.performanceFactor,
    );

    const requiredCollectorLps = this.applySafetyMargin(
      baseLps * input.performanceFactor * input.deviceCollectorStress,
    );

    const totalStorageGB = this.applySafetyMargin(
      input.logsPerDayGB * input.retentionDays * input.growth * storageMult,
    );

    return {
      logsPerDayGB: input.logsPerDayGB,
      logsPerSecond,
      requiredCollectorLps,
      totalStorageGB,
    };
  }

  // -----------------------------
  // Evaluación
  // -----------------------------

  /**
   * Criterios alineados al datasheet (capacidad de ingesta / análisis).
   * El almacenamiento NO filtra aquí: GB/día×retención×márgenes es volumen lógico;
   * el PDF suele traer TB físicos sin equivalencia 1:1 (compresión, políticas, archivo).
   */
  evaluateModel(model, req) {
    if (model.gbLogsPerDay == null || model.gbLogsPerDay < req.logsPerDayGB) return false;

    if (model.analyticsLps == null || model.analyticsLps < req.logsPerSecond) return false;

    if (model.collectorLps == null || model.collectorLps < req.requiredCollectorLps) return false;

    return true;
  }

  /**
   * Compara almacenamiento datasheet (si existe) frente al volumen lógico estimado.
   * @returns {{ ok: boolean | null, modelGb: number | null, requiredGb: number }}
   */
  evaluateStorageVsRequirement(model, req) {
    const requiredGb = req.totalStorageGB;
    if (!model) return { ok: null, modelGb: null, requiredGb };
    const cap = model.storageGb;
    if (cap == null) return { ok: null, modelGb: null, requiredGb };
    return { ok: cap >= requiredGb, modelGb: cap, requiredGb };
  }

  /**
   * Texto para avisos al usuario (preventa).
   * @param {NormalizedFazModel|null} model
   */
  buildStorageAdvisoryMessage(model, req) {
    if (!model || !req) return null;
    const { ok, modelGb, requiredGb } = this.evaluateStorageVsRequirement(model, req);
    if (ok === true) return null;
    const need = Math.ceil(requiredGb);
    if (ok === null) {
      return (
        `Almacenamiento: no se pudo interpretar la capacidad del datasheet para ${model.UNIT}. ` +
        `Volumen lógico estimado (retención × GB/día × márgenes): ~${need} GB. ` +
        `Valida disco, archivo externo y guía Fortinet con preventa.`
      );
    }
    const cap = Math.ceil(modelGb);
    return (
      `Almacenamiento: el datasheet indica ~${cap} GB en esta fila; la retención indicada sugiere ~${need} GB de volumen bruto estimado (sin asumir compresión). ` +
      `Revisa archivado, políticas de logs o un modelo con más disco.`
    );
  }

  // -----------------------------
  // Selección
  // -----------------------------

  /**
   * @param {ReturnType<FortiAnalyzerEngine['calculateRequirements']>} req
   * @param {ReturnType<FortiAnalyzerEngine['normalizeInputs']>} input
   * @returns {NormalizedFazModel|null}
   */
  selectBestModel(req, input) {
    let candidates = [...this.models];

    if (input.deployment === 1) {
      candidates = candidates.filter((m) => !m.isVm);
    } else if (input.deployment === 2) {
      candidates = candidates.filter((m) => m.isVm);
    }

    candidates.sort((a, b) => {
      const ga = a.gbLogsPerDay ?? Number.POSITIVE_INFINITY;
      const gb = b.gbLogsPerDay ?? Number.POSITIVE_INFINITY;
      if (ga !== gb) return ga - gb;
      return String(a.UNIT).localeCompare(String(b.UNIT));
    });

    let selected = null;
    for (const model of candidates) {
      if (this.evaluateModel(model, req)) {
        selected = model;
        break;
      }
    }

    if (!selected) return null;

    if (input.growth >= 1.6) {
      let idx = candidates.indexOf(selected);
      while (idx + 1 < candidates.length) {
        idx += 1;
        if (this.evaluateModel(candidates[idx], req)) return candidates[idx];
      }
    }

    return selected;
  }

  // -----------------------------
  // Licencia (una sola; sin bundles)
  // -----------------------------

  /**
   * @param {ReturnType<FortiAnalyzerEngine['normalizeInputs']>} input
   * @returns {string}
   */
  selectAdditionalLicense(input) {
    switch (input.licenseOption) {
      case 1:
        return LICENSE_TYPES.PREMIUM;
      case 2:
        return LICENSE_TYPES.ELITE;
      case 3:
        return LICENSE_TYPES.UPGRADE_PREMIUM_ELITE;
      case 4:
        return LICENSE_TYPES.RMA_NBD;
      case 5:
        return LICENSE_TYPES.RMA_4H;
      case 6:
        return LICENSE_TYPES.RMA_4H_ONSITE;
      case 7:
        return LICENSE_TYPES.SECURE_RMA;
      case 8:
        return LICENSE_TYPES.AI_MGMT;
      case 9:
      default:
        if (input.performanceFactor >= 2 || input.analyticsFactor >= 2) {
          return LICENSE_TYPES.ELITE;
        }
        return LICENSE_TYPES.PREMIUM;
    }
  }

  /**
   * @param {string} license
   * @returns {{ requires: string }|null}
   */
  validateLicenseDependencies(license) {
    if (REQUIRES_FORTICARE.has(license)) {
      return { requires: 'FortiCare Premium or Elite' };
    }
    return null;
  }

  /**
   * @param {NormalizedFazModel|null} model
   * @param {string} license
   * @param {Array<object>} warnings
   */
  buildResult(model, license, warnings = []) {
    if (!model) {
      return {
        model: { UNIT: '', SKU: '' },
        bundle: null,
        license: { type: license },
        warnings,
      };
    }
    return {
      model: {
        UNIT: model.UNIT,
        SKU: '',
      },
      bundle: null,
      license: { type: license },
      warnings,
    };
  }
}

export { LICENSE_TYPES, REQUIRES_FORTICARE };
