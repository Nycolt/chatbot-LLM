/**
 * Servicio de recomendación de licencias/bundles por modelo (UNIT).
 * Clasifica por convención: hardware (primera fila o SKU FG-/FAZ- etc.) vs licencias (FC-* u otros).
 */

import ProductService from './product.service.js';

const HARDWARE_SKU_PREFIXES = ['fg-', 'faz-', 'fmg-', 'fsw-', 'fap-', 'fml-', 'fwb-', 'fwf-', 'fg/fwf-'];
const LICENSE_SKU_PREFIXES = ['fc-', 'fcr-', 'lic-'];

function isHardware(sku) {
  if (!sku) return false;
  const s = String(sku).toLowerCase();
  return HARDWARE_SKU_PREFIXES.some(prefix => s.startsWith(prefix));
}

function isLicenseOrBundle(sku) {
  if (!sku) return true;
  const s = String(sku).toLowerCase();
  if (LICENSE_SKU_PREFIXES.some(prefix => s.startsWith(prefix))) return true;
  if (isHardware(sku)) return false;
  return true;
}

/**
 * Obtiene todos los productos de un UNIT y los clasifica en hardware vs licencias/bundles
 * @param {string} unit - UNIT del modelo (ej. FortiGate-40F)
 * @returns {Promise<{ hardware: object[], licenses: object[] }>}
 */
async function getProductsByUnitClassified(unit) {
  const rows = await ProductService.getProductByUnit(unit);
  if (!Array.isArray(rows) || rows.length === 0) {
    return { hardware: [], licenses: [] };
  }
  const hardware = [];
  const licenses = [];
  for (const row of rows) {
    if (isHardware(row.SKU)) hardware.push(row);
    else licenses.push(row);
  }
  if (hardware.length === 0 && rows.length > 0) {
    hardware.push(rows[0]);
    for (let i = 1; i < rows.length; i++) licenses.push(rows[i]);
  }
  return { hardware, licenses };
}

/**
 * Filtra por duración de contrato (1, 3 o 5 años) según campos OneYearContract, ThirdYearContract, FiveYearContract
 * @param {object[]} products
 * @param {number} years - 1, 3 o 5
 */
function filterByContractYears(products, years) {
  const key = years === 1 ? 'OneYearContract' : years === 3 ? 'ThirdYearContract' : 'FiveYearContract';
  return products.filter(p => p[key] != null && String(p[key]).trim() !== '');
}

/**
 * Recomienda opciones de licencias/bundles para un modelo
 * @param {string} unit
 * @param {number} contractYears - 1, 3 o 5 (opcional; si no se pasa, devuelve todos)
 * @returns {Promise<{ unit: string, hardware: object[], licenses: object[], message: string }>}
 */
async function recommendLicensesForUnit(unit, contractYears = null) {
  const { hardware, licenses } = await getProductsByUnitClassified(unit);
  let list = licenses;
  if (contractYears != null) {
    list = filterByContractYears(licenses, contractYears);
  }
  const hw = hardware[0] || null;
  let message = `Para ${unit}:\n\n`;
  if (hw) message += `Hardware de referencia: ${hw.SKU} – ${hw.Descripcion || 'N/A'}\n\n`;
  if (list.length === 0) {
    message += 'No hay licencias o bundles cargados para este modelo en la lista de precios. Revisa la carga de productos.';
  } else {
    message += `Opciones de licencias/bundles (${contractYears ? contractYears + ' años' : 'todas'}):\n`;
    list.slice(0, 15).forEach(p => {
      const price = contractYears === 1 ? p.OneYearContract : contractYears === 3 ? p.ThirdYearContract : p.FiveYearContract;
      message += `- ${p.SKU}: ${p.Descripcion || 'N/A'} ${price != null ? `(${price})` : ''}\n`;
    });
    if (list.length > 15) message += `... y ${list.length - 15} más.\n`;
  }
  return {
    unit,
    hardware: hardware.slice(0, 1),
    licenses: list,
    message,
  };
}

export default {
  getProductsByUnitClassified,
  recommendLicensesForUnit,
  filterByContractYears,
  isHardware,
  isLicenseOrBundle,
};
