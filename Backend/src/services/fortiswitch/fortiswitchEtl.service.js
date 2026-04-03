/**
 * ETL: filas limpias → product_models + fortiswitch_specs (UPSERT por unit).
 */

import { sequelize } from '../../config/database.js';
import Solution from '../../models/Solution.model.js';
import ProductModel from '../../models/ProductModel.model.js';
import { FortiswitchSpec } from '../../models/SolutionSpecs.models.js';
import { cleanFortiswitchRecord } from './fortiswitchCleaner.service.js';

const SPEC_COLUMNS = [
  'total_network_interfaces',
  'poe_ports',
  'poe_power_budget',
  'switching_capacity',
  'pps_64_bytes',
  'mac_address_storage',
  'vlans_supported',
  'lag_group_size',
  'lag_total_groups',
  'power_consumption',
  'power_supply',
  'heat_dissipation',
  'operating_temp',
  'humidity',
  'form_factor',
  'uplink',
];

function buildSpecPayload(cleaned) {
  const payload = {};
  for (const k of SPEC_COLUMNS) {
    payload[k] = cleaned[k] ?? null;
  }
  return payload;
}

/**
 * @param {Array<Record<string, unknown>>} rawRows — salida de fortiswitchParser (antes validación)
 * @param {object} [options]
 * @param {import('sequelize').Transaction} [options.transaction]
 * @returns {Promise<Array<{ unit: string, created: boolean, id: number, product_model_id: number }>>}
 */
export async function upsertFortiswitchRecordsFromParsedRows(rawRows, options = {}) {
  const { transaction: externalTransaction } = options;

  const exec = async (transaction) => {
    const solution = await Solution.findOne({
      where: { code: 'fortiswitch', is_active: 1 },
      transaction,
    });
    if (!solution) {
      throw new Error(
        'fortiswitchEtl: no hay fila activa en solutions con code=fortiswitch. Créela antes de importar.',
      );
    }

    const list = Array.isArray(rawRows) ? rawRows : [];
    const results = [];

    for (const raw of list) {
      const cleaned = cleanFortiswitchRecord(raw);
      if (!cleaned.unit) {
        console.log('[fortiswitchEtl] omitiendo fila sin unit válida');
        continue;
      }

      const payload = buildSpecPayload(cleaned);
      console.log('[fortiswitchEtl] upsert unit=', cleaned.unit);

      const [pm, pmCreated] = await ProductModel.findOrCreate({
        where: { solution_id: solution.id, unit: cleaned.unit },
        defaults: {
          solution_id: solution.id,
          solution_type: 'fortiswitch',
          unit: cleaned.unit,
          sku_base: null,
          model_name: cleaned.unit,
          family_name: 'FortiSwitch',
          deployment_type: 'appliance',
          has_datasheet: true,
          source_origin: 'pdf',
          technical_completeness_status: 'verified',
          is_active: 1,
        },
        transaction,
      });

      await pm.update({ has_datasheet: true }, { transaction });

      const [spec, specCreated] = await FortiswitchSpec.findOrCreate({
        where: { unit: cleaned.unit },
        defaults: {
          unit: cleaned.unit,
          product_model_id: pm.id,
          ...payload,
        },
        transaction,
      });

      if (!specCreated) {
        await spec.update(
          {
            product_model_id: pm.id,
            ...payload,
          },
          { transaction },
        );
      }

      console.log(
        '[fortiswitchEtl] unit=',
        cleaned.unit,
        'specCreated=',
        specCreated,
        'pmCreated=',
        pmCreated,
        'specId=',
        spec.id,
      );

      results.push({
        unit: cleaned.unit,
        created: specCreated,
        id: spec.id,
        product_model_id: pm.id,
        product_model_created: pmCreated,
      });
    }

    return results;
  };

  if (externalTransaction) {
    return exec(externalTransaction);
  }
  return sequelize.transaction(exec);
}

export default { upsertFortiswitchRecordsFromParsedRows };
