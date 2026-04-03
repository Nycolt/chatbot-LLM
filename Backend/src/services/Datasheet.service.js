import { sequelize } from '../config/database.js';
import { logger } from '../config/logger.js';
import { Datasheet } from '../models/Datasheet.model.js';
import FortigateSpecs from '../models/FortigateSpecs.model.js';
import Solution from '../models/Solution.model.js';
import TransactSQL from './TransactSQL.js';
import { bulkCreate, bulkCreateInChunks } from '../utils/bulk.utils.js';
import {
  upsertSpecs,
  dedupeRecordsByUnit,
  findDuplicateSpecUnits,
} from '../utils/specUpsert.utils.js';
import { isFortigateUnitOrSkuRow } from './fortigate/fortigateSpecRowMap.js';
import { getDatasheetRowsByUnitPreferCatalog } from './fortigate/fortigateSpecsSizing.service.js';

class DatasheetService {
  /**
   * Carga masiva desde Excel/API.
   * - Filas FortiGate → tabla `fortigate_specs` (mismo esquema que la antigua `Datasheet`).
   * - Resto → tabla `Datasheet`.
   */
  async bulkCreateDatasheets(datasheets, options = {}) {
    const { useChunks = false, chunkSize = 500 } = options;

    if (!Array.isArray(datasheets) || datasheets.length === 0) {
      return [];
    }

    const fortigateSolution = await Solution.findOne({
      where: { code: 'fortigate', is_active: 1 },
    });

    const fgRows = datasheets.filter(isFortigateUnitOrSkuRow);
    const otherRows = datasheets.filter(r => !isFortigateUnitOrSkuRow(r));

    // Sin solución fortigate en BD: todo va a Datasheet (no perder carga)
    if (!fortigateSolution) {
      const merged = [...datasheets];
      if (useChunks && merged.length > chunkSize) {
        return bulkCreateInChunks(Datasheet, merged, chunkSize);
      }
      return bulkCreate(Datasheet, merged, { validate: true });
    }

    const out = [];

    await sequelize.transaction(async (transaction) => {
      if (fgRows.length) {
        const deduped = dedupeRecordsByUnit(fgRows, 'UNIT');
        if (useChunks && deduped.length > chunkSize) {
          for (let i = 0; i < deduped.length; i += chunkSize) {
            const chunk = deduped.slice(i, i + chunkSize);
            const saved = await upsertSpecs(FortigateSpecs, chunk, {
              transaction,
              unitField: 'UNIT',
            });
            out.push(...saved);
          }
        } else {
          const saved = await upsertSpecs(FortigateSpecs, deduped, {
            transaction,
            unitField: 'UNIT',
          });
          out.push(...saved);
        }
      }

      if (otherRows.length) {
        if (useChunks && otherRows.length > chunkSize) {
          for (let i = 0; i < otherRows.length; i += chunkSize) {
            const chunk = otherRows.slice(i, i + chunkSize);
            const created = await bulkCreate(Datasheet, chunk, { validate: true, transaction });
            out.push(...created);
          }
        } else {
          const created = await bulkCreate(Datasheet, otherRows, { validate: true, transaction });
          out.push(...created);
        }
      }
    });

    if (fgRows.length) {
      try {
        const dups = await findDuplicateSpecUnits(FortigateSpecs, 'UNIT');
        if (dups.length) {
          logger.warn(
            { duplicates: dups },
            '[Datasheet] fortigate_specs: se detectaron UNIT duplicados tras la carga (revisar índice único y datos)',
          );
        }
      } catch (e) {
        logger.debug({ err: e?.message }, '[Datasheet] validación duplicados omitida');
      }
    }

    return out;
  }

  /**
   * Antes ejecutaba SP `DebbugDatasheets` sobre `DatasheetTemporal`. Obsoleto.
   */
  async syncDatasheetsFromTemp() {
    return {
      message:
        'Omitido: la carga masiva escribe en fortigate_specs (FortiGate) y Datasheet (resto).',
      inserted: 0,
      updated: 0,
      deleted: 0,
    };
  }

  async getDatasheetByUnit(unit) {
    if (!unit || typeof unit !== 'string' || unit.trim() === '') {
      throw new Error('El parámetro UNIT es requerido y debe ser una cadena válida');
    }

    const trimmed = unit.trim();

    return getDatasheetRowsByUnitPreferCatalog(trimmed, async () => {
      const result = await TransactSQL.singleQuery('GetDatasheetByUnit', [trimmed]);
      return result || [];
    });
  }

  async getAllDatasheets() {
    const [fg, legacy] = await Promise.all([
      FortigateSpecs.findAll({ raw: true }),
      Datasheet.findAll({ raw: true }),
    ]);
    return [...(fg || []), ...(legacy || [])];
  }
}

export default new DatasheetService();
