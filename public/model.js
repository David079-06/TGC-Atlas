(function(){
const key='tcg-atlas-v3-state';
const fallback={preferredStores:{},invest:{},flip:{},watchIntent:{},period:3,fee:10,discount:15,importcost:0,customRate:null,favorites:[],customItems:[],saleTargets:{},selectedPage:'inicio'};
let saved={};try{saved=JSON.parse(localStorage.getItem(key)||'{}')}catch{}
const state=Object.assign({},fallback,saved);state.invest=state.invest||{};state.flip=state.flip||{};state.favorites=Array.isArray(state.favorites)?state.favorites:[];state.customItems=Array.isArray(state.customItems)?state.customItems:[];state.preferredStores=state.preferredStores||{};state.watchIntent=state.watchIntent||{};
let data={items:[],checks:[],candidates:[],shops:[],knownNews:[],fx:null},news={items:[]};const hours=ms=>ms/36e5;const isRecent=t=>t&&hours(Date.now()-new Date(t).getTime())<36;const save=()=>localStorage.setItem(key,JSON.stringify(state));
const eur=n=>Number(n||0).toLocaleString('es-ES',{style:'currency',currency:'EUR'}),pen=n=>'S/ '+Number(n||0).toLocaleString('es-PE',{minimumFractionDigits:2,maximumFractionDigits:2});const fmt=n=>Number(n||0).toLocaleString('es-ES',{maximumFractionDigits:1});
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const shop=id=>data.shops.find(s=>s.id===id)||{name:id||'Desconocida',tier:'por verificar'};
const allItems=()=>[...data.items,...state.customItems];
const valueRate=()=>{const x=state.customRate>0?Number(state.customRate):Number(data.fx?.rate||data.referenceFx||0);return x>0.1&&x<0.5?x:null};
const fxFresh=()=>data.fx?.checked_at?isRecent(data.fx.checked_at):false;
const checked=item=>data.checks.filter(x=>x.item_id===item.id);
function customOffer(item,country){const pe=country==='PE';const shop=pe?item._fromShop:item._fromEsMerchant;const ext=pe?item._fromCandidateId:item._fromEsExternalId;if(!shop||!ext)return null;let found=data.candidates?.find(x=>pe&&x.shop_id===shop&&String(x.external_id)===String(ext));if(!found)found=data.offers?.find(x=>x.merchant===shop&&String(x.external_id)===String(ext)&&x.market===country);if(!found||!found.price)return null;const language=found.lang||({Inglés:'en',Español:'es',Japonés:'jp',Chino:'zh'}[found.language]);if(language!==item.lang)return null;return{item_id:item.id,shop_id:shop,country,product_url:found.product_url,title:found.title,price:Number(found.price),currency:found.currency,availability:found.availability||(found.available?'available':'out'),stock_qty:found.stock_qty??found.stock_quantity??null,evidence:'Oferta extraída de catálogo público. Emparejamiento seleccionado por el usuario.',checked_at:found.checked_at||found.updated_at,lang:language}}
function offers(item,country){let x=checked(item).filter(y=>y.country===country);if(item.manual){let v=customOffer(item,country);if(v&&!x.some(a=>a.shop_id===v.shop_id&&a.product_url===v.product_url))x.push(v)}return x.filter(y=>Number(y.price)>0&&y.currency===(country==='PE'?'PEN':'EUR')&&y.lang===item.lang).sort((a,b)=>Number(a.price)-Number(b.price))}
function best(item,country,onlyActive=true){
 const list=offers(item,country);
 const active=list.filter(x=>x.availability==='available'&&isRecent(x.checked_at));
 if(active.length)return active[0];
 if(country==='ES'){
  const pe=preferred(item),src=window.AtlasOpportunityFeed||[];
  const url=u=>{try{let x=new URL(u);return x.origin+x.pathname.replace(/\/$/,'')}catch{return''}};
  const key=pe?url(pe.product_url):'';
  const found=key?src.find(x=>x.es&&url(x.pe?.product_url)===key&&(!onlyActive||x.es.available)):null;
  if(found){
   const es=found.es;
   return{item_id:item.id,shop_id:es.merchant,country:'ES',product_url:es.product_url,title:es.title,
    price:Number(es.price),currency:'EUR',availability:es.available?'available':'out',
    stock_qty:es.stock_quantity,checked_at:es.updated_at,lang:item.lang,
    evidence:'Referencia española por expansión, formato e idioma. Precio publicado, no venta confirmada.'};
  }
 }
 return !onlyActive?list[0]||null:null;
}
function latestStatus(item,country){let all=offers(item,country);let active=all.filter(x=>isRecent(x.checked_at));if(!active.length)return{type:'unknown',label:'No confirmado',details:'Sin consulta reciente'};if(active.some(x=>x.availability==='available')){let o=active.find(x=>x.availability==='available');return{type:'good',label:'Disponible',details:o.stock_qty==null?'Disponible en la tienda':o.stock_qty+' unidades indicadas'}}if(active.every(x=>x.availability==='out'))return{type:'bad',label:'Agotado',details:'Todas las tiendas consultadas'};return{type:'warn',label:'Por verificar',details:'Sin disponibilidad comprobable'}}
function preferred(item){let all=offers(item,'PE').filter(x=>x.availability==='available'&&isRecent(x.checked_at));let id=state.preferredStores[item.id]||item.preferred;let pr=all.find(x=>x.shop_id===id);return pr||all[0]||null}
const number=(x)=>Math.max(0,Number(x)||0);
function count(kind,item){return Math.max(0,Math.floor(Number(state[kind][item.id]||0)))}
function reservedFor(offer,excludeKind=null,excludeId=null){
 const svc=window.TCGStock;if(!offer||!svc)return 0;
 const ref=svc.resolve(offer);if(!ref)return 0;
 let selected=0;
 for(const item of allItems()){
  const chosen=preferred(item),resolved=chosen&&svc.resolve(chosen);
  if(!resolved||resolved.merchant!==ref.merchant||resolved.id!==ref.id)continue;
  for(const kind of ['invest','flip'])if(!(kind===excludeKind&&item.id===excludeId))selected+=count(kind,item);
 }
 return selected;
}
function watchItem(id,kind,shopId){const item=allItems().find(x=>x.id===id);if(!item||!['invest','flip'].includes(kind))return false;state.watchIntent[id]=kind;if(shopId)state.preferredStores[id]=shopId;save();return true}
function changeCount(kind,id,next){
 const item=allItems().find(x=>x.id===id);
 if(!item||!['invest','flip'].includes(kind))return false;
 const value=Number(next);if(!Number.isSafeInteger(value)||value<0)return false;
 const n=value,current=count(kind,item);
 if(n>current){
  const offer=preferred(item),svc=window.TCGStock;if(!offer||!svc)return false;
  const stock=svc.peek(offer);
  if(!stock||stock.stockStatus!=='verified'||!stock.exact||n+reservedFor(offer,kind,id)>stock.maxQty)return false;
 }
 state[kind][id]=n;save();return true;
}
function costUnit(item){let o=preferred(item),fx=valueRate();return o&&fx?Number(o.price)*fx:null}
function getSummary(kind){let cost=0,totalSoles=0,qty=0,unpriced=0,cover=0,comparableCost=0,revenue=0,net=0,coverageCount=0;const rows=[];for(let item of allItems()){const countValue=count(kind,item);if(!countValue)continue;qty+=countValue;let pe=preferred(item),es=best(item,'ES');if(!pe||!valueRate()){unpriced+=countValue;rows.push({item,n:countValue,pe:null,es});continue}let cost0=Number(pe.price)*valueRate()*countValue*(1+Number(state.importcost||0)/100);cost+=cost0;totalSoles+=Number(pe.price)*countValue;let net0=null,sell0=null;if(es){let sell=Number(state.saleTargets?.[item.id]||0)>0?Number(state.saleTargets[item.id]):Number(es.price)*(1-Number(state.discount||0)/100);sell0=sell*countValue;net0=sell0*(1-Number(state.fee||0)/100)-cost0;revenue+=sell0;net+=net0;cover+=countValue;comparableCost+=cost0;coverageCount++}rows.push({item,n:countValue,pe,es,cost:cost0,immediate:net0,sale:sell0})}return{cost,totalSoles,qty,unpriced,cover,comparableCost,revenue,net,coverageCount,rows}}
function forecast(kind,period){const s=getSummary(kind),out=[];const covered=s.rows.filter(row=>row.pe&&row.es&&row.cost!=null&&row.n>0);
for(let month=0;month<=period*12;month++){
 let t=month/12,fields={month,label:month%12===0?t+' año'+(t===1?'':'s'):'',negative:0,central:0,positive:0};
 for(const row of covered){const starting=Number(row.es.price)*row.n*(1-Number(state.discount||0)/100),buy=row.cost;
  // No se inventa una tasa por producto: escenarios genéricos de sensibilidad.
  for(const [field,growth] of [['negative',-.20],['central',0],['positive',.08]])
   fields[field]+=starting*Math.pow(Math.max(.01,1+growth),t)*(1-Number(state.fee||0)/100)-buy;
 }
 out.push(fields);
}
return{series:out,paid:s.cost,summary:s,coverage:covered.reduce((a,x)=>a+x.n,0),available:covered.length>0,assumptions:{down:-20,flat:0,up:8},final:out[out.length-1]};}
function comparisons(){return allItems().map(item=>{let pe=preferred(item),es=best(item,'ES'),esRef=es||best(item,'ES',false),cost=pe&&valueRate()?Number(pe.price)*valueRate():null;let gross=es&&cost!=null?Number(es.price)-cost:null;let net=es&&cost!=null?Number(es.price)*(1-Number(state.discount||0)/100)*(1-Number(state.fee||0)/100)-cost*(1+Number(state.importcost||0)/100):null;const countEs=offers(item,'ES').filter(x=>x.availability==='available'&&isRecent(x.checked_at)).length;return{item,pe,es,esRef,cost,gross,net,countEs}})}
function candidateKey(c){return c.shop_id+'-'+String(c.product_url||'').replace(/[^a-z0-9]/gi,'').slice(-24)}
function watchCandidate(c){let id='manual-'+candidateKey(c);if(state.customItems.some(x=>x.id===id)){const item=state.customItems.find(x=>x.id===id);if(c.esMerchant)item._fromEsMerchant=c.esMerchant;if(c.esExternalId)item._fromEsExternalId=String(c.esExternalId);save();return id;}state.customItems.push({id,name:c.title,family:'Descubrimiento',lang:c.lang||'unknown',format:'otro',priority:99,method:'ambos',growth:[-.17,.08,.23],preferred:c.shop_id,manual:true,_fromCandidateId:String(c.external_id),_fromShop:c.shop_id,_fromEsMerchant:c.esMerchant||null,_fromEsExternalId:c.esExternalId?String(c.esExternalId):null});state.favorites.push(id);save();return id}
function exportState(){return JSON.stringify({type:'tcg-atlas',version:3,date:new Date().toISOString(),state},null,2)}
function loadState(payload){if(payload?.type!=='tcg-atlas'||!payload.state)throw Error('Archivo no compatible');for(const k of ['invest','flip','period','fee','discount','importcost','customRate','favorites','customItems','saleTargets','preferredStores','watchIntent'])if(payload.state[k]!==undefined)state[k]=payload.state[k];save()}
function replaceData(d){data=d||data}function replaceNews(d){news=d||news}
window.Atlas={state,get data(){return data},get news(){return news},replaceData,replaceNews,save,eur,pen,fmt,esc,shop,allItems,offers,best,preferred,latestStatus,count,changeCount,watchItem,reservedFor,costUnit,valueRate,fxFresh,isRecent,getSummary,forecast,comparisons,watchCandidate,exportState,loadState,candidateKey};
})();