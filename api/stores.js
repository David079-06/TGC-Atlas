import {db} from 'hatchable';
import {sourceForHost} from 'lib/store-adapters.js';
import {acceptableCountry,safeUrl} from 'lib/store-validation.js';
import {storesQuery,toStore} from 'lib/store-presenter.js';
import {enrichWithVerification,verificationKey,evaluateVerification} from 'lib/store-verification.js';
export const access='admin';export const methods=['GET','POST'];
export default async function(req,res){
 if(req.method==='GET'){
  const compact=String(req.query?.compact||'')==='1';
  const rows=await db.query(compact?`SELECT s.*,h.last_attempt AS source_last_attempt,h.last_success,h.last_error FROM store_registry s LEFT JOIN shop_scan_health h ON h.merchant=s.id ORDER BY s.country,s.name`:storesQuery),shops=await enrichWithVerification(rows.rows.map(toStore));
  return res.json({shops,checkedAt:new Date().toISOString(),counts:{all:shops.length,followed:shops.filter(s=>s.selected).length},
   note:'Los colores evalúan documentación y frescura de datos, no garantizan seguridad comercial. Las tiendas pendientes no reciben lecturas automáticas.'});
 }
 const body=typeof req.body==='string'?JSON.parse(req.body):req.body||{},action=String(body.action||'');
 if(action==='add_candidate'){
  const candidateId=String(body.id||'').slice(0,110),requested=String(body.country||'').toUpperCase();
  if(!candidateId||!acceptableCountry(requested))return res.status(400).json({error:'Selecciona una tienda real de la investigación'});
  const result=await db.query(`SELECT id,name,country,city,website,phone,address,store_type,source_url
   FROM discovered_shops WHERE id=$1 AND country=$2 AND expires_at>NOW()`,[candidateId,requested]);
  const c=result.rows[0];if(!c)return res.status(404).json({error:'La investigación temporal caducó. Vuelve a buscar esa tienda.'});
  const validSite=safeUrl(c.website||'');
  const key=verificationKey(c);
  const dossier=(await db.query('SELECT * FROM shop_verification_reports WHERE verification_key=$1',[key])).rows[0]||null;
  const trust=evaluateVerification(dossier);
  const sources=trust.sources||[];
  const level=trust.level==='green'?'documented':'pending';
  const label=trust.label;
  const verification={last_checked_at:trust.checkedAt,website_note:trust.summary};
  if(validSite){
   const already=await db.query('SELECT id FROM store_registry WHERE country=$1 AND host=$2 AND selected=TRUE LIMIT 1',[requested,validSite.host]);
   if(already.rows.length)return res.json({ok:true,id:already.rows[0].id,country:requested,alreadyAdded:true,message:'Esta tienda ya está en tu directorio.'});
  }
  const savedId='saved-'+c.id;
  const saved=await db.query(`INSERT INTO store_registry
   (id,name,country,website,host,platform,store_type,city,address,address_type,evidence_url,phone,
   selected,approved_host,auto_enabled,scan_status,integration_note,
   research_label,research_level,research_reviewed_at,research_note,research_sources)
   VALUES($1,$2,$3,$4,$5,'manual',$6,$7,$8,NULL,$9,$10,TRUE,FALSE,FALSE,'not_supported',$11,$12,$13,$14,$15,$16::jsonb)
   ON CONFLICT(id) DO UPDATE SET selected=TRUE,
    research_label=EXCLUDED.research_label,research_level=EXCLUDED.research_level,
    research_reviewed_at=EXCLUDED.research_reviewed_at,research_note=EXCLUDED.research_note,
    research_sources=EXCLUDED.research_sources,updated_at=NOW()
   RETURNING id,name,country,selected`,
   [savedId,c.name,c.country,validSite?.website||null,validSite?.host||null,c.store_type||'physical',
    c.city||null,c.address||null,c.source_url||null,c.phone||null,
    'Añadida expresamente a tu directorio. La investigación de fiabilidad y la integración de productos son procesos independientes.',
    label,level,verification.last_checked_at||null,verification.website_note||'Candidata encontrada en una fuente abierta, pendiente de confirmación comercial.',JSON.stringify(sources)]);
  return res.json({ok:true,...saved.rows[0],message:'Tienda añadida a Mis tiendas. Se conserva su ficha básica y fuente; no se importan productos automáticamente.'});
 }
 if(action==='register'){
  const input=safeUrl(String(body.website||'').trim()),requested=String(body.country||'').toUpperCase(),
   name=String(body.name||'').trim().slice(0,110);
  if(!input||!acceptableCountry(requested))return res.status(400).json({error:'Introduce país y enlace HTTPS válido'});
  const match=sourceForHost(input.host);
  const candidateId=String(body.discoveredId||'').slice(0,110);
  const candidateRows=candidateId?await db.query('SELECT id,country,city,name,website,address,phone,store_type,source_url FROM discovered_shops WHERE id=$1',[candidateId]):{rows:[]};
  const candidate=candidateRows.rows.find(c=>safeUrl(c.website)?.host===input.host&&c.country===requested)||null;
  const known=match?.[1],id=match?.[0]||('web-'+input.host.replace(/[^a-z0-9]/g,'-'));
  const country=known?.country||candidate?.country||requested;
  const shopName=known?.name||candidate?.name||name;
  if(!shopName||shopName.length<3)return res.status(400).json({error:'Indica el nombre comercial de la tienda'});
  const host=known?.host||input.host,website='https://'+host+'/';
  const approved=!!known;
  const inserted=await db.query(`INSERT INTO store_registry
   (id,name,country,website,host,platform,store_type,preorders_url,
    city,address,address_type,contact_url,evidence_url,email,phone,
    selected,auto_enabled,approved_host,refresh_minutes,scan_status,integration_note)
   VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,TRUE,$16,$16,$17,$18,$19)
   ON CONFLICT(id) DO UPDATE SET selected=TRUE,
    city=COALESCE(store_registry.city,EXCLUDED.city),
    address=COALESCE(store_registry.address,EXCLUDED.address),
    address_type=COALESCE(store_registry.address_type,EXCLUDED.address_type),
    contact_url=COALESCE(store_registry.contact_url,EXCLUDED.contact_url),
    evidence_url=COALESCE(store_registry.evidence_url,EXCLUDED.evidence_url),
    email=COALESCE(store_registry.email,EXCLUDED.email),
    phone=COALESCE(store_registry.phone,EXCLUDED.phone),
    updated_at=NOW()
   RETURNING id,name,country,selected,auto_enabled,approved_host,scan_status`,
   [id,shopName,country,website,host,known?.platform||'manual',known?.kind||candidate?.store_type||'online',known?.preorders||null,
    known?.city||candidate?.city||null,known?.address||candidate?.address||null,known?.addressType||null,
    known?.contact||null,known?.evidence||candidate?.source_url||null,known?.email||null,known?.phone||candidate?.phone||null,
    approved,approved?120:360,approved?'queued':'not_supported',
    approved?'Conector público de catálogo habilitado; comprobación inicial pendiente':'Esta web necesita revisión de API, identidad y condiciones antes de habilitar el recolector.']);
  return res.json({ok:true,...inserted.rows[0],importAvailable:approved,
   message:approved?'Tienda añadida. Importación inicial disponible y seguimiento automático habilitado.':candidate?'Tienda registrada desde una fuente externa: hemos conservado su dirección declarada, pendiente de contrastar identidad y conector.':'Tienda registrada. El dominio no tiene todavía un conector autorizado; queda pendiente de integración, sin datos ficticios.'});
 }
 if(action==='follow'){
  const id=String(body.id||''),selected=body.followed===true;
  const changed=await db.query(`UPDATE store_registry SET selected=$2,updated_at=NOW(),scan_status=CASE WHEN $2 AND approved_host AND last_scan_finished IS NULL THEN 'queued' ELSE scan_status END WHERE id=$1 RETURNING id,selected,approved_host`,[id,selected]);
  return changed.rows.length?res.json({ok:true,...changed.rows[0]}):res.status(404).json({error:'Tienda no encontrada'});
 }
 if(action==='delete'){
  const id=String(body.id||'');
  const found=await db.query('SELECT id FROM store_registry WHERE id=$1',[id]);if(!found.rows.length)return res.status(404).json({error:'Tienda no encontrada'});
  await db.query('DELETE FROM market_stock_events WHERE merchant=$1',[id]);
  await db.query('DELETE FROM market_offer_history WHERE merchant=$1',[id]);
  await db.query('DELETE FROM market_offers WHERE merchant=$1',[id]);
  await db.query('DELETE FROM shop_scan_health WHERE merchant=$1',[id]);
  await db.query('DELETE FROM store_registry WHERE id=$1',[id]);
  return res.json({ok:true,id});
 }
 if(action==='cadence'){
  const minutes=Number(body.minutes);
  if(!Number.isSafeInteger(minutes)||minutes<60||minutes>1440)return res.status(400).json({error:'Intervalo permitido: 60-1440 minutos'});
  const updated=await db.query('UPDATE store_registry SET refresh_minutes=$2 WHERE id=$1 AND approved_host AND selected RETURNING id,refresh_minutes',[String(body.id||''),minutes]);
  return updated.rows.length?res.json({ok:true,minutes}):res.status(400).json({error:'Primero debe aprobarse la integración'});
 }
 res.status(400).json({error:'Acción no válida'});
}