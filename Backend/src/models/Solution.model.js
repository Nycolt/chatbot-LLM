/**
 * solutions — Catálogo base de soluciones Fortinet del chatbot.
 * Referencia para product_models, solution_offers.solution_id, intent_keywords, etc.
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const Solution = sequelize.define(
  'Solution',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    code: { type: DataTypes.STRING(64), allowNull: false, unique: true },
    name: { type: DataTypes.STRING(255), allowNull: false },
    category: { type: DataTypes.STRING(100), allowNull: false, defaultValue: 'security' },
    is_active: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 1 },
  },
  {
    tableName: 'solutions',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
);

export default Solution;
