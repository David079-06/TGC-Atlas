import {db} from 'hatchable';
import {scanPhoton,scanOverpass,scanCommercialWeb} from 'lib/research-providers.js';
import {storeResearchCandidates} from 'lib/research-store.js';

const short=x=>String(x||'').slice(0,175);
const providerFns={photon:scanPhoton,overpass:scanOverpass,brave:scanCommercialWeb};
export async function queueSupplementaryArea(country,area){
 await db.query(`INSERT INTO research_area_retries(country,area_key,provider,next_attempt,status)
  VALUES($1,$2,'overpass',NOW(),'retry')
  ON CONFLICT(country,area_key,provider) DO NOTHING`,[country,area.area_key]);
}
export async function registerAreaFailures(country,area,scans){
 const failures=(scans||[]).filter(s=>s.state==='error'&&providerFns[s.provider]);
 for(const s of failures){
  await db.query(`INSERT INTO research_area_retries(country,area_key,provider,last_error,next_attempt)
   VALUES($1,$2,$3,$4,NOW()+INTERVAL '5 minutes')
   ON CONFLICT(country,area_key,provider) DO UPDATE SET last_error=EXCLUDED.last_error,
   updated_at=NOW() WHERE research_area_retries.status='retry'`,
   [country,area.area_key,s.provider,short(s.error)]);
 }
 return failures.length;
}
export async function processAreaRetry(country=null){
 const due=await db.query(`WITH picked AS(
  SELECT country,area_key,provider FROM research_area_retries
   WHERE ($1::text IS NULL OR country=$1) AND next_attempt<=NOW()
   AND (status='retry' OR (status='running' AND locked_at<NOW()-INTERVAL '5 minutes'))
   ORDER BY next_attempt ASC FOR UPDATE SKIP LOCKED LIMIT 1
 )
 UPDATE research_area_retries r SET status='running',locked_at=NOW(),
  attempts=r.attempts+1,updated_at=NOW()
 FROM picked WHERE r.country=picked.country AND r.area_key=picked.area_key AND r.provider=picked.provider
 RETURNING r.country,r.area_key,r.provider,r.attempts`,[country]);
 const task=due.rows[0];if(!task)return {processed:0};
 const result=await db.query(`SELECT country,area_key,city,region,kind,lat,lon
 FROM country_search_areas WHERE country=$1 AND area_key=$2`,[task.country,task.area_key]);
 const area=result.rows[0];
 if(!area||!providerFns[task.provider]){
  await db.query(`UPDATE research_area_retries SET status='failed',locked_at=NULL,
   last_error='Zona o proveedor no disponible',updated_at=NOW()
   WHERE country=$1 AND area_key=$2 AND provider=$3`,[task.country,task.area_key,task.provider]);
  return {processed:1,failed:true};
 }
 let scan;
 try{scan=await providerFns[task.provider](task.country,area,0);}
 catch(e){scan={state:'error',shops:[],error:short(e.message)};}
 const throttled=scan.state==='throttled'||scan.state==='not_configured';
 if(scan.state==='ok'){
  const saved=await storeResearchCandidates(scan.shops);
  await db.query(`UPDATE research_area_retries SET status='done',locked_at=NULL,
   last_error=NULL,updated_at=NOW() WHERE country=$1 AND area_key=$2 AND provider=$3`,
   [task.country,task.area_key,task.provider]);
  return {processed:1,provider:task.provider,found:saved.unique,success:true};
 }
 const attempts=Number(task.attempts);
 const status=throttled?'retry':attempts>=3?'failed':'retry';
 const seconds=throttled?180:Math.min(86400,300*Math.pow(4,Math.max(0,attempts-1)));
 await db.query(`UPDATE research_area_retries SET status=$4,locked_at=NULL,
  attempts=CASE WHEN $5 THEN GREATEST(0,attempts-1) ELSE attempts END,
  next_attempt=NOW()+($6::integer*INTERVAL '1 second'),
  last_error=$7,updated_at=NOW()
  WHERE country=$1 AND area_key=$2 AND provider=$3`,
  [task.country,task.area_key,task.provider,status,throttled,seconds,
   short(scan.error||'Proveedor temporalmente limitado')]);
 return {processed:1,provider:task.provider,success:false,retry:status==='retry',throttled};
}