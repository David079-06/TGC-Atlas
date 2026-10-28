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
  (SELECT COUNT(*)::integer FROM country_search_areas) AS planned_areas`);
 const c=r.rows[0]||{};
 return res.json({
  ok:Number(c.orphan_reviews||0)===0,
  status:Number(c.stale_jobs||0)>0?'warning':'ok',
  checks:{no_orphan_reviews:Number(c.orphan_reviews||0)===0,stale_jobs:Number(c.stale_jobs||0),
   expired_candidates:Number(c.expired_candidates||0),saved_stores:Number(c.saved_stores||0),
   temporary_candidates:Number(c.temporary_candidates||0),planned_areas:Number(c.planned_areas||0)},
  description:'Diagnóstico de mantenimiento, restringido al propietario. Las tiendas descubiertas no se guardan en Mis tiendas.',
  checkedAt:new Date().toISOString()
 });
}