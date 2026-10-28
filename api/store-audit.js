import {db} from 'hatchable';
export const access='admin';export const methods=['GET'];
const sources={
 okami:{name:'Okamidex',market:'PE',url:'https://okamidex.pe/',method:'WooCommerce',preorders:'https://okamidex.pe/categoria-producto/preventas/'},
 khipu:{name:'Khipu Club TCG',market:'PE',url:'https://khipuclubtcg.com/',method:'WooCommerce'},
 mazmorra:{name:'La Mazmorra TCG',market:'PE',url:'https://lamazmorratcg.com/',method:'WooCommerce'},
 bimba:{name:'BimbaCards',market:'ES',url:'https://bimbacards.com/',method:'WooCommerce'},
 noraku:{name:'Noraku',market:'ES',url:'https://noraku.es/',method:'Shopify',preorders:'https://noraku.es/collections/preventas'},
 pokemillon:{name:'Pokemillon',market:'ES',url:'https://www.pokemillon.com/',method:'Shopify',preorders:'https://www.pokemillon.com/collections/reservas'},
 theboosterbox:{name:'The Booster Box',market:'ES',url:'https://theboosterbox.es/',method:'Shopify'}
};
const manual=[
 {id:'carloncho',name:'Carloncho Store',market:'PE',url:'https://www.carlonchostore.com/',reason:'Consulta manual por condiciones de uso y falta de integración autorizada'},
 {id:'carddex',name:'CardDex',market:'PE',url:'https://carddex.pe/',reason:'No hay lector automático de precios e inventario verificado'},
 {id:'gp',name:'GP TCG',market:'PE',url:'https://gptcg.pe/',reason:'No hay lector automático de precios e inventario verificado'}
];
export default async function(req,res){
 const result=await db.query("SELECT o.merchant,o.market,COUNT(*)::int AS products,COUNT(*) FILTER(WHERE o.available)::int AS available,COUNT(*) FILTER(WHERE o.price>0)::int AS priced,COUNT(*) FILTER(WHERE o.price<=0 OR o.price IS NULL)::int AS without_price,COUNT(*) FILTER(WHERE o.stock_quantity IS NOT NULL)::int AS stock_amount_in_catalog,COUNT(*) FILTER(WHERE o.preorder_evidence IS NOT NULL)::int AS tagged_preorders,COUNT(*) FILTER(WHERE o.franchise='pokemon_tcg')::int AS pokemon,COUNT(*) FILTER(WHERE o.franchise='otro_tcg')::int AS other_tcg,COUNT(*) FILTER(WHERE o.franchise IS NULL OR o.franchise='sin_clasificar')::int AS unclassified,MAX(o.updated_at) AS last_catalog_scan,MAX(o.stock_checked_at) AS last_live_stock,MAX(h.last_attempt) AS last_attempt,MAX(h.last_success) AS last_success,MAX(h.last_error) AS last_error FROM market_offers o LEFT JOIN shop_scan_health h ON h.merchant=o.merchant GROUP BY o.merchant,o.market ORDER BY o.merchant");
 const now=Date.now(),shops=result.rows.filter(row=>sources[row.merchant]).map(row=>{
  const src=sources[row.merchant],last=Date.parse(row.last_catalog_scan),attempt=Date.parse(row.last_attempt||0);
  const hours=Number.isFinite(last)?(now-last)/3600000:null;
  const failed=!!row.last_error&&Number.isFinite(attempt)&&attempt>last+1000;
  const status=failed?(/429|rate.limit|demasiadas peticiones/i.test(row.last_error)?'rate-limited':'scan-error'):
   hours===null?'no-data':hours<=36?'fresh':hours<=72?'delayed':'stale';
  return {id:row.merchant,name:src.name,market:row.market,url:src.url,method:src.method,preordersUrl:src.preorders||null,
   products:Number(row.products),available:Number(row.available),priced:Number(row.priced),withoutPrice:Number(row.without_price),
   stockAmountInCatalog:Number(row.stock_amount_in_catalog),taggedPreorders:Number(row.tagged_preorders),
   pokemon:Number(row.pokemon),otherTcg:Number(row.other_tcg),unclassified:Number(row.unclassified),
   lastCatalogScan:row.last_catalog_scan,lastStockCheck:row.last_live_stock,lastAttempt:row.last_attempt,
   status,scanError:row.last_error?String(row.last_error).slice(0,130):null,inventoryVerified:false,
   clarification:'La fecha corresponde al último catálogo obtenido. Un error posterior no actualiza los precios anteriores.'
  };
 });
 for(const [id,src] of Object.entries(sources))if(!shops.some(s=>s.id===id))shops.push({id,...src,products:0,available:0,priced:0,status:'no-data'});
 res.json({automated:shops.sort((a,b)=>a.market.localeCompare(b.market)||a.name.localeCompare(b.name)),manual,checkedAt:new Date().toISOString(),
 notice:'El último escaneo correcto se distingue de intentos bloqueados por la tienda. No se inventan precios ni inventarios ni se certifica la seguridad comercial.'});
}