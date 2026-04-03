/**
 * model_offer_links — Enlace explícito entre product_model y fila de solution_offers.
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const ModelOfferLink = sequelize.define(
  'ModelOfferLink',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    product_model_id: { type: DataTypes.INTEGER, allowNull: false },
    solution_offer_id: { type: DataTypes.INTEGER, allowNull: false },
    link_type: { type: DataTypes.STRING(64), allowNull: false, defaultValue: 'primary_sku' },
  },
  {
    tableName: 'model_offer_links',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [{ unique: true, fields: ['product_model_id', 'solution_offer_id', 'link_type'] }],
  },
);

export default ModelOfferLink;
