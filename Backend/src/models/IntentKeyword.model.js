/**
 * intent_keywords — Palabras clave para detección de intención / solución en el agente.
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const IntentKeyword = sequelize.define(
  'IntentKeyword',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    solution_id: { type: DataTypes.INTEGER, allowNull: true },
    keyword: { type: DataTypes.STRING(255), allowNull: false },
    intent_label: { type: DataTypes.STRING(128), allowNull: true },
    weight: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 1.0 },
    is_active: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 1 },
  },
  {
    tableName: 'intent_keywords',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
);

export default IntentKeyword;
