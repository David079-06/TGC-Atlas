import {db} from 'hatchable';
export const access='admin';export const methods=['GET'];
const releases=[{rx:/delta reign|dominio delta|reinado delta/i,date:'2026-11-06',url:'https://press.pokemon.com/en-CA/Items/Schedule?period=All'}];
const stores={
 okami:{name:'Okamidex',market:'PE',page:'https://okamidex.pe/categoria-producto/preventas/'},
 mazmorra:{name:'La Mazmorra TCG',market:'PE',page:'https://lamazmorratcg.com/pokemon-tcg/'},
 khipu:{name:'Khipu Club TCG',market:'PE',page:'https://khipuclubtcg.com/'},
 bimba:{name:'BimbaCards',market:'ES',page:'https://bimbacards.com/'},
 noraku:{name:'Noraku',market:'ES',page:'https://noraku.es/collections/preventas'},
 pokemillon:{name:'Pokemillon',market:'ES',page:'https://www.pokemillon.com/collections/reservas'},
 theboosterbox:{name:'The Booster Box',market:'ES',page:'https://theboosterbox.es/'}
};
const clean=s=>String(s||'').replace(/&#(?:0?8211);|&ndash;/gi,'–').replace(/&#(?:0?39);|&#x27;/gi,"'").replace(/&amp;|&#0?38;/gi,'&').replace(/<[^>]*>/g,' ').trim();
const unrelated=/one piece|magic|yu.?gi.?oh|lorcana|digimon|dragon ball|naruto|riftbound|palworld|gundam|topps|jurassic|formula 1|wwe|star wars|vanguard|altered|flesh and blood/i;
const pkm=/pok[eé]mon|pokemon|delta reign|dominio delta|reinado delta|prismatic evolution|evoluciones prism|30.?aniversario|30th anniversary|destined rivals|rivales predestinados|mega dream|first partner|mewtwo|espeon|umbreon|greninja/i;
function certified(x){
 try{
  const u=new URL(x.product_url),p=u.pathname.toLowerCase(),t=clean(x.title).toLowerCase();
  if(x.merchant==='okami'&&u.hostname==='okamidex.pe')return /\/producto\/[a-z0-9-]*delta-reign[a-z0-9-]*\/?$/.test(p)?'categoría preventas Okamidex':null;
  if(x.merchant==='noraku'&&u.hostname==='noraku.es'){
   if(/\/products\/(?:blister-3-sobres-dominio-delta|booster-box-dominio-delta|elite-trainer-box-dominio-delta)/.test(p))return 'categoría de preventas Noraku';
   if(/pok[eé]mon 30 aniversario/i.test(t)&&/colecci[oó]n premium de ditto|colecci[oó]n ultra premium d[ií]a y noche|baraja de combate espeon|colecci[oó]n con figura de mew/.test(t))return 'etiqueta PREVENTA en Noraku';
  }
  if(x.merchant==='theboosterbox'&&u.hostname==='theboosterbox.es'&&/\/products\/delta-reign-(?:caja-de-6-sobres-ingles|etb-ingles)/.test(p))return 'preventa comprobada en tienda';
  if(x.merchant==='pokemillon'&&u.hostname==='www.pokemillon.com'){
   if(/delta reign|dominio delta/.test(t))return 'categoría de reservas Pokemillon';
   if(/^caja 10 sobres mega dream ex m2a|^caja 20 sobres pok[eé]mon 30th anniversary m6a|^first partner illustration collections pok[eé]mon 30th anniversary|^futuristic box pok[eé]mon 30th anniversary|^super premium collection evoluciones prism[aá]ticas/i.test(t))return 'categoría de reservas Pokemillon';
  }
 }catch{}
 return null;
}
function isPokemon(x){
 const title=clean(x.title);
 if(unrelated.test(title))return false;
 return x.franchise==='pokemon_tcg'||(x.franchise!=='otro_tcg'&&pkm.test(title));
}
export default async function(req,res){
 const result=await db.query("SELECT merchant,market,external_id,title,product_url,currency,price,available,stock_quantity,stock_note,language,product_kind,updated_at,franchise,preorder_evidence FROM market_offers WHERE updated_at>=NOW()-INTERVAL '72 hours' AND (preorder_evidence IS NOT NULL OR title ~* 'pre[ -]?venta|pre[ -]?order|reserva|prepedido' OR merchant IN ('okami','noraku','pokemillon','theboosterbox')) ORDER BY updated_at DESC LIMIT 10000");
 const grouped={};
 for(const x of result.rows){
  if(!stores[x.merchant]||!isPokemon(x))continue;
  const certifiedBy=certified(x);
  const explicit=x.preorder_evidence||(/pre[ -]?venta|pre[ -]?order|prepedido|reserva/i.test(clean(x.title))?'nombre de producto en catálogo':null);
  const evidence=certifiedBy||explicit;
  if(!evidence||/preventa cerrada|reserva cerrada|no longer available for pre.ordering/i.test(clean(x.stock_note)))continue;
  const rel=releases.find(v=>v.rx.test(x.title));
  // Si la tienda mantiene la etiqueta oficial de preventa, no se excluye solo por la fecha prevista.
  const shop=stores[x.merchant],item={
   id:x.merchant+':'+x.external_id,merchant:x.merchant,title:clean(x.title),url:x.product_url,country:x.market,
   price:x.price===null?null:Number(x.price),currency:x.currency,available:x.available===true,
   stockQty:x.stock_quantity===null?null:Number(x.stock_quantity),language:x.language||'No determinado',
   format:x.product_kind||'Sin formato',checkedAt:x.updated_at,
   releaseDate:rel?.date||null,releaseSource:rel?.url||null,
   storeAvailableDate:x.merchant==='okami'&&rel?'2026-11-07':null,
   preorderCategoryUrl:certifiedBy?shop.page:null,
   evidence:certifiedBy?'Clasificada según '+certifiedBy+'. Las reservas y entregas dependen de la tienda.':'La tienda publica una etiqueta de preventa o reserva: '+evidence+'. No equivale a compra confirmada.',
   sourceStatus:certifiedBy?'sección oficial de preventas':'etiqueta de tienda'
  };
  (grouped[x.merchant]??={id:x.merchant,name:shop.name,country:x.market,offers:[],catalogUrl:shop.page}).offers.push(item);
 }
 const groups=Object.values(grouped).sort((a,b)=>b.offers.length-a.offers.length||a.name.localeCompare(b.name));
 res.json({groups,total:groups.reduce((sum,g)=>sum+g.offers.length,0),stores:groups.length,updatedAt:new Date().toISOString(),
 notice:'Preventa identificada en categorías o etiquetas de las propias tiendas. Se excluyen juegos no Pokémon. Algunos comercios no publican stock exacto, y una preventa no garantiza reserva de unidad.'});
}