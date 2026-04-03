/**
 * Servicio de orquestación: carga completa de lista oficial de precios Fortinet.
 * Flujo: crear batch → parsear Excel → cargar staging → ETL → actualizar estado.
 */

import PriceUploadBatch from '../models/PriceUploadBatch.model.js';
import PriceListStaging from '../models/PriceListStaging.model.js';
import { parsePriceListExcel } from './priceListParser.service.js';
import { processBatchToSolutionOffers } from './priceListEtl.service.js';
import { bulkCreate, bulkCreateInChunks } from '../utils/bulk.utils.js';
import ProductService from './product.service.js';
const CHUNK_SIZE = 500;

/**
 * Inserta filas en price_list_staging; usa chunks si hay muchas filas.
 * @param {number} batchId
 * @param {Array<{ unit, sku, description, price, contract_1y, contract_3y, contract_5y, row_index }>} rows
 */
async function insertStagingRows(batchId, rows) {
  const payload = rows.map((r) => ({
    batch_id: batchId,
    unit: r.unit ?? null,
    sku: r.sku ?? null,
    description: r.description ?? null,
    price: r.price ?? null,
    contract_1y: r.contract_1y ?? null,
    contract_3y: r.contract_3y ?? null,
    contract_5y: r.contract_5y ?? null,
    row_index: r.row_index ?? null,
  }));

  if (payload.length > CHUNK_SIZE) {
    await bulkCreateInChunks(PriceListStaging, payload, CHUNK_SIZE);
  } else if (payload.length > 0) {
    await bulkCreate(PriceListStaging, payload, { validate: true });
  }
}

function limitTo(value, maxLen) {
  if (value == null) return null;
  const s = String(value).trim();
  if (s === '') return null;
  return s.length > maxLen ? s.slice(0, maxLen) : s;
}

function mapRowsToProductTemporal(rows) {
  // Convertimos filas parseadas de la price-list al formato ProductoTemporal
  return (rows || [])
    .filter((r) => r?.unit != null && String(r.unit).trim() !== '' && r?.sku != null && String(r.sku).trim() !== '')
    .filter((r) => {
      // Si el Excel vino sin precios (ni contratos), evitamos sobrescribir con null en DebbugProductos.
      return r.price != null || r.contract_1y != null || r.contract_3y != null || r.contract_5y != null;
    })
    .map((r) => ({
      UNIT: String(r.unit).trim(),
      SKU: String(r.sku).trim(),
      Familia: r.sheet_name ? String(r.sheet_name).trim() : 'Fortinet',
      Descripcion: r.description != null ? String(r.description).trim() : null,
      Price: limitTo(r.price, 20),
      OneYearContract: limitTo(r.contract_1y, 20),
      ThirdYearContract: limitTo(r.contract_3y, 20),
      FiveYearContract: limitTo(r.contract_5y, 20),
    }));
}

/**
 * Flujo completo de carga de lista de precios.
 * Crea batch, parsea Excel, carga staging, ejecuta ETL y actualiza estado del batch.
 *
 * @param {object} params
 * @param {Buffer} params.fileBuffer - Buffer del archivo .xlsx
 * @param {string} params.fileName - Nombre original del archivo
 * @param {number|null} [params.uploadedBy] - ID de usuario (Usuario.id)
 * @param {string} [params.sourceType] - Tipo de origen (default: 'fortinet_official')
 * @returns {Promise<{ batch_id: number, file_name: string, row_count: number|null, etl_summary: object|null, status: string, error_message?: string }>}
 */
export async function uploadPriceListFile({ fileBuffer, fileName, uploadedBy, sourceType }) {
  const sourceTypeVal = sourceType || 'fortinet_official';

  const batch = await PriceUploadBatch.create({
    file_name: fileName,
    uploaded_by: uploadedBy ?? null,
    status: 'uploaded',
    is_active: 1,
    source_type: sourceTypeVal,
  });

  try {
    // 2. Parsear Excel
    const rows = await parsePriceListExcel(fileBuffer);
    const rowCount = rows.length;

    // 2b) Actualizar Producto/ProductoTemporal para que el chatbot vea precios nuevos
    const productTemporalRows = mapRowsToProductTemporal(rows);
    if (productTemporalRows.length > 0) {
      await ProductService.bulkCreateProducts(productTemporalRows, { useChunks: true, chunkSize: CHUNK_SIZE });
    }

    // 3. Cargar staging (aunque sean 0 filas, dejamos trazabilidad)
    await insertStagingRows(batch.id, rows);

    // 4. Actualizar batch: row_count y staging_loaded
    batch.row_count = rowCount;
    batch.status = 'staging_loaded';
    await batch.save();

    // 5. Marcar como procesando y ejecutar ETL
    batch.status = 'processing';
    await batch.save();

    const etlSummary = await processBatchToSolutionOffers(batch.id);

    // 6. Completado (catálogo product_models + FKs: dentro del ETL)
    batch.status = 'completed';
    await batch.save();

    return {
      batch_id: batch.id,
      file_name: batch.file_name,
      row_count: batch.row_count,
      etl_summary: etlSummary,
      status: batch.status,
    };
  } catch (err) {
    batch.status = 'failed';
    batch.error_message = err?.message ?? String(err);
    await batch.save();

    return {
      batch_id: batch.id,
      file_name: batch.file_name,
      row_count: batch.row_count ?? null,
      etl_summary: null,
      status: 'failed',
      error_message: batch.error_message,
    };
  }
}

export default {
  uploadPriceListFile,
};
