import {db} from 'hatchable';import {lang,kind} from 'lib/match.js';
const fetchJson=async u=>{let last;for(let attempt=0;attempt<2;attempt++){try{const r=await fetch(u,{headers:{'Accept':'application/json','User-Agent':'Mozilla/5.0 (compatible; TCGAtlasResearch/1.0)'},signal:AbortSignal.timeout(8000)});if(!r.ok)throw Error('HTTP '+r.status+' '+u);return await r.json()}catch(e){last=e;if(/HTTP 429\b/.test(String(e)))break}}throw last};
const plain=s=>String(s||'').replace(/&#0?38;|&amp;/g,'&').replace(/&#0?39;|&apos;/g,"'").replace(/&nbsp;/g,' ').replace(/<[^>]+>/g,' ').trim();
const classify=(title,tags='',productType='')=>{const t=[title,tags,productType].join(' ').toLowerCase();if(/sleeves|fundas|deck.box|carpetas?|binder protector|binder.*ultra.?pro|ultra.?pro.*binder|album.*ultra.?pro|álbum.*ultra.?pro|\b\d{2,4} cartas\b|acrilic|toploader|playmat|peluche|plush|funko|llavero|keychain|poster decorativo|merchandising|figura coleccionable/.test(t)&&!/binder collection|collection con album/.test(t))return 'otro_tcg';if(/one piece|lorcana|magic the gathering|yu.?gi.?oh|naruto|digimon|dragon ball|riftbound|gundam|palworld|topps|wwe|formula 1|jurassic|star wars|vanguard|altered|flesh and blood/.test(t))return 'otro_tcg';if(/pok[eé]mon|pokemon|pikachu|charizard|eevee|umbreon|espeon|greninja|mewtwo|sylveon|prismatic|destined rivals|surging sparks|journey together|delta reign|dominio delta|reinado delta|caos creciente|chaos rising|30 aniversario|30th anniversary|evoluciones prism|etb|booster bundle/.test(t))return 'pokemon_tcg';return 'sin_clasificar'};
const preorder=(title,tags='',cats='')=>{const t=String(title)+' '+String(tags)+' '+String(cats);return /(?:^|\W)(?:preventas?|pre.?venta|pre.?order|pre.?pedido|reservas?|precompra)(?:\W|$)/i.test(t)?'marca_tienda':null};
async function isFollowed(merchant){const r=await db.query('SELECT selected FROM store_registry WHERE id=$1',[merchant]);return r.rows.length>0&&r.rows[0].selected===true}
const tagger=(title,cats='')=>{
 const t=(title+' '+cats).toLowerCase(),tags=[];
 if(/sleeves|fundas|deck.box|carpetas?|binder|acrilic|acryl|protectores?|toploader|tapete|playmat|album|álbum|storage|caja para guardar/.test(t)&&!/binder collection|collection con album|colecci[oó]n con [aá]lbum/.test(t))tags.push('accesorio');
 if(/funko|figura|peluche|plush|merch|poster|estatua|llavero|keychain/.test(t))tags.push('coleccionable');
 if(/one piece|lorcana|magic|yu.?gi.?oh|digimon|dragon ball|naruto|riftbound/.test(t))tags.push('otro_tcg');
 if(/pokemon|pokémon|etb|booster box|display box|boosters|cartas|tcg/.test(t))tags.push('tcg');
 return [...new Set(tags)];
};
const decPrice=p=>{let unit=Number(p?.currency_minor_unit??2);let n=Number(p?.price);return Number.isFinite(n)&&n>=0?n/Math.pow(10,unit):null};
export async function save(arr){for(let i=0;i<arr.length;i+=60){const batch=JSON.stringify(arr.slice(i,i+60));
await db.query(`INSERT INTO market_stock_events(merchant,external_id,title,previous_available,new_available,previous_qty,new_qty,source)
 SELECT old.merchant,old.external_id,old.title,old.available,x.available,old.stock_quantity,x.stock_quantity,'Lectura diaria del catálogo'
 FROM jsonb_to_recordset($1::jsonb) AS x(merchant text,external_id text,available boolean,stock_quantity integer)
 JOIN market_offers old ON old.merchant=x.merchant AND old.external_id=x.external_id
 WHERE old.available IS DISTINCT FROM x.available OR
  (old.stock_quantity IS NOT NULL AND x.stock_quantity IS NOT NULL AND old.stock_quantity IS DISTINCT FROM x.stock_quantity)`,[batch]);
await db.query(`INSERT INTO market_offers (merchant,market,external_id,title,product_url,currency,price,available,stock_quantity,stock_note,language,product_kind,franchise,preorder_evidence,product_tags,updated_at,verification) SELECT merchant,market,external_id,title,product_url,currency,price,available,stock_quantity,stock_note,language,product_kind,franchise,preorder_evidence,COALESCE(product_tags,ARRAY[]::text[]),NOW(),verification FROM jsonb_to_recordset($1::jsonb) AS x(merchant text,market text,external_id text,title text,product_url text,currency text,price numeric,available boolean,stock_quantity integer,stock_note text,language text,product_kind text,franchise text,preorder_evidence text,product_tags text[],verification text) ON CONFLICT(merchant,external_id) DO UPDATE SET title=EXCLUDED.title,product_url=EXCLUDED.product_url,price=EXCLUDED.price,currency=EXCLUDED.currency,available=EXCLUDED.available,stock_quantity=CASE WHEN market_offers.stock_checked_at>NOW()-INTERVAL '120 minutes' AND EXCLUDED.stock_quantity IS NULL AND EXCLUDED.available THEN market_offers.stock_quantity ELSE EXCLUDED.stock_quantity END,stock_note=EXCLUDED.stock_note,language=EXCLUDED.language,product_kind=EXCLUDED.product_kind,franchise=EXCLUDED.franchise,preorder_evidence=EXCLUDED.preorder_evidence,product_tags=EXCLUDED.product_tags,updated_at=NOW(),verification=EXCLUDED.verification`,[batch]);await db.query(`INSERT INTO market_offer_history (merchant,external_id,currency,price,available,stock_quantity) SELECT merchant,external_id,currency,price,available,stock_quantity FROM jsonb_to_recordset($1::jsonb) AS x(merchant text,external_id text,currency text,price numeric,available boolean,stock_quantity integer)
 WHERE NOT EXISTS (SELECT 1 FROM (SELECT h.price,h.available,h.checked_at FROM market_offer_history h
  WHERE h.merchant=x.merchant AND h.external_id=x.external_id ORDER BY h.checked_at DESC LIMIT 1) latest
  WHERE latest.checked_at>NOW()-INTERVAL '20 hours' AND latest.price IS NOT DISTINCT FROM x.price
    AND latest.available IS NOT DISTINCT FROM x.available)`,[batch])}return arr.length}
function wooRow(x,merchant,market='PE'){let qty=null;let stockText=plain(x.stock_availability?.text);const m=stockText.match(/(\d+)\s*(?:disponibles|in stock|unidades|units)/i);if(m)qty=Number(m[1]);if(!x.is_in_stock)qty=0;const title=plain(x.name);return {merchant,market,external_id:String(x.id),title,product_url:x.permalink,currency:x.prices?.currency_code||'PEN',price:decPrice(x.prices),available:!!x.is_in_stock,stock_quantity:qty,stock_note:stockText||(x.is_in_stock?'Stock exacto no publicado':'Agotado'),language:lang(title)==='No determinado'?lang((x.attributes||[]).flatMap(a=>(a.terms||[]).map(t=>t.name)).join(' ')):lang(title),product_kind:kind(title),franchise:classify(title,'',(x.categories||[]).map(c=>c.name).join(' ')),preorder_evidence:preorder(title, '',(x.categories||[]).map(c=>c.name+' '+c.slug).join(' ')),product_tags:tagger(title,(x.categories||[]).map(c=>c.name).join(' ')),verification:'official_catalog_api'}}
async function recordScan(merchant,read,errors){const issue=(errors||[]).join(' | ').slice(0,500)||null;try{await db.query('INSERT INTO shop_scan_health(merchant,last_attempt,last_success,read_count,last_error) VALUES($1,NOW(),CASE WHEN $2::integer>0 THEN NOW() ELSE NULL END,$2,$3) ON CONFLICT(merchant) DO UPDATE SET last_attempt=EXCLUDED.last_attempt,last_success=COALESCE(EXCLUDED.last_success,shop_scan_health.last_success),read_count=EXCLUDED.read_count,last_error=EXCLUDED.last_error',[merchant,read,issue])}catch(e){console.warn('No se pudo registrar el estado del escaneo: '+String(e))}}
export async function collectWoo(merchant,base,opts={}){if(!(await isFollowed(merchant)))return {merchant,read:0,errors:[],skipped:'Tienda no seguida'};let all=[],err=[];const pages=opts.pages||1;for(let page=(opts.startPage||1);page<=(opts.endPage||pages);page++){try{const q=new URLSearchParams({per_page:'100',page:String(page),...(opts.category?{category:String(opts.category)}:{})});const js=await fetchJson(base+'/wp-json/wc/store/v1/products?'+q);if(!Array.isArray(js))throw Error('JSON no es lista');all.push(...js.map(x=>wooRow(x,merchant,opts.market||'PE')));if(js.length<100)break}catch(e){err.push(String(e));continue}}if(all.length)await save(all);await recordScan(merchant,all.length,err);return {merchant,read:all.length,errors:err,stored:all.length}}
function shopRows(item,merchant,host,market='ES',collectionLabel=null){const a=[];for(const v of item.variants||[]){const title=plain(item.title)+' — '+(v.title==='Default Title'?'':v.title);let label=lang(title);let vurl='https://'+host+'/products/'+item.handle+(v.id?'?variant='+v.id:'');a.push({merchant,market,external_id:String(v.id),title,product_url:vurl,currency:'EUR',price:typeof v.price==='string'?Number(v.price):Number(v.price)/100,available:!!v.available,stock_quantity:Number.isInteger(v.inventory_quantity)&&v.inventory_quantity>=0?v.inventory_quantity:null,stock_note:v.available?'Cantidad no acreditada por API pública':'Agotado',language:label,product_kind:kind(title),franchise:classify(title,item.tags,item.product_type),preorder_evidence:preorder(item.title,item.tags,item.product_type)||collectionLabel||(merchant==='theboosterbox'&&/^(?:delta-reign-etb-ingles|delta-reign-caja-de-6-sobres-ingles)$/.test(String(item.handle))?'categoria_preventa_tienda':null),product_tags:tagger(title,item.tags+' '+item.product_type),verification:'official_catalog_api'})}return a}
export async function collectShop(merchant,host,maxPages=2,startPage=1,market='ES'){
 if(!(await isFollowed(merchant)))return {merchant,read:0,errors:[],skipped:'Tienda no seguida'};
 const merged=new Map(),errors=[];let lastPageFull=false;
 for(let page=startPage;page<startPage+maxPages;page++){
  try{
   const j=await fetchJson('https://'+host+'/products.json?limit=250&page='+page);
   if(!Array.isArray(j.products))throw Error('Respuesta sin catálogo Shopify');
   for(const product of j.products)for(const row of shopRows(product,merchant,host,market))
    merged.set(row.external_id,row);
   lastPageFull=j.products.length>=250;
   if(!lastPageFull)break;
  }catch(e){errors.push(String(e));break}
 }
 // Además del título y las etiquetas, comprobar colecciones oficiales de preventa.
 // Solo para dos dominios preaprobados, y solo en primera página del recorrido.
 const reservationCollections={noraku:'preventas',pokemillon:'reservas'};
 const collection=reservationCollections[merchant];
 if(collection&&startPage===1&&!errors.some(x=>/429|403/.test(x))){
  try{
   const response=await fetchJson('https://'+host+'/collections/'+collection+'/products.json?limit=250&page=1');
   if(Array.isArray(response.products)){
    for(const product of response.products){
     for(const row of shopRows(product,merchant,host,market,'coleccion_oficial_'+collection)){
      const previous=merged.get(row.external_id);
      merged.set(row.external_id,previous?{...previous,preorder_evidence:row.preorder_evidence}:row);
     }
    }
   }
  }catch(e){
   if(/429|rate.limit|too many/i.test(String(e)))errors.push(String(e));
  }
 }
 const all=[...merged.values()];
 if(all.length)await save(all);
 await recordScan(merchant,all.length,errors);
 return {merchant,read:all.length,errors,pageFull:lastPageFull};
}
export async function collectFx(){try{let j=await fetchJson('https://open.er-api.com/v6/latest/PEN');if(j.result!=='success'||!(j.rates?.EUR>0))throw Error('tipo de cambio invalido');await db.query('INSERT INTO fx_rates (from_code,to_code,rate,source,source_date) VALUES ($1,$2,$3,$4,$5)',['PEN','EUR',j.rates.EUR,'open.er-api.com',j.time_last_update_utc||'']);return {rate:j.rates.EUR,date:j.time_last_update_utc}}catch(e){return {error:String(e)}}}