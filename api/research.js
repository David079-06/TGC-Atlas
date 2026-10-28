import {db} from 'hatchable';
export const access='admin';
export const methods=['GET'];
export default async function(req,res){
 const merchant=String(req.query?.merchant||'').slice(0,40);
 const id=String(req.query?.id||'').slice(0,25);
 if(!/^[a-z0-9_-]{2,40}$/.test(merchant)||!/^[0-9]{1,20}$/.test(id))return res.status(400).json({error:'Selección no válida'});
 const [offer,hist]=await Promise.all([
  db.query('SELECT merchant,external_id,title,market,price,currency,available,stock_quantity,updated_at,product_url,language,product_kind,verification FROM market_offers WHERE merchant=$1 AND external_id=$2 LIMIT 1',[merchant,id]),
  db.query('SELECT price,currency,available,stock_quantity,checked_at FROM market_offer_history WHERE merchant=$1 AND external_id=$2 AND price>0 AND checked_at>=NOW()-INTERVAL \'365 days\' ORDER BY checked_at DESC LIMIT 600',[merchant,id])
 ]);
 const product=offer.rows[0];if(!product)return res.status(404).json({error:'Producto no registrado'});
 const observations=hist.rows.reverse().map(x=>({...x,price:Number(x.price)}));
 const dates=new Set(observations.map(x=>String(x.checked_at).slice(0,10))).size;
 const prices=observations.map(x=>x.price),min=prices.length?Math.min(...prices):null,max=prices.length?Math.max(...prices):null;
 const change=observations.length>1&&dates>=2?(observations.at(-1).price/observations[0].price-1)*100:null;
 const daily=[];
 for(const x of observations){const d=String(x.checked_at).slice(0,10);if(daily.length&&daily.at(-1).day===d){daily[daily.length-1]={day:d,price:x.price};}else daily.push({day:d,price:x.price});}
 let vol=null,drawdown=null;
 if(daily.length>=7){
  const returns=daily.slice(1).map((x,i)=>Math.log(x.price/daily[i].price)),mean=returns.reduce((a,b)=>a+b,0)/returns.length;
  vol=Math.sqrt(returns.reduce((a,b)=>a+(b-mean)**2,0)/(returns.length-1))*100;
  let peak=0,worst=0;for(const x of daily){peak=Math.max(peak,x.price);worst=Math.min(worst,(x.price/peak-1)*100)}drawdown=worst;
 }
 res.json({product,observations,summary:{samples:observations.length,distinctDays:dates,minimum:min,maximum:max,changePercent:change,dailyVolatilityPercent:vol,maxDrawdownPercent:drawdown,historyReady:dates>=7},notice:'Solo observaciones de ofertas anunciadas, NO transacciones cerradas ni volumen de ventas. Historial escaso: no se extrapola una rentabilidad futura.'});
}