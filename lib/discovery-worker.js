import {db} from 'hatchable';
import {scanPhoton} from 'lib/research-providers.js';
import {queueSupplementaryArea} from 'lib/research-area-retry.js';
import {storeResearchCandidates} from 'lib/research-store.js';
// User-selected city: one bounded geographical lookup per job, separate from country scanning.
export async function runDiscoveryArea(){
 const due=await db.query(`SELECT id,country,city,lat,lon,radius,attempts FROM discovery_areas
  WHERE (status IN ('queued','partial','limited','error','completed') AND next_attempt<=NOW())
  OR (status='running' AND last_started<NOW()-INTERVAL '5 minutes')
  ORDER BY CASE WHEN status='queued' THEN 0 ELSE 1 END,created_at ASC LIMIT 1`);
 const area=due.rows[0];if(!area)return {ok:true,processed:0,reason:'No hay zonas urbanas pendientes'};
 const gate=await db.query(`UPDATE discovery_provider_throttle SET last_called=NOW()
  WHERE id=1 AND last_called<NOW()-INTERVAL '2 minutes' RETURNING id`);
 if(!gate.rows.length)return {ok:true,processed:0,reason:'Pausa global entre búsquedas urbanas'};
 const claimed=await db.query(`UPDATE discovery_areas
  SET status='running',last_started=NOW(),attempts=attempts+1 WHERE id=$1
  AND ((status IN ('queued','partial','limited','error','completed') AND next_attempt<=NOW())
   OR (status='running' AND last_started<NOW()-INTERVAL '5 minutes')) RETURNING id`,[area.id]);
 if(!claimed.rows.length)return {ok:true,processed:0,reason:'Zona reclamada por otro proceso'};
 const a={...area,area_key:'city-'+area.id,kind:'city'};
 const sources=[];
 try{
  // Return quickly: Overpass is expensive, so its query is persisted independently.
  await queueSupplementaryArea(area.country,a);
  sources.push(await scanPhoton(area.country,a,Number(area.attempts)||0));
  const success=sources.some(s=>s.state==='ok');
  const blocked=sources.every(s=>['throttled','not_configured'].includes(s.state));
  const saved=await storeResearchCandidates(sources.flatMap(s=>s.shops));
  const failure=!success?sources.map(s=>s.error||s.state).join(', ').slice(0,170):null;
  const attempts=Number(area.attempts||0)+1;
  const hours=blocked?1:success?24*7:Math.min(24,Math.pow(2,Math.min(4,attempts)));
  const status=success?'completed':blocked?'limited':'error';
  await db.query(`UPDATE discovery_areas SET status=$2,checked_at=NOW(),
   discoveries=$3,last_error=$4,
   next_attempt=NOW()+($5::integer*INTERVAL '1 hour')
   WHERE id=$1`,[area.id,status,saved.unique,failure,hours]);
  return {ok:success,processed:1,area:area.id,country:area.country,city:area.city,
   found:saved.unique,deduplicated:saved.duplicates,queued:saved.queued,
   sources:sources.map(s=>({name:s.provider,state:s.state})),
   error:failure,retryHours:hours,
   disclaimer:'Cobertura geográfica parcial; solo se guardan en Mis tiendas las fichas añadidas expresamente.'};
 }catch(e){
  const message=String(e?.message||e).slice(0,180);
  await db.query(`UPDATE discovery_areas SET status='error',last_error=$2,checked_at=NOW(),
   next_attempt=NOW()+INTERVAL '2 hours' WHERE id=$1`,[area.id,message]);
  return {ok:false,processed:1,area:area.id,error:message};
 }
}