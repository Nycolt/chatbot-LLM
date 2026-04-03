/**
 * datasheet_model_map — Relación documento fuente ↔ product_model (página, verificación).
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const DatasheetModelMap = sequelize.define(
  'DatasheetModelMap',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    datasheet_source_id: { type: DataTypes.INTEGER, allowNull: false },
    product_model_id: { type: DataTypes.INTEGER, allowNull: false },
    page_reference: { type: DataTypes.STRING(100), allowNull: true },
    extracted_by: { type: DataTypes.STRING(100), allowNull: true },
    verified_manually: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
  },
  {
    tableName: 'datasheet_model_map',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [{ unique: true, fields: ['datasheet_source_id', 'product_model_id'] }],
  },
);

export default DatasheetModelMap;
