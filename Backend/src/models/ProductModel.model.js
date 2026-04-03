/**
 * product_models — Una fila por modelo lógico (UNIT + solution_id único).
 * Origen: excel (lista precios), pdf (matrix), o manual.
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

/** Alineado con migración 20260326_000011 (MySQL ENUM); incluye valores legacy / ingest. */
const SOURCE_ORIGIN = ['excel', 'pdf', 'manual', 'datasheet', 'legacy_migration'];
const TECHNICAL_STATUS = ['verified', 'partial', 'commercial_only', 'complete', 'missing'];

const ProductModel = sequelize.define(
  'ProductModel',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    solution_id: { type: DataTypes.INTEGER, allowNull: false },
    solution_type: { type: DataTypes.STRING(50), allowNull: false },
    unit: { type: DataTypes.STRING(250), allowNull: false },
    sku_base: { type: DataTypes.STRING(250), allowNull: true },
    model_name: { type: DataTypes.STRING(255), allowNull: true },
    family_name: { type: DataTypes.STRING(255), allowNull: true },
    deployment_type: { type: DataTypes.STRING(100), allowNull: true },
    has_datasheet: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
    source_origin: {
      type: DataTypes.ENUM(...SOURCE_ORIGIN),
      allowNull: false,
      defaultValue: 'manual',
    },
    technical_completeness_status: {
      type: DataTypes.ENUM(...TECHNICAL_STATUS),
      allowNull: false,
      defaultValue: 'commercial_only',
    },
    is_active: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 1 },
  },
  {
    tableName: 'product_models',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
);

export { SOURCE_ORIGIN, TECHNICAL_STATUS };
export default ProductModel;
