/**
 * Prueba local del motor FortiSwitch (sin MySQL): valida parsers + selección con filas sintéticas.
 */

import {
  FortiSwitchEngine,
  parseAccessPorts,
  parseUplink,
} from '../src/services/fortiswitch/fortiswitch.engine.js';

function assert(name, cond) {
  if (!cond) throw new Error(`FAIL: ${name}`);
  console.log('ok:', name);
}

const synthetic = [
  {
    unit: 'FS-124G-FPOE',
    total_network_interfaces: '24 x GE RJ45 + 4 x GE SFP',
    poe_ports: '24',
    poe_power_budget: '370 W',
    switching_capacity: '56 Gbps',
    pps_64_bytes: '42 Mpps',
    uplink: '10G',
    form_factor: '1 RU rack mount',
    power_supply: 'Single AC',
  },
  {
    unit: 'FS-148F-FPOE',
    total_network_interfaces: '48 x GE RJ45 + 4 x 10G SFP+',
    poe_ports: '48',
    poe_power_budget: '370 W',
    switching_capacity: '240 Gbps',
    pps_64_bytes: '600 Mpps',
    uplink: '10G',
    form_factor: '1 RU rack mount',
    power_supply: 'Single AC',
  },
];

// Parsers
assert('parseThroughput Gbps', FortiSwitchEngine.parseThroughput('1760 Gbps') === 1760);
assert('parseThroughput Tbps', FortiSwitchEngine.parseThroughput('1.76 Tbps') === 1760);
assert('parsePPS', FortiSwitchEngine.parsePPS('1309 Mpps') === 1309);
assert('parsePoE', FortiSwitchEngine.parsePoE('740 W') === 740);
assert('parseAccessPorts sin uplinks', parseAccessPorts('48x GE RJ45 + 4x SFP') === 48);
assert('parseUplink', parseUplink('40G/100G QSFP') === 100);
assert('parseUplink infiere SFP+', parseUplink('4 x SFP+') === 10);

const answers = {
  ports: 3,
  speed: 3,
  uplinks: 2,
  poe: 3,
  switching: 2,
  pps: 2,
  redundancy: 1,
  formFactor: 2,
  scalability: 1,
  supportLevel: 1,
  cloudManagement: 1,
  addOns: [],
};

const engine = new FortiSwitchEngine(synthetic);
const norm = engine.normalizeInputs(answers);
const req = engine.calculateRequirements(norm);
assert('requiredPorts 48', req.requiredPorts === 48);
assert('requiredThroughput 130', req.requiredThroughput === 130);

const selected = engine.selectBestModel(req, norm);
assert('selected FS-148F', selected && selected.unit === 'FS-148F-FPOE');

console.log('\n[testFortiswitchEngine] todos los checks pasaron.');
