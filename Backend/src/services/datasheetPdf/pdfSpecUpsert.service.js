/**
 * Upsert en tablas *_specs por `product_model_id` (no FortiGate / no FortiWiFi matrix) o por UNIT.
 * FortiGate PDF: clave `UNIT`. FortiWiFi (genérico): `fortiwifi_specs` por `UNIT` derivado de `product_models.unit`.
 */

import ProductModel from '../../models/ProductModel.model.js';
import FortigateSpecs from '../../models/FortigateSpecs.model.js';
import normalizeUnit from '../../utils/normalizeUnit.js';
import {
  FortigateVmSpec,
  FortiwifiSpec,
  FortianalyzerSpec,
  FortimanagerSpec,
  FortiswitchSpec,
  FortiapSpec,
  FortimailSpec,
  FortiwebSpec,
} from '../../models/SolutionSpecs.models.js';

/** Claves internas del extractor PDF → columnas `fortigate_specs` (PascalCase). */
const FORTIGATE_PDF_METRIC_TO_PASCAL = {
  firewall_throughput_udp: 'Firewall_Throughput_UDP',
  ipsec_vpn_throughput: 'IPSec_VPN_Throughput',
  ips_throughput_enterprise_mix: 'IPS_Throughput_Enterprise_Mix',
  ngfw_throughput_enterprise_mix: 'NGFW_Throughput_Enterprise_Mix',
  threat_protection_throughput: 'Threat_Protection_Throughput',
  concurrent_sessions: 'Concurrent_Sessions',
  new_sessions_per_second: 'New_Sessions_Per_Second',
  firewall_policies: 'Firewall_Policies',
  max_ipsec_gw_tunnels: 'Max_Gateway_To_Gateway_IPSec_Tunnels',
  max_ipsec_client_tunnels: 'Max_Client_To_Gateway_IPSec_Tunnels',
  ssl_vpn_throughput: 'SSL_VPN_Throughput',
  concurrent_ssl_vpn_users: 'Concurrent_SSL_VPN_Users',
  virtual_domains: 'Virtual_Domains',
  form_factor: 'Form_Factor',
};

const SPEC_MODEL_BY_SOLUTION = {
  fortigate_vm: FortigateVmSpec,
  fortiwifi: FortiwifiSpec,
  fortianalyzer: FortianalyzerSpec,
  fortimanager: FortimanagerSpec,
  fortiswitch: FortiswitchSpec,
  fortiap: FortiapSpec,
  fortimail: FortimailSpec,
  fortiweb: FortiwebSpec,
};

/**
 * @param {string} solutionType
 * @returns {import('sequelize').Model | null}
 */
export function getSpecSequelizeModel(solutionType) {
  return SPEC_MODEL_BY_SOLUTION[solutionType] ?? null;
}

/**
 * @param {object} params
 * @param {string} params.solutionType
 * @param {number} params.productModelId
 * @param {Record<string, string>} params.metrics
 * @param {import('sequelize').Transaction} [params.transaction]
 * @returns {Promise<{ created: boolean, updated: boolean, fields_touched: string[] }>}
 */
export async function upsertTechnicalSpecForModel({ solutionType, productModelId, metrics, transaction }) {
  if (solutionType === 'fortigate') {
    return upsertFortigateSpecsFromPdfMetrics({ productModelId, metrics, transaction });
  }

  const Model = getSpecSequelizeModel(solutionType);
  if (!Model || !metrics || Object.keys(metrics).length === 0) {
    return { created: false, updated: false, fields_touched: [] };
  }

  const cleaned = {};
  for (const [k, v] of Object.entries(metrics)) {
    if (v == null) continue;
    const s = String(v).trim();
    if (!s) continue;
    cleaned[k] = s.slice(0, 255);
  }
  if (Object.keys(cleaned).length === 0) {
    return { created: false, updated: false, fields_touched: [] };
  }

  if (solutionType === 'fortiwifi') {
    const pm = await ProductModel.findByPk(productModelId, { transaction });
    if (!pm) return { created: false, updated: false, fields_touched: [] };
    const unit = normalizeUnit(pm.unit);
    if (!unit) return { created: false, updated: false, fields_touched: [] };
    const defaults = { UNIT: unit, ...cleaned };
    const [row, created] = await Model.findOrCreate({
      where: { UNIT: unit },
      defaults,
      transaction,
    });
    if (created) {
      return { created: true, updated: false, fields_touched: Object.keys(cleaned) };
    }
    const updates = {};
    for (const [k, v] of Object.entries(cleaned)) {
      if (k === 'UNIT') continue;
      const cur = row.get(k);
      if (cur == null || String(cur).trim() === '') updates[k] = v;
    }
    if (Object.keys(updates).length === 0) {
      return { created: false, updated: false, fields_touched: [] };
    }
    await row.update(updates, { transaction });
    return { created: false, updated: true, fields_touched: Object.keys(updates) };
  }

  if (solutionType === 'fortianalyzer') {
    const pm = await ProductModel.findByPk(productModelId, { transaction });
    if (!pm) return { created: false, updated: false, fields_touched: [] };
    const unit = normalizeUnit(pm.unit);
    if (!unit) return { created: false, updated: false, fields_touched: [] };
    const defaults = { UNIT: unit, ...cleaned };
    const [row, created] = await Model.findOrCreate({
      where: { UNIT: unit },
      defaults,
      transaction,
    });
    if (created) {
      return { created: true, updated: false, fields_touched: Object.keys(cleaned) };
    }
    const updates = {};
    for (const [k, v] of Object.entries(cleaned)) {
      if (k === 'UNIT') continue;
      const cur = row.get(k);
      if (cur == null || String(cur).trim() === '') updates[k] = v;
    }
    if (Object.keys(updates).length === 0) {
      return { created: false, updated: false, fields_touched: [] };
    }
    await row.update(updates, { transaction });
    return { created: false, updated: true, fields_touched: Object.keys(updates) };
  }

  if (solutionType === 'fortiswitch') {
    const pm = await ProductModel.findByPk(productModelId, { transaction });
    if (!pm) return { created: false, updated: false, fields_touched: [] };
    const unit = normalizeUnit(pm.unit);
    if (!unit) return { created: false, updated: false, fields_touched: [] };
    const defaults = { unit, product_model_id: productModelId, ...cleaned };
    const [row, created] = await Model.findOrCreate({
      where: { unit },
      defaults,
      transaction,
    });
    if (created) {
      return { created: true, updated: false, fields_touched: Object.keys(cleaned) };
    }
    const updates = {};
    if (row.get('product_model_id') == null) {
      updates.product_model_id = productModelId;
    }
    for (const [k, v] of Object.entries(cleaned)) {
      if (k === 'unit' || k === 'product_model_id') continue;
      const cur = row.get(k);
      if (cur == null || String(cur).trim() === '') updates[k] = v;
    }
    if (Object.keys(updates).length === 0) {
      return { created: false, updated: false, fields_touched: [] };
    }
    await row.update(updates, { transaction });
    return { created: false, updated: true, fields_touched: Object.keys(updates) };
  }

  const defaults = { product_model_id: productModelId, ...cleaned };

  const [row, created] = await Model.findOrCreate({
    where: { product_model_id: productModelId },
    defaults,
    transaction,
  });

  if (created) {
    return { created: true, updated: false, fields_touched: Object.keys(cleaned) };
  }

  const updates = {};
  for (const [k, v] of Object.entries(cleaned)) {
    const cur = row.get(k);
    if (cur == null || String(cur).trim() === '') updates[k] = v;
  }

  if (Object.keys(updates).length === 0) {
    return { created: false, updated: false, fields_touched: [] };
  }

  await row.update(updates, { transaction });
  return { created: false, updated: true, fields_touched: Object.keys(updates) };
}

async function upsertFortigateSpecsFromPdfMetrics({ productModelId, metrics, transaction }) {
  const pm = await ProductModel.findByPk(productModelId, { transaction });
  if (!pm || !metrics || Object.keys(metrics).length === 0) {
    return { created: false, updated: false, fields_touched: [] };
  }

  const cleaned = {};
  for (const [k, v] of Object.entries(metrics)) {
    if (v == null) continue;
    const s = String(v).trim();
    if (!s) continue;
    cleaned[k] = s.slice(0, 255);
  }
  if (Object.keys(cleaned).length === 0) {
    return { created: false, updated: false, fields_touched: [] };
  }

  const unit = normalizeUnit(pm.unit);
  if (!unit) {
    return { created: false, updated: false, fields_touched: [] };
  }
  const sku =
    pm.sku_base != null && String(pm.sku_base).trim() !== ''
      ? String(pm.sku_base).trim()
      : unit;

  const row = { UNIT: unit, SKU: sku };
  for (const [snake, val] of Object.entries(cleaned)) {
    const pascal = FORTIGATE_PDF_METRIC_TO_PASCAL[snake];
    if (pascal) row[pascal] = val;
  }

  const existing = await FortigateSpecs.findOne({
    where: { UNIT: unit },
    transaction,
  });

  if (existing) {
    const updates = {};
    const touched = [];
    for (const [k, v] of Object.entries(row)) {
      if (k === 'UNIT') continue;
      if (v != null && String(v).trim() !== '') {
        updates[k] = v;
        touched.push(k);
      }
    }
    if (Object.keys(updates).length === 0) {
      return { created: false, updated: false, fields_touched: [] };
    }
    await existing.update(updates, { transaction });
    console.log({
      action: 'UPSERT',
      table: 'fortigate_specs',
      unit,
      operation: 'UPDATE',
      source: 'pdf_metrics',
    });
    return { created: false, updated: true, fields_touched: touched };
  }

  await FortigateSpecs.create(row, { transaction });
  console.log({
    action: 'UPSERT',
    table: 'fortigate_specs',
    unit,
    operation: 'INSERT',
    source: 'pdf_metrics',
  });
  return {
    created: true,
    updated: false,
    fields_touched: Object.keys(row).filter((k) => k !== 'UNIT' && k !== 'SKU'),
  };
}
