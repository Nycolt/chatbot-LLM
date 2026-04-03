/**
 * ProductReplacement — UNIT obsoleto → UNIT/SKU de reemplazo (opcional).
 * Usado cuando lifecycle está en EOS/EOL. No obligatorio para el chatbot si la tabla está vacía.
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const ProductReplacement = sequelize.define('ProductReplacement', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  unit: {
    type: DataTypes.STRING(250),
    allowNull: false,
  },
  replacement_unit: {
    type: DataTypes.STRING(250),
    allowNull: false,
  },
  replacement_sku: {
    type: DataTypes.STRING(250),
    allowNull: true,
  },
}, {
  tableName: 'ProductReplacement',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
});

export default ProductReplacement;
