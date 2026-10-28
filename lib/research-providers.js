import {db,config} from 'hatchable';
import {hostFor} from 'lib/research-identity.js';

const compact=x=>String(x||'').trim().slice(0,160);
const safeNumber=(n,a,b)=>Number.isFinite(Number(n))&&Number(n)>=a&&Number(n)<=b;
const nameSignal=text=>/pok[eé]mon|\btcg\b|trading.?card|cartas coleccionables|cartas pok[eé]mon/i.test(text||'');
const shopCategories=new Set(['games','hobby','collector','toys','comic','trading_cards','board_games','anime','books','gift']);
const providerRules={
 photon:{daily:450,gap:9},overpass:{daily:35,gap:120},brave:{daily:24,gap:120}
};
async function reserve(provider){
 const rule=providerRules[provider];if(!rule)return false;
 await db.query(`INSERT INTO research_source_budget(provider) VALUES($1) ON CONFLICT DO NOTHING`,[provider]);
 const result=await db.query(`UPDATE research_source_budget SET
   quota_day=CURRENT_DATE,
   used_today=CASE WHEN quota_day=CURRENT_DATE THEN used_today+1 ELSE 1 END,
   attempts=attempts+1,next_allowed_at=NOW()+($2::integer*INTERVAL '1 second'),
   last_called_at=NOW(),updated_at=NOW()
  WHERE provider=$1 AND next_allowed_at<=NOW()
  AND (quota_day<>CURRENT_DATE OR used_today<$3) RETURNING provider`,
  [provider,rule.gap,rule.daily]);
 return result.rows.length>0;
}
async function finish(provider,success,status=null,reason=''){
 // Avoid hammering a provider when it is overloaded.
 const cooldown=provider==='overpass'?900:provider==='brave'?240:90;
 await db.query(`UPDATE research_source_budget SET
  successes=successes+CASE WHEN $2 THEN 1 ELSE 0 END,
  failures=failures+CASE WHEN $2 THEN 0 ELSE 1 END,
  consecutive_failures=CASE WHEN $2 THEN 0 ELSE LEAST(10,consecutive_failures+1) END,
  last_http_status=$3,last_error=CASE WHEN $2 THEN NULL ELSE $4 END,
  next_allowed_at=CASE WHEN $2 THEN next_allowed_at
   ELSE GREATEST(next_allowed_at,NOW()+($5::integer*INTERVAL '1 second')) END,
  updated_at=NOW() WHERE provider=$1`,
  [provider,success,status,compact(reason),cooldown]);
}
async function controlled(provider,task){
 if(!await reserve(provider))return {provider,state:'throttled',shops:[],error:null};
 try{
  const result=await task();
  await finish(provider,true,200);
  return {provider,state:'ok',shops:result,error:null};
 }catch(e){
  const status=Number(e.status)||null;
  await finish(provider,false,status,e.message);
  return {provider,state:'error',shops:[],error:compact(e.message||e),status};
 }
}
async function jsonResponse(url,headers={},timeout=6500){
 const response=await fetch(url,{headers:{Accept:'application/json',...headers},signal:AbortSignal.timeout(timeout)});
 if(!response.ok){const error=Error('HTTP '+response.status);error.status=response.status;throw error}
 const data=await response.json();
 if(!data||typeof data!=='object')throw Error('Formato de datos inesperado');
 return data;
}
const osmUrl=(type,id)=>'https://www.openstreetmap.org/'+type+'/'+id;
function photonCandidate(f,area,country){
 const p=f.properties||{},raw=compact(p.name),code=String(p.countrycode||'').toUpperCase();
 if(!raw||raw.length<3||code!==country||!p.osm_id)return null;
 const kind=String(p.osm_value||'').toLowerCase();
 if(!shopCategories.has(kind))return null;
 const signal=nameSignal([raw,p.description,p.brand,p.shop].join(' '));
 if(!signal&&['books','toys','gift'].includes(kind))return null;
 const type={N:'node',W:'way',R:'relation'}[p.osm_type];
 const xy=f.geometry?.coordinates||[],lat=Number(xy[1]),lon=Number(xy[0]);
 if(!type||!safeNumber(lat,-85,85)||!safeNumber(lon,-180,180))return null;
 const site=p.website||p['contact:website']||null;
 const website=hostFor(site)?'https://'+hostFor(site)+'/':null;
 return {id:'osm-'+type+'-'+p.osm_id,country,name:raw,city:compact(p.city||area.city||area.region),
  website,phone:compact(p.phone||p['contact:phone'])||null,
  address:[p.street,p.housenumber,p.city].filter(Boolean).join(', ').slice(0,250)||null,
  lat,lon,store_type:website?'hybrid':'physical',shop_kind:kind,
  source:'OpenStreetMap / Photon',source_url:osmUrl(type,p.osm_id),
  evidence_level:signal?'pokemon_mentioned':'category_match',pokemon_signal:signal};
}
export async function scanPhoton(country,area,index=0){
 const keyword=['Pokémon','TCG','trading card games','cartas coleccionables'][index%4];
 const scale=area.kind==='region'?.36:.18,lat=Number(area.lat),lon=Number(area.lon);
 const bbox=[lon-scale,lat-scale,lon+scale,lat+scale].map(n=>n.toFixed(4)).join(',');
 const url='https://photon.komoot.io/api/?'+new URLSearchParams({q:keyword,bbox,
  lat:String(lat),lon:String(lon),limit:'60'});
 return controlled('photon',async()=>{
  const data=await jsonResponse(url,{},6500);
  if(!Array.isArray(data.features))throw Error('Photon no devolvió una lista');
  return data.features.map(f=>photonCandidate(f,area,country)).filter(Boolean);
 });
}
function overpassCandidate(e,area,country){
 const t=e.tags||{},kind=String(t.shop||'').toLowerCase();
 if(!shopCategories.has(kind))return null;
 const name=compact(t.name||t['name:es']),signal=nameSignal([name,t.description,t.brand,t.games,t.products].join(' '));
 if(name.length<3||(!signal&&['toys','books','gift'].includes(kind)))return null;
 const xy=e.center||e,lat=Number(xy.lat),lon=Number(xy.lon);
 if(!safeNumber(lat,-85,85)||!safeNumber(lon,-180,180)||!['node','way','relation'].includes(e.type)||!e.id)return null;
 const site=t.website||t['contact:website'];
 const host=hostFor(site),website=host?'https://'+host+'/':null;
 return {id:'osm-'+e.type+'-'+e.id,country,name,city:compact(t['addr:city']||area.city||area.region),
  website,phone:compact(t.phone||t['contact:phone'])||null,
  address:[t['addr:street'],t['addr:housenumber'],t['addr:city']].filter(Boolean).join(', ').slice(0,250)||null,
  lat,lon,store_type:website?'hybrid':'physical',shop_kind:kind,source:'OpenStreetMap / Overpass',
  source_url:osmUrl(e.type,e.id),evidence_level:signal?'pokemon_mentioned':'category_match',pokemon_signal:signal};
}
export async function scanOverpass(country,area){
 const lat=Number(area.lat),lon=Number(area.lon),radius=area.kind==='region'?9000:4300;
 const query='[out:json][timeout:8];(nwr["shop"~"^(games|hobby|collector|trading_cards)$"](around:'+radius+','+
  lat.toFixed(4)+','+lon.toFixed(4)+');nwr["shop"="toys"]["name"~"Pokemon|Pokémon|TCG|cartas",i](around:'+
  radius+','+lat.toFixed(4)+','+lon.toFixed(4)+'););out center 60;';
 return controlled('overpass',async()=>{
  const url='https://overpass-api.de/api/interpreter?data='+encodeURIComponent(query);
  const data=await jsonResponse(url,{},8500);
  if(!Array.isArray(data.elements))throw Error('Overpass no devolvió elementos');
  return data.elements.map(e=>overpassCandidate(e,area,country)).filter(Boolean);
 });
}
const ignoreDomains=new Set(['amazon.com','amazon.es','ebay.com','ebay.es','facebook.com','instagram.com','youtube.com',
 'reddit.com','wikipedia.org','pinterest.com','tiktok.com','cardmarket.com','google.com','x.com','mercadolibre.com','aliexpress.com']);
function braveCandidate(entry,country){
 const url=String(entry.url||'');
 const host=hostFor(url);if(!host)return null;
 if([...ignoreDomains].some(d=>host===d||host.endsWith('.'+d)))return null;
 const title=compact(entry.title),description=compact(entry.description);
 if(!nameSignal(title+' '+description)||!/tienda|shop|store|comprar|buy|venta|online|tcg|cartas/i.test(title+' '+description))return null;
 const name=compact(title.split(/\s+[|–—-]\s+/)[0]||host);
 if(name.length<3)return null;
 const key='web-'+country+'-'+host.replace(/[^a-z0-9]/g,'-');
 return {id:key,country,name,city:'',website:'https://'+host+'/',phone:null,address:null,
  lat:null,lon:null,store_type:'online',shop_kind:'trading_cards',
  source:'Brave Search API · candidato web',source_url:url,evidence_level:'pokemon_mentioned',pokemon_signal:true};
}
export async function scanCommercialWeb(country,area){
 let key='';try{key=String(await config.get('BRAVE_SEARCH_API_KEY')||'')}catch{}
 if(!key)return {provider:'brave',state:'not_configured',shops:[],error:null};
 const location=[area.city||area.region,country].filter(Boolean).join(' ');
 return controlled('brave',async()=>{
  const query='tienda online Pokémon TCG cartas coleccionables '+location;
  const url='https://api.search.brave.com/res/v1/web/search?'+new URLSearchParams({q:query,count:'12',safesearch:'moderate'});
  const data=await jsonResponse(url,{'X-Subscription-Token':key},7000);
  return (data.web?.results||[]).map(e=>braveCandidate(e,country)).filter(Boolean);
 });
}
export async function scanAreaSources(country,area,index){
 // Fast providers only on the interactive country cursor.
 // Slow Overpass queries are queued independently and never hold this cursor.
 const scans=[await scanPhoton(country,area,index)];
 if(index%3===0)scans.push(await scanCommercialWeb(country,area));
 return {shops:scans.flatMap(s=>s.shops),scans};
}