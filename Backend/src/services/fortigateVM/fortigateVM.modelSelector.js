/**
 * Carga `fortigate_vm_specs` y selecciona el modelo VM mínimo que cumple requisitos.
 */

import { sequelize } from '../../config/database.js';
import { logger } from '../../config/logger.js';
import { VM_TIER_ORDER } from './fortigateVM.requirements.js';

/**
 * Normaliza fila legacy / PascalCase / snake_case
 */
export function normalizeVmSpecRow(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const get = (keys) => {
    for (const k of keys) {
      if (raw[k] != null && String(raw[k]).trim() !== '') return raw[k];
    }
    return null;
  };
  const unit = String(get(['UNIT', 'unit', 'vm_tier_code']) || '').trim();
  if (!unit) return null;
  return {
    UNIT: unit,
    Virtual_Domains: get(['Virtual_Domains', 'virtual_domains', 'max_vdoms']),
    Max_Wireless_AP: get(['Max_Wireless_AP', 'max_wireless_ap']),
    Max_FortiSwitches: get(['Max_FortiSwitches', 'max_fortiswitches', 'Max_Fortiswitches']),
    Max_Endpoints: get(['Max_Endpoints', 'max_endpoints']),
    vCPU_Support: get(['vCPU_Support', 'vcpu_profile']),
    _raw: raw,
  };
}

/**
 * Extrae el mayor número útil de textos tipo "10 / 250", "200 000", "32 GB / 2 TB"
 */
export function parseSpecCapacityNumber(value) {
  if (value == null) return null;
  const s = String(value).replace(/\u00a0/g, ' ').trim();
  if (!s || /^n\/a$/i.test(s) || /^-+$/i.test(s)) return null;
  if (/unlimited|unlimit/i.test(s)) return Number.POSITIVE_INFINITY;

  const parts = s.split(/\s*\/\s*/).map((p) => p.trim()).filter(Boolean);
  const candidates = [];
  for (const part of parts.length ? parts : [s]) {
    const digits = part.replace(/[^\d]/g, '');
    if (digits) candidates.push(Number(digits));
  }
  if (!candidates.length) return null;
  return Math.max(...candidates);
}

function specNumericAtLeast(specValue, required) {
  if (required == null || required <= 0) return true;
  const n = parseSpecCapacityNumber(specValue);
  if (n == null || !Number.isFinite(n)) return true;
  return n >= required;
}

/**
 * @param {ReturnType<normalizeVmSpecRow>} row
 * @param {{ requiredEndpoints:number, requiredVdoms:number, requiredFortiap:number, requiredFortiswitch:number }} need
 */
export function specRowMeetsRequirements(row, need) {
  if (!row?.UNIT) return false;
  if (!specNumericAtLeast(row.Max_Endpoints, need.requiredEndpoints)) return false;
  if (!specNumericAtLeast(row.Virtual_Domains, need.requiredVdoms)) return false;
  if (!specNumericAtLeast(row.Max_Wireless_AP, need.requiredFortiap)) return false;
  if (!specNumericAtLeast(row.Max_FortiSwitches, need.requiredFortiswitch)) return false;
  return true;
}

function normalizeUnitKey(u) {
  return String(u || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '');
}

/**
 * Mapa UNIT → fila normalizada
 */
function indexSpecsByUnit(rows) {
  const map = new Map();
  for (const r of rows || []) {
    const n = normalizeVmSpecRow(r);
    if (!n?.UNIT) continue;
    map.set(normalizeUnitKey(n.UNIT), n);
  }
  return map;
}

/**
 * @param {object} requirements - salida de `computeFortigateVMRequirements`
 * @param {object[]} specRows - filas crudas de BD
 * @returns {{ unit: string, spec: object|null, tierIndex: number, bumpedTiers: number, fromSpecs: boolean }}
 */
export function selectBestFortigateVMModel(requirements, specRows) {
  const need = {
    requiredEndpoints: requirements.requiredEndpoints,
    requiredVdoms: requirements.requiredVdoms,
    requiredFortiap: requirements.requiredFortiap,
    requiredFortiswitch: requirements.requiredFortiswitch,
  };

  const byUnit = indexSpecsByUnit(specRows);
  if (!byUnit.size) {
    return {
      unit: requirements.initialVmUnit,
      spec: null,
      tierIndex: requirements.initialTierIndex,
      bumpedTiers: 0,
      fromSpecs: false,
    };
  }

  let tierIdx = Math.min(Math.max(0, requirements.initialTierIndex), VM_TIER_ORDER.length - 1);
  let bumped = 0;

  while (tierIdx < VM_TIER_ORDER.length) {
    const unitName = VM_TIER_ORDER[tierIdx];
    const row = byUnit.get(normalizeUnitKey(unitName));
    if (row && specRowMeetsRequirements(row, need)) {
      return {
        unit: row.UNIT,
        spec: row,
        tierIndex: tierIdx,
        bumpedTiers: bumped,
        fromSpecs: true,
      };
    }
    tierIdx += 1;
    bumped += 1;
  }

  const uls = byUnit.get('VM-ULS');
  return {
    unit: uls?.UNIT || 'VM-ULS',
    spec: uls || null,
    tierIndex: VM_TIER_ORDER.length - 1,
    bumpedTiers: bumped,
    fromSpecs: true,
  };
}

export async function loadFortigateVmSpecRows() {
  try {
    const [rows] = await sequelize.query(`SELECT * FROM fortigate_vm_specs LIMIT 500`);
    return rows || [];
  } catch (e) {
    logger.warn({ err: e?.message }, '[fortigateVM.modelSelector] loadFortigateVmSpecRows failed');
    return [];
  }
}
