/**
 * Comparación de modelos Fortinet desde tablas *_specs (datos reales en BD).
 */

import { QueryTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import { logger } from '../config/logger.js';

/** @typedef {{ key: string, label: string, higherIsBetter: boolean }} MetricDef */

/** Escape LIKE wildcards */
function escapeLike(s) {
  return String(s || '')
    .replace(/\\/g, '\\\\')
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_');
}

/**
 * Extrae un valor numérico comparable desde texto de datasheet (Gbps, Mpps, "95 / 130", etc.)
 * @param {unknown} raw
 * @returns {number|null}
 */
export function parseSpecNumber(raw) {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s || /^[—\-–n\/a]+$/i.test(s)) return null;
  const normalized = s.replace(/,/g, '.');
  const nums = normalized.match(/\d+(?:\.\d+)?/g);
  if (!nums || !nums.length) return null;
  const vals = nums.map((n) => parseFloat(n)).filter((n) => Number.isFinite(n));
  if (!vals.length) return null;
  if (/\d+(?:\.\d+)?\s*\/\s*\d+(?:\.\d+)?/.test(normalized)) {
    return Math.max(...vals);
  }
  if (/latency|ms\b|microsecond/i.test(normalized)) {
    return Math.min(...vals);
  }
  return Math.max(...vals);
}

/**
 * @param {Record<string, unknown>} row
 * @param {string} key — PascalCase o snake_case según tabla
 */
function getCell(row, key) {
  if (row == null) return null;
  if (Object.prototype.hasOwnProperty.call(row, key)) return row[key];
  const lower = key.toLowerCase();
  for (const k of Object.keys(row)) {
    if (k.toLowerCase() === lower) return row[k];
  }
  return null;
}

function displayUnit(row, config) {
  const u = getCell(row, config.unitFieldInRow) ?? getCell(row, 'UNIT') ?? getCell(row, 'unit');
  return u != null ? String(u).trim() : '';
}

/**
 * @typedef {{
 *   table: string,
 *   unitFieldInRow: string,
 *   skuField?: string|null,
 *   joinSql?: string,
 *   fromExtra?: string,
 *   metrics: MetricDef[],
 * }} SolutionCompareConfig
 */

/** @type {Record<string, SolutionCompareConfig>} */
export const SOLUTION_COMPARE_CONFIG = {
  /**
   * FortiGate: en BD suele haber UNIT/SKU en la fila; product_model_id puede ser NULL.
   * No usar solo INNER JOIN a product_models — vacía el listado. Ver findRowForModel / listUnits.
   */
  fortigate: {
    table: 'fortigate_specs',
    unitFieldInRow: 'resolved_unit',
    skuField: null,
    metrics: [
      { key: 'Firewall_Throughput_UDP', label: 'Firewall throughput (UDP)', higherIsBetter: true },
      { key: 'NGFW_Throughput_Enterprise_Mix', label: 'NGFW throughput (enterprise mix)', higherIsBetter: true },
      { key: 'Threat_Protection_Throughput', label: 'Threat protection throughput', higherIsBetter: true },
      { key: 'Concurrent_Sessions', label: 'Concurrent sessions', higherIsBetter: true },
      { key: 'New_Sessions_Per_Second', label: 'New sessions per second', higherIsBetter: true },
      { key: 'IPSec_VPN_Throughput', label: 'IPSec VPN throughput', higherIsBetter: true },
      { key: 'SSL_VPN_Throughput', label: 'SSL VPN throughput', higherIsBetter: true },
      { key: 'Virtual_Domains', label: 'Virtual domains (VDOMs)', higherIsBetter: true },
    ],
  },
  fortianalyzer: {
    table: 'fortianalyzer_specs',
    unitFieldInRow: 'UNIT',
    skuField: null,
    metrics: [
      { key: 'GB_Logs_Per_Day', label: 'GB logs / día', higherIsBetter: true },
      { key: 'Analytics_Rate_Logs_Per_Sec', label: 'Analytics rate (logs/s)', higherIsBetter: true },
      { key: 'Collector_Rate_Logs_Per_Sec', label: 'Collector rate (logs/s)', higherIsBetter: true },
      { key: 'Storage_Capacity', label: 'Storage capacity', higherIsBetter: true },
      { key: 'Total_Interfaces', label: 'Total interfaces', higherIsBetter: true },
    ],
  },
  fortimanager: {
    table: 'fortimanager_specs',
    unitFieldInRow: 'unit',
    skuField: null,
    metrics: [
      { key: 'devices_vdoms_maximum', label: 'Devices / VDOMs (máx.)', higherIsBetter: true },
      { key: 'gb_per_day', label: 'GB / día (logs)', higherIsBetter: true },
      { key: 'sustained_log_rates', label: 'Sustained log rates', higherIsBetter: true },
      { key: 'storage_capacity', label: 'Storage capacity', higherIsBetter: true },
      { key: 'total_interfaces', label: 'Total interfaces', higherIsBetter: true },
      { key: 'max_adoms', label: 'ADOMs (máx.)', higherIsBetter: true },
    ],
  },
  fortiswitch: {
    table: 'fortiswitch_specs',
    unitFieldInRow: 'unit',
    skuField: null,
    metrics: [
      { key: 'switching_capacity', label: 'Switching capacity', higherIsBetter: true },
      { key: 'total_network_interfaces', label: 'Interfaces de red', higherIsBetter: true },
      { key: 'pps_64_bytes', label: 'PPS (64 bytes)', higherIsBetter: true },
      { key: 'poe_power_budget', label: 'PoE power budget', higherIsBetter: true },
      { key: 'mac_address_storage', label: 'MAC address storage', higherIsBetter: true },
      { key: 'vlans_supported', label: 'VLANs', higherIsBetter: true },
    ],
  },
};

/**
 * @param {string} fragment — texto usuario (ej. FG-100F)
 * @param {SolutionCompareConfig} config
 */
async function findRowForModel(fragment, config) {
  const frag = String(fragment || '').trim();
  if (!frag) return null;
  const like = `%${escapeLike(frag)}%`;

  let sql;
  let replacements = [like, like];

  if (config.table === 'fortigate_specs') {
    sql = `
      SELECT fs.*, COALESCE(pm.unit, fs.\`UNIT\`) AS resolved_unit
      FROM fortigate_specs fs
      LEFT JOIN product_models pm
        ON fs.product_model_id = pm.id
        AND (pm.is_active = 1 OR pm.is_active IS NULL)
      WHERE UPPER(COALESCE(pm.unit, fs.\`UNIT\`)) LIKE UPPER(?)
         OR UPPER(COALESCE(pm.sku_base, fs.\`SKU\`)) LIKE UPPER(?)
      LIMIT 15
    `;
  } else if (config.joinSql) {
    sql = `
      SELECT \`${config.table}\`.* ${config.fromExtra || ''}
      FROM \`${config.table}\`
      ${config.joinSql}
      WHERE (UPPER(pm.unit) LIKE UPPER(?) OR UPPER(COALESCE(pm.sku_base,'')) LIKE UPPER(?))
      LIMIT 15
    `;
  } else {
    const unitCol = config.unitFieldInRow === 'UNIT' ? '`UNIT`' : '`unit`';
    const skuCol = '`SKU`';
    if (config.skuField) {
      sql = `
        SELECT * FROM \`${config.table}\`
        WHERE UPPER(${unitCol}) LIKE UPPER(?) OR UPPER(${skuCol}) LIKE UPPER(?)
        LIMIT 15
      `;
    } else {
      sql = `
        SELECT * FROM \`${config.table}\`
        WHERE UPPER(${unitCol}) LIKE UPPER(?)
        LIMIT 15
      `;
      replacements = [like];
    }
  }

  try {
    /** @type {Record<string, unknown>[]} */
    const rows = await sequelize.query(sql, {
      replacements,
      type: QueryTypes.SELECT,
    });
    if (!rows?.length) return null;
    return pickBestRow(rows, frag, config);
  } catch (e) {
    logger.warn({ err: e?.message, fragment: frag, table: config.table }, '[modelCompare] query failed');
    return null;
  }
}

/**
 * @param {Record<string, unknown>[]} rows
 * @param {string} fragment
 * @param {SolutionCompareConfig} config
 */
function pickBestRow(rows, fragment, config) {
  const f = fragment.replace(/\s/g, '').toUpperCase();
  const fAlnum = f.replace(/[^A-Z0-9]/g, '');
  let best = rows[0];
  let bestScore = -1;

  for (const row of rows) {
    const u = displayUnit(row, config).replace(/\s/g, '').toUpperCase();
    const uAlnum = u.replace(/[^A-Z0-9]/g, '');
    let score = 0;
    if (u === f || uAlnum === fAlnum) score = 1000;
    else if (u.includes(f) || uAlnum.includes(fAlnum)) score = 500 + Math.min(u.length, 50);
    else score = 100;
    if (uAlnum.endsWith(fAlnum) && fAlnum.length >= 3) score += 200;
    if (score > bestScore) {
      bestScore = score;
      best = row;
    }
  }
  return best;
}

/**
 * @param {string} solution
 * @param {string[]} models — fragmentos pedidos por el usuario
 */
export async function compareModelsFromDb(solution, models) {
  const sol = String(solution || '')
    .toLowerCase()
    .trim();
  const config = SOLUTION_COMPARE_CONFIG[sol];
  if (!config) {
    return { ok: false, error: `Solución no soportada: ${solution}` };
  }

  const frags = (models || []).map((m) => String(m).trim()).filter(Boolean);
  if (frags.length < 2) {
    return { ok: false, error: 'Se requieren al menos 2 modelos para comparar.' };
  }

  /** @type {{ fragment: string, row: Record<string, unknown>|null, unit: string }[]} */
  const resolved = [];
  const notFound = [];
  /** @type {Set<string>} */
  const seenUnits = new Set();

  for (const fragment of frags) {
    const row = await findRowForModel(fragment, config);
    if (!row) {
      notFound.push(fragment);
      resolved.push({ fragment, row: null, unit: '' });
      continue;
    }
    const unit = displayUnit(row, config) || fragment;
    if (seenUnits.has(unit)) {
      notFound.push(fragment);
      resolved.push({ fragment, row: null, unit: '' });
      continue;
    }
    seenUnits.add(unit);
    resolved.push({ fragment, row, unit });
  }

  const active = resolved.filter((r) => r.row != null);
  if (active.length < 2) {
    return {
      ok: true,
      solution: sol,
      models: frags,
      resolvedUnits: active.map((a) => a.unit),
      comparison: {},
      winner: null,
      wins: {},
      notFound,
      error:
        notFound.length === frags.length
          ? 'No se encontró ningún modelo en la base de datos con esos criterios.'
          : 'No hay suficientes modelos encontrados para comparar (mínimo 2).',
    };
  }

  const units = active.map((a) => a.unit);
  /** @type {Record<string, Record<string, unknown>>} */
  const comparison = {};
  /** @type {Record<string, number>} */
  const winCount = Object.fromEntries(units.map((u) => [u, 0]));

  for (const metric of config.metrics) {
    /** @type {Record<string, unknown>} */
    const rawVals = {};
    /** @type {Record<string, number|null>} */
    const numVals = {};
    for (const a of active) {
      const raw = getCell(a.row, metric.key);
      rawVals[a.unit] = raw ?? null;
      const n = parseSpecNumber(raw);
      numVals[a.unit] = n;
    }

    const comparable = units.filter((u) => numVals[u] != null && Number.isFinite(numVals[u]));
    let bestUnit = null;
    if (comparable.length >= 2) {
      const higher = metric.higherIsBetter !== false;
      const vals = comparable.map((u) => ({ u, v: numVals[u] }));
      vals.sort((a, b) => (higher ? b.v - a.v : a.v - b.v));
      const top = vals[0].v;
      const winners = vals.filter((x) => x.v === top).map((x) => x.u);
      if (winners.length === 1) {
        bestUnit = winners[0];
        winCount[bestUnit] += 1;
      }
    }

    comparison[metric.key] = {
      label: metric.label,
      raw: rawVals,
      numeric: numVals,
      best: bestUnit,
    };
  }

  let winner = null;
  const maxW = Math.max(...Object.values(winCount));
  const tops = units.filter((u) => winCount[u] === maxW);
  if (tops.length === 1) winner = tops[0];
  else if (tops.length > 1 && maxW > 0) winner = tops[0];

  return {
    ok: true,
    solution: sol,
    models: frags,
    resolvedUnits: units,
    comparison,
    winner,
    wins: winCount,
    notFound,
    error: null,
  };
}

/**
 * Lista de modelos (UNIT) distintos en la tabla specs — para botones de selección en el chat.
 * @param {string} solution — fortigate | fortianalyzer | …
 * @returns {Promise<string[]|null>} null si la solución no existe; [] si error o catálogo vacío
 */
export async function listUnitsForSolution(solution) {
  const sol = String(solution || '')
    .toLowerCase()
    .trim();
  const config = SOLUTION_COMPARE_CONFIG[sol];
  if (!config) return null;

  try {
    let sql;
    if (sol === 'fortigate') {
      sql = `
        SELECT DISTINCT TRIM(u) AS u FROM (
          SELECT fs.\`UNIT\` AS u
          FROM fortigate_specs fs
          WHERE fs.\`UNIT\` IS NOT NULL AND TRIM(fs.\`UNIT\`) <> ''
          UNION
          SELECT pm.unit AS u
          FROM fortigate_specs fs
          INNER JOIN product_models pm ON fs.product_model_id = pm.id
            AND (pm.is_active = 1 OR pm.is_active IS NULL)
          WHERE pm.unit IS NOT NULL AND TRIM(pm.unit) <> ''
        ) AS t
        WHERE t.u IS NOT NULL AND TRIM(t.u) <> ''
        ORDER BY u ASC
        LIMIT 500
      `;
    } else {
      const col = config.unitFieldInRow === 'UNIT' ? 'UNIT' : 'unit';
      sql = `
        SELECT DISTINCT TRIM(\`${col}\`) AS u
        FROM \`${config.table}\`
        WHERE \`${col}\` IS NOT NULL AND TRIM(\`${col}\`) <> ''
        ORDER BY u ASC
        LIMIT 500
      `;
    }

    const rows = await sequelize.query(sql, { type: QueryTypes.SELECT });
    const units = (rows || [])
      .map((r) => getCell(r, 'u') ?? r?.u ?? r?.U)
      .filter((x) => x != null && String(x).trim() !== '')
      .map((u) => String(u).trim());
    return [...new Set(units)];
  } catch (e) {
    logger.warn(
      `[modelCompare] listUnitsForSolution failed (${sol}): ${e?.message || e}`,
    );
    return [];
  }
}

export default {
  compareModelsFromDb,
  parseSpecNumber,
  SOLUTION_COMPARE_CONFIG,
  listUnitsForSolution,
};
