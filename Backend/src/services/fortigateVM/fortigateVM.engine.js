/**
 * Constantes comerciales FortiGate VM (perfil → código FGVVS de bundle; no BDL).
 */

export { VM_TIER_ORDER } from './fortigateVM.requirements.js';

const BUNDLE_BY_SECURITY = {
  enterprise: {
    bundleCode: '814',
    bundleLabel: 'Enterprise Bundle',
    bundleDetail: 'Cobertura empresarial integral (FGVVS / VM).',
  },
  utp: {
    bundleCode: '990',
    bundleLabel: 'UTP Bundle',
    bundleDetail: 'Unified Threat Protection (FGVVS / VM).',
  },
  atp: {
    bundleCode: '993',
    bundleLabel: 'ATP Protection Bundle',
    bundleDetail: 'Advanced Threat Protection (FGVVS / VM).',
  },
};

export function bundleFromSecurityProfile(securityOpt) {
  const key = securityOpt?.id || 'utp';
  return BUNDLE_BY_SECURITY[key] || BUNDLE_BY_SECURITY.utp;
}

export function hasUnknownVMInputs() {
  return false;
}
