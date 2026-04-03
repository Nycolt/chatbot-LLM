/**
 * Modelo PriceUploadBatch (price_upload_batches)
 * Registra cada subida de lista de precios como un batch; no elimina datos anteriores.
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const BATCH_STATUS = ['uploaded', 'staging_loaded', 'processing', 'completed', 'failed'];

const PriceUploadBatch = sequelize.define('PriceUploadBatch', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  file_name: {
    type: DataTypes.STRING(500),
    allowNull: false,
  },
  uploaded_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  uploaded_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'FK Usuario.id',
  },
  status: {
    type: DataTypes.ENUM(...BATCH_STATUS),
    allowNull: false,
    defaultValue: 'uploaded',
  },
  is_active: {
    type: DataTypes.TINYINT,
    allowNull: false,
    defaultValue: 0,
  },
  source_type: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'fortinet_official',
  },
  row_count: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  error_message: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'price_upload_batches',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
});

export { BATCH_STATUS };
export default PriceUploadBatch;
