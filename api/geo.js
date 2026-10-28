import {db} from 'hatchable';
import {COUNTRY_CODES} from 'lib/country-codes.js';
export const access='admin';export const methods=['GET'];
const countries=COUNTRY_CODES;
const norm=s=>String(s||'').trim().slice(0,90);
const safe=(n,minimum,maximum)=>Number.isFinite(n)&&n>=minimum&&n<=maximum;
function extract(feature){
 const props=feature?.properties||{},coordinates=feature?.geometry?.coordinates||[];
 const raw=String(props.countrycode||'').toUpperCase();
 if(!countries.has(raw))return null;
 const type=String(props.osm_value||'');
 const country=String(props.country||'').trim();
 const name=String(props.name||'').trim();
 const city=type==='country'?null:(
  ['city','town','village','municipality','hamlet','locality','suburb','district'].includes(type)?name:
  props.city||props.town||props.village||props.municipality||null
 );
 const level=type==='country'?'country':city?'city':'country';
 if(level==='city'&&(!city||String(city).length>90))return null;
 const lat=Number(coordinates[1]),lon=Number(coordinates[0]);
 if(!safe(lat,-90,90)||!safe(lon,-180,180))return null;
 return {type:level,code:raw,country,city:city?String(city):null,lat,lon,
  label:level==='city'?String(city)+', '+(country||raw):country||raw,
  source:'Photon / OpenStreetMap'};
}
export default async function(req,res){
 const mode=String(req.query?.mode||'');
 if(!['suggest','reverse'].includes(mode))return res.status(400).json({error:'Modo inválido'});
 const country=String(req.query?.country||'').toUpperCase();
 if(country&&!countries.has(country))return res.status(400).json({error:'País no disponible'});
 const q=norm(req.query?.q||'');
 const lat=Number(req.query?.lat),lon=Number(req.query?.lon),zoom=Number(req.query?.zoom);
 if(mode==='suggest'&&(q.length<3||!/^[\p{L}\p{M}0-9\s.,'-]+$/u.test(q)))
  return res.status(400).json({error:'Introduce al menos tres caracteres de una ciudad'});
 if(mode==='reverse'&&(!safe(lat,-85,85)||!safe(lon,-180,180)||!safe(zoom,0,19)))
  return res.status(400).json({error:'Coordenadas incorrectas'});
 const key=mode==='suggest'?'s:'+country+':'+q.toLocaleLowerCase('es'):
  'r:'+Math.round(lat*1000)+':'+Math.round(lon*1000)+':'+Math.round(zoom);
 const cached=await db.query('SELECT payload FROM geo_lookup_cache WHERE cache_key=$1 AND expires_at>NOW()',[key]);
 if(cached.rows.length)return res.json({...cached.rows[0].payload,cached:true});
 // Límite global: si alguien pidió geocodificación hace menos de 2 s, no consultamos al proveedor.
 const token=await db.query("UPDATE geo_lookup_throttle SET last_called=NOW() WHERE id=1 AND last_called<NOW()-INTERVAL '2 seconds' RETURNING id");
 if(!token.rows.length)return res.status(429).json({error:'Consultas geográficas limitadas. Usa las sugerencias locales o repite dentro de unos segundos.'});
 const query=new URLSearchParams();
 const path=mode==='suggest'?'/api':'/reverse';
 if(mode==='suggest'){
  query.set('q',q);query.set('limit','7');query.append('layer','city');
  if(country)query.set('countrycode',country);
 }else{
  query.set('lat',String(lat));query.set('lon',String(lon));
  query.set('limit','6');query.set('radius',zoom<=5?'250':'25');
  query.append('layer','city');query.append('layer','country');query.append('layer','state');
 }
 try{
  const remote=await fetch('https://photon.komoot.io'+path+'?'+query.toString(),{
   headers:{'Accept':'application/json','User-Agent':'TCGAtlasPrivateGeo/1.0 (personal shop directory)'},
   signal:AbortSignal.timeout(7500)});
  if(!remote.ok)throw Error('Photon HTTP '+remote.status);
  const parsed=await remote.json();
  if(!Array.isArray(parsed.features))throw Error('Datos geográficos no válidos');
  const places=[],unique=new Set();
  for(const feature of parsed.features){
   let place=extract(feature);if(!place)continue;
   if(mode==='reverse'&&country&&place.code!==country)continue;
   if(mode==='reverse'&&zoom<=5)place={...place,type:'country',city:null,label:place.country||place.code};
   const k=place.code+'|'+(place.city||'').toLocaleLowerCase('es');
   if(unique.has(k))continue;unique.add(k);places.push(place);
  }
  // En zoom amplio prevalece país, en zoom urbano ciudad si la proporciona el proveedor.
  places.sort((a,b)=>mode==='reverse'&&zoom<=5?
   (a.type==='country'?-1:1)-(b.type==='country'?-1:1):
   (a.type==='city'?-1:1)-(b.type==='city'?-1:1));
  const body={places:places.slice(0,7),provider:'Photon (© OpenStreetMap contributors)',checkedAt:new Date().toISOString()};
  await db.query("INSERT INTO geo_lookup_cache(cache_key,payload,expires_at) VALUES($1,$2,NOW()+INTERVAL '15 days') ON CONFLICT(cache_key) DO UPDATE SET payload=$2,expires_at=NOW()+INTERVAL '15 days'",[key,JSON.stringify(body)]);
  res.json(body);
 }catch(e){
  res.status(503).json({error:'El servicio geográfico no responde; puedes elegir el país y las ciudades ya registradas.',details:String(e).slice(0,120)});
 }
}