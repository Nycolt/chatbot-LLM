/**
 * Frases aprendidas desde el buzón (needs_inbox) → matching rápido sin LLM.
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const LearnedSolutionKeyword = sequelize.define(
  'LearnedSolutionKeyword',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    solution: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'Nombre de solución Fortinet (ej. FortiAnalyzer)',
    },
    phrase: {
      type: DataTypes.STRING(512),
      allowNull: false,
      comment: 'Texto normalizado para includes() contra la pregunta del usuario',
    },
    needs_inbox_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Origen en needs_inbox',
    },
    phrase_original: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Texto original del usuario o frase manual del buzón',
    },
  },
  {
    tableName: 'learned_solution_keywords',
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
  },
);

export default LearnedSolutionKeyword;
