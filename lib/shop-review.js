import {browser,db} from 'hatchable';
// La revisión se realiza una tienda a la vez. La ausencia de pruebas no es fraude.
// No se consultan automáticamente directorios que prohíben la extracción masiva.
const clean=s=>String(s||'').slice(0,180);
const hostOf=value=>{
 try{
  const u=new URL(String(value||''));
  const host=u.hostname.toLowerCase();
  if(u.protocol!=='https:'||u.username||u.password||u.port||host.length>130||
    !/^[a-z0-9.-]+$/.test(host)||host.includes('..')||
    /^(localhost|\d+\.\d+\.\d+\.\d+)$/.test(host))return null;
  return {host,url:u.origin+'/'};
 }catch{return null}
};
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();

export async function reviewOneShop(shop){
 let reachable=null,contact=false,conditions=false,identity=false;
 let note='',method='referencia pública',url=hostOf(shop.website)?.url||null;
 const claimed=!!shop.pokemon_signal,ref=String(shop.source||'');
 if(url){
  method='web del comercio';
  try{
   const response=await browser.session(async page=>{
    await page.goto(url,{waitUntil:'domcontentloaded'});
    return {url:await page.url(),body:await page.$eval('body',el=>el.innerText.slice(0,18000))};
   });
   const origin=hostOf(response.url);
   if(!origin||origin.host!==hostOf(url).host)throw Error('La web redirige a otro dominio; revisión pendiente');
   const body=norm(response.body);
   reachable=true;
   contact=/contacto|contact us|tel[eé]fono|whatsapp|email|correo|contact|address|direcci[oó]n/.test(body);
   conditions=/devoluci[oó]n|refund|return policy|t[eé]rminos|terms|aviso legal|privacy|shipping|env[ií]o/.test(body);
   identity=/ruc\s*[:#]?\s*\d{11}|cif\s*[:#]?|vat\s*(number|id)|company registration|raz[oó]n social|registro mercantil|r[uú]c/.test(body);
   note='Web publicada accesible. '+(claimed?'Referencia a Pokémon TCG disponible. ':'Actividad Pokémon todavía sin verificar. ')+
    'Contacto '+(contact?'detectado':'no confirmado')+', condiciones '+(conditions?'detectadas':'sin confirmar')+
    ', datos legales '+(identity?'publicados sin contraste registral':'pendientes')+
    '. Sin certificación de pedidos, opiniones ni identidad.';
  }catch(e){note='La web publicada no pudo contrastarse: '+clean(e.message||e)+'. No es prueba de riesgo comercial.'}
 }else{
  note='Tienda '+(shop.store_type==='physical'?'física':'sin dominio web propio')+' con referencia '+ref+
   '. '+(claimed?'Existe indicio externo de Pokémon TCG. ':'Todavía no hay confirmación independiente de ventas Pokémon TCG. ')+
   'Dirección: '+(shop.address?'publicada sin comprobación presencial':'no documentada')+
   '. No se confirma identidad legal, pedidos ni opiniones.';
 }
 const previous=await db.query('SELECT verification_level,independent_sources FROM discovered_shop_evidence WHERE shop_id=$1',[shop.id]);
 const record=previous.rows[0],sources=Array.isArray(record?.independent_sources)?record.independent_sources:[];
 // Preserve prior documentary corroboration; never downgrade a reviewed dossier silently.
 const level=record?.verification_level==='documented'&&sources.length>=2?'documented':
  reachable===true?'limited':'pending';
 await db.query(`INSERT INTO discovered_shop_evidence
  (shop_id,website_reachable,website_checked_at,website_note,published_contact,
   published_conditions,published_identity,last_checked_at,verification_level)
  VALUES($1,$2,NOW(),$3,$4,$5,$6,NOW(),$7)
  ON CONFLICT(shop_id) DO UPDATE SET
   website_reachable=EXCLUDED.website_reachable,website_checked_at=NOW(),
   website_note=EXCLUDED.website_note,published_contact=EXCLUDED.published_contact,
   published_conditions=EXCLUDED.published_conditions,published_identity=EXCLUDED.published_identity,
   last_checked_at=NOW(),verification_level=EXCLUDED.verification_level`,
 [shop.id,reachable,note,contact,conditions,identity,level]);
 return {id:shop.id,name:shop.name,level,reachable,method};
}