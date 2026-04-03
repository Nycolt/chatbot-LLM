import { DataTypes } from 'sequelize';
import { sequelize } from '../../config/database.js';
import { extractTextFromPdfBuffer } from '../datasheetPdf/pdfExtract.service.js';
import normalizeUnit from '../../utils/normalizeUnit.js';
import { upsertSpecs } from '../../utils/specUpsert.utils.js';

const FortigateVmPdfSpec =
  sequelize.models.FortigateVmPdfSpec ||
  sequelize.define(
    'FortigateVmPdfSpec',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      product_model_id: { type: DataTypes.INTEGER, allowNull: true },
      UNIT: { type: DataTypes.STRING(64), allowNull: false },
      vCPU_Support: { type: DataTypes.STRING(128), allowNull: true },
      Storage_Support: { type: DataTypes.STRING(128), allowNull: true },
      Firewall_Policies: { type: DataTypes.STRING(128), allowNull: true },
      Virtual_Domains: { type: DataTypes.STRING(128), allowNull: true },
      Max_Wireless_AP: { type: DataTypes.STRING(128), allowNull: true },
      Max_FortiSwitches: { type: DataTypes.STRING(128), allowNull: true },
      Max_Endpoints: { type: DataTypes.STRING(128), allowNull: true },
      Unlimited_User_License: { type: DataTypes.STRING(128), allowNull: true },
    },
    {
      tableName: 'fortigate_vm_specs',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  );

const MODEL_REGEX = /VM-(?:\d{2}S|ULS)/gi;

const ROW_DEFS = [
  {
    source: 'vCPU Support (Minimum / Maximum)',
    target: 'vCPU_Support',
    aliases: ['vCPU Support (Minimum / Maximum)', 'vCPU Support Minimum / Maximum'],
    labelRegex: 'vCPU\\s+Support\\s+\\(Minimum\\s*\\/\\s*Maximum\\)',
  },
  {
    source: 'Storage Support (Minimum / Maximum)',
    target: 'Storage_Support',
    aliases: ['Storage Support (Minimum / Maximum)', 'Storage Support Minimum / Maximum'],
    labelRegex: 'Storage\\s+Support\\s+\\(Minimum\\s*\\/\\s*Maximum\\)',
  },
  {
    source: 'Firewall Policies',
    target: 'Firewall_Policies',
    aliases: ['Firewall Policies'],
    labelRegex: 'Firewall\\s+Policies',
  },
  {
    source: 'Virtual Domains (Default / Maximum)',
    target: 'Virtual_Domains',
    aliases: ['Virtual Domains (Default / Maximum)', 'Virtual Domains Default / Maximum'],
    labelRegex: 'Virtual\\s+Domains\\s+\\(Default\\s*\\/\\s*Maximum\\)\\s*\\*?',
  },
  {
    source: 'Maximum Number of Wireless Access Points Controlled',
    target: 'Max_Wireless_AP',
    aliases: [
      'Maximum Number of Wireless Access Points Controlled',
      'Maximum Number of Wireless Access Points',
    ],
    labelRegex:
      'Maximum\\s+Number\\s+of\\s+Wireless\\s+Access\\s+Points\\s+Controlled\\s+\\(Tunnel\\s*\\/\\s*Global\\)',
  },
  {
    source: 'Maximum Number of FortiSwitches',
    target: 'Max_FortiSwitches',
    aliases: ['Maximum Number of FortiSwitches'],
    labelRegex: 'Maximum\\s+Number\\s+of\\s+FortiSwitches',
  },
  {
    source: 'Maximum Number of Registered Endpoints',
    target: 'Max_Endpoints',
    aliases: ['Maximum Number of Registered Endpoints', 'Maximum Number of Endpoints'],
    labelRegex: 'Maximum\\s+Number\\s+of\\s+Registered\\s+Endpoints',
  },
  {
    source: 'Unlimited User License',
    target: 'Unlimited_User_License',
    aliases: ['Unlimited User License'],
    labelRegex: 'Unlimited\\s+User\\s+License',
  },
];

const SLASH_VALUE_KEYS = new Set(['vCPU_Support', 'Storage_Support', 'Virtual_Domains']);

const ROW_SPECIFIC_VALUE_PATTERNS = {
  vCPU_Support: [
    /1\s*\/\s*unlimited/gi,
    /1\s*\/\s*32/gi,
    /1\s*\/\s*16/gi,
    /1\s*\/\s*8/gi,
    /1\s*\/\s*4/gi,
    /1\s*\/\s*2/gi,
    /1\s*\/\s*1/gi,
  ],
  Storage_Support: [/\d+\s*GB\s*\/\s*\d+\s*TB/gi],
  Firewall_Policies: [/200\s*000/gi, /20\s*000/gi, /10\s*000/gi],
  Virtual_Domains: [/2\s*\/\s*500/gi, /2\s*\/\s*50/gi, /2\s*\/\s*25/gi, /2\s*\/\s*10/gi],
  Max_Wireless_AP: [/1024\s*\/\s*4096/gi, /512\s*\/\s*1024/gi, /32\s*\/\s*64/gi],
  Max_FortiSwitches: [/300/gi, /64/gi, /24/gi, /8/gi],
  Max_Endpoints: [/20\s*000/gi, /8\s*000/gi, /8000/gi, /2\s*000/gi, /2000/gi],
  Unlimited_User_License: [/Yes/gi],
};

function normalizeWhitespace(text) {
  return String(text || '')
    .replace(/\r/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/⃝/g, ' ')
    .replace(/[✓✔☑■]/g, ' Yes ')
    .replace(/[•·]/g, ' ')
    .replace(/[|]/g, ' ')
    .replace(/\t/g, '  ');
}

function normalizeLabelText(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[()]/g, ' ')
    .replace(/[^a-z0-9/ ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function sanitizeSpecValue(value) {
  return String(value || '')
    .replace(/⃝/g, ' ')
    .replace(/[✓✔☑■]/g, 'Yes')
    .replace(/[|]/g, ' ')
    .replace(/\s*\/\s*/g, ' / ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractVmUnits(text) {
  const matches = String(text || '').match(MODEL_REGEX) || [];
  return [...new Set(matches.map((m) => m.toUpperCase()))];
}

function extractTableBlock(text) {
  const match = String(text || '').match(/Specifications([\s\S]*?)Note:\s*All performance values/i);
  if (!match?.[1]) {
    throw new Error('No se detectó el bloque de especificaciones FortiGate VM en el PDF.');
  }
  return match[1];
}

function locateRowSections(text) {
  const block = extractTableBlock(normalizeWhitespace(text));
  const sections = {};

  for (let idx = 0; idx < ROW_DEFS.length; idx += 1) {
    const def = ROW_DEFS[idx];
    const next = ROW_DEFS[idx + 1];
    const pattern = new RegExp(
      `${def.labelRegex}\\s*([\\s\\S]*?)(?=${next ? next.labelRegex : 'Note:\\s*All performance values|$'})`,
      'i',
    );
    const match = block.match(pattern);
    if (!match?.[1]) {
      throw new Error(`No se detectó la fila "${def.source}" en el PDF de FortiGate VM.`);
    }
    sections[def.target] = match[1].trim();
  }

  return sections;
}

function extractSlashValues(segment, modelCount) {
  const prepared = sanitizeSpecValue(segment);
  const matches =
    prepared.match(
      /Unlimited|Yes|No|[\dA-Za-z.,]+\s*(?:GB|TB|MB)?\s*\/\s*[\dA-Za-z.,]+\s*(?:GB|TB|MB)?/gi,
    ) || [];
  return matches.map(sanitizeSpecValue).slice(0, modelCount);
}

function extractLineValues(segment, modelCount) {
  const lines = normalizeWhitespace(segment)
    .split('\n')
    .map((line) => sanitizeSpecValue(line))
    .filter(Boolean);

  if (lines.length >= modelCount) {
    return lines.slice(0, modelCount);
  }

  const wideSplit = normalizeWhitespace(segment)
    .split(/\s{2,}/)
    .map((part) => sanitizeSpecValue(part))
    .filter(Boolean);

  if (wideSplit.length >= modelCount) {
    return wideSplit.slice(0, modelCount);
  }

  return [];
}

function extractGeneralValues(segment, modelCount) {
  const prepared = sanitizeSpecValue(segment);
  const lines = extractLineValues(prepared, modelCount);
  if (lines.length >= modelCount) return lines;

  const matches = prepared.match(/Unlimited|Yes|No|[\d][\d ,A-Za-z-]*/g) || [];
  return matches.map(sanitizeSpecValue).filter(Boolean).slice(0, modelCount);
}

function extractBySpecificPatterns(targetKey, segment, modelCount) {
  const patterns = ROW_SPECIFIC_VALUE_PATTERNS[targetKey];
  if (!patterns?.length) return [];

  const prepared = normalizeWhitespace(segment);
  const matches = [];
  for (const pattern of patterns) {
    const found = [...prepared.matchAll(pattern)];
    matches.push(
      ...found.map((m) => ({
        value: sanitizeSpecValue(m[0]),
        index: m.index ?? 0,
        end: (m.index ?? 0) + String(m[0] || '').length,
        length: String(m[0] || '').length,
      })),
    );
  }

  const ordered = matches.sort((a, b) => {
    if (a.index !== b.index) return a.index - b.index;
    return b.length - a.length;
  });

  const selected = [];
  let lastEnd = -1;
  for (const match of ordered) {
    if (match.index < lastEnd) continue;
    selected.push(match.value);
    lastEnd = match.end;
    if (selected.length >= modelCount) break;
  }

  return selected.slice(0, modelCount);
}

function extractValuesForRow(targetKey, segment, modelCount) {
  const rowSpecific = extractBySpecificPatterns(targetKey, segment, modelCount);
  if (rowSpecific.length >= modelCount) return rowSpecific.slice(0, modelCount);

  if (SLASH_VALUE_KEYS.has(targetKey)) {
    const slashValues = extractSlashValues(segment, modelCount);
    if (slashValues.length >= modelCount) return slashValues.slice(0, modelCount);
  }

  const lineValues = extractLineValues(segment, modelCount);
  if (lineValues.length >= modelCount) return lineValues.slice(0, modelCount);

  const generalValues = extractGeneralValues(segment, modelCount);
  if (generalValues.length >= modelCount) return generalValues.slice(0, modelCount);

  throw new Error(`No se pudieron extraer ${modelCount} valores para "${targetKey}" desde el PDF.`);
}

export function mapTableToRecords(tableData) {
  const models = Array.isArray(tableData?.models) ? tableData.models : [];
  const rows = tableData?.rows && typeof tableData.rows === 'object' ? tableData.rows : {};

  if (!models.length) {
    throw new Error('No se detectaron modelos VM en la tabla del PDF.');
  }

  return models.map((unit, index) => {
    const record = {
      UNIT: unit,
      vCPU_Support: null,
      Storage_Support: null,
      Firewall_Policies: null,
      Virtual_Domains: null,
      Max_Wireless_AP: null,
      Max_FortiSwitches: null,
      Max_Endpoints: null,
      Unlimited_User_License: null,
    };

    for (const def of ROW_DEFS) {
      const values = Array.isArray(rows[def.target]) ? rows[def.target] : [];
      record[def.target] = values[index] != null ? sanitizeSpecValue(values[index]) : null;
    }

    return record;
  });
}

export async function extractFortigateVMSpecsFromPDF(fileBuffer) {
  const { text } = await extractTextFromPdfBuffer(fileBuffer);
  const normalizedText = normalizeWhitespace(text);
  const models = extractVmUnits(normalizedText);

  if (!models.length) {
    throw new Error('No se detectó la tabla de modelos FortiGate VM en el PDF.');
  }

  const rowSections = locateRowSections(normalizedText);
  const tableData = {
    models,
    rows: Object.fromEntries(
      ROW_DEFS.map((def) => [
        def.target,
        extractValuesForRow(def.target, rowSections[def.target] || '', models.length),
      ]),
    ),
  };

  return mapTableToRecords(tableData);
}

export async function saveFortigateVMSpecs(records, options = {}) {
  const { transaction } = options;
  const list = Array.isArray(records) ? records : [];
  const prepared = [];

  for (const record of list) {
    const unit = normalizeUnit(sanitizeSpecValue(record.UNIT));
    if (!unit) continue;
    prepared.push({
      UNIT: unit,
      vCPU_Support: sanitizeSpecValue(record.vCPU_Support),
      Storage_Support: sanitizeSpecValue(record.Storage_Support),
      Firewall_Policies: sanitizeSpecValue(record.Firewall_Policies),
      Virtual_Domains: sanitizeSpecValue(record.Virtual_Domains),
      Max_Wireless_AP: sanitizeSpecValue(record.Max_Wireless_AP),
      Max_FortiSwitches: sanitizeSpecValue(record.Max_FortiSwitches),
      Max_Endpoints: sanitizeSpecValue(record.Max_Endpoints),
      Unlimited_User_License: sanitizeSpecValue(record.Unlimited_User_License),
    });
  }

  const instances = await upsertSpecs(FortigateVmPdfSpec, prepared, {
    transaction,
    unitField: 'UNIT',
    mergeSku: false,
  });

  return instances.map((m) => m.get({ plain: true }));
}

export default {
  extractFortigateVMSpecsFromPDF,
  mapTableToRecords,
  saveFortigateVMSpecs,
};
