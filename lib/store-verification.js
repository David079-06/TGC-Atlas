import {db} from 'hatchable';
import {hostFor} from 'lib/research-identity.js';
import {SOURCES} from 'lib/store-adapters.js';

// One interpretation of evidence for every country and every entry point.
// Never use catalogue status, HTTP errors or maps as proof of transaction safety.
const now=()=>new Date().toISOString();
export function verificationKey(shop){
 const country=String(shop?.country||'').trim().toUpperCase();
 const host=hostFor(shop?.website);
 if(!/^[A-Z]{2}$/.test(country))return null;
 if(host)return country+'|'+host;
 const id=String(shop?.id||'').replace(/^saved-/,'').slice(0,140);
 return id?country+'|ref:'+id:null;
}
export const pendingTrust=(name='')=>({
 level:'yellow',label:'Identidad pendiente de contrastar',checkedAt:null,
 summary:'No hay suficientes fuentes independientes para confirmar la identidad y actividad comercial.',
 positives:[],cautions:['Verifica los datos legales, la dirección y las condiciones antes de comprar.'],
 sources:[],review:null,recommended:false,confidence:'sin evaluar',ruc:null,
 verification:{status:'pending',storeType:'unknown',officialRegistryChecked:false,technicalStatus:'not_checked',
  independentSources:0,checkedAt:null},
 locations:[],contact:{},typeEvidence:[],transactionSafety:'not_verified'
});
const str=s=>String(s||'').slice(0,280);
const sourcesOf=report=>Array.isArray(report?.evidence)?report.evidence:[];
const json=x=>typeof x==='string'?(()=>{try{return JSON.parse(x)}catch{return {}}})():(x||{});
export function evaluateVerification(report){
 if(!report)return pendingTrust();
 const facts=json(report.facts),tech=json(report.technical),sources=sourcesOf(report);
 const independent=sources.filter(s=>['registry_secondary','registry_official','supplier_listing','independent_directory','independent_reviews','official_sanction'].includes(s.kind)&&s.confirmed===true);
 const activeLegal=independent.some(s=>['registry_secondary','registry_official'].includes(s.kind)&&s.claim==='legal_active'&&
  !!facts.legal?.identifier);
 const independentPhysical=independent.some(s=>['supplier_listing','independent_directory'].includes(s.kind)&&s.claim==='physical_location_match');
 const firstParty=sources.some(s=>s.kind==='first_party'&&s.confirmed===true);
 const ownPhysical=!!(Array.isArray(facts.locations)&&facts.locations.some(l=>l.purpose==='store'||l.purpose==='pickup'))||
  tech.physicalClaimPublished===true;
 const merchantOnline=facts.ecommerce?.catalog===true||tech.ecommerceIndicated===true;
 const storeType=merchantOnline&&ownPhysical?'hybrid':ownPhysical?'physical':merchantOnline?'online':'unknown';
 const groups=new Set(independent.map(s=>s.publisher||s.url).filter(Boolean));
 const credibleSanction=independent.some(s=>s.kind==='official_sanction'&&s.claim==='serious_active_risk');
 const corroborated=firstParty&&activeLegal&&groups.size>=2&&
  (ownPhysical?independentPhysical:independent.some(s=>s.claim==='commercial_activity_confirmed'));
 const level=credibleSanction?'red':corroborated?'green':'yellow';
 const label=credibleSanction?'Riesgo grave documentado':corroborated?'Identidad y actividad corroboradas':'Verificación incompleta';
 const checkedAt=report.evaluated_at||report.last_evaluated_at||null;
 const technicalStatus=tech.reachable===true?'accessible':tech.reachable===false?'unavailable':'not_checked';
 const lastError=report.website_error||null;
 const risks=[];
 if(!facts.legal?.officialChecked)risks.push('El registro oficial no se ha consultado directamente; los datos legales proceden de fuentes secundarias o declaradas.');
 if(!sources.some(s=>s.kind==='independent_reviews'&&s.confirmed===true))risks.push('No hay una auditoría suficiente de reseñas y entregas reales.');
 if(ownPhysical&&!independentPhysical)risks.push('La ubicación física anunciada aún no tiene confirmación externa.');
 if(!firstParty)risks.push('Falta comprobar información publicada directamente por el comercio.');
 if(lastError)risks.push('Último intento de acceso a la web no concluyente; no modifica la verificación documental.');
 for(const note of Array.isArray(facts.policyNotes)?facts.policyNotes:[])risks.push(str(note));
 if(level==='red')risks.unshift('Existe una advertencia oficial documentada; revisa la fuente antes de comprar.');
 const positives=[];
 if(activeLegal)positives.push('Razón social y registro localizados en fuente externa; el contraste oficial sigue pendiente si no se indica lo contrario.');
 if(independentPhysical)positives.push('Al menos un local publicado coincide con un directorio o proveedor independiente.');
 if(firstParty&&merchantOnline)positives.push('El comercio publica catálogo y actividad de venta online.');
 if(firstParty&&ownPhysical)positives.push('El comercio publica una dirección de atención o recogida.');
 const reviewSource=sources.find(s=>s.kind==='independent_reviews'&&s.confirmed===true&&s.ratingCount>=20);
 const review=reviewSource?.rating!=null?{
  source:reviewSource.publisher,url:reviewSource.url,rating:Number(reviewSource.rating),count:Number(reviewSource.ratingCount)
 }:null;
 const positiveSources=sources.filter(s=>s.confirmed===true&&/^https:\/\//.test(s.url||'')).map(s=>({
   label:str(s.label||s.publisher),url:s.url,
   type:s.kind==='first_party'?'comercio':s.kind==='registry_official'||s.kind==='official_sanction'?'oficial':'tercero',
   finding:str(s.finding),publisher:str(s.publisher),checkedAt:s.checkedAt||null,
   kind:s.kind,claim:s.claim
 }));
 const contact={email:tech.emails?.[0]||null,phone:tech.phones?.[0]||null,...(facts.contact||{})};
 const locations=Array.isArray(facts.locations)?facts.locations:
   Array.isArray(tech.declaredLocations)?tech.declaredLocations.map(l=>({...l,purpose:'store',corroborated:false})):[];
 const summary=level==='green'
  ?'La identidad y al menos una referencia de actividad o ubicación coinciden con fuentes externas de distinto origen. No se han certificado pagos, stock ni entregas.'
  :level==='red'?'Existe una advertencia grave respaldada por un documento oficial. Revisa las pruebas.':
  'La información publicada no basta para corroborar de forma independiente la identidad y la actividad comercial.';
 return {level,label,checkedAt,summary,positives,cautions:risks,sources:positiveSources,
  review,recommended:level==='green'&&!!review,confidence:level==='green'?'moderada':'limitada',
  ruc:facts.legal?.country==='PE'?facts.legal?.identifier:null,
  registration:{country:facts.legal?.country||report.country,identifier:facts.legal?.identifier||null,
   publishedIdentifiers:tech.legalIdentifiersPublished||[],
   name:facts.legal?.name||null,status:facts.legal?.status||'not_checked',
   officialCheckUrl:facts.legal?.officialCheckUrl||null,
   officialChecked:facts.legal?.officialChecked===true},
  locations,contact,storeType,
  verification:{status:level==='green'?'corroborated':level==='red'?'documented_risk':'incomplete',
   storeType,officialRegistryChecked:facts.legal?.officialChecked===true,
   technicalStatus,websiteCheckedAt:report.website_checked_at||null,
   independentSources:groups.size,independentPhysicalLocation:independentPhysical,checkedAt,storefrontConfirmed:merchantOnline,
   physicalLocations:locations.filter(l=>l.purpose==='store').length,
   websiteError:lastError,contactPageFound:tech.contactPageFound===true,
   termsPageFound:tech.termsPageFound===true,
   termsDocumented:sources.some(s=>s.kind==='first_party'&&s.claim==='commercial_conditions'&&s.confirmed===true),
   checkedPages:tech.checkedPages||[]},
  typeEvidence:positiveSources.filter(s=>s.claim==='physical_location_match'||s.claim==='online_catalog'||s.claim==='published_location'),
  transactionSafety:'not_verified'};
}
export async function loadVerificationReports(shops){
 const keys=[...new Set((shops||[]).map(verificationKey).filter(Boolean))];
 if(!keys.length)return new Map();
 const r=await db.query('SELECT * FROM shop_verification_reports WHERE verification_key=ANY($1::text[])',[keys]);
 return new Map(r.rows.map(x=>[x.verification_key,x]));
}
export async function enrichWithVerification(shops){
 const reports=await loadVerificationReports(shops);
 return (shops||[]).map(shop=>{
  const report=reports.get(verificationKey(shop));
  const trust=evaluateVerification(report);
  const primary=trust.locations.find(l=>l.purpose==='store'||l.purpose==='pickup');
  return {...shop,trust,
   storeType:trust.storeType!=='unknown'?trust.storeType:shop.storeType||'unknown',
   address:shop.address||primary?.address||null,
   addressType:shop.addressType||primary?.purpose||null,
   phone:shop.phone||trust.contact.phone||null,
   email:shop.email||trust.contact.email||null,
   badge:trust.level,
   verifiedProfile:Boolean(report),
   technicalStatus:trust.verification.technicalStatus
  };
 });
}
export async function findShopToVerify(id){
 const found=await db.query(`SELECT id,name,country,website,store_type AS "storeType" FROM discovered_shops
  WHERE id=$1 AND expires_at>NOW()
  UNION ALL SELECT id,name,country,website,store_type AS "storeType" FROM store_registry WHERE id=$1
  LIMIT 1`,[id]);
 if(found.rows[0])return found.rows[0];
 const known=SOURCES[id];
 return known?{id,name:known.name,country:known.country,website:'https://'+known.host+'/',storeType:known.kind}:null;
}
export async function saveTechnicalCheck(shop,result){
 const key=verificationKey(shop);if(!key)return null;
 // Technical checks can update accessibility but must never replace
 // independent sources, registral facts or a verified address.
 const r=await db.query(`INSERT INTO shop_verification_reports
   (verification_key,country,name,website,technical,website_checked_at,website_error)
  VALUES($1,$2,$3,$4,$5::jsonb,NOW(),$6)
  ON CONFLICT(verification_key) DO UPDATE SET
   technical=EXCLUDED.technical,website_checked_at=NOW(),website_error=$6,updated_at=NOW()
  RETURNING *`,
 [key,shop.country,shop.name,shop.website||null,JSON.stringify(result.technical),result.error||null]);
 return r.rows[0];
}