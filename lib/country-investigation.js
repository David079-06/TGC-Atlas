import {db,scheduler} from 'hatchable';
import {COUNTRY_CODES} from 'lib/country-codes.js';
import {countryAreaCount,countryAreaAt} from 'lib/country-areas.js';
import {scanAreaSources} from 'lib/research-providers.js';
import {storeResearchCandidates} from 'lib/research-store.js';
import {processVerificationQueue,queueSnapshot} from 'lib/research-queue.js';
import {registerAreaFailures,queueSupplementaryArea} from 'lib/research-area-retry.js';

export const supportedCountry=code=>COUNTRY_CODES.has(code);
const cut=x=>String(x?.message||x||'').slice(0,180);

// A locked country cursor preserves progress; other workers can safely review shops.
export async function runCountryInvestigation(given=null){
 const due=await db.query(`SELECT country,status,phase,cursor,generation
  FROM country_investigations WHERE next_attempt<=NOW()
  AND (status IN('queued','partial','limited','error')
    OR (status='running' AND locked_at<NOW()-INTERVAL '5 minutes'))
  AND ($1::text IS NULL OR country=$1)
  ORDER BY CASE WHEN status='queued' THEN 0 ELSE 1 END,updated_at ASC LIMIT 1`,[given]);
 const job=due.rows[0];
 if(!job)return {ok:true,processed:0,reason:'No hay análisis de país pendientes'};
 const lock=await db.query(`UPDATE country_investigations SET status='running',
   locked_at=NOW(),updated_at=NOW() WHERE country=$1 AND generation=$2 AND next_attempt<=NOW()
   AND (status IN('queued','partial','limited','error')
    OR (status='running' AND locked_at<NOW()-INTERVAL '5 minutes'))
   RETURNING country`,[job.country,job.generation]);
 if(!lock.rows.length)return {ok:true,processed:0,reason:'Otro proceso ya trabaja en este país'};
 const country=job.country,totalAreas=await countryAreaCount(country);
 let phase=job.phase,cursor=Number(job.cursor)||0,checked=0,failed=0,found=0,reviewed=0;
 let note='',error=null,lastCity=null,delay=18,providerResults=[],deduplicated=0;
 try{
  if(phase==='discover'){
   const area=cursor<totalAreas?await countryAreaAt(country,cursor):null;
   if(!area){phase='verify';note='Zonas planificadas recorridas; continúa la cola independiente de verificaciones.';}
   else{
    if(area.kind==='region'||cursor%25===0)await queueSupplementaryArea(country,area);
    const result=await scanAreaSources(country,area,cursor);
    providerResults=result.scans.map(s=>({source:s.provider,state:s.state,found:s.shops.length}));
    const usable=result.scans.some(s=>s.state==='ok');
    const errors=result.scans.filter(s=>s.state==='error');
    if(usable||errors.length){
     const saved=await storeResearchCandidates(result.shops);
     found=saved.unique;deduplicated=saved.duplicates;
     await registerAreaFailures(country,area,result.scans);
     cursor++;checked=usable?1:0;failed=usable?0:1;
     lastCity=area.city||area.region||'Área consultada';
     note=lastCity+': '+found+' candidatas únicas, '+deduplicated+' duplicadas; '+
      providerResults.map(s=>s.source+' '+s.state).join(', ').slice(0,100)+'.';
     if(!usable&&errors.length)error='Fuentes no disponibles en '+lastCity+'; zona pendiente de reintento.';
     if(cursor>=totalAreas)phase='verify';
    }else{
     note='Fuentes con pausa de protección o cuota alcanzada. Se conserva la zona pendiente.';
     delay=110;
    }
   }
   // Never make the country wait for all areas before verifying an individual shop.
   const result=await processVerificationQueue(country,1);
   reviewed=result.processed;
   if(result.names.length)note+=' Verificada: '+result.names.join(', ')+'.';
   if(result.errors.length)note+=' La verificación fallida quedó en su cola de reintentos.';
   // Slow geographical source retries are handled only by the independent maintenance job.
  }else if(phase==='verify'){
   const result=await processVerificationQueue(country,2);
   reviewed=result.processed;
   const queue=await queueSnapshot(country);
   const waiting=queue.queued+queue.retry+queue.running;
   if(!waiting){
    phase='finished';
    note='Revisión de esta ronda terminada. Algunas fuentes pueden estar limitadas y quedan reintentos geográficos independientes.';
   }else{
    note=result.names.length?'Revisadas: '+result.names.join(', ')+'. '+waiting+' comprobaciones pendientes.':
      'Cola persistente activa: '+waiting+' tiendas pendientes o esperando reintento.';
    delay=result.processed?12:65;
   }
   // Slow supplementary lookups never block the country's verification phase.
  }
 }catch(e){
  error=cut(e);note='Error controlado. El cursor y las verificaciones pendientes siguen guardados.';
  delay=85;
 }
 const done=phase==='finished',status=done?'completed':error?'limited':'partial';
 if(!done&&error)delay=Math.max(delay,70);
 await db.query(`UPDATE country_investigations SET status=$3,phase=$4,cursor=$5,
   checked_zones=checked_zones+$6,failed_zones=failed_zones+$7,checked_sites=checked_sites+$8,
   candidates_found=(SELECT COUNT(*)::integer FROM discovered_shops WHERE country=$1 AND expires_at>NOW()),
   last_city=COALESCE($9,last_city),last_note=$10,last_error=$11,
   updated_at=NOW(),finished_at=CASE WHEN $12 THEN NOW() ELSE NULL END,
   next_attempt=NOW()+($13::integer*INTERVAL '1 second'),locked_at=NULL
   WHERE country=$1 AND generation=$2`,
  [country,job.generation,status,phase,cursor,checked,failed,reviewed,lastCity,note,error,done,delay]);
 if(!done){
  try{await scheduler.at(new Date(Date.now()+delay*1000),'/api/jobs/country-investigation',{payload:{country}})}
  catch(e){/* recurring maintenance cron is a safety net */}
 }
 return {ok:!error,processed:1,country,status,phase,attempted:cursor,checked,failed,
  found,reviewed,deduplicated,providers:providerResults,note,error,
  limitation:'Búsqueda por fuentes públicas y servicios autorizados; no existe un registro universal de tiendas ni garantía de cobertura.'};
}