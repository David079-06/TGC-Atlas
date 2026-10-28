import {db,browser} from 'hatchable';
import {zoneSeeds} from 'lib/discovery-zones.js';

// Geographic coverage plan, NOT a census of Pokémon shops.
// Derived from world-countries-cities-db (ODbL 1.0); geographic data is separate
// from temporary merchant search results and permanent user-added stores.
const BASE='https://raw.githubusercontent.com/srestre/world-countries-cities-db/main/countries/';
const validCoord=(lat,lon)=>Number.isFinite(Number(lat))&&Number.isFinite(Number(lon))&&Math.abs(Number(lat))<=85&&Math.abs(Number(lon))<=180;
const slug=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').slice(0,65);
function planFromData(country,data){
 const areas=[],seen=new Set();
 const add=(city,region,lat,lon,kind,priority)=>{
  if(!validCoord(lat,lon))return;
  const cell=kind==='city'?Math.round(Number(lat)*6)+'_'+Math.round(Number(lon)*6):'';
  const geoKey=kind==='city'?country+':cell:'+cell:country+':'+kind+':'+slug(region||city);
  if(seen.has(geoKey))return;seen.add(geoKey);
  areas.push({country,area_key:geoKey,region:String(region||'').slice(0,100),city:String(city||'').slice(0,100),
   lat:Number(lat),lon:Number(lon),kind,priority,source_url:BASE+country+'.json'});
 };
 const existing=zoneSeeds(country);
 for(const x of existing)add(x.city||'Ciudad principal','',x.lat,x.lon,'city',0);
 const regions=Array.isArray(data.states)?data.states:[];
 let totalCities=0;
 for(const s of regions){
  totalCities+=(s.cities||[]).length;
  add('',s.name,s.latitude,s.longitude,'region',10);
 }
 // Round-robin geography gives early coverage to every province/state rather than
 // exhausting a metropolitan region while others remain unchecked.
 const groups=regions.map(s=>({
  state:s,
  cities:(s.cities||[]).filter(c=>validCoord(c.latitude,c.longitude))
 })).filter(s=>s.cities.length);
 const limit=1100,priorityBase=30;
 for(let idx=0;areas.length<limit;idx++){
  let any=false;
  for(const group of groups){
   const c=group.cities[idx];if(!c)continue;
   any=true;
   add(c.name,group.state.name,c.latitude,c.longitude,'city',priorityBase+idx);
   if(areas.length>=limit)break;
  }
  if(!any)break;
 }
 return {areas,regions:regions.length,sourceCities:totalCities,
  limitation:totalCities>areas.length?'Cobertura por regiones y núcleos geográficos: algunas localidades de la fuente no se exploran de forma individual.':'Se han incluido las áreas distinguibles disponibles en la fuente; no implica descubrir todos los negocios.',
  source:BASE+country+'.json'};
}
export async function countryAreaCount(country){
 const r=await db.query('SELECT COUNT(*)::integer total FROM country_search_areas WHERE country=$1',[country]);
 return Number(r.rows[0]?.total||0);
}
export async function countryAreaAt(country,cursor){
 const r=await db.query('SELECT city,region,lat,lon,kind,area_key FROM country_search_areas WHERE country=$1 ORDER BY priority,area_key LIMIT 1 OFFSET $2',[country,Math.max(0,cursor)]);
 return r.rows[0]||null;
}
export async function countryAreaReport(country){
 const r=await db.query('SELECT COUNT(*)::integer total,COUNT(*) FILTER(WHERE kind=\'region\')::integer regions,COUNT(*) FILTER(WHERE kind=\'city\')::integer localities FROM country_search_areas WHERE country=$1',[country]);
 return r.rows[0]||{total:0,regions:0,localities:0};
}
export async function prepareCountryAreas(country,force=false){
 const count=await countryAreaCount(country);
 if(count&&!force)return {areas:count,reused:true};
 let data=null,downloadError='';
 try{
  const result=await browser.session(async page=>{
   await page.goto(BASE+country+'.json',{waitUntil:'domcontentloaded'});
   const t=await page.$eval('body',e=>e.innerText);
   if(t.length>3500000)throw Error('Fuente geográfica supera el tamaño permitido');
   return JSON.parse(t);
  });
  data=Array.isArray(result)?result.find(x=>x.iso2===country):null;
 }catch(e){downloadError=String(e).slice(0,180)}
 let plan;
 if(data)plan=planFromData(country,data);
 else{
  const seed=zoneSeeds(country);
  plan={source:'Datos locales predefinidos',regions:0,sourceCities:seed.length,
   limitation:'No se pudo consultar la geografía detallada de este país. Investigación restringida a puntos disponibles. '+downloadError,
   areas:seed.map((p,i)=>({country,area_key:'seed-'+i,city:p.city||'',region:'',lat:p.lat,lon:p.lon,kind:'city',priority:i,source_url:'https://www.openstreetmap.org/'}))};
 }
 if(!plan.areas.length)return {areas:0,source:plan.source,limitation:plan.limitation,error:downloadError};
 if(force&&count&&data)await db.query('DELETE FROM country_search_areas WHERE country=$1',[country]);
 await db.query(`INSERT INTO country_search_areas(country,area_key,region,city,lat,lon,kind,priority,source_url)
 SELECT x.country,x.area_key,x.region,x.city,x.lat,x.lon,x.kind,x.priority,x.source_url
 FROM jsonb_to_recordset($1::jsonb) AS x(country char(2),area_key text,region text,city text,lat double precision,lon double precision,kind text,priority integer,source_url text)
 ON CONFLICT(country,area_key) DO NOTHING`,[JSON.stringify(plan.areas)]);
 return {areas:await countryAreaCount(country),reused:false,source:plan.source,limitation:plan.limitation,
  sourceCities:plan.sourceCities,regions:plan.regions};
}