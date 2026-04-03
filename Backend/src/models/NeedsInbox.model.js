/**
 * Modelo NeedsInbox (Buzón de Necesidades)
 * Almacena cada consulta del usuario y la detección/revisión de soluciones.
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const NeedsInbox = sequelize.define('NeedsInbox', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  user_question: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  detected_solutions: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Array de nombres de soluciones detectadas',
  },
  matched_keywords: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Palabras/frases que coincidieron por solución',
  },
  detected_scores: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Array de { solution, score }',
  },
  detected_category: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  confirmed_solution: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  solution_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'FK a solutions cuando la necesidad queda asociada al catálogo',
  },
  review_status: {
    type: DataTypes.ENUM('pendiente', 'auto_clasificado', 'requiere_revision', 'confirmado', 'descartado'),
    allowNull: false,
    defaultValue: 'pendiente',
  },
  observations: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'needs_inbox',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
});

export default NeedsInbox;
