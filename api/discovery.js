import {db} from 'hatchable';
import {zoneSeeds,AREA_CENTERS} from 'lib/discovery-zones.js';
import {COUNTRY_CODES} from 'lib/country-codes.js';
export const access='admin';export const methods=['GET','POST'];
const validCountry=x=>COUNTRY_CODES.has(x)||['SG','HK','AD','MC','LU','BH','QA'].includes(x);
const safeNum=(v,a,b)=>Number.isFinite(Number(v))&&Number(v)>=a&&Number(v)<=b;
const clean=s=>String(s||'').trim().slice(0,90);
async function snapshot(country,city,page=1){
 const areaFilter=city?"country=$1 AND lower(city)=lower($2)":"country=$1";
 const filters=city?"country=$1 AND expires_at>NOW() AND lower(city)=lower($2)":"country=$1 AND expires_at>NOW()";
 const args=city?[country,city]:[country];
 const [areas,totals,results]=await Promise.all([
  db.query(`SELECT id,city,status,discoveries,attempts,checked_at,last_error,next_attempt FROM discovery_areas
   WHERE ${areaFilter} ORDER BY created_at ASC LIMIT 45`,args),
  db.query(`SELECT COUNT(*)::integer total,COUNT(*) FILTER(WHERE pokemon_signal)::integer pokemon_indicated
   FROM discovered_shops WHERE ${filters}`,args),
  db.query(`SELECT id,country,city,name,website,phone,address,lat,lon,store_type,
   shop_kind,source,source_url,evidence_level,pokemon_signal,review_status,last_seen
   FROM discovered_shops WHERE ${filters}
   ORDER BY pokemon_signal DESC,last_seen DESC,name ASC
   LIMIT 40 OFFSET $3`,[country,city,Math.max(0,page-1)*40])
 ]);
 const checks=results.rows.length?await db.query('SELECT shop_id,website_reachable,website_checked_at,website_note,published_contact,published_conditions,published_identity,verification_level,independent_sources,last_checked_at FROM discovered_shop_evidence WHERE shop_id=ANY($1::text[])',[results.rows.map(x=>x.id)]):{rows:[]};
 const checkById=new Map(checks.rows.map(x=>[x.shop_id,x]));
 const data=results.rows.map(s=>{
  const verification=checkById.get(s.id)||null;
  const sources=Array.isArray(verification?.independent_sources)?verification.independent_sources:[];
  const documented=verification?.verification_level==='documented'&&sources.length>=2;
  const trust={
   level:documented?'green':'yellow',
   label:documented?'Identidad y actividad corroboradas':verification?.last_checked_at?'Revisada · faltan pruebas':'Sin revisar · por comprobar',
   checkedAt:verification?.last_checked_at||null,
   summary:documented?'Existen referencias externas contrastadas y datos comerciales publicados; no es garantía de pago ni entrega.':
    verification?.website_reachable===true?'La web publicada funciona, pero faltan pruebas externas suficientes para recomendar compras.':verification?.last_checked_at?'Se ha revisado la información disponible de esta tienda, pero aún falta corroborar su identidad y fiabilidad comercial.':'Candidata encontrada; pendiente de revisión individual y fuentes independientes.',
   positives:sources.map(x=>'Referencia externa: '+x.label),
   cautions:['Comprobar registros oficiales, condiciones de compra y opiniones recientes antes de pagar.'],
   sources:sources.map(x=>({label:x.label,url:x.url,type:'tercero'})),
   review:null,recommended:documented,confidence:documented?'moderada':'no evaluada'
  };
  return {...s,trust,verification,discovery:'researched',selected:s.review_status==='needs_review',approvedHost:false,autoEnabled:false,
   products:0,preorders:0,other:0,pokemon:0,unclassified:0,
   storeType:s.store_type,scanStatus:'not_registered',badge:documented?'green':'yellow',
   sourceUrl:s.source_url,typeLabel:s.shop_kind==='games'?'Juegos y cartas':'Comercio relacionado',
   note:'Ficha con fuentes documentadas. La accesibilidad no certifica compras ni entregas.'};
 });
 return {shops:data,total:totals.rows[0]?.total||0,pokemonIndicated:totals.rows[0]?.pokemon_indicated||0,
  areas:areas.rows,queued:areas.rows.filter(s=>['queued','running','partial'].includes(s.status)).length,
  completed:areas.rows.filter(s=>s.status==='completed').length,
  failed:areas.rows.filter(s=>['error','limited'].includes(s.status)).length,
  coverage:'Investigación incremental: cada zona explorada cubre un radio limitado; no representa todas las tiendas del país.',
  checkedAt:new Date().toISOString()};
}
export default async function(req,res){
 const body=req.method==='POST'?(typeof req.body==='string'?JSON.parse(req.body):req.body||{}):req.query||{};
 const country=clean(body.country).toUpperCase(),city=clean(body.city);
 if(!validCountry(country))return res.status(400).json({error:'Selecciona primero un país disponible'});
 if(req.method==='GET'){
  const page=Math.max(1,Math.min(25,Number(body.page)||1));
  return res.json(await snapshot(country,city,page));
 }
 const action=String(body.action||'');
 if(action==='follow')return res.status(400).json({error:'Para guardar una tienda debes pulsar Añadir a mi directorio desde su ficha'});
 // Las candidatas no se guardan en el directorio. Solo se añaden mediante una acción explícita.
 if(action!=='start')return res.status(400).json({error:'Acción no soportada'});
 const isCity=city.length>0;
 if(isCity&&(!safeNum(body.lat,-85,85)||!safeNum(body.lon,-180,180)))
  return res.status(400).json({error:'Selecciona una ciudad reconocida con coordenadas'});
 let zones=isCity?
  [{city,lat:Number(body.lat),lon:Number(body.lon),radius:6500}]:
  zoneSeeds(country).slice(0,6);
 if(!zones.length)return res.json({...await snapshot(country,city),added:0,
   message:'Todavía no hay zonas base para este país; selecciona una ciudad para investigarla.'});
 const budget=await db.query(`SELECT COUNT(*)::integer today FROM discovery_areas WHERE created_at>NOW()-INTERVAL '1 day'`);
 const remaining=Math.max(0,16-Number(budget.rows[0]?.today||0));
 let added=0;
 for(const z of zones.slice(0,remaining)){
  if(!safeNum(z.lat,-85,85)||!safeNum(z.lon,-180,180))continue;
  const entry=await db.query(`INSERT INTO discovery_areas(country,city,lat,lon,radius)
   VALUES($1,$2,$3,$4,$5) ON CONFLICT(country,city,lat,lon) DO NOTHING RETURNING id`,
   [country,z.city||'',Number(z.lat),Number(z.lon),Math.min(14000,Number(z.radius||6500))]);
  if(entry.rows.length)added++;
 }
 return res.json({...await snapshot(country,city),added,message:added?
  'Investigación registrada. Se conservarán los resultados contrastados y las zonas pendientes.':
  'La zona ya está en seguimiento o se ha alcanzado el límite de nuevas investigaciones por día.'});
}