import {db,browser,scheduler} from 'hatchable';
import {COUNTRY_CODES} from 'lib/country-codes.js';
import {countryAreaCount,countryAreaAt} from 'lib/country-areas.js';
import {reviewOneShop} from 'lib/shop-review.js';

export const supportedCountry=code=>COUNTRY_CODES.has(code);
const short=s=>String(s||'').slice(0,150);
const validNum=(v,lim)=>Number.isFinite(Number(v))&&Math.abs(Number(v))<=lim;
const website=value=>{
 try{
  const url=new URL(String(value||''));
  if(url.protocol!=='https:'||url.username||url.password||url.port||url.hostname.length>130||
   !/^[a-z0-9.-]+$/.test(url.hostname)||url.hostname.includes('..'))return null;
  return url.origin+'/';
 }catch{return null}
};
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const parseLocation=(f,area,country)=>{
 const p=f.properties||{},code=String(p.countrycode||'').toUpperCase(),name=short(p.name);
 if(code!==country||name.length<3)return null;
 const kind=String(p.osm_value||'').toLowerCase(),tags=[p.name,p.category,p.description,p.brand,p.shop].filter(Boolean).join(' ');
 const pokemon=/pok[eé]mon|trading.?cards?|\btcg\b|cartas coleccionables|cartas pokemon/i.test(tags);
 if(!['games','collector','hobby','toys','comic','books','anime','gift','trading_cards','board_games'].includes(kind))return null;
 if(!pokemon&&['books','toys','gift'].includes(kind))return null;
 const [lon,lat]=f.geometry?.coordinates||[];
 if(!validNum(lat,85)||!validNum(lon,180)||!p.osm_id)return null;
 const type={N:'node',W:'way',R:'relation'}[p.osm_type];
 if(!type)return null;
 const url='https://www.openstreetmap.org/'+type+'/'+p.osm_id;
 return {id:'osm-'+type+'-'+p.osm_id,country,name,city:short(p.city||area.city||area.region),
  website:website(p.website||p['contact:website']),phone:short(p.phone||p['contact:phone'])||null,
  address:[p.street,p.housenumber,p.city].filter(Boolean).join(', ').slice(0,250)||null,
  lat:Number(lat),lon:Number(lon),store_type:website(p.website)?'hybrid':'physical',shop_kind:kind,
  source:'OpenStreetMap (vía Photon)',source_url:url,evidence_level:pokemon?'pokemon_mentioned':'category_match',pokemon_signal:pokemon};
};
async function photon(country,area,keyword){
 const lat=Number(area.lat),lon=Number(area.lon);
 if(!validNum(lat,85)||!validNum(lon,180))return {shops:[],ok:false,error:'Coordenadas no válidas'};
 const radius=area.kind==='region'?.36:.18;
 const bbox=[lon-radius,lat-radius,lon+radius,lat+radius].map(v=>v.toFixed(4)).join(',');
 const url='https://photon.komoot.io/api/?'+new URLSearchParams({q:keyword,bbox,lat:String(lat),lon:String(lon),limit:'60'});
 try{
  const data=await browser.session(async page=>{
   await page.goto(url,{waitUntil:'domcontentloaded'});
   const raw=await page.$eval('body',e=>e.innerText);
   return JSON.parse(raw.slice(0,175000));
  });
  const shops=(data.features||[]).map(f=>parseLocation(f,area,country)).filter(Boolean);
  return {shops,ok:true,error:null};
 }catch(e){return {shops:[],ok:false,error:short(e.message||e)}}
}
async function saveTemporary(shops){
 const vals=[...new Map(shops.map(s=>[s.id,s])).values()].slice(0,100);
 if(!vals.length)return 0;
 await db.query(`INSERT INTO discovered_shops
 (id,country,city,name,website,phone,address,lat,lon,store_type,shop_kind,source,source_url,evidence_level,pokemon_signal,expires_at)
 SELECT x.id,x.country,x.city,x.name,x.website,x.phone,x.address,x.lat,x.lon,x.store_type,x.shop_kind,x.source,x.source_url,x.evidence_level,x.pokemon_signal,NOW()+INTERVAL '24 hours'
 FROM jsonb_to_recordset($1::jsonb) AS x(id text,country char(2),city text,name text,website text,phone text,address text,lat double precision,lon double precision,store_type text,shop_kind text,source text,source_url text,evidence_level text,pokemon_signal boolean)
 ON CONFLICT(id) DO UPDATE SET last_seen=NOW(),expires_at=NOW()+INTERVAL '24 hours',
 website=COALESCE(discovered_shops.website,EXCLUDED.website),
 address=COALESCE(discovered_shops.address,EXCLUDED.address),
 pokemon_signal=discovered_shops.pokemon_signal OR EXCLUDED.pokemon_signal`,[JSON.stringify(vals)]);
 return vals.length;
}
export async function runCountryInvestigation(given=null){
 const due=await db.query(`SELECT country,status,phase,cursor,checked_zones,failed_zones,generation
 FROM country_investigations WHERE next_attempt<=NOW()
 AND (status IN('queued','partial','limited','error') OR (status='running' AND locked_at<NOW()-INTERVAL '15 minutes'))
 AND ($1::text IS NULL OR country=$1)
 ORDER BY CASE status WHEN 'queued' THEN 0 ELSE 1 END,updated_at ASC LIMIT 1`,[given]);
 const job=due.rows[0];
 if(!job)return {ok:true,processed:0,reason:'No hay análisis pendientes'};
 const locked=await db.query(`UPDATE country_investigations SET status='running',locked_at=NOW(),updated_at=NOW()
 WHERE country=$1 AND generation=$2 AND next_attempt<=NOW()
 AND (status IN('queued','partial','limited','error') OR (status='running' AND locked_at<NOW()-INTERVAL '15 minutes'))
 RETURNING country`,[job.country,job.generation]);
 if(!locked.rows.length)return {ok:true,processed:0,reason:'Otro proceso está comprobando el país'};
 const country=job.country,totalAreas=await countryAreaCount(country);
 let phase=job.phase,cursor=Number(job.cursor),checked=0,failed=0,found=0,reviewed=0;
 let note='',error=null,lastCity=null;
 try{
  if(phase==='discover'){
   // Batch 2 independent areas per job; limited calls protect third-party providers.
   const tasks=[];
   for(let i=0;i<2&&cursor+i<totalAreas;i++){
    const area=await countryAreaAt(country,cursor+i);
    if(area)tasks.push(area);
   }
   if(!tasks.length){phase='verify';cursor=0;note='Se han consultado las áreas planificadas; comienza la verificación individual.';}
   else{
    const results=await Promise.all(tasks.map(async (a,i)=>{
     const keys=[i===0?'Pokémon':'TCG',i===0?'card':'juegos'];
     const p=await Promise.all(keys.map(k=>photon(country,a,k)));
     return {area:a,lookups:p};
    }));
    const items=[],bad=[];
    for(const r of results){
     const ok=r.lookups.some(v=>v.ok);
     if(ok)checked++;else {failed++;bad.push(r.area.city||r.area.region)}
     items.push(...r.lookups.flatMap(v=>v.shops));
    }
    found=await saveTemporary(items);
    cursor+=tasks.length;
    lastCity=tasks.at(-1).city||tasks.at(-1).region||'Zona geográfica';
    note='Analizadas '+tasks.length+' áreas: '+tasks.map(a=>a.city||a.region).join(', ').slice(0,170)+'. '+found+' candidatas con referencia geográfica.';
    if(bad.length)error='El proveedor no respondió en '+bad.join(', ').slice(0,110);
    if(cursor>=totalAreas)phase='verify';
   }
  }else if(phase==='verify'){
   const foundRows=await db.query(`SELECT s.id,s.website,s.name,s.country,s.city,s.address,s.pokemon_signal,s.store_type,s.source
     FROM discovered_shops s LEFT JOIN discovered_shop_evidence e ON e.shop_id=s.id
     WHERE s.country=$1 AND s.expires_at>NOW() AND (e.shop_id IS NULL OR e.last_checked_at<NOW()-INTERVAL '24 hours')
     ORDER BY s.pokemon_signal DESC,s.last_seen DESC LIMIT 1`,[country]);
   const shop=foundRows.rows[0];
   if(!shop){phase='finished';note='Revisión individual terminada para las tiendas encontradas. No equivale a un censo nacional de comercios.';}
   else {
    try{const review=await reviewOneShop(shop);reviewed=1;note='Revisada: '+shop.name+' — '+(review.level==='documented'?'fuentes corroboradas':'verificación comercial insuficiente');}
    catch(e){
     error='Error al revisar '+shop.name+': '+short(e.message||e);
     await db.query(`INSERT INTO discovered_shop_evidence(shop_id,website_checked_at,website_note,verification_level)
      VALUES($1,NOW(),$2,'pending') ON CONFLICT(shop_id)
      DO UPDATE SET website_checked_at=NOW(),website_note=$2,last_checked_at=NOW()`,[shop.id,error]);
     reviewed=1;note='Revisión inconclusa de '+shop.name+'; se continuará con otros candidatos.';
    }
   }
  }
 }catch(e){error=short(e.message||e);note='Se conserva el progreso anterior; hay una limitación temporal en la investigación.'}
 const done=phase==='finished';
 const status=done?'completed':error?'limited':'partial';
 const nextDelay=done?86400:failed>0&&checked===0?90:25;
 await db.query(`UPDATE country_investigations SET status=$3,phase=$4,cursor=$5,
 checked_zones=checked_zones+$6,failed_zones=failed_zones+$7,
 checked_sites=checked_sites+$8,
 candidates_found=(SELECT COUNT(*)::integer FROM discovered_shops WHERE country=$1 AND expires_at>NOW()),
 last_city=COALESCE($9,last_city),last_note=$10,last_error=$11,
 updated_at=NOW(),finished_at=CASE WHEN $12 THEN NOW() ELSE NULL END,
 next_attempt=NOW()+($13::integer*INTERVAL '1 second'),locked_at=NULL
 WHERE country=$1 AND generation=$2`,
 [country,job.generation,status,phase,cursor,checked,failed,reviewed,lastCity,note,error,done,nextDelay]);
 if(!done){try{await scheduler.at(new Date(Date.now()+nextDelay*1000),'/api/jobs/country-investigation',{payload:{country}})}catch{}}
 return {ok:!error,processed:1,country,status,phase,attempted:cursor,checked,failed,found,reviewed,note,error,
  limitation:'Áreas consultadas no equivale a tiendas totales del país. Fuentes de búsqueda web general no conectadas.'};
}