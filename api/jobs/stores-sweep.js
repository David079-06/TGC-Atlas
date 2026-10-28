import {db} from 'hatchable';
import {runStoreScan} from 'lib/store-scan.js';
import {runCountryInvestigation} from 'lib/country-investigation.js';
export const access='scheduler';export const methods=['POST'];
export default async function(req,res){
 const due=await db.query(`SELECT id FROM store_registry
  WHERE selected=TRUE AND auto_enabled=TRUE AND approved_host=TRUE
  AND (backoff_until IS NULL OR backoff_until<=NOW())
  AND (last_scan_started IS NULL OR last_scan_started<NOW()-refresh_minutes*INTERVAL '1 minute')
  ORDER BY last_scan_started ASC NULLS FIRST LIMIT 2`);
 // Solo los comercios añadidos por el usuario se guardan de forma permanente.
 // Las candidatas de búsqueda caducan y se eliminan con sus revisiones temporales.
 await db.query('DELETE FROM discovered_shops WHERE expires_at<NOW()');
 const work=[runCountryInvestigation().then(result=>({kind:'country_research',...result}))];
 for(const s of due.rows)work.push(runStoreScan(s.id,{manual:false}).then(result=>({kind:'catalog',...result})));
 const done=await Promise.allSettled(work);
 res.json({ok:done.every(x=>x.status==='fulfilled'&&x.value.ok!==false),scanned:done.length,
  results:done.map(x=>x.status==='fulfilled'?x.value:{ok:false,error:String(x.reason).slice(0,180)}),
  policy:'Una fase de investigación nacional y hasta dos conectores de catálogo por ejecución horaria. No se realizan búsquedas repetidas de fuentes limitadas.'});
}