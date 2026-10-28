import {db} from 'hatchable';
export const access='admin';
export const methods=['GET'];
const stores={okami:'https://okamidex.pe',khipu:'https://khipuclubtcg.com',mazmorra:'https://lamazmorratcg.com',bimba:'https://bimbacards.com'};
function quantity(product){
 if(product.is_in_stock===false)return{qty:0,reason:'Agotado según tienda'};
 if(product.is_on_backorder===true||product.is_purchasable===false)return{qty:null,reason:'La tienda no confirma unidades de venta ordinaria'};
 const description=String(product.stock_availability?.text||'').replace(/<[^>]*>/g,' ');
 const m=description.match(/(?:^|\b)(\d{1,7})\s*(?:disponibles|in stock|unidades|units|existencias)/i);
 if(!product.is_in_stock)return{qty:null,reason:'Disponibilidad no confirmada'};
 if(m)return{qty:Number(m[1]),reason:'Cantidad publicada por la tienda'};
 if(Number.isInteger(product.low_stock_remaining)&&product.low_stock_remaining>=0)return{qty:product.low_stock_remaining,reason:'Unidades restantes publicadas por el comercio'};
 return{qty:null,reason:'El comercio no publica la cantidad exacta'};
}
const response=(r,status,source,reason,checkedAt)=>({
 merchant:r.merchant,id:String(r.external_id),title:r.title,
 available:r.available===true,exact:r.stock_quantity!==null&&Number.isInteger(Number(r.stock_quantity)),
 maxQty:r.available===true&&r.stock_quantity!==null?Math.max(0,Number(r.stock_quantity)):0,
 checkedAt:checkedAt||r.stock_checked_at||null,
 stockStatus:status,source,reason:reason||r.stock_note||'Sin detalle',
 note:'Disponibilidad observada, no reserva ni garantía de compra.'
});
export default async function(req,res){
 const merchant=String(req.query?.merchant||'').toLowerCase();
 const ids=String(req.query?.ids||'').split(',').filter(Boolean);
 if(!Object.hasOwn(stores,merchant)||!ids.length||ids.length>8||new Set(ids).size!==ids.length||ids.some(x=>!/^\d{1,20}$/.test(x)))return res.status(400).json({error:'Selección de tienda o productos no válida'});
 const query=await db.query('SELECT merchant,external_id,title,available,stock_quantity,stock_note,stock_checked_at,verification FROM market_offers WHERE merchant=$1 AND external_id=ANY($2::text[])',[merchant,ids]);
 const found=new Map(query.rows.map(row=>[String(row.external_id),row]));
 const missing=ids.filter(id=>!found.has(id));
 const valid=ids.map(id=>found.get(id)).filter(Boolean),now=Date.now();
 const cached=[],need=[];
 for(const old of valid){
  const age=now-Date.parse(old.stock_checked_at||'');
  if(old.verification==='consulta_stock_api'&&Number.isFinite(age)&&age>=0&&age<90000){
   cached.push(response(old,old.stock_quantity===null?'unknown':old.available?'verified':'out','caché reciente de la tienda','Revisado recientemente'));
  }else need.push(old);
 }
 const updated=[];
 let failure=null;
 if(need.length){
  const uri=stores[merchant]+'/wp-json/wc/store/v1/products?'+new URLSearchParams({include:need.map(r=>r.external_id).join(','),per_page:String(need.length)});
  try{
   const source=await fetch(uri,{headers:{Accept:'application/json'},redirect:'error',signal:AbortSignal.timeout(7000)});
   if(!source.ok)throw Error('HTTP '+source.status);
   const products=await source.json();
   if(!Array.isArray(products))throw Error('Formato de API no reconocido');
   const byId=new Map(products.map(p=>[String(p.id),p]));
   const checkedAt=new Date().toISOString(),write=[];
   for(const old of need){
    const p=byId.get(String(old.external_id));
    if(!p){updated.push(response({...old,stock_quantity:null},'unknown','consulta parcial','La tienda no devolvió esta variante',old.stock_checked_at));continue}
    const q=quantity(p);
    const available=!!p.is_in_stock;
    write.push({merchant,id:String(old.external_id),available,qty:q.qty,reason:q.reason,checked_at:checkedAt,title:old.title,old_available:old.available,old_qty:old.stock_quantity,had_stock:!!old.stock_checked_at});
    updated.push(response({...old,available,stock_quantity:q.qty,stock_note:q.reason,stock_checked_at:checkedAt},q.qty===null?'unknown':available?'verified':'out','API pública WooCommerce',q.reason,checkedAt));
   }
   if(write.length){
    const batch=JSON.stringify(write);
    await db.query(`INSERT INTO market_stock_events(merchant,external_id,title,previous_available,new_available,previous_qty,new_qty,source,changed_at)
      SELECT merchant,id,title,old_available,available,old_qty,qty,'Consulta agrupada de stock',checked_at::timestamptz
      FROM jsonb_to_recordset($1::jsonb) AS x(merchant text,id text,title text,old_available boolean,available boolean,old_qty integer,qty integer,checked_at text,had_stock boolean)
      WHERE had_stock AND (old_available IS DISTINCT FROM available OR old_qty IS DISTINCT FROM qty)`,[batch]);
    await db.query(`UPDATE market_offers m SET available=x.available,stock_quantity=x.qty,stock_note=x.reason,stock_checked_at=x.checked_at::timestamptz,verification='consulta_stock_api'
      FROM jsonb_to_recordset($1::jsonb) AS x(merchant text,id text,available boolean,qty integer,reason text,checked_at text)
      WHERE m.merchant=x.merchant AND m.external_id=x.id`,[batch]);
   }
  }catch(e){
   failure=String(e).slice(0,120);
   for(const old of need)updated.push(response({...old,stock_quantity:null},'unknown','consulta fallida','No se pudieron comprobar unidades en este momento',old.stock_checked_at));
  }
 }
 res.json({merchant,results:[...cached,...updated],missing,error:failure,checkedAt:new Date().toISOString(),
  note:'La última cantidad conocida no es inventario reservado. Se reutilizan comprobaciones de los últimos 90 segundos.'});
}