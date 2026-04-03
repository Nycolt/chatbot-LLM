/**
 * ProductLifecycle — Estado EOS/EOL por UNIT (opcional).
 * Usado por `lifecycle.service` (ollama + comparaciones). Si no hay filas, el flujo asume ACTIVE.
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const ProductLifecycle = sequelize.define('ProductLifecycle', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  unit: {
    type: DataTypes.STRING(250),
    allowNull: false,
  },
  sku: {
    type: DataTypes.STRING(250),
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('ACTIVE', 'EOS', 'EOL'),
    allowNull: false,
    defaultValue: 'ACTIVE',
  },
  eos_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  eol_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
}, {
  tableName: 'ProductLifecycle',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
});

export default ProductLifecycle;
