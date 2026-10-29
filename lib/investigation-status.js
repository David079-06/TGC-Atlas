import {db} from 'hatchable';
import {countryAreaReport} from 'lib/country-areas.js';
import {queueSnapshot} from 'lib/research-queue.js';
import {FREE_PROVIDER_LIMITS} from 'lib/research-providers.js';
export async function investigationStatus(country){
 const [job,stats,areas,recent,saved,queue,providers,areaRetries]=await Promise.all([
  db.query('SELECT * FROM country_investigations WHERE country=$1',[country]),
  db.query(`SELECT COUNT(*)::integer total,
   COUNT(*) FILTER(WHERE s.pokemon_signal)::integer pokemon,
   COUNT(*) FILTER(WHERE s.website IS NOT NULL)::integer with_web,
   COUNT(e.shop_id)::integer reviewed,
   COUNT(*) FILTER(WHERE e.verification_level='documented' AND jsonb_array_length(e.independent_sources)>=2)::integer documented,
   COUNT(*) FILTER(WHERE e.website_reachable=TRUE)::integer accessible
   FROM discovered_shops s LEFT JOIN discovered_shop_evidence e ON e.shop_id=s.id
   WHERE s.country=$1 AND s.expires_at>NOW()`,[country]),
  countryAreaReport(country),
  db.query(`SELECT s.name,s.city,e.website_note,e.verification_level,e.website_reachable,e.last_checked_at
    FROM discovered_shop_evidence e JOIN discovered_shops s ON s.id=e.shop_id
    WHERE s.country=$1 AND s.expires_at>NOW() ORDER BY e.last_checked_at DESC LIMIT 5`,[country]),
  db.query('SELECT COUNT(*)::integer saved FROM store_registry WHERE country=$1 AND selected=TRUE',[country]),
  queueSnapshot(country),
  db.query('SELECT provider,used_today,consecutive_failures,next_allowed_at,last_http_status FROM research_source_budget ORDER BY provider'),
  db.query(`SELECT COUNT(*) FILTER(WHERE status='retry')::integer waiting,
    COUNT(*) FILTER(WHERE status='failed')::integer exhausted
    FROM research_area_retries WHERE country=$1`,[country])
 ]);
 const j=job.rows[0]||null,v=stats.rows[0]||{},total=v.total||0,reviewed=v.reviewed||0;
 const attempted=Math.min(Number(j?.cursor||0),Number(areas.total||0)),planned=Number(areas.total||0);
 const successful=Number(j?.checked_zones||0),failed=Number(j?.failed_zones||0);
 const searchPct=planned?Math.round(100*attempted/planned):0;
 const verifiedPct=total?Math.round(100*reviewed/total):j?.phase==='finished'?100:0;
 const phase=j?.phase||'discover';
 const roundPct=phase==='finished'?100:phase==='verify'?60+Math.round(39*verifiedPct/100):Math.round(searchPct*.6);
 return {country,job:j,zonesPlanned:planned,plannedRegions:areas.regions||0,plannedLocalities:areas.localities||0,
  areasAttempted:attempted,areasSucceeded:successful,areasFailed:failed,
  totalCandidates:total,pokemonIndicated:v.pokemon||0,candidatesWithWebsite:v.with_web||0,
  webChecks:v.accessible||0,reviewed,remaining:Math.max(0,total-reviewed),
  documented:v.documented||0,savedStores:saved.rows[0]?.saved||0,latestReviews:recent.rows,
  verificationQueue:queue,
  areaRetries:areaRetries.rows[0]||{waiting:0,exhausted:0},
  providers:providers.rows.filter(p=>FREE_PROVIDER_LIMITS[p.provider]).map(p=>({
    name:p.provider,requestsToday:p.used_today,
    dailyLimit:FREE_PROVIDER_LIMITS[p.provider].daily,
    failuresInRow:p.consecutive_failures,nextAllowed:p.next_allowed_at,
    lastHttpStatus:p.last_http_status})),
  progress:{search:searchPct,verification:verifiedPct,overall:Math.min(100,roundPct)},
  coverage:{mode:'muestra_geografica',nationalComplete:false,areasNotVisited:Math.max(0,planned-attempted),
   notice:'El porcentaje mide la ronda de áreas planificadas; no representa el porcentaje de tiendas existentes del país descubiertas.',
   source:j?.area_source||null,limitations:j?.area_limitations||null,
   lastArea:j?.last_city||null},
  cache:'Las candidatas se mantienen en caché hasta 30 días. Solo las añadidas por ti se guardan permanentemente en Mis tiendas.',
  sourceNote:'Búsqueda gratuita de comercios con datos de OpenStreetMap (Photon/Overpass) y dominios de conectores conocidos. Sin servicios de pago. Cobertura parcial; la procedencia no implica fiabilidad.',
  checkedAt:new Date().toISOString()};
}