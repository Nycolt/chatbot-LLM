/**
 * `fortigate_specs` — especificaciones FortiGate en el mismo esquema que la antigua tabla `Datasheet`
 * (columnas PascalCase: UNIT, SKU, Firewall_Throughput_UDP, …).
 * El motor de dimensionamiento consume estas filas tal cual.
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const properties = {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  UNIT: {
    type: DataTypes.STRING(250),
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: { msg: 'El UNIT es requerido' },
      len: { args: [1, 250], msg: 'El UNIT no puede exceder 250 caracteres' },
    },
  },
  SKU: {
    type: DataTypes.STRING(250),
    allowNull: false,
    validate: {
      notEmpty: { msg: 'El SKU es requerido' },
      len: { args: [1, 250], msg: 'El SKU no puede exceder 250 caracteres' },
    },
  },
  Firewall_Throughput_UDP: { type: DataTypes.STRING(250) },
  IPSec_VPN_Throughput: { type: DataTypes.STRING(250) },
  IPS_Throughput_Enterprise_Mix: { type: DataTypes.STRING(250) },
  NGFW_Throughput_Enterprise_Mix: { type: DataTypes.STRING(250) },
  Threat_Protection_Throughput: { type: DataTypes.STRING(250) },
  Firewall_Latency: { type: DataTypes.STRING(250) },
  Concurrent_Sessions: { type: DataTypes.STRING(250) },
  New_Sessions_Per_Second: { type: DataTypes.STRING(250) },
  Firewall_Policies: { type: DataTypes.STRING(250) },
  Max_Gateway_To_Gateway_IPSec_Tunnels: { type: DataTypes.STRING(250) },
  Max_Client_To_Gateway_IPSec_Tunnels: { type: DataTypes.STRING(250) },
  SSL_VPN_Throughput: { type: DataTypes.STRING(250) },
  Concurrent_SSL_VPN_Users: { type: DataTypes.STRING(250) },
  SSL_Inspection_Throughput: { type: DataTypes.STRING(250) },
  Application_Control_Throughput: { type: DataTypes.STRING(250) },
  Max_FortiAPs: { type: DataTypes.STRING(250) },
  Max_FortiSwitches: { type: DataTypes.STRING(250) },
  Max_FortiTokens: { type: DataTypes.STRING(250) },
  Virtual_Domains: { type: DataTypes.STRING(250) },
  Interfaces: { type: DataTypes.STRING(250) },
  Local_Storage: { type: DataTypes.STRING(250) },
  Power_Supplies: { type: DataTypes.STRING(250) },
  Form_Factor: { type: DataTypes.STRING(250) },
  Variants: { type: DataTypes.STRING(250) },
};

const FortigateSpecs = sequelize.define('FortigateSpecs', { ...properties }, {
  tableName: 'fortigate_specs',
  timestamps: true,
});

/** Columnas técnicas PascalCase (sin id ni UNIT/SKU) — útil para copias parciales. */
export const FORTIGATE_PASCAL_METRIC_KEYS = [
  'Firewall_Throughput_UDP',
  'IPSec_VPN_Throughput',
  'IPS_Throughput_Enterprise_Mix',
  'NGFW_Throughput_Enterprise_Mix',
  'Threat_Protection_Throughput',
  'Firewall_Latency',
  'Concurrent_Sessions',
  'New_Sessions_Per_Second',
  'Firewall_Policies',
  'Max_Gateway_To_Gateway_IPSec_Tunnels',
  'Max_Client_To_Gateway_IPSec_Tunnels',
  'SSL_VPN_Throughput',
  'Concurrent_SSL_VPN_Users',
  'SSL_Inspection_Throughput',
  'Application_Control_Throughput',
  'Max_FortiAPs',
  'Max_FortiSwitches',
  'Max_FortiTokens',
  'Virtual_Domains',
  'Interfaces',
  'Local_Storage',
  'Power_Supplies',
  'Form_Factor',
  'Variants',
];

export { FortigateSpecs };
export default FortigateSpecs;
