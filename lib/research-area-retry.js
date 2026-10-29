import {db} from 'hatchable';
import {AUTO_DISCOVERY_ENABLED,directoryNotice} from 'lib/directory-mode.js';
import {scanPhoton,scanOverpass,providerDelay} from 'lib/research-providers.js';
import {storeResearchCandidates} from 'lib/research-store.js';

const cut=x=>String(x?.message||x||'').slice(0,180);
const scanners={photon:scanPhoton,overpass:scanOverpass};
const providers=Object.keys(scanners);

// Community services are shared resources. This is a lead-finding source, not
// a credit score or identity verification.
export async function queueSupplementaryArea(country,area){
 if(!area.area_key)return false;
 const cached=await db.query(`SELECT 1 FROM research_geo_cache
   WHERE country=$1 AND area_key=$2 AND provider='overpass' AND expires_at>NOW()`,
   [country,area.area_key]);
 if(cached.rows.length)return false;
 await db.query(`INSERT INTO research_area_retries(country,area_key,provider,next_attempt,status,lat,lon,city,kind)
 VALUES($1,$2,'overpass',NOW(),'retry',$3,$4,$5,$6)
 ON CONFLICT(country,area_key,provider) DO UPDATE SET
 lat=COALESCE(research_area_retries.lat,EXCLUDED.lat),
 lon=COALESCE(research_area_retries.lon,EXCLUDED.lon),
 city=COALESCE(research_area_retries.city,EXCLUDED.city),
 kind=COALESCE(research_area_retries.kind,EXCLUDED.kind)`,
 [country,area.area_key,area.lat,area.lon,area.city||area.region||'',area.kind||'city']);
 return true;
}
export async function registerAreaFailures(country,area,scans){
 const failures=(scans||[]).filter(s=>s.state==='error'&&scanners[s.provider]);
 for(const s of failures){
  await db.query(`INSERT INTO research_area_retries
   (country,area_key,provider,last_error,next_attempt,lat,lon,city,kind)
   VALUES($1,$2,$3,$4,NOW()+INTERVAL '15 minutes',$5,$6,$7,$8)
   ON CONFLICT(country,area_key,provider) DO UPDATE SET
    last_error=EXCLUDED.last_error,updated_at=NOW()
   WHERE research_area_retries.status='retry'`,
  [country,area.area_key,s.provider,cut(s.error),area.lat,area.lon,area.city||area.region||'',area.kind||'city']);
 }
 return failures.length;
}
export async function processAreaRetry(country=null){
 if(!AUTO_DISCOVERY_ENABLED)return {processed:0,paused:true,reason:directoryNotice};
 // Check the free provider quota BEFORE claiming a job: a throttle must not
 // increment attempts, create retries every few minutes, or block other work.
 const delays=await Promise.all(providers.map(async name=>({name,seconds:await providerDelay(name)})));
 const ready=delays.filter(x=>x.seconds<=0).map(x=>x.name);
 if(!ready.length)return {processed:0,reason:'Fuentes gratuitas en pausa',waitSeconds:Math.min(...delays.map(x=>x.seconds))};
 const due=await db.query(`WITH picked AS(
   SELECT country,area_key,provider FROM research_area_retries
   WHERE ($1::text IS NULL OR country=$1) AND provider=ANY($2::text[])
    AND next_attempt<=NOW() AND (
      status='retry' OR (status='running' AND locked_at<NOW()-INTERVAL '10 minutes'))
   ORDER BY next_attempt ASC FOR UPDATE SKIP LOCKED LIMIT 1
  )
  UPDATE research_area_retries r SET status='running',locked_at=NOW(),
   attempts=r.attempts+1,updated_at=NOW()
  FROM picked WHERE r.country=picked.country AND r.area_key=picked.area_key AND r.provider=picked.provider
  RETURNING r.country,r.area_key,r.provider,r.attempts,r.lat,r.lon,r.city,r.kind`,
  [country,ready]);
 const task=due.rows[0];if(!task)return {processed:0,reason:'No hay fuentes pendientes con cuota disponible'};
 const result=await db.query(`SELECT country,area_key,city,region,kind,lat,lon
  FROM country_search_areas WHERE country=$1 AND area_key=$2`,[task.country,task.area_key]);
 const area=result.rows[0]||(task.lat!=null&&task.lon!=null?
  {country:task.country,area_key:task.area_key,lat:task.lat,lon:task.lon,
   city:task.city||'',kind:task.kind||'city'}:null);
 if(!area||!scanners[task.provider]){
  await db.query(`UPDATE research_area_retries SET status='failed',locked_at=NULL,
   last_error='Área no disponible',updated_at=NOW()
   WHERE country=$1 AND area_key=$2 AND provider=$3`,[task.country,task.area_key,task.provider]);
  return {processed:1,provider:task.provider,failed:true};
 }
 let scan;
 try{scan=await scanners[task.provider](task.country,area,0);}
 catch(e){scan={state:'error',shops:[],error:cut(e)};}
 if(scan.state==='ok'||scan.state==='cached'){
  const saved=await storeResearchCandidates(scan.shops||[]);
  await db.query(`UPDATE research_area_retries SET status='done',locked_at=NULL,
   last_error=NULL,updated_at=NOW() WHERE country=$1 AND area_key=$2 AND provider=$3`,
   [task.country,task.area_key,task.provider]);
  return {processed:1,provider:task.provider,found:saved.unique,
   cached:scan.state==='cached',success:true};
 }
 const blocked=scan.state==='throttled';
 const attempts=Number(task.attempts)||1;
 const status=blocked||attempts<3?'retry':'failed';
 const seconds=blocked?Math.max(180,Number(scan.waitSeconds)||await providerDelay(task.provider)):
  Math.min(86400,900*Math.pow(4,Math.max(0,attempts-1)));
 await db.query(`UPDATE research_area_retries SET status=$4,locked_at=NULL,
  attempts=CASE WHEN $5 THEN GREATEST(0,attempts-1) ELSE attempts END,
  next_attempt=NOW()+($6::integer*INTERVAL '1 second'),
  last_error=$7,updated_at=NOW()
  WHERE country=$1 AND area_key=$2 AND provider=$3`,
 [task.country,task.area_key,task.provider,status,blocked,seconds,cut(scan.error||'Proveedor pausado')]);
 return {processed:1,provider:task.provider,success:false,retry:status==='retry',
  throttled:blocked,waitSeconds:seconds};
}