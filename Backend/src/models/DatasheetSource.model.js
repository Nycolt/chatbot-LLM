/**
 * datasheet_sources — Trazabilidad de cada PDF/matrix/archivo de especificaciones.
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const DatasheetSource = sequelize.define(
  'DatasheetSource',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    solution_id: { type: DataTypes.INTEGER, allowNull: false },
    solution_type: { type: DataTypes.STRING(50), allowNull: true },
    file_name: { type: DataTypes.STRING(500), allowNull: false },
    version: { type: DataTypes.STRING(100), allowNull: true },
    uploaded_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    source_type: { type: DataTypes.STRING(80), allowNull: false, defaultValue: 'pdf' },
    /** uploaded | processing | processed | failed */
    processing_status: {
      type: DataTypes.STRING(32),
      allowNull: true,
    },
    uploaded_by: { type: DataTypes.INTEGER, allowNull: true },
    notes: { type: DataTypes.TEXT, allowNull: true },
  },
  {
    tableName: 'datasheet_sources',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
);

export default DatasheetSource;
