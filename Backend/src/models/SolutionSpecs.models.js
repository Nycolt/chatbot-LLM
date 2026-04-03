/**
 * Especificaciones técnicas por solución — en general una fila por product_model_id (FK).
 * FortiWiFi / FortiAnalyzer: specs por `UNIT` + matrix (sin FK en la tabla).
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const specOpts = {
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
};

/** FortiGate: tabla `fortigate_specs` con esquema PascalCase → `FortigateSpecs.model.js` (no hay fila snake_case aquí). */

const FortigateVmSpec = sequelize.define(
  'FortigateVmSpec',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    product_model_id: { type: DataTypes.INTEGER, allowNull: false, unique: true },
    vm_tier_code: DataTypes.STRING(32),
    vcpu_profile: DataTypes.STRING(128),
    max_vdoms: DataTypes.STRING(64),
    max_tokens: DataTypes.STRING(64),
    throughput_notes: DataTypes.STRING(512),
  },
  { tableName: 'fortigate_vm_specs', ...specOpts },
);

/** FortiWiFi: métricas por `UNIT`; enlace al catálogo vía `product_models.unit` + `datasheet_model_map`. */
const FortiwifiSpec = sequelize.define(
  'FortiwifiSpec',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    UNIT: { type: DataTypes.STRING(64), allowNull: true },
    IPS_Throughput: DataTypes.STRING(255),
    NGFW_Throughput: DataTypes.STRING(255),
    Threat_Protection_Throughput: DataTypes.STRING(255),
    Concurrent_Sessions_TCP: DataTypes.STRING(255),
    New_Sessions_Per_Second_TCP: DataTypes.STRING(255),
    IPsec_VPN_Throughput: DataTypes.STRING(255),
    SSL_Inspection_Throughput: DataTypes.STRING(255),
    SSL_Inspection_Concurrent_Session: DataTypes.STRING(255),
    Max_FortiAPs: DataTypes.STRING(255),
    Max_FortiSwitches: DataTypes.STRING(255),
  },
  {
    tableName: 'fortiwifi_specs',
    underscored: false,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
);

/** FortiAnalyzer: métricas por UNIT (matriz PDF); catálogo vía product_models.unit + datasheet_model_map. */
const FortianalyzerSpec = sequelize.define(
  'FortianalyzerSpec',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    UNIT: { type: DataTypes.STRING(64), allowNull: true },
    GB_Logs_Per_Day: DataTypes.STRING(255),
    Analytics_Rate_Logs_Per_Sec: DataTypes.STRING(255),
    Collector_Rate_Logs_Per_Sec: DataTypes.STRING(255),
    Total_Interfaces: DataTypes.STRING(255),
    Storage_Capacity: DataTypes.STRING(255),
  },
  {
    tableName: 'fortianalyzer_specs',
    underscored: false,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
);

const FortimanagerSpec = sequelize.define(
  'FortimanagerSpec',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    product_model_id: { type: DataTypes.INTEGER, allowNull: false, unique: true },
    /** Denormalizado (FMG-3100G) para listados sin JOIN a product_models */
    unit: DataTypes.STRING(64),
    /** Datasheet: Devices/VDOMs (Default) */
    devices_vdoms_default: DataTypes.STRING(64),
    /** Datasheet: Devices/VDOMs (Maximum) */
    devices_vdoms_maximum: DataTypes.STRING(64),
    default_adoms: DataTypes.STRING(64),
    max_adoms: DataTypes.STRING(64),
    /** Datasheet: GB/day */
    gb_per_day: DataTypes.STRING(64),
    /** Datasheet: Sustained Log Rates */
    sustained_log_rates: DataTypes.STRING(64),
    storage_capacity: DataTypes.STRING(255),
    /** Datasheet: Usable Storage (after RAID) */
    usable_storage_after_raid: DataTypes.STRING(255),
    raid_levels: DataTypes.STRING(128),
    total_interfaces: DataTypes.STRING(255),
    redundant_power: DataTypes.STRING(32),
    removable_disks: DataTypes.STRING(128),
    sed: DataTypes.STRING(128),
    form_factor: DataTypes.STRING(128),
  },
  { tableName: 'fortimanager_specs', ...specOpts },
);

const FortiswitchSpec = sequelize.define(
  'FortiswitchSpec',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    product_model_id: { type: DataTypes.INTEGER, allowNull: true, unique: true },
    unit: { type: DataTypes.STRING(128), allowNull: false, unique: true },
    total_network_interfaces: DataTypes.STRING(512),
    poe_ports: DataTypes.STRING(128),
    poe_power_budget: DataTypes.STRING(128),
    switching_capacity: DataTypes.STRING(128),
    pps_64_bytes: DataTypes.STRING(128),
    mac_address_storage: DataTypes.STRING(128),
    vlans_supported: DataTypes.STRING(128),
    lag_group_size: DataTypes.STRING(64),
    lag_total_groups: DataTypes.STRING(64),
    power_consumption: DataTypes.STRING(128),
    power_supply: DataTypes.STRING(255),
    heat_dissipation: DataTypes.STRING(128),
    operating_temp: DataTypes.STRING(255),
    humidity: DataTypes.STRING(255),
    form_factor: DataTypes.STRING(255),
    uplink: DataTypes.STRING(128),
  },
  { tableName: 'fortiswitch_specs', ...specOpts },
);

const FortiapSpec = sequelize.define(
  'FortiapSpec',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    product_model_id: { type: DataTypes.INTEGER, allowNull: false, unique: true },
    wifi_generation: DataTypes.STRING(32),
    mimo_streams: DataTypes.STRING(32),
    max_clients: DataTypes.STRING(64),
    antennas: DataTypes.STRING(128),
  },
  { tableName: 'fortiap_specs', ...specOpts },
);

const FortimailSpec = sequelize.define(
  'FortimailSpec',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    product_model_id: { type: DataTypes.INTEGER, allowNull: false, unique: true },
    max_domains: DataTypes.STRING(64),
    max_mailboxes: DataTypes.STRING(64),
    throughput_email: DataTypes.STRING(128),
  },
  { tableName: 'fortimail_specs', ...specOpts },
);

const FortiwebSpec = sequelize.define(
  'FortiwebSpec',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    product_model_id: { type: DataTypes.INTEGER, allowNull: false, unique: true },
    http_throughput: DataTypes.STRING(128),
    max_applications: DataTypes.STRING(64),
    form_factor: DataTypes.STRING(128),
  },
  { tableName: 'fortiweb_specs', ...specOpts },
);

export {
  FortigateVmSpec,
  FortiwifiSpec,
  FortianalyzerSpec,
  FortimanagerSpec,
  FortiswitchSpec,
  FortiapSpec,
  FortimailSpec,
  FortiwebSpec,
};
