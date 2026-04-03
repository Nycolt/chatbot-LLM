/**
 * Soluciones permitidas para carga de datasheet PDF (alineado con backend / solutions.code).
 * value = solutionType enviado en multipart.
 */

export const DATASHEET_PDF_SOLUTION_OPTIONS = [
  { value: 'fortigate', label: 'FortiGate (appliance)' },
  { value: 'fortigate_vm', label: 'FortiGate VM' },
  { value: 'fortiwifi', label: 'FortiWiFi' },
  { value: 'fortianalyzer', label: 'FortiAnalyzer' },
  { value: 'fortimanager', label: 'FortiManager' },
  { value: 'fortiswitch', label: 'FortiSwitch' },
  { value: 'fortiap', label: 'FortiAP' },
  { value: 'fortimail', label: 'FortiMail' },
  { value: 'fortiweb', label: 'FortiWeb' },
];
