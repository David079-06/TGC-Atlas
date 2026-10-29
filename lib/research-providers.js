import {db} from 'hatchable';
import {hostFor} from 'lib/research-identity.js';

// Public, community-operated endpoints. Strict caps are deliberately below
// advertised hard ceilings: no paid API, no account, no credit card.
export const FREE_PROVIDER_LIMITS={
 photon:{daily:48,gapSeconds:180},
 overpass:{daily:6,gapSeconds:1800}
};
const safe=x=>String(x?.message||x||'').slice(0,180);
const validCoord=(value,min,max)=>Number.isFinite(Number(value))&&Number(value)>=min&&Number(value)<=max;
const signal=text=>/pok[eé]mon|\btcg\b|trading.?cards?|cartas coleccionables|cartas pok[eé]mon/i.test(String(text||''));
const relevantShops=new Set(['games','hobby','collector','trading_cards','board_games','toys','comic','anime','books','gift']);
const endpointUrl=(kind,id)=>'https://www.openstreetmap.org/'+kind+'/'+id;
const safeWebsite=value=>{const h=hostFor(value);return h?'https://'+h+'/':null};

export async function providerDelay(provider){
 const rule=FREE_PROVIDER_LIMITS[provider];
 if(!rule)return 86400;
 const q=await db.query('SELECT quota_day,used_today,next_allowed_at,consecutive_failures FROM research_source_budget WHERE provider=$1',[provider]);
 const item=q.rows[0];if(!item)return 0;
 const now=Date.now(),next=Date.parse(item.next_allowed_at||0);
 let seconds=Number.isFinite(next)?Math.max(0,Math.ceil((next-now)/1000)):0;
 const day=new Date().toISOString().slice(0,10);
 if(String(item.quota_day).slice(0,10)===day&&Number(item.used_today)>=rule.daily){
  seconds=Math.max(seconds,Math.ceil((Date.parse(day+'T00:00:00Z')+86400000-now)/1000)+30);
 }
 return Math.max(0,Math.min(90000,seconds));
}
async function claim(provider){
 const rule=FREE_PROVIDER_LIMITS[provider];if(!rule)return false;
 await db.query('INSERT INTO research_source_budget(provider) VALUES($1) ON CONFLICT DO NOTHING',[provider]);
 const result=await db.query(`UPDATE research_source_budget SET
  quota_day=CURRENT_DATE,
  used_today=CASE WHEN quota_day=CURRENT_DATE THEN used_today+1 ELSE 1 END,
  attempts=attempts+1,
  next_allowed_at=NOW()+($2::integer*INTERVAL '1 second'),
  last_called_at=NOW(),updated_at=NOW()
 WHERE provider=$1 AND next_allowed_at<=NOW()
  AND (quota_day<>CURRENT_DATE OR used_today<$3)
 RETURNING provider`,[provider,rule.gapSeconds,rule.daily]);
 return result.rows.length>0;
}
async function record(provider,ok,status=null,error=''){
 // Success clears the circuit breaker; repeated failures trigger a long cooldown.
 await db.query(`UPDATE research_source_budget SET
 successes=successes+CASE WHEN $2 THEN 1 ELSE 0 END,
 failures=failures+CASE WHEN $2 THEN 0 ELSE 1 END,
 consecutive_failures=CASE WHEN $2 THEN 0 ELSE LEAST(10,consecutive_failures+1) END,
 last_http_status=$3,last_error=CASE WHEN $2 THEN NULL ELSE $4 END,
 next_allowed_at=CASE WHEN $2 THEN next_allowed_at ELSE
  GREATEST(next_allowed_at,NOW()+
    (CASE WHEN consecutive_failures>=2 THEN 43200 ELSE 1800 END)*INTERVAL '1 second')
  END,updated_at=NOW() WHERE provider=$1`,[provider,ok,status,safe(error)]);
}
async function getCached(provider,country,areaKey){
 if(!areaKey)return null;
 const q=await db.query(`SELECT found FROM research_geo_cache
 WHERE provider=$1 AND country=$2 AND area_key=$3 AND expires_at>NOW() AND outcome='ok'`,
 [provider,country,areaKey]);
 return q.rows[0]||null;
}
async function cacheSuccess(provider,country,areaKey,count){
 if(!areaKey)return;
 await db.query(`INSERT INTO research_geo_cache(country,area_key,provider,found,expires_at,outcome)
 VALUES($1,$2,$3,$4,NOW()+INTERVAL '30 days','ok')
 ON CONFLICT(country,area_key,provider) DO UPDATE SET
 checked_at=NOW(),expires_at=EXCLUDED.expires_at,found=EXCLUDED.found,outcome='ok'`,
 [country,areaKey,provider,Math.max(0,Number(count)||0)]);
}
async function controlled(provider,country,area,fetcher){
 const areaKey=String(area.area_key||'');
 const previous=await getCached(provider,country,areaKey);
 if(previous)return {provider,state:'cached',shops:[],found:Number(previous.found)||0,waitSeconds:0,error:null};
 if(!await claim(provider)){
  return {provider,state:'throttled',shops:[],found:0,waitSeconds:await providerDelay(provider),error:null};
 }
 try{
  const shops=await fetcher();
  await record(provider,true,200);
  await cacheSuccess(provider,country,areaKey,shops.length);
  return {provider,state:'ok',shops,found:shops.length,waitSeconds:0,error:null};
 }catch(e){
  await record(provider,false,Number(e.status)||null,safe(e));
  return {provider,state:'error',shops:[],found:0,error:safe(e),waitSeconds:await providerDelay(provider)};
 }
}
async function getJson(url,timeout=6500){
 const response=await fetch(url,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(timeout)});
 if(!response.ok){const error=new Error('HTTP '+response.status);error.status=response.status;throw error;}
 const data=await response.json();
 if(!data||typeof data!=='object')throw Error('Respuesta no reconocida');
 return data;
}
function photonCandidate(f,area,country){
 const p=f.properties||{},raw=String(p.name||'').slice(0,160).trim();
 if(raw.length<3||String(p.countrycode||'').toUpperCase()!==country||!p.osm_id)return null;
 const kind=String(p.osm_value||'').toLowerCase();
 if(!relevantShops.has(kind))return null;
 const mentioned=signal([raw,p.description,p.brand,p.shop].join(' '));
 if(!mentioned&&['books','toys','gift'].includes(kind))return null;
 const type={N:'node',W:'way',R:'relation'}[p.osm_type];
 const xy=f.geometry?.coordinates||[],lat=Number(xy[1]),lon=Number(xy[0]);
 if(!type||!validCoord(lat,-85,85)||!validCoord(lon,-180,180))return null;
 const website=safeWebsite(p.website||p['contact:website']);
 return {id:'osm-'+type+'-'+p.osm_id,country,name:raw,city:String(p.city||area.city||area.region||'').slice(0,100),
 website,phone:String(p.phone||p['contact:phone']||'').slice(0,90)||null,
 address:[p.street,p.housenumber,p.city].filter(Boolean).join(', ').slice(0,250)||null,
 lat,lon,store_type:website?'hybrid':'physical',shop_kind:kind,
 source:'OpenStreetMap / Photon',source_url:endpointUrl(type,p.osm_id),
 evidence_level:mentioned?'pokemon_mentioned':'category_match',pokemon_signal:mentioned};
}
export async function scanPhoton(country,area,index=0){
 const words=['Pokémon','TCG','trading card games','cartas coleccionables'];
 const keyword=words[Math.abs(Number(index)||0)%words.length];
 const lat=Number(area.lat),lon=Number(area.lon);
 if(!validCoord(lat,-85,85)||!validCoord(lon,-180,180))
  return {provider:'photon',state:'invalid',shops:[],error:'Coordenadas no válidas'};
 const scale=area.kind==='region'?.36:.18;
 const bbox=[lon-scale,lat-scale,lon+scale,lat+scale].map(v=>v.toFixed(4)).join(',');
 const url='https://photon.komoot.io/api/?'+new URLSearchParams({
  q:keyword,bbox,lat:String(lat),lon:String(lon),limit:'50'
 });
 return controlled('photon',country,area,async()=>{
  const data=await getJson(url,6500);
  if(!Array.isArray(data.features))throw Error('Photon no devolvió resultados válidos');
  return data.features.map(f=>photonCandidate(f,area,country)).filter(Boolean);
 });
}
function overpassCandidate(e,area,country){
 const t=e.tags||{},kind=String(t.shop||'').toLowerCase();
 if(!relevantShops.has(kind))return null;
 const name=String(t.name||t['name:es']||'').trim().slice(0,160);
 const mentioned=signal([name,t.description,t.brand,t.games,t.products].join(' '));
 if(name.length<3||(!mentioned&&['toys','books','gift'].includes(kind)))return null;
 const xy=e.center||e,lat=Number(xy.lat),lon=Number(xy.lon);
 if(!validCoord(lat,-85,85)||!validCoord(lon,-180,180)||
  !['node','way','relation'].includes(e.type)||!e.id)return null;
 const website=safeWebsite(t.website||t['contact:website']);
 return {id:'osm-'+e.type+'-'+e.id,country,name,
 city:String(t['addr:city']||area.city||area.region||'').slice(0,100),
 website,phone:String(t.phone||t['contact:phone']||'').slice(0,90)||null,
 address:[t['addr:street'],t['addr:housenumber'],t['addr:city']].filter(Boolean).join(', ').slice(0,250)||null,
 lat,lon,store_type:website?'hybrid':'physical',shop_kind:kind,
 source:'OpenStreetMap / Overpass',source_url:endpointUrl(e.type,e.id),
 evidence_level:mentioned?'pokemon_mentioned':'category_match',pokemon_signal:mentioned};
}
export async function scanOverpass(country,area){
 const lat=Number(area.lat),lon=Number(area.lon);
 if(!validCoord(lat,-85,85)||!validCoord(lon,-180,180))
  return {provider:'overpass',state:'invalid',shops:[],error:'Coordenadas no válidas'};
 const radius=area.kind==='region'?8000:4000;
 const query='[out:json][timeout:7];(nwr["shop"~"^(games|hobby|collector|trading_cards)$"](around:'+
  radius+','+lat.toFixed(4)+','+lon.toFixed(4)+');nwr["shop"="toys"]["name"~"Pokémon|Pokemon|TCG|cartas",i](around:'+
  radius+','+lat.toFixed(4)+','+lon.toFixed(4)+'););out center 60;';
 return controlled('overpass',country,area,async()=>{
  const url='https://overpass-api.de/api/interpreter?data='+encodeURIComponent(query);
  const data=await getJson(url,8500);
  if(!Array.isArray(data.elements))throw Error('Overpass no devolvió elementos válidos');
  return data.elements.map(e=>overpassCandidate(e,area,country)).filter(Boolean);
 });
}
export async function scanAreaSources(country,area,index){
 // One low-volume free geocoder; secondary Overpass is handled asynchronously.
 const scan=await scanPhoton(country,area,index);
 return {shops:scan.shops,scans:[scan]};
}