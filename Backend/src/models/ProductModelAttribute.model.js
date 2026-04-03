/**
 * product_model_attributes — Atributos inferidos desde descripción comercial o PDF.
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const ATTR_SOURCE = ['excel_description', 'pdf', 'manual'];
const CONFIDENCE = ['verified', 'inferred', 'unknown'];

const ProductModelAttribute = sequelize.define(
  'ProductModelAttribute',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    product_model_id: { type: DataTypes.INTEGER, allowNull: false },
    attribute_key: { type: DataTypes.STRING(128), allowNull: false },
    attribute_value: { type: DataTypes.TEXT, allowNull: false },
    attribute_unit: { type: DataTypes.STRING(32), allowNull: true },
    source_type: { type: DataTypes.ENUM(...ATTR_SOURCE), allowNull: false },
    confidence_level: {
      type: DataTypes.ENUM(...CONFIDENCE),
      allowNull: false,
      defaultValue: 'unknown',
    },
    notes: { type: DataTypes.TEXT, allowNull: true },
  },
  {
    tableName: 'product_model_attributes',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
);

export { ATTR_SOURCE, CONFIDENCE };
export default ProductModelAttribute;
