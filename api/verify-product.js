export const access='admin';
export const methods=['POST'];
import {db} from 'hatchable';
import {save} from 'lib/collect.js';
export default async function(req,res){
 const merchant=String(req.body?.merchant||''), id=String(req.body?.id||'');
 if(!['okami','khipu','theboosterbox','pokemillon'].includes(merchant)||!/^[0-9]{1,20}$/.test(id)) return res.status(400).json({error:'Solicitud inválida'});
 const q=await db.query('SELECT merchant,market,external_id,title,product_url,currency,price,available,stock_quantity,stock_note,language,product_kind,updated_at,verification FROM market_offers WHERE merchant=$1 AND external_id=$2 LIMIT 1',[merchant,id]);
 const old=q.rows[0];if(!old)return res.status(404).json({error:'Producto desconocido'});
 if(Date.now()-Date.parse(old.updated_at)<120000)return res.json({status:'cache_reciente',offer:old});
 try{
  let next={...old,verification:'consulta_puntual_api'};
  if(merchant==='okami'||merchant==='khipu'){
   const host=merchant==='okami'?'https://okamidex.pe':'https://khipuclubtcg.com';
   const r=await fetch(host+'/wp-json/wc/store/v1/products/'+id);
   if(!r.ok)throw Error('HTTP '+r.status);
   const x=await r.json();if(String(x.id)!==id)throw Error('Identificador diferente');
   const price=Number(x.prices?.price)/Math.pow(10,Number(x.prices?.currency_minor_unit??2));
   if(!(price>0))throw Error('Precio inválido');
   const note=String(x.stock_availability?.text||'');
   const match=note.match(/(\d+)\s*(disponibles|in stock|unidades)/i);
   next.price=price;next.available=!!x.is_in_stock;
   next.stock_quantity=!x.is_in_stock?0:match?Number(match[1]):null;
   next.stock_note=note||'Stock numérico no publicado';
   next.product_url=x.permalink||old.product_url;
  }else{
   const url=new URL(old.product_url);
   const host=merchant==='theboosterbox'?'theboosterbox.es':'www.pokemillon.com';
   if(url.host!==host)throw Error('Dominio no autorizado');
   const r=await fetch('https://'+host+url.pathname+'.js');if(!r.ok)throw Error('HTTP '+r.status);
   const x=await r.json(),v=x.variants?.find(z=>String(z.id)===id);
   if(!v)throw Error('Variante no localizada');
   next.price=Number(v.price)/100;next.available=!!v.available;
   next.stock_quantity=null;next.stock_note='Cantidad no publicada';
  }
  await save([next]);return res.json({status:'comprobado',offer:{...next,updated_at:new Date().toISOString()}});
 }catch(e){return res.status(502).json({error:'No verificado: '+String(e).slice(0,200),ultima_revision:old.updated_at})}
}