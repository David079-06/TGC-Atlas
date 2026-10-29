// Legacy fallback for unresearched shops. No preassigned green labels.
// The single evidence-backed dossier now lives in shop_verification_reports.
export const TRUST_PROFILES={};
export function trustForShop(){
 return {level:'yellow',label:'Identidad pendiente de contrastar',checkedAt:null,
  summary:'La presencia de una web o un conector no acredita identidad ni entregas.',
  positives:[],cautions:['Faltan registros externos y pruebas independientes suficientes.'],
  sources:[],review:null,recommended:false,confidence:'sin evaluar'};
}