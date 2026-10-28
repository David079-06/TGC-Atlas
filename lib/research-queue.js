import {db} from 'hatchable';
import {reviewOneShop} from 'lib/shop-review.js';

const asError=error=>String(error?.message||error||'Error desconocido').slice(0,190);
export async function enqueueReviews(shops){
 const rows=[...new Map((shops||[]).filter(x=>x?.id&&x.country).map(s=>[s.id,{
  shop_id:s.id,country:s.country,priority:s.pokemon_signal?10:100
 }])).values()].slice(0,150);
 if(!rows.length)return 0;
 const r=await db.query(`INSERT INTO research_verify_queue(shop_id,country,priority)
  SELECT x.shop_id,x.country,x.priority FROM jsonb_to_recordset($1::jsonb)
  AS x(shop_id text,country char(2),priority integer)
  ON CONFLICT(shop_id) DO UPDATE SET priority=LEAST(research_verify_queue.priority,EXCLUDED.priority)
  RETURNING shop_id`,[JSON.stringify(rows)]);
 return r.rows.length;
}
export async function queueSnapshot(country){
 const r=await db.query(`SELECT COUNT(*)::integer total,
   COUNT(*) FILTER(WHERE status='queued')::integer queued,
   COUNT(*) FILTER(WHERE status='running')::integer running,
   COUNT(*) FILTER(WHERE status='retry')::integer retry,
   COUNT(*) FILTER(WHERE status='done')::integer done,
   COUNT(*) FILTER(WHERE status='failed')::integer failed,
   MIN(next_attempt) FILTER(WHERE status IN ('queued','retry')) next_due
  FROM research_verify_queue WHERE country=$1`,[country]);
 const x=r.rows[0]||{};
 return {total:Number(x.total||0),queued:Number(x.queued||0),running:Number(x.running||0),
  retry:Number(x.retry||0),done:Number(x.done||0),failed:Number(x.failed||0),nextDue:x.next_due||null};
}
export async function processVerificationQueue(country=null,max=2){
 const count=Math.min(2,Math.max(1,Number(max)||1));
 const r=await db.query(`WITH claimed AS (
  SELECT q.shop_id FROM research_verify_queue q
  JOIN discovered_shops s ON s.id=q.shop_id
  WHERE s.expires_at>NOW() AND ($1::text IS NULL OR q.country=$1)
  AND ((q.status IN ('queued','retry') AND q.next_attempt<=NOW())
    OR (q.status='running' AND q.locked_at<NOW()-INTERVAL '4 minutes'))
  ORDER BY q.priority ASC,q.next_attempt ASC,q.created_at ASC
  FOR UPDATE OF q SKIP LOCKED LIMIT $2
 )
 UPDATE research_verify_queue q SET status='running',attempts=q.attempts+1,
  locked_at=NOW(),updated_at=NOW()
 FROM claimed WHERE q.shop_id=claimed.shop_id
 RETURNING q.shop_id,q.attempts`,[country,count]);
 if(!r.rows.length)return {processed:0,done:0,retry:0,failed:0,errors:[],names:[]};
 const results=await Promise.all(r.rows.map(async task=>{
  let shop=null;
  try{
   const found=await db.query(`SELECT s.id,s.website,s.name,s.country,s.city,s.address,
    s.pokemon_signal,s.store_type,s.source FROM discovered_shops s
    WHERE s.id=$1 AND s.expires_at>NOW()`,[task.shop_id]);
   shop=found.rows[0];
   if(!shop){await db.query(`DELETE FROM research_verify_queue WHERE shop_id=$1`,[task.shop_id]);return {status:'done',name:'Caducada'};}
   const review=await reviewOneShop(shop);
   if(review.temporaryFailure)throw Error(review.error||'Fuente web no disponible');
   await db.query(`UPDATE research_verify_queue SET status='done',locked_at=NULL,
    last_error=NULL,completed_at=NOW(),updated_at=NOW() WHERE shop_id=$1`,[task.shop_id]);
   return {status:'done',name:shop.name};
  }catch(e){
   const error=asError(e),attempts=Number(task.attempts||1);
   const status=attempts>=4?'failed':'retry';
   const delay=Math.min(14400,90*Math.pow(3,Math.max(0,attempts-1)));
   await db.query(`UPDATE research_verify_queue SET status=$2,locked_at=NULL,last_error=$3,
    next_attempt=NOW()+($4::integer*INTERVAL '1 second'),updated_at=NOW()
    WHERE shop_id=$1`,[task.shop_id,status,error,delay]);
   return {status,name:shop?.name||task.shop_id,error};
  }
 }));
 return {processed:results.length,done:results.filter(x=>x.status==='done').length,
  retry:results.filter(x=>x.status==='retry').length,
  failed:results.filter(x=>x.status==='failed').length,
  errors:results.filter(x=>x.error).map(x=>x.error),names:results.map(x=>x.name)};
}