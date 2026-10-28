import {db} from 'hatchable';
// Bounded OSM discovery: one shared provider call per >= 15 minutes, one area per job.
// This is not a complete commercial database; candidates always retain source and uncertainty.
const okNum=(v,a,b)=>Number.isFinite(Number(v))&&Number(v)>=a&&Number(v)<=b;
function safeLink(value){
 if(!value)return null;
 try{
  const u=new URL(/^https?:\/\//i.test(value)?value:'https://'+value);
  if(u.protocol!=='https:'||u.username||u.password||u.port||u.hostname.length>150||
   /^(?:localhost|(?:\d{1,3}\.){3}\d{1,3})$/.test(u.hostname)||
   /\.(?:local|internal|test|invalid)$/i.test(u.hostname))return null;
  return u.origin+'/';
 }catch{return null}
}
function parseCandidate(e,area){
 const tags=e.tags||{},name=String(tags.name||tags['name:es']||'').trim();
 const k=String(tags.shop||'');
 if(name.length<3||name.length>150||!['games','hobby','collector','toys'].includes(k))return null;
 const evidence=String([name,tags.description,tags.brand,tags.games,tags['product'],tags['shop:products']].filter(Boolean).join(' ')).slice(0,280);
 const pokemon=/pok[eé]mon|\btcg\b|trading card|cartas coleccionables|cartas pok[eé]mon/i.test(evidence);
 if(k==='toys'&&!pokemon&&!/card game|juegos de mesa|boardgames/i.test(evidence))return null;
 const point=e.center||e,lat=Number(point.lat),lon=Number(point.lon);
 if(!okNum(lat,-85,85)||!okNum(lon,-180,180))return null;
 const url='https://www.openstreetmap.org/'+String(e.type)+'/'+String(e.id);
 const city=String(tags['addr:city']||area.city||'').slice(0,100);
 return {id:'osm-'+e.type+'-'+e.id,country:area.country,city,name,
  website:safeLink(tags.website||tags['contact:website']||tags.url),
  phone:String(tags.phone||tags['contact:phone']||'').slice(0,90)||null,
  address:[tags['addr:street'],tags['addr:housenumber'],tags['addr:city']].filter(Boolean).join(' ').slice(0,250)||null,
  lat,lon,store_type:'physical',shop_kind:k,source:'OpenStreetMap',source_url:url,
  pokemon_signal:pokemon,evidence_level:pokemon?'pokemon_mentioned':k==='games'?'category_match':'location_only'};
}

function distKm(a,b,c,d){
 const R=6371,toRad=x=>x*Math.PI/180;
 const p=(c-a)*Math.PI/180,dl=(d-b)*Math.PI/180;
 return 2*R*Math.asin(Math.sqrt(Math.sin(p/2)**2+Math.cos(toRad(a))*Math.cos(toRad(c))*Math.sin(dl/2)**2));
}
async function photonFallback(area,radius){
 const found=new Map();
 // Fallback is an OSM name search; it is not a complete business search.
 for(const keyword of ['Pokemon TCG','trading card games']){
  try{
   const query=new URLSearchParams({q:keyword,lat:String(area.lat),lon:String(area.lon),limit:'30'});
   const response=await fetch('https://photon.komoot.io/api?'+query,{
    headers:{Accept:'application/json'},signal:AbortSignal.timeout(3500)});
   if(!response.ok)continue;
   const data=await response.json();
   for(const f of data.features||[]){
    const p=f.properties||{},xy=f.geometry?.coordinates||[],lon=Number(xy[0]),lat=Number(xy[1]);
    if(!okNum(lat,-85,85)||!okNum(lon,-180,180)||distKm(Number(area.lat),Number(area.lon),lat,lon)>radius/1000)continue;
    if(String(p.countrycode||'').toUpperCase()!==area.country)continue;
    const value=String(p.osm_value||'').toLowerCase();
    if(!['games','collector','hobby','toys','books','comic'].includes(value))continue;
    const name=String(p.name||'').trim();
    if(name.length<3||name.length>150)continue;
    const id='photon-'+p.osm_type+'-'+p.osm_id;
    if(!p.osm_id||!/^[NWR]$/.test(String(p.osm_type||'')))continue;
    const kind={N:'node',W:'way',R:'relation'}[p.osm_type];
    found.set(id,{id,country:area.country,city:String(area.city||p.city||'').slice(0,100),
     name,website:null,phone:null,address:[p.street,p.housenumber,p.city].filter(Boolean).join(' ').slice(0,250)||null,
     lat,lon,store_type:'physical',shop_kind:value,source:'Photon / OpenStreetMap',
     source_url:'https://www.openstreetmap.org/'+kind+'/'+p.osm_id,
     pokemon_signal:/pok[eé]mon|\btcg\b|trading card/i.test(name),
     evidence_level:/pok[eé]mon|\btcg\b|trading card/i.test(name)?'pokemon_mentioned':'location_only'});
   }
  }catch(e){}
 }
 return [...found.values()];
}

export async function runDiscoveryArea(){
 const due=await db.query(`SELECT id,country,city,lat,lon,radius,attempts FROM discovery_areas
  WHERE (status IN('queued','partial','limited','error','completed') AND next_attempt<=NOW()) OR (status='running' AND last_started<NOW()-INTERVAL '35 minutes')
  ORDER BY CASE status WHEN 'queued' THEN 0 ELSE 1 END,created_at ASC LIMIT 1`);
 const area=due.rows[0];if(!area)return {ok:true,processed:0,reason:'No hay zonas pendientes'};
 const lock=await db.query(`UPDATE discovery_provider_throttle SET last_called=NOW()
  WHERE id=1 AND last_called<NOW()-INTERVAL '15 minutes' RETURNING id`);
 if(!lock.rows.length)return {ok:true,processed:0,reason:'Intervalo global entre consultas geográficas'};
 const claimed=await db.query(`UPDATE discovery_areas SET status='running',last_started=NOW(),attempts=attempts+1
 WHERE id=$1 AND ((status IN('queued','partial','limited','error','completed') AND next_attempt<=NOW()) OR (status='running' AND last_started<NOW()-INTERVAL '35 minutes')) RETURNING id`,[area.id]);
 if(!claimed.rows.length)return {ok:true,processed:0,reason:'Zona ya reclamada'};
 let candidates=[],failure=null,limited=false;
 try{
  const radius=Math.min(9000,Math.max(2000,Number(area.radius)));
  const query='[out:json][timeout:7];(nwr["shop"~"^(games|hobby|collector)$"](around:'+radius+','+Number(area.lat).toFixed(4)+','+Number(area.lon).toFixed(4)+');nwr["shop"="toys"]["name"~"Pok[eé]mon|TCG|cards|cartas|juegos de mesa",i](around:'+radius+','+Number(area.lat).toFixed(4)+','+Number(area.lon).toFixed(4)+'););out center 60;';
  const response=await fetch('https://overpass-api.de/api/interpreter?data='+encodeURIComponent(query),{
   headers:{Accept:'application/json','User-Agent':'TCGAtlasDirectory/1.0 (bounded OpenStreetMap candidate lookup)'},
   signal:AbortSignal.timeout(9500)});
  if(!response.ok){limited=[429,503,504].includes(response.status);throw Error('Proveedor geográfico HTTP '+response.status)}
  const json=await response.json();
  if(!Array.isArray(json.elements))throw Error('Formato de la fuente no reconocido');
  const seen=new Set();
  for(const element of json.elements){
   const parsed=parseCandidate(element,area);if(!parsed||seen.has(parsed.id))continue;
   seen.add(parsed.id);candidates.push(parsed);
  }

 }catch(e){
  failure=String(e).slice(0,200);limited=/429|503|504|timeout|aborted|timed out/i.test(failure);
  const fallback=await photonFallback(area,Math.min(9000,Math.max(2000,Number(area.radius))));
  for(const c of fallback)if(!candidates.some(x=>x.source_url===c.source_url))candidates.push(c);
 }
   if(candidates.length){
   await db.query(`INSERT INTO discovered_shops
    (id,country,city,name,website,phone,address,lat,lon,store_type,shop_kind,source,source_url,evidence_level,pokemon_signal)
    SELECT x.id,x.country,x.city,x.name,x.website,x.phone,x.address,x.lat,x.lon,x.store_type,x.shop_kind,x.source,x.source_url,x.evidence_level,x.pokemon_signal
    FROM jsonb_to_recordset($1::jsonb) AS x(id text,country char(2),city text,name text,website text,phone text,address text,lat double precision,lon double precision,store_type text,shop_kind text,source text,source_url text,evidence_level text,pokemon_signal boolean)
    WHERE true ON CONFLICT(id) DO UPDATE SET last_seen=NOW(),name=EXCLUDED.name,website=COALESCE(EXCLUDED.website,discovered_shops.website),
      phone=COALESCE(EXCLUDED.phone,discovered_shops.phone),address=COALESCE(EXCLUDED.address,discovered_shops.address),
      evidence_level=EXCLUDED.evidence_level,pokemon_signal=EXCLUDED.pokemon_signal`,[JSON.stringify(candidates)]);
  }
 
 const attempts=Number(area.attempts||0)+1;
 const backoff=failure?Math.min(7*24,Math.max(6,Math.pow(2,Math.min(attempts,4)))):24*14;
 await db.query(`UPDATE discovery_areas SET status=$2,checked_at=NOW(),discoveries=$3,last_error=$4,
   next_attempt=NOW()+($5::integer*INTERVAL '1 hour') WHERE id=$1`,
 [area.id,failure?(limited?'limited':'error'):'completed',candidates.length,failure,backoff]);
 return {ok:!failure,processed:1,area:area.id,country:area.country,city:area.city,
  found:candidates.length,error:failure,retryHours:backoff,
  disclaimer:'Búsqueda parcial por radio. No garantiza el censo de todas las tiendas, ni certifica que vendan Pokémon.'};
}