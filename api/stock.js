import {db} from 'hatchable';
export const access='admin';
export const methods=['GET'];
const shopifyStores={noraku:'noraku.es',pokemillon:'www.pokemillon.com',theboosterbox:'theboosterbox.es'};
const stores={
  okami:'https://okamidex.pe',
  khipu:'https://khipuclubtcg.com',
  mazmorra:'https://lamazmorratcg.com',
  bimba:'https://bimbacards.com'
};
function stockNumber(x){
  if(x.is_in_stock===false)return {qty:0,reason:'Agotado según la tienda'};
  if(x.is_on_backorder===true||x.is_purchasable===false)return {qty:null,reason:'La tienda no confirma una compra ordinaria con unidades disponibles'};
  const text=String(x.stock_availability?.text||'').replace(/<[^>]*>/g,' ');
  const match=text.match(/(?:^|\b)(\d{1,7})\s*(?:disponibles|in stock|unidades|units|existencias)/i);
  if(x.is_in_stock===false)return {qty:0,reason:'Agotado según tienda'};
  if(!x.is_in_stock)return {qty:null,reason:'Disponibilidad no comprobada'};
  if(!match){const low=x.low_stock_remaining;if(Number.isInteger(low)&&low>=0)return {qty:low,reason:'Unidades restantes publicadas por WooCommerce'};return {qty:null,reason:'La tienda no publica una cantidad exacta'};}
  return {qty:Number(match[1]),reason:'Cantidad publicada por la tienda'};
}
export default async function(req,res){
 const merchant=String(req.query?.merchant||'').toLowerCase().slice(0,30);
 const id=String(req.query?.id||'').slice(0,25);
 if(!/^[a-z0-9_-]{2,30}$/.test(merchant)||!/^[0-9]{1,20}$/.test(id))
   return res.status(400).json({error:'Producto o tienda no válidos'});
 const q=await db.query('SELECT merchant,external_id,title,market,product_url,available,stock_quantity,updated_at,stock_note,verification,stock_checked_at FROM market_offers WHERE merchant=$1 AND external_id=$2 LIMIT 1',[merchant,id]);
 const old=q.rows[0];
 if(!old)return res.status(404).json({error:'Producto no encontrado en nuestro catálogo'});
 const now=Date.now(),elapsed=now-Date.parse(old.stock_checked_at||0);
 const response=(record,source,status,why)=>({
   merchant,id,title:record.title,available:record.available===true,
   maxQty:Number.isInteger(Number(record.stock_quantity))&&record.stock_quantity!==null&&record.available===true?Math.max(0,Number(record.stock_quantity)):0,
   exact:record.stock_quantity!==null&&Number.isInteger(Number(record.stock_quantity)),
   checkedAt:record.stock_checked_at||record.updated_at,source,stockStatus:status,reason:why||record.stock_note||'Sin detalle',
   note:'Dato de disponibilidad, no reserva. La tienda puede vender unidades antes de que compres.'
 });
 // Comparte la última comprobación durante 90 s entre pantallas y sesiones.
 if(old.verification==='consulta_stock_api'&&old.stock_checked_at&&elapsed>=0&&elapsed<90000){
  return res.json(response(old,'caché de API oficial',old.stock_quantity===null?'unknown':old.available?'verified':'out','Comprobado recientemente'));
 }
 const host=stores[merchant];
 if(!host&&shopifyStores[merchant]){
  try{
   const product=new URL(old.product_url);
   if(product.hostname!==shopifyStores[merchant])throw Error('La ficha no pertenece al dominio verificado');
   const slug=product.pathname.match(/^\/products\/([a-z0-9_-]+)\/?$/i)?.[1];
   if(!slug)throw Error('No hay identificador de producto consultable');
   const reqUrl='https://'+shopifyStores[merchant]+'/products/'+slug+'.js';
   const result=await fetch(reqUrl,{headers:{Accept:'application/json'},redirect:'error',signal:AbortSignal.timeout(5500)});
   if(!result.ok)throw Error('HTTP '+result.status);
   const productJson=await result.json();
   const variant=(productJson.variants||[]).find(x=>String(x.id)===id);
   if(!variant)throw Error('La variante no aparece en la ficha pública');
   const available=variant.available===true;
   const publicCount=variant.inventory_management==='shopify'&&variant.inventory_policy==='deny'
     &&Number.isInteger(variant.inventory_quantity)&&variant.inventory_quantity>=0?variant.inventory_quantity:null;
   const qty=!available?0:publicCount===0?null:publicCount;
   const checkedAt=new Date().toISOString(),reason=qty===null?'Disponibilidad publicada por la tienda':'Existencias de la variante publicadas por la tienda';
   if(old.stock_checked_at&&(old.available!==available||old.stock_quantity!==qty)){
    await db.query('INSERT INTO market_stock_events(merchant,external_id,title,previous_available,new_available,previous_qty,new_qty,source,changed_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',[merchant,id,old.title,old.available,available,old.stock_quantity,qty,'API pública de variante Shopify',checkedAt]);
   }
   await db.query('UPDATE market_offers SET available=$3,stock_quantity=$4,stock_note=$5,stock_checked_at=$6,verification=$7 WHERE merchant=$1 AND external_id=$2',[merchant,id,available,qty,reason,checkedAt,'consulta_stock_api']);
   return res.json(response({...old,available,stock_quantity:qty,stock_note:reason,stock_checked_at:checkedAt},'Variante pública Shopify',!available?'out':qty===null?'unknown':'verified'));
  }catch(e){
   return res.json({...response({...old,stock_quantity:null},'catálogo Shopify','unknown',old.available?'Disponible según última lectura de la tienda':'Sin disponibilidad confirmada'),error:String(e).slice(0,100)});
  }
 }
 if(!host){
  return res.json({...response({...old,stock_quantity:null},'catálogo de tienda','unknown',old.available?'Disponible según catálogo':'Sin disponibilidad confirmada')});
 }
 try{
  const u=host+'/wp-json/wc/store/v1/products/'+encodeURIComponent(id);
  const r=await fetch(u,{headers:{Accept:'application/json'},redirect:'error',signal:AbortSignal.timeout(6500)});
  if(!r.ok)throw Error('HTTP '+r.status);
  const x=await r.json();
  if(String(x.id)!==id)throw Error('Identificador diferente');
  const v=stockNumber(x);
  const check=new Date().toISOString();
  if(old.stock_checked_at && (old.available!==!!x.is_in_stock || old.stock_quantity!==v.qty)){
    await db.query('INSERT INTO market_stock_events(merchant,external_id,title,previous_available,new_available,previous_qty,new_qty,source,changed_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',[merchant,id,old.title,old.available,!!x.is_in_stock,old.stock_quantity,v.qty,'Consulta puntual a API de tienda',check]);
  }
  await db.query('UPDATE market_offers SET available=$3,stock_quantity=$4,stock_note=$5,stock_checked_at=$6,verification=$7 WHERE merchant=$1 AND external_id=$2',[merchant,id,!!x.is_in_stock,v.qty,v.reason,check,'consulta_stock_api']);
  // Una lectura de stock no agrega una observación ficticia de precio.
  return res.json(response({...old,available:!!x.is_in_stock,stock_quantity:v.qty,stock_checked_at:check,stock_note:v.reason},'API pública de la tienda',v.qty===null?'unknown':x.is_in_stock?'verified':'out'));
 }catch(e){
  return res.json({...response({...old,stock_quantity:null},'error en consulta','unknown','No se ha podido comprobar el stock ahora'),checkedAt:old.updated_at,error:String(e).slice(0,120)});
 }
}