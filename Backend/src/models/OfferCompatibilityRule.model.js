/**
 * offer_compatibility_rules — Clasificación complementaria de bundles/licencias por SKU.
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const BUNDLE_TYPE_VALUES = ['enterprise', 'utp', 'basic'];

const OfferCompatibilityRule = sequelize.define(
  'OfferCompatibilityRule',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    sku: { type: DataTypes.STRING(255), allowNull: false, unique: true },
    bundle_type: { type: DataTypes.ENUM(...BUNDLE_TYPE_VALUES), allowNull: false },
    requires_ssl_inspection: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    requires_ips: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    requires_advanced_threat: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    requires_vpn: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    recommended_for: { type: DataTypes.STRING(255), allowNull: true },
  },
  {
    tableName: 'offer_compatibility_rules',
    timestamps: true,
  },
);

export default OfferCompatibilityRule;
