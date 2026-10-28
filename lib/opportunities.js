const names=[
 ['Delta Reign',/delta reign|dominio delta|reinado delta/],
 ['Evoluciones Prismáticas',/prismatic evolutions?|evoluciones prismat/],
 ['Destined Rivals',/destined rivals|rivales predestinad/],
 ['Chaos Rising',/chaos rising|caos creciente/],
 ['Pitch Black',/pitch black|oscuridad absoluta/],
 ['Perfect Order',/perfect order|orden perfecto|equilibrio perfecto/],
 ['30.º aniversario',/30th celebrat|30 aniversario|30.? aniversario|30th anniversary|celebraciones 30|celebracion 30/],
 ['Journey Together',/journey together|juntos de aventura/],
 ['Surging Sparks',/surging sparks|chispas fulgurantes/],
 ['White Flare',/white flare|llamarada blanca/],
 ['Black Bolt',/black bolt|rayo negro/],
 ['Ascended Heroes',/ascended heroes|heroes ascendentes/],
 ['Phantasmal Flames',/phantasmal flames|fuegos fantasmales/],
 ['Paldean Fates',/paldean fates|destinos de paldea/],
 ['Crown Zenith',/crown zenith|cenit supremo/],
 ['Astral Radiance',/astral radiance|resplandor astral/],
 ['Lost Origin',/lost origin|origen perdido/],
 ['Silver Tempest',/silver tempest|tempestad plateada/],
 ['Paldea Evolved',/paldea evolved|evoluciones en paldea/],
 ['Stellar Crown',/stellar crown|corona astral/],
 ['Twilight Masquerade',/twilight masquerade|mascarada crepuscular/],
 ['151',/(?:^|\W)(?:151|pokemon 151|pokemon card 151)(?:\W|$)/],
 ['Battle Styles',/battle styles|estilos de combate/],
 ['Fusion Strike',/fusion strike|golpe fusion/],
 ['Brilliant Stars',/brilliant stars|astros brillantes/],
 ['Scarlet & Violet',/scarlet.*violet|escarlata.*purpura/],
 ['Mega Evolution',/mega evolution|megaevolucion/]
];
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/&(?:#8211|ndash);/ig,' ').toLowerCase();
const family=s=>names.find(([name,rx])=>rx.test(norm(s)))?.[0]||null;
function format(s){
 const t=norm(s);
 if(/acrylic|acrilic|(?:\+| plus )\s*(?:the )?acrylic|protector|pack de [2-9]|lote de|lot of|9 cajas|caja de 20 sobres|booster box 18|caja de 18|caja 18|premium 1 sobres|blister dual|duo pack|mystery|misterios/.test(t))return null;
 if(/super.premium collection|super.premium|\bspc\b/.test(t))return 'Super Premium Collection';
 if(/ultra.premium collection|\bupc\b/.test(t))return 'Ultra Premium Collection';
 if(/premium.*figure|figure.*collection|coleccion premium con figura/.test(t))return 'Premium Figure Collection';
 if(/booster.*display.*box|display.*box|booster box(?: 36)?|caja (?:de )?36 sobres|36 sobres/.test(t))return 'Booster Box 36';
 if(/elite trainer|\betb\b/.test(t))return 'Elite Trainer Box';
 if(/booster bundle|bundle(?: de)? 6|caja de 6 sobres|6 sobres|6 packs/.test(t))return 'Booster Bundle 6';
 if(/binder collection|coleccion con album|coleccion binder/.test(t))return 'Binder Collection';
 if(/greninja ex box|box.*greninja ex/.test(t))return 'Greninja ex Box';
 if(/sylveon ex box|box.*sylveon ex/.test(t))return 'Sylveon ex Box';
 if(/poster collection|coleccion con poster/.test(t))return 'Poster Collection';
 if(/3.pack blister|3.pack|blister (?:de )?3|blister 3 sobres|blister 3/.test(t))return 'Blíster 3';
 if(/build.*battle/.test(t))return 'Build & Battle';
 if(/sleeved booster/.test(t))return 'Sleeved Booster';
 if(/(?:^|\W)(?:sobre individual|booster pack|sobre\s*\-|sobre\s+ingles|sobre\s+espanol)(?:\W|$)/.test(t))return 'Sobre';
 return null;
}
function classify(o){
 if(!o||!['Inglés','Español','Japonés','Chino'].includes(o.language))return null;
 const f=family(o.title),p=format(o.title);
 if(!f||!p)return null;
 const title=norm(o.title);
 if(/combo|pack con|funda|contiene \d+|sin cartas|sin sobres|dañad|opened|abierto|vacio|repack/.test(title))return null;
 // Los lotes asiáticos con distribución diferente no se equiparan a cajas de 36.
 if(p==='Booster Box 36'&&/japon|japanese|chino|chinese|coreano|korean/.test(title))return null;
 const specific=['Blíster 3','Poster Collection','Premium Figure Collection','Greninja ex Box','Sylveon ex Box'].includes(p);
 const person=specific?(title.match(/charmeleon|gengar|greninja|sylveon|umbreon|lucario|gardevoir|rayquaza|pikachu|mewtwo|ditto/)||[])[0]||'sin-variante':'';
 return {family:f,format:p,language:o.language,key:[f,p,o.language,person].join('::')};
}
const median=vals=>{const arr=vals.slice().sort((a,b)=>a-b);return arr.length?(arr.length%2?arr[(arr.length-1)/2]:(arr[arr.length/2-1]+arr[arr.length/2])/2):null};
const round=x=>x==null?null:Math.round(x*100)/100;
export function buildRadar(offers,rate,{discount=12,fee=8,pack=3,importPercent=0}={}){
 const groups=new Map(),now=Date.now();
 for(const o of offers){
  if(o.preorder_evidence||o.franchise==='otro_tcg'||!o.price||Number(o.price)<=0||!o.product_url)continue;
  const c=classify(o);if(!c)continue;
  const stamp=Date.parse(o.updated_at);
  if(!Number.isFinite(stamp)||now-stamp>14*864e5)continue;
  const v={...o,price:Number(o.price),stock_quantity:o.stock_quantity===null?null:Number(o.stock_quantity)};
  if(!groups.has(c.key))groups.set(c.key,{...c,peru:[],spain:[]});
  const g=groups.get(c.key);
  if(o.market==='PE'&&o.currency==='PEN')g.peru.push(v);
  if(o.market==='ES'&&o.currency==='EUR')g.spain.push(v);
 }
 const result=[];
 for(const g of groups.values()){
  const peru=g.peru.filter(o=>o.available).sort((a,b)=>a.price-b.price);
  if(!peru.length)continue;
  // Una tienda solo aporta su mejor precio para no sesgar la media con variantes duplicadas.
  const spainByMerchant=new Map();
  for(const offer of g.spain){
   const existing=spainByMerchant.get(offer.merchant);
   if(!existing||(offer.available&&!existing.available)||(offer.available===existing.available&&offer.price<existing.price))spainByMerchant.set(offer.merchant,offer);
  }
  const spanishAll=[...spainByMerchant.values()],active=spanishAll.filter(o=>o.available).sort((a,b)=>a.price-b.price);
  const selected=active.length?active:spanishAll.slice().sort((a,b)=>a.price-b.price);
  const best=selected[0]||null;
  const med=median(selected.map(x=>x.price)),avg=selected.length?selected.reduce((n,x)=>n+x.price,0)/selected.length:null;
  const status=active.length?'en_venta':selected.length?'agotado':'sin_referencia';
  const lastSeen=selected.length?selected.map(x=>x.updated_at).sort().at(-1):null;
  for(const p of peru){
   const cost=p.price*rate,buyTotal=cost*(1+importPercent/100);
   const modeledSell=best&&status==='en_venta'?best.price*(1-discount/100):null;
   const net=modeledSell===null?null:modeledSell*(1-fee/100)-buyTotal-pack;
   result.push({
    key:g.key,groupName:g.family,format:g.format,language:g.language,pe:p,
    es:best,esOut:status==='agotado'?best:null,
    spanishStatus:status,spanishMedian:round(med),spanishAverage:round(avg),spanishMin:best?.price??null,
    spanishShops:selected.length,spanishObservedAt:lastSeen,
    buyEUR:round(cost),spanishLow:best?.price??null,
    estimatedSell:round(modeledSell),estimatedNet:round(net),roi:net===null||!buyTotal?null:round(net/buyTotal*100),
    indicativeOnly:status!=='en_venta',
    verification:status==='en_venta'?'OFERTA ESPAÑOLA DISPONIBLE; precio anunciado, no venta cerrada':
     status==='agotado'?'ÚLTIMO PRECIO ESPAÑOL ANUNCIADO; actualmente agotado':
     'SIN PRODUCTO EQUIVALENTE IDENTIFICADO EN LOS CATÁLOGOS'
   });
  }
 }
 result.sort((a,b)=>{
  if(a.estimatedNet===null&&b.estimatedNet!==null)return 1;
  if(b.estimatedNet===null&&a.estimatedNet!==null)return -1;
  return (b.estimatedNet??-Infinity)-(a.estimatedNet??-Infinity);
 });
 return result;
}