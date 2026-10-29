import {trustForShop} from 'lib/store-trust.js';
export const storesQuery=`SELECT s.*,
 COALESCE(p.total,0)::int AS products,COALESCE(p.pokemon,0)::int AS pokemon,
 COALESCE(p.preorders,0)::int AS preorders,COALESCE(p.other,0)::int AS other,
 COALESCE(p.unclassified,0)::int AS unclassified,COALESCE(p.available,0)::int AS available,
 COALESCE(p.priced,0)::int AS priced,p.last_catalog,
 h.last_attempt AS source_last_attempt,h.last_success,h.last_error
 FROM store_registry s
 LEFT JOIN LATERAL
 (SELECT COUNT(*) AS total,
 COUNT(*) FILTER(WHERE franchise='pokemon_tcg' AND preorder_evidence IS NULL) AS pokemon,
 COUNT(*) FILTER(WHERE franchise='pokemon_tcg' AND preorder_evidence IS NOT NULL) AS preorders,
 COUNT(*) FILTER(WHERE franchise='otro_tcg' OR (franchise='sin_clasificar' AND product_tags && ARRAY['accesorio','coleccionable','otros']::text[])) AS other,
 COUNT(*) FILTER(WHERE franchise IS NULL OR (franchise='sin_clasificar' AND NOT (product_tags && ARRAY['accesorio','coleccionable','otros']::text[]))) AS unclassified,
 COUNT(*) FILTER(WHERE available) AS available,COUNT(*) FILTER(WHERE price>0) AS priced,
 MAX(updated_at) AS last_catalog
 FROM market_offers WHERE merchant=s.id) p ON TRUE
 LEFT JOIN shop_scan_health h ON h.merchant=s.id
 ORDER BY s.country,s.name`;
export const toStore=r=>{
 const products=Number(r.products||0),priced=Number(r.priced||0),
  last=Date.parse(r.last_catalog||''),stale=!Number.isFinite(last)||Date.now()-last>36*3600000;
 let badge=r.scan_status==='blocked'||r.scan_status==='failed'?'red':
  !r.approved_host||r.scan_status==='not_supported'||stale?'yellow':'green';
 const status=r.scan_status==='ok'&&stale?'old':r.scan_status;
 const completeness=products?Math.round(100*priced/products):0;
 const dataScore=Math.min(100,(r.approved_host?20:0)+(products?20:0)+(stale?0:25)+Math.round(.25*completeness)+(r.evidence_url?10:0));
 return {
  id:r.id,name:r.name,country:r.country,website:r.website,city:r.city,address:r.address,addressType:r.address_type,
  trust:trustForShop(r.id),
  platform:r.platform,storeType:r.store_type,email:r.email,phone:r.phone,contactUrl:r.contact_url,
  evidenceUrl:r.evidence_url,preordersUrl:r.preorders_url,
  selected:r.selected,autoEnabled:r.auto_enabled,approvedHost:r.approved_host,
  badge,status,scanError:r.integration_note||r.last_error||null,scanStatus:status,failStreak:r.fail_streak,
  lastCatalogScan:r.last_catalog,lastScanStarted:r.last_scan_started,lastScanFinished:r.last_scan_finished,
  lastAttempt:r.source_last_attempt,backoffUntil:r.backoff_until,refreshMinutes:r.refresh_minutes,
  products,pokemon:Number(r.pokemon),preorders:Number(r.preorders),other:Number(r.other),
  unclassified:Number(r.unclassified),available:Number(r.available),priced,dataScore,
  recommendationScore:dataScore,
  hasIndependentReviews:r.rating!==null&&!!r.rating_source,rating:r.rating===null?null:Number(r.rating),
  ratingCount:r.rating_count,ratingSource:r.rating_source,reviewCheckedAt:r.review_checked_at,
  marketingNote:r.marketing_note,marketingUrl:r.marketing_url,
  isSimulation:false,
  analysisReasons:[r.approved_host?'Dominio y conector revisados':'Conector pendiente de validación',
   products+' fichas recogidas',stale?'Lectura de catálogo antigua o pendiente':'Lectura reciente de catálogo',
   completeness+' % de fichas con precio']
 };
};