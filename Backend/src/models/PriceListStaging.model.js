/**
 * Modelo PriceListStaging (price_list_staging)
 * Staging: copia cruda de cada fila del Excel de lista de precios.
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import PriceUploadBatch from './PriceUploadBatch.model.js';

const PriceListStaging = sequelize.define('PriceListStaging', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  batch_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'price_upload_batches', key: 'id' },
    onDelete: 'CASCADE',
  },
  unit: {
    type: DataTypes.STRING(250),
    allowNull: true,
  },
  sku: {
    type: DataTypes.STRING(250),
    allowNull: true,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  price: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Valor crudo del Excel',
  },
  contract_1y: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  contract_3y: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  contract_5y: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  row_index: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Número de fila en el Excel',
  },
}, {
  tableName: 'price_list_staging',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
});

PriceListStaging.belongsTo(PriceUploadBatch, { foreignKey: 'batch_id' });
PriceUploadBatch.hasMany(PriceListStaging, { foreignKey: 'batch_id' });

export default PriceListStaging;
