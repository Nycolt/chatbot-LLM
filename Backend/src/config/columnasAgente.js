//
import { getModelColumns } from '../utils/model.utils.js';

//
import Product from '../models/Product.model.js';
import {Datasheet} from '../models/Datasheet.model.js';

const ProductoColumns = getModelColumns(Product);
const DatasheetColumns = getModelColumns(Datasheet);

export {
    ProductoColumns,
    DatasheetColumns
}