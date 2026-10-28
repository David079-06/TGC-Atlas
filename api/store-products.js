import {db} from 'hatchable';
export const access='admin';export const methods=['GET'];
export default async function(req,res){
 const merchant=String(req.query?.merchant||'').slice(0,130),
  category=String(req.query?.category||'pokemon'),
  page=Math.max(1,Math.min(100,parseInt(req.query?.page,10)||1)),
  q=String(req.query?.q||'').trim().slice(0,75);
 if(!['pokemon','preorders','other','review'].includes(category))return res.status(400).json({error:'Categoría desconocida'});
 const listed=await db.query('SELECT id,selected,scan_status FROM store_registry WHERE id=$1',[merchant]);
 if(!listed.rows.length)return res.status(404).json({error:'La tienda no está registrada'});
 const predicate=category==='pokemon'?"franchise='pokemon_tcg' AND preorder_evidence IS NULL":
  category==='preorders'?"franchise='pokemon_tcg' AND preorder_evidence IS NOT NULL":
  category==='other'?"franchise='otro_tcg' OR (franchise='sin_clasificar' AND product_tags && ARRAY['accesorio','coleccionable','otros']::text[])":
  "franchise IS NULL OR (franchise='sin_clasificar' AND NOT (product_tags && ARRAY['accesorio','coleccionable','otros']::text[]))";
 const where=`merchant=$1 AND (${predicate}) AND ($2='' OR title ILIKE '%'||$2||'%')`;
 const [rows,count]=await Promise.all([
  db.query(`SELECT external_id,title,price,currency,available,stock_quantity,stock_checked_at,stock_note,
   product_url,language,product_kind,product_tags,updated_at,preorder_evidence,franchise
   FROM market_offers WHERE ${where} ORDER BY updated_at DESC LIMIT 24 OFFSET $3`,
  [merchant,q,(page-1)*24]),
  db.query(`SELECT COUNT(*)::integer total FROM market_offers WHERE ${where}`,[merchant,q])
 ]);
 res.json({merchant,category,page,total:Number(count.rows[0]?.total||0),items:rows.rows,
  scanStatus:listed.rows[0].scan_status,checkedAt:new Date().toISOString(),
  note:'Precios y disponibilidad tomados del último escaneo de una API pública. La cifra numérica de stock solo es fiable si la tienda la publica. No son reservas.'});
}