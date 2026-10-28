import {db} from 'hatchable';
import {scanStore,supportsConnector} from 'lib/store-adapters.js';
export async function runStoreScan(id,{manual=false,initial=false}={}){
 const query=await db.query('SELECT * FROM store_registry WHERE id=$1',[id]);
 const store=query.rows[0];
 if(!store)return {ok:false,code:404,error:'La tienda no está registrada'};
 if(!supportsConnector(store))return {ok:false,code:409,error:'Esta tienda aún no tiene un conector autorizado'};
 const cooldown=manual?90:Math.max(60,Number(store.refresh_minutes||120));
 const claim=await db.query(`UPDATE store_registry SET scan_status='running',last_scan_started=NOW(),integration_note=NULL
 WHERE id=$1 AND selected=TRUE AND auto_enabled=TRUE AND approved_host=TRUE
 AND (backoff_until IS NULL OR backoff_until<=NOW())
 AND (last_scan_started IS NULL OR last_scan_started<NOW()-($2::integer*INTERVAL '1 second'))
 RETURNING id`,[id,cooldown*(manual?1:60)]);
 if(!claim.rows.length){
  const reason=store.backoff_until&&new Date(store.backoff_until)>new Date()?'Pausa activa tras un error de la tienda':'Ya se está comprobando o el último escaneo es reciente';
  return {ok:false,code:429,error:reason,retryAfter:store.backoff_until||store.last_scan_started};
 }
 let result,failed=false,limited=false;
 try{
  result=await scanStore(store,{firstPage:initial,pages:initial?2:1});
  limited=(result.errors||[]).some(x=>/HTTP 429|too many|rate.?limit|bot protection/i.test(x));
  failed=!(result.read>0)||!!result.errors?.length;
 }catch(e){
  result={merchant:id,read:0,errors:[String(e).slice(0,350)]};
  failed=true;limited=/429|too many|rate.?limit/i.test(String(e));
 }
 const streak=failed?Math.min(7,Number(store.fail_streak||0)+1):0;
 const rest=failed?(limited?Math.min(24*60,240*2**Math.min(3,streak-1)):Math.min(720,60*2**Math.min(3,streak-1))):0;
 const status=failed?(limited?'blocked':result.read>0?'partial':'failed'):'ok';
 const summary=failed?(limited?'Tienda limitada (429); manteniendo el último catálogo válido':String(result.errors?.[0]||'Lectura incompleta').slice(0,350)):'Catálogo actualizado desde API pública';
 await db.query(`UPDATE store_registry SET scan_status=$2,last_scan_finished=NOW(),last_scan_count=$3,
  fail_streak=$4,backoff_until=CASE WHEN $5::integer>0 THEN NOW()+($5*INTERVAL '1 minute') ELSE NULL END,
  scan_page_cursor=$6,integration_note=$7,updated_at=NOW() WHERE id=$1`,
 [id,status,Number(result.read||0),streak,rest,failed?Number(store.scan_page_cursor||1):Number(result.nextPage||1),summary]);
 return {ok:!failed,code:failed?502:200,merchant:id,read:Number(result.read||0),scanStatus:status,
  nextPage:result.nextPage||1,backoffMinutes:rest,errors:(result.errors||[]).map(x=>String(x).slice(0,180)),
  message:summary,at:new Date().toISOString()};
}