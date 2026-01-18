import { REQUIRED_PRODUCT_COLUMNS, NO_EMPTY_PRODUCT_COLUMNS } from "../config/columnasExcel.js";
import { REQUIRED_DATASHEET_COLUMNS } from "../config/columnasExcel.js";

/**
 * Valida que los datos del Excel contengan las columnas requeridas
 * @param {Array} data - Array de objetos del Excel
 * @param {Array} requiredColumns - Array con los nombres de las columnas requeridas
 * @returns {Object} { valid: boolean, missing: Array, message: string }
 */
export const validateExcelColumns = (data, requiredColumns) => {
    if (!data || data.length === 0) {
        return {
            valid: false,
            missing: requiredColumns,
            message: 'No hay datos para validar'
        };
    }

    // Obtener las columnas del primer registro
    const presentColumns = Object.keys(data[0]);

    // Encontrar columnas faltantes
    const missingColumns = requiredColumns.filter(
        col => !presentColumns.includes(col)
    );

    if (missingColumns.length > 0) {
        return {
            valid: false,
            missing: missingColumns,
            message: `Faltan las siguientes columnas: ${missingColumns.join(', ')}`
        };
    }

    return {
        valid: true,
        missing: [],
        message: 'Todas las columnas requeridas están presentes'
    };
};

/**
 * Valida que todas las hojas del Excel tengan las columnas requeridas
 * @param {Array} data - Array de objetos del Excel (con propiedad 'familia')
 * @param {Array} requiredColumns - Array con los nombres de las columnas requeridas
 * @returns {Object} { valid: boolean, errors: Array, message: string }
 */
export const validateAllSheetsColumns = (data, requiredColumns) => {
    if (!data || data.length === 0) {
        return {
            valid: false,
            errors: [],
            message: 'No hay datos para validar'
        };
    }

    // Agrupar datos por familia (nombre de la hoja)
    const sheetGroups = {};
    data.forEach(row => {
        const sheetName = row.familia || 'Sin nombre';
        if (!sheetGroups[sheetName]) {
            sheetGroups[sheetName] = [];
        }
        sheetGroups[sheetName].push(row);
    });

    const errors = [];

    // Validar cada hoja
    Object.keys(sheetGroups).forEach(sheetName => {
        const sheetData = sheetGroups[sheetName];
        const validation = validateExcelColumns(sheetData, requiredColumns);

        if (!validation.valid) {
            errors.push({
                sheet: sheetName,
                missing: validation.missing,
                message: `Hoja "${sheetName}": ${validation.message}`
            });
        }
    });

    if (errors.length > 0) {
        return {
            valid: false,
            errors: errors,
            message: `${errors.length} hoja(s) con columnas faltantes`
        };
    }

    return {
        valid: true,
        errors: [],
        message: 'Todas las hojas tienen las columnas requeridas'
    };
};



/**
 * Valida que no existan columnas adicionales a las requeridas en cada hoja
 * @param {Array} data - Array de objetos del Excel (con propiedad 'familia')
 * @param {Array} requiredColumns - Array con los nombres de las columnas requeridas
 * @returns {Object} { valid: boolean, errors: Array, message: string }
 */
export const validateNoExtraColumns = (data, requiredColumns) => {
    if (!data || data.length === 0) {
        return {
            valid: false,
            errors: [],
            message: 'No hay datos para validar'
        };
    }

    // Agrupar datos por familia (nombre de la hoja)
    const sheetGroups = {};
    data.forEach(row => {
        const sheetName = row.familia || 'Sin nombre';
        if (!sheetGroups[sheetName]) {
            sheetGroups[sheetName] = [];
        }
        sheetGroups[sheetName].push(row);
    });

    const errors = [];

    // Validar cada hoja
    Object.keys(sheetGroups).forEach(sheetName => {
        const sheetData = sheetGroups[sheetName];
        if (sheetData.length > 0) {
            const presentColumns = Object.keys(sheetData[0]).filter(col => col !== 'familia');
            const extraColumns = presentColumns.filter(col => !requiredColumns.includes(col));

            if (extraColumns.length > 0) {
                errors.push({
                    sheet: sheetName,
                    extraColumns: extraColumns,
                    message: `Hoja "${sheetName}": columnas no permitidas: ${extraColumns.join(', ')}`
                });
            }
        }
    });

    if (errors.length > 0) {
        return {
            valid: false,
            errors: errors,
            message: `${errors.length} hoja(s) con columnas adicionales`
        };
    }

    return {
        valid: true,
        errors: [],
        message: 'No hay columnas adicionales'
    };
};

/**
 * Valida que las columnas especificadas no estén vacías en cada hoja
 * @param {Array} data - Array de objetos del Excel (con propiedad 'familia')
 * @param {Array} requiredColumns - Array con los nombres de las columnas que no deben estar vacías
 * @returns {Object} { valid: boolean, errors: Array, message: string }
 */
export const validateNotEmptyColumns = (data, requiredColumns) => {
    if (!data || data.length === 0) {
        return {
            valid: false,
            errors: [],
            message: 'No hay datos para validar'
        };
    }

    // Agrupar datos por familia (nombre de la hoja)
    const sheetGroups = {};
    data.forEach(row => {
        const sheetName = row.familia || 'Sin nombre';
        if (!sheetGroups[sheetName]) {
            sheetGroups[sheetName] = [];
        }
        sheetGroups[sheetName].push(row);
    });

    const errors = [];

    // Validar cada hoja
    Object.keys(sheetGroups).forEach(sheetName => {
        const sheetData = sheetGroups[sheetName];
        const emptyColumns = new Set();

        sheetData.forEach((row, index) => {
            requiredColumns.forEach(col => {
                const value = row[col];
                // Verificar si está vacío (null, undefined, string vacío, solo espacios)
                if (value === null || value === undefined || value === '' || 
                    (typeof value === 'string' && value.trim() === '')) {
                    emptyColumns.add(col);
                }
            });
        });

        if (emptyColumns.size > 0) {
            errors.push({
                sheet: sheetName,
                emptyColumns: Array.from(emptyColumns),
                message: `Hoja "${sheetName}": columnas con valores vacíos: ${Array.from(emptyColumns).join(', ')}`
            });
        }
    });

    if (errors.length > 0) {
        return {
            valid: false,
            errors: errors,
            message: `${errors.length} hoja(s) con columnas vacías`
        };
    }

    return {
        valid: true,
        errors: [],
        message: 'Todas las columnas requeridas tienen valores'
    };
};

/**
 * Valida que el Excel de contratos tenga las columnas correctas
 * @param {Array} data - Array de objetos del Excel
 * @returns {Object} { valid: boolean, errors: Array, message: string }
 */
export const validateContractExcel = (data, requiredColumns) => {
    return validateAllSheetsColumns(data, requiredColumns);
};


const ValidacionGeneral = (data, requiredColumns, noEmptyColumns) => {

    //Validar que todas las hojas tengan las columnas requeridas
    const validation = validateContractExcel(data, requiredColumns);
    if (!validation.valid) {
        let errorMsg = validation.message + '\n\n';
        validation.errors.forEach(error => {
            errorMsg += `• ${error.message}\n`;
        });
        return { valid: false, errors: validation.errors, message: errorMsg };
    }

    //Validar que no existan columnas adicionales a las requeridas
    const extraColumnsValidation = validateNoExtraColumns(data, requiredColumns);
    if (!extraColumnsValidation.valid) {
        let errorMsg = extraColumnsValidation.message + '\n\n';
        extraColumnsValidation.errors.forEach(error => {
            errorMsg += `• ${error.message}\n`;
        });
        return { valid: false, errors: extraColumnsValidation.errors, message: errorMsg };
    }

    //Validar que las columnas nombradas no estén vacías
    const notEmptyValidation = validateNotEmptyColumns(data, noEmptyColumns);
    if (!notEmptyValidation.valid) {
        let errorMsg = notEmptyValidation.message + '\n\n';
        notEmptyValidation.errors.forEach(error => {
            errorMsg += `• ${error.message}\n`;
        });
        return { valid: false, errors: notEmptyValidation.errors, message: errorMsg };
    }

    return { valid: true, errors: [], message: "Continuar" };
}

/**
 * Valida que el Excel de productos tenga las columnas correctas
 * @param {Array} data - Array de objetos del Excel
 * @returns {Object} { valid: boolean, errors: Array, message: string }
 */
export const ValidarProducto = (data) => {
    
    // Validación general
    const validacionGeneral = ValidacionGeneral(data, REQUIRED_PRODUCT_COLUMNS, NO_EMPTY_PRODUCT_COLUMNS);
    if (!validacionGeneral.valid) {
        return validacionGeneral;
    }

    return { valid: true, errors: [], message: "El Excel de productos es válido" };
}

/**
 * Valida que el Excel de productos tenga las columnas correctas
 * @param {Array} data - Array de objetos del Excel
 * @returns {Object} { valid: boolean, errors: Array, message: string }
 */
export const ValidarDatasheets = (data) => {

    // Validación general
    const validacionGeneral = ValidacionGeneral(data, REQUIRED_DATASHEET_COLUMNS, []);
    if (!validacionGeneral.valid) {
        return validacionGeneral;
    }

    return { valid: true, errors: [], message: "El Excel de datasheets es válido" };
}



