import {db} from 'hatchable';
import {processVerificationQueue} from 'lib/research-queue.js';
import {processAreaRetry} from 'lib/research-area-retry.js';
export const access='scheduler';
export const methods=['POST'];
// Hourly fallback (hosting plan limit) for verification jobs that outlive a session.
export default async function(req,res){
 const [reviews,areas]=await Promise.allSettled([
  processVerificationQueue(null,2),
  processAreaRetry(null)
 ]);
 const done=reviews.status==='fulfilled'?reviews.value:{processed:0,error:String(reviews.reason).slice(0,160)};
 const retry=areas.status==='fulfilled'?areas.value:{processed:0,error:String(areas.reason).slice(0,160)};
 // Cleanup is bounded to expired temporary research; permanent user stores untouched.
 const [expired,cache]=await Promise.all([
  db.query(`DELETE FROM discovered_shops WHERE id IN
   (SELECT id FROM discovered_shops WHERE expires_at<NOW() ORDER BY expires_at LIMIT 70)
   RETURNING id`),
  db.query(`DELETE FROM research_geo_cache WHERE (country,area_key,provider) IN
   (SELECT country,area_key,provider FROM research_geo_cache WHERE expires_at<NOW()
    ORDER BY expires_at LIMIT 70) RETURNING provider`)
 ]);
 return res.json({ok:reviews.status==='fulfilled'&&areas.status==='fulfilled',
  verification:done,geoRetries:retry,expiredCleaned:expired.rows.length,geoCacheCleaned:cache.rows.length,
  policy:'Cola persistente; máximo 2 verificaciones y 1 reintento geográfico por ejecución.'});
}