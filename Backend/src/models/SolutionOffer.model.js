/**
 * Modelo SolutionOffer (solution_offers)
 * Tabla comercial final: ofertas clasificadas (hardware / license / bundle).
 * `unit` se alinea con `Datasheet.UNIT` y `product_models.unit`.
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import PriceUploadBatch from './PriceUploadBatch.model.js';

const OFFER_TYPES = ['hardware', 'license', 'bundle'];

const SolutionOffer = sequelize.define('SolutionOffer', {
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
  solution_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'FK a solutions.id (poblado por ETL + catalogSync)',
  },
  product_model_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'FK a product_models.id cuando hay unit identificable',
  },
  unit: {
    type: DataTypes.STRING(250),
    allowNull: true,
    comment: 'Relación lógica con Datasheet.UNIT para hardware; null si no aplica',
  },
  sku: {
    type: DataTypes.STRING(250),
    allowNull: false,
    comment: 'Obligatorio; filas sin SKU se rechazan en el ETL',
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  solution_type: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Solución del chatbot: fortigate, fortigate_vm, fortiwifi, fortianalyzer, fortimanager, fortiswitch, fortiap, fortimail, fortiweb',
  },
  offer_type: {
    type: DataTypes.ENUM(...OFFER_TYPES),
    allowNull: false,
  },
  price: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true,
  },
  price_1y: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true,
  },
  price_3y: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true,
  },
  price_5y: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true,
  },
  is_active: {
    type: DataTypes.TINYINT,
    allowNull: false,
    defaultValue: 1,
  },
}, {
  tableName: 'solution_offers',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
});

SolutionOffer.belongsTo(PriceUploadBatch, { foreignKey: 'batch_id' });
PriceUploadBatch.hasMany(SolutionOffer, { foreignKey: 'batch_id' });

export { OFFER_TYPES };
export default SolutionOffer;
