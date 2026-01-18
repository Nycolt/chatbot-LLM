/**
 * Utilidades para trabajar con modelos de Sequelize
 */

/**
 * Extrae los nombres de las columnas de un modelo de Sequelize
 * 
 * @param {Model} model - Modelo de Sequelize
 * @param {Object} options - Opciones de filtrado
 * @param {boolean} options.includeTimestamps - Incluir createdAt y updatedAt (default: true)
 * @param {boolean} options.includePrimaryKey - Incluir clave primaria (default: true)
 * @param {Array<string>} options.exclude - Columnas a excluir
 * @returns {Array<string>} - Array con los nombres de las columnas
 */
export function getModelColumns(model, options = {}) {
  const {
    includeTimestamps = true,
    includePrimaryKey = true,
    exclude = []
  } = options;

  // Obtener todos los atributos del modelo
  const allAttributes = Object.keys(model.rawAttributes);

  // Filtrar según opciones
  return allAttributes.filter(attr => {
    // Excluir columnas específicas
    if (exclude.includes(attr)) {
      return false;
    }

    // Filtrar timestamps
    if (!includeTimestamps && (attr === 'createdAt' || attr === 'updatedAt')) {
      return false;
    }

    // Filtrar primary key
    if (!includePrimaryKey && model.rawAttributes[attr].primaryKey) {
      return false;
    }

    return true;
  });
}

/**
 * Extrae solo los nombres de columnas que no son timestamps ni primaryKey
 * 
 * @param {Model} model - Modelo de Sequelize
 * @returns {Array<string>} - Array con los nombres de las columnas de datos
 */
export function getDataColumns(model) {
  return getModelColumns(model, {
    includeTimestamps: false,
    includePrimaryKey: false
  });
}

/**
 * Extrae toda la información de las columnas incluyendo tipos y restricciones
 * 
 * @param {Model} model - Modelo de Sequelize
 * @returns {Object} - Objeto con información detallada de cada columna
 */
export function getModelColumnsInfo(model) {
  const attributes = model.rawAttributes;
  const columnsInfo = {};

  for (const [columnName, columnDef] of Object.entries(attributes)) {
    columnsInfo[columnName] = {
      type: columnDef.type.constructor.name,
      allowNull: columnDef.allowNull,
      primaryKey: columnDef.primaryKey || false,
      autoIncrement: columnDef.autoIncrement || false,
      defaultValue: columnDef.defaultValue,
      unique: columnDef.unique || false
    };
  }

  return columnsInfo;
}

export default {
  getModelColumns,
  getDataColumns,
  getModelColumnsInfo
};
