import {db} from 'hatchable';
export const access='admin';export const methods=['GET'];
const n=(x,min,max)=>Number.isFinite(Number(x))&&Number(x)>=min&&Number(x)<=max;
function safeWebsite(s){
 if(!s)return null;
 let u;try{u=new URL(/^https?:\/\//i.test(s)?s:'https://'+s)}catch{return null}
 if(u.protocol!=='https:'||u.username||u.password||u.port)return null;
 const host=u.hostname.toLowerCase();
 if(!/^[a-z0-9.-]{3,150}$/.test(host)||/^(localhost|\d+\.\d+\.\d+\.\d+)$/.test(host))return null;
 return u.origin+'/';
}
function convert(e){
 const t=e.tags||{},name=String(t.name||t['name:es']||'').trim();
 const loc=e.center||e;
 const lat=Number(loc.lat),lon=Number(loc.lon);
 if(!name||name.length>130||!n(lat,-85,85)||!n(lon,-180,180))return null;
 const category=String(t.shop||'');
 const label=String(name+' '+(t.description||'')+' '+(t.games||'')+' '+(t.brand||''));
 if(!['games','hobby','collector','toys'].includes(category))return null;
 // Jugueterías genéricas solo aparecen si hay alguna evidencia textual de cartas/juegos de mesa.
 if(category==='toys'&&!/pok[eé]mon|tcg|cartas|cards|trading|collectible|juegos de mesa|boardgame/i.test(label))return null;
 const website=safeWebsite(t.website||t['contact:website']||t.url);
 const address=[t['addr:street'],t['addr:housenumber'],t['addr:city']].filter(Boolean).join(', ');
 return {id:'osm-'+e.type+'-'+e.id,name,lat,lon,website,phone:t.phone||t['contact:phone']||null,
  address:address||null,storeType:'physical',category,
  typeLabel:category==='games'?'Juegos y cartas':category==='collector'?'Coleccionismo':category==='hobby'?'Hobbies':'Juguetes / juegos',
  sourceUrl:'https://www.openstreetmap.org/'+e.type+'/'+e.id,
  source:'OpenStreetMap',verifiedPokemon:/pok[eé]mon|trading card|tcg/i.test(label),
  note:'Ficha geográfica comunitaria. No acredita inventario de Pokémon, reputación ni disponibilidad.'};
}
export default async function(req,res){
 const lat=Number(req.query?.lat),lon=Number(req.query?.lon),radius=Number(req.query?.radius||10000);
 if(!n(lat,-85,85)||!n(lon,-180,180)||!n(radius,2000,18000))
  return res.status(400).json({error:'Área de búsqueda incorrecta'});
 const key='osmshops:'+lat.toFixed(2)+':'+lon.toFixed(2)+':'+Math.round(radius/1000);
 const cache=await db.query('SELECT payload,created_at FROM geo_lookup_cache WHERE cache_key=$1 AND expires_at>NOW()',[key]);
 if(cache.rows.length)return res.json({...cache.rows[0].payload,cached:true});
 const throttle=await db.query("UPDATE shop_discovery_throttle SET last_called=NOW() WHERE id=1 AND last_called<NOW()-INTERVAL '30 seconds' RETURNING id");
 if(!throttle.rows.length)return res.status(429).json({error:'El buscador de establecimientos está limitado para proteger OpenStreetMap. Vuelve a intentarlo más tarde.'});
 const query='[out:json][timeout:8];(nwr["shop"~"^(games|collector|hobby)$"](around:'+Math.round(radius)+','+lat.toFixed(4)+','+lon.toFixed(4)+');nwr["shop"="toys"]["name"~"Pok[eé]mon|TCG|card|games|juegos|cartas",i](around:'+Math.round(radius)+','+lat.toFixed(4)+','+lon.toFixed(4)+'););out center 70;';
 try{
  const response=await fetch('https://overpass-api.de/api/interpreter?data='+encodeURIComponent(query),{
   headers:{Accept:'application/json'},signal:AbortSignal.timeout(10500)});
  if(!response.ok)throw Error('Overpass HTTP '+response.status);
  const data=await response.json();
  const shops=[],seen=new Set();
  for(const element of data.elements||[]){
   const v=convert(element);if(!v||seen.has(v.id))continue;
   seen.add(v.id);shops.push(v);
  }
  shops.sort((a,b)=>Number(b.verifiedPokemon)-Number(a.verifiedPokemon)||(a.category==='games'?-1:1)-(b.category==='games'?-1:1));
  const payload={shops:shops.slice(0,70),checkedAt:new Date().toISOString(),
   coverage:'Búsqueda de comercios físicos relacionados con juegos y coleccionismo en datos OpenStreetMap, no directorio exhaustivo ni verificación de inventario.'};
  await db.query("INSERT INTO geo_lookup_cache(cache_key,payload,expires_at) VALUES($1,$2,NOW()+INTERVAL '36 hours') ON CONFLICT(cache_key) DO UPDATE SET payload=$2,expires_at=NOW()+INTERVAL '36 hours'",[key,JSON.stringify(payload)]);
  return res.json(payload);
 }catch(e){
  res.status(503).json({error:'La consulta de locales físicos no está disponible en este momento. Se mantienen las tiendas guardadas y con conectores.',detail:String(e).slice(0,130)});
 }
}