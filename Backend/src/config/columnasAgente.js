import { getModelColumns } from '../utils/model.utils.js';
import Product from '../models/Product.model.js';
import { Datasheet } from '../models/Datasheet.model.js';
import FortigateSpecs from '../models/FortigateSpecs.model.js';

const ProductoColumns = getModelColumns(Product);
const FortigateSpecsColumns = getModelColumns(FortigateSpecs);
const DatasheetLegacyColumns = getModelColumns(Datasheet);
/** Campos válidos para intenciones: FortiGate (`fortigate_specs`) + otras filas `Datasheet`. */
const DatasheetColumns = [...new Set([...FortigateSpecsColumns, ...DatasheetLegacyColumns])];

export { ProductoColumns, DatasheetColumns, FortigateSpecsColumns };
