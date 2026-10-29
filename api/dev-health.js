import {db} from 'hatchable';
export const access='admin';
export const methods=['GET'];
// Read-only check for regression tests. Never return shop records or private data.
export default async function(req,res){
 const r=await db.query(`SELECT
  (SELECT COUNT(*)::integer FROM store_registry WHERE selected=TRUE) AS saved_stores,
  (SELECT COUNT(*)::integer FROM discovered_shops WHERE expires_at>NOW()) AS temporary_candidates,
  (SELECT COUNT(*)::integer FROM discovered_shops WHERE expires_at<=NOW()) AS expired_candidates,
  (SELECT COUNT(*)::integer FROM discovered_shop_evidence e LEFT JOIN discovered_shops s ON e.shop_id=s.id WHERE s.id IS NULL) AS orphan_reviews,
  (SELECT COUNT(*)::integer FROM country_investigations WHERE status='running' AND locked_at<NOW()-INTERVAL '15 minutes') AS stale_jobs,
  (SELECT COUNT(*)::integer FROM country_search_areas) AS planned_areas,
  (SELECT COUNT(*)::integer FROM research_verify_queue WHERE status IN('queued','retry','running')) AS verification_pending,
  (SELECT COUNT(*)::integer FROM research_verify_queue WHERE status='done') AS verification_completed,
  (SELECT COUNT(*)::integer FROM research_verify_queue WHERE status='failed') AS verification_exhausted,
  (SELECT COUNT(*)::integer FROM research_verify_queue q LEFT JOIN discovered_shops s ON s.id=q.shop_id WHERE s.id IS NULL) AS orphan_queue,
  (SELECT COUNT(*)::integer FROM research_area_retries WHERE status='retry') AS geographic_retry_pending,
  (SELECT COUNT(*)::integer FROM research_geo_cache WHERE expires_at>NOW()) AS cached_geographic_areas,
  (SELECT COUNT(*)::integer FROM research_geo_cache WHERE expires_at<=NOW()) AS expired_geographic_cache`);
 const c=r.rows[0]||{};
 return res.json({
  ok:Number(c.orphan_reviews||0)===0&&Number(c.orphan_queue||0)===0,
  status:Number(c.stale_jobs||0)>0?'warning':'ok',
  checks:{no_orphan_reviews:Number(c.orphan_reviews||0)===0,stale_jobs:Number(c.stale_jobs||0),
   expired_candidates:Number(c.expired_candidates||0),saved_stores:Number(c.saved_stores||0),
   temporary_candidates:Number(c.temporary_candidates||0),planned_areas:Number(c.planned_areas||0),
   verification_pending:Number(c.verification_pending||0),verification_completed:Number(c.verification_completed||0),
   verification_exhausted:Number(c.verification_exhausted||0),orphan_queue:Number(c.orphan_queue||0),
   geographic_retry_pending:Number(c.geographic_retry_pending||0),
   cached_geographic_areas:Number(c.cached_geographic_areas||0),
   expired_geographic_cache:Number(c.expired_geographic_cache||0)},
  description:'Diagnóstico de mantenimiento, restringido al propietario. Las tiendas descubiertas no se guardan en Mis tiendas.',
  checkedAt:new Date().toISOString()
 });
}