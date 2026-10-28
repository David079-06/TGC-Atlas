import {db} from 'hatchable';
export const access='admin';export const methods=['GET'];
export default async function(req,res){
 const result=await db.query("SELECT e.merchant,e.external_id,e.title,e.previous_available,e.new_available,e.previous_qty,e.new_qty,e.source,e.changed_at,o.product_url,o.franchise,o.preorder_evidence FROM market_stock_events e JOIN market_offers o ON o.merchant=e.merchant AND o.external_id=e.external_id WHERE o.franchise='pokemon_tcg' AND e.changed_at>=NOW()-INTERVAL '14 days' ORDER BY e.changed_at DESC LIMIT 75");
 const list=result.rows.map(x=>{
   const low=x.new_available&&x.new_qty!==null&&x.new_qty<=3;
   return {merchant:x.merchant,id:x.external_id,title:x.title,source:x.source,at:x.changed_at,url:x.product_url,
    previousAvailable:x.previous_available,available:x.new_available,previousQty:x.previous_qty,qty:x.new_qty,
    preorder:!!x.preorder_evidence,kind:!x.new_available?'agotado':!x.previous_available&&x.new_available?'reposición':low?'pocas unidades':'cambio de existencias'};
 });
 res.json({events:list,lastCheckedAt:new Date().toISOString(),notice:'Cambios observados, no inventario en tiempo real. Si un comercio no publica cantidades exactas, el cambio se informa solo cuando hay evidencia.'});
}