// Backend/src/services/fortigateSizing.service.js
export {
  handleFortigateSizingFlow,
  resetFortiGateSession as resetSession,
  runFortigateSizingFromPayload,
  isFortigateSizingActive,
} from './fortigate/fortigate.flow.js';