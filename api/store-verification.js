import {db} from 'hatchable';
import {findShopToVerify,verificationKey,evaluateVerification,saveTechnicalCheck} from 'lib/store-verification.js';
import {checkMerchantWebsite} from 'lib/store-site-analyzer.js';
import {hostFor} from 'lib/research-identity.js';

export const access='admin';
export const methods=['GET','POST'];
const safeId=value=>String(value||'').trim().slice(0,145);
async function lookup(id){
 const shop=await findShopToVerify(id);
 if(!shop)return null;
 const key=verificationKey(shop);
 const r=await db.query('SELECT * FROM shop_verification_reports WHERE verification_key=$1',[key]);
 return {shop,key,report:r.rows[0]||null};
}
export default async function(req,res){
 const body=req.method==='POST'?(typeof req.body==='string'?JSON.parse(req.body):req.body||{}):req.query||{};
 const id=safeId(body.id);
 if(!id)return res.status(400).json({error:'Selecciona una tienda para su revisión'});
 const located=await lookup(id);
 if(!located)return res.status(404).json({error:'La tienda no aparece en el directorio de investigación'});
 if(req.method==='GET')return res.json({
  shop:{id:located.shop.id,name:located.shop.name,country:located.shop.country},
  trust:evaluateVerification(located.report),profileAvailable:!!located.report,
  policy:'La verificación es comercial/documental; accesibilidad y seguimiento de precios son comprobaciones separadas.'
 });
 const action=String(body.action||'');
 if(action!=='check_web')return res.status(400).json({error:'Acción no disponible. El buscador de tiendas sigue pausado.'});
 if(!hostFor(located.shop.website))return res.status(422).json({error:'No hay un dominio público de la tienda para comprobar'});
 if(located.report?.website_checked_at&&
  Date.now()-Date.parse(located.report.website_checked_at)<6*3600000)
  return res.json({ok:true,cached:true,trust:evaluateVerification(located.report),
   message:'Se ha reutilizado la revisión técnica reciente. La evidencia comercial no ha cambiado.'});
 // One manually requested site at a time. The scanner does not attempt to find
 // external reputation or claim to verify official registries automatically.
 const result=await checkMerchantWebsite(located.shop);
 const updated=await saveTechnicalCheck(located.shop,result);
 const trust=evaluateVerification(updated);
 return res.json({ok:true,cached:false,trust,technical:result.technical,
  message:result.error?'Acceso no concluyente. Las pruebas documentales se conservan.':
   'Comprobación técnica completada. El color comercial solo cambia si hay nuevas pruebas independientes revisadas.'});
}