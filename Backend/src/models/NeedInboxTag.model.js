/**
 * need_inbox_tags — Etiquetas para clasificar entradas del buzón (needs_inbox).
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const NeedInboxTag = sequelize.define(
  'NeedInboxTag',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    needs_inbox_id: { type: DataTypes.INTEGER, allowNull: false },
    tag: { type: DataTypes.STRING(128), allowNull: false },
  },
  {
    tableName: 'need_inbox_tags',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
    // Solo created_at en BD (sin updated_at)
  },
);

export default NeedInboxTag;
