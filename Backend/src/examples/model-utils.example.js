/**
 * Ejemplo de uso de model.utils.js
 */

import { Datasheet } from '../models/Datasheet.model.js';
import { Product } from '../models/Product.model.js';
import { getModelColumns, getDataColumns, getModelColumnsInfo } from '../utils/model.utils.js';

// ====================================
// Ejemplo 1: Obtener todas las columnas
// ====================================
const allColumns = getModelColumns(Datasheet);
console.log('Todas las columnas de Datasheet:');
console.log(allColumns);
// ['id', 'UNIT', 'SKU', 'Firewall_Throughput_UDP', ..., 'createdAt', 'updatedAt']

// ====================================
// Ejemplo 2: Solo columnas de datos (sin id, timestamps)
// ====================================
const dataColumns = getDataColumns(Datasheet);
console.log('\nColumnas de datos de Datasheet:');
console.log(dataColumns);
// ['UNIT', 'SKU', 'Firewall_Throughput_UDP', 'IPSec_VPN_Throughput', ...]

// ====================================
// Ejemplo 3: Excluir columnas específicas
// ====================================
const columnsWithoutSKU = getModelColumns(Datasheet, {
  exclude: ['SKU', 'createdAt', 'updatedAt']
});
console.log('\nColumnas sin SKU ni timestamps:');
console.log(columnsWithoutSKU);

// ====================================
// Ejemplo 4: Solo timestamps
// ====================================
const onlyTimestamps = getModelColumns(Datasheet, {
  includeTimestamps: true,
  includePrimaryKey: false
}).filter(col => col === 'createdAt' || col === 'updatedAt');
console.log('\nSolo timestamps:');
console.log(onlyTimestamps);
// ['createdAt', 'updatedAt']

// ====================================
// Ejemplo 5: Información detallada de columnas
// ====================================
const columnsInfo = getModelColumnsInfo(Datasheet);
console.log('\nInformación detallada de columnas:');
console.log(JSON.stringify(columnsInfo, null, 2));
/*
{
  "id": {
    "type": "INTEGER",
    "allowNull": false,
    "primaryKey": true,
    "autoIncrement": true,
    "defaultValue": undefined,
    "unique": false
  },
  "UNIT": {
    "type": "STRING",
    "allowNull": false,
    "primaryKey": false,
    ...
  }
}
*/

// ====================================
// Ejemplo 6: Uso en SELECT dinámico
// ====================================
async function getDatasheetFields() {
  const fields = getDataColumns(Datasheet);
  
  // Usar en query de Sequelize
  const datasheets = await Datasheet.findAll({
    attributes: fields // Solo seleccionar columnas de datos
  });
  
  return datasheets;
}

// ====================================
// Ejemplo 7: Generar estructura para LLM
// ====================================
function generateLLMSchema(model) {
  const columns = getDataColumns(model);
  const info = getModelColumnsInfo(model);
  
  return {
    fields: columns,
    schema: columns.reduce((acc, col) => {
      acc[col] = {
        type: info[col].type,
        required: !info[col].allowNull
      };
      return acc;
    }, {})
  };
}

const llmSchema = generateLLMSchema(Datasheet);
console.log('\nEsquema para LLM:');
console.log(JSON.stringify(llmSchema, null, 2));

export { 
  allColumns, 
  dataColumns, 
  columnsWithoutSKU,
  getDatasheetFields,
  generateLLMSchema
};
