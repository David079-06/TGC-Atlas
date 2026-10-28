/* Stock verificado: resultados compartidos, caché por variante y refresco discreto.
 * Las cifras no constituyen reserva. Los aumentos de unidades se revalidan.
 */
(()=>{
 'use strict';
 const CACHE_KEY='tcg-atlas-stock-session-v3';
 const PRESENT_MS=5*60*1000, AUTO_MS=85*1000, APPROVE_MS=22*1000;
 const ERROR_RETRY_MS=100*1000, MAX_TRACK_MS=120*1000;
 const live=new Map(),pending=new Map(),tracked=new Map(),lastAttempt=new Map(),listeners=new Set();
 let lookupSource=null,lookup=new Map(),tickQueued=false,scanning=false,renderQueued=false,saveQueued=false;
 const norm=url=>{try{const x=new URL(url,location.href);return x.origin+x.pathname.replace(/\/$/,'')}catch{return ''}};
 const key=x=>x.merchant+':'+x.id;
 function remember(){
  if(saveQueued)return;saveQueued=true;
  setTimeout(()=>{
   saveQueued=false;
   try{
    const items=[...live].filter(([,v])=>Date.now()-v.savedAt<PRESENT_MS&&v.stockStatus!=='unknown').slice(-130);
    sessionStorage.setItem(CACHE_KEY,JSON.stringify(items));
   }catch{}
  },250);
 }
 try{
  for(const [k,v] of JSON.parse(sessionStorage.getItem(CACHE_KEY)||'[]')){
   if(v&&v.savedAt&&Date.now()-v.savedAt<PRESENT_MS)live.set(k,v);
  }
 }catch{}
 function resolve(offer){
  if(!offer)return null;
  const merchant=String(offer.merchant||offer.shop_id||'');
  let id=offer.external_id;
  if(!id&&/^\d{1,20}$/.test(String(offer.id||'')))id=offer.id;
  if(!id){
   const source=window.Atlas?.data?.offers||[];
   if(lookupSource!==source){
    lookupSource=source;lookup=new Map();
    for(const x of source)if(x.merchant&&x.external_id&&x.product_url)lookup.set(x.merchant+'|'+norm(x.product_url),String(x.external_id));
   }
   id=lookup.get(merchant+'|'+norm(offer.product_url));
  }
  return merchant&&/^[0-9]{1,20}$/.test(String(id||''))?{merchant,id:String(id)}:null;
 }
 function peek(offer){
  const x=resolve(offer);if(!x)return null;
  const r=live.get(key(x));if(!r)return null;
  return {...r,stale:Date.now()-r.savedAt>AUTO_MS,updating:pending.has(key(x))};
 }
 function inform(){
  if(renderQueued)return;renderQueued=true;
  setTimeout(()=>{renderQueued=false;for(const callback of listeners){try{callback()}catch(e){console.warn('Error al actualizar stock',e)}}},65);
 }
 function track(offer){
  const x=resolve(offer);if(!x)return false;
  const k=key(x);
  tracked.set(k,{offer,at:Date.now()});
  const r=live.get(k);
  if(!r||Date.now()-r.savedAt>AUTO_MS)queue();
  return true;
 }
 function limit(offer){const v=peek(offer);return v?.stockStatus==='verified'&&v.exact?v.maxQty:0}
 function onUpdate(callback){listeners.add(callback);return()=>listeners.delete(callback)}
 function acceptable(r){return r&&r.exact&&r.stockStatus==='verified'&&r.available===true&&Number.isSafeInteger(Number(r.maxQty))}
 async function check(offer,{fresh=false}={}){
  const x=resolve(offer);
  if(!x)return {exact:false,stockStatus:'unknown',maxQty:0,reason:'La ficha no tiene una variante identificable'};
  const k=key(x),old=live.get(k),age=Date.now()-(old?.savedAt||0);
  // Una comprobación reciente sirve también al pulsar Añadir; no se hacen dos peticiones seguidas.
  if(old&&((!fresh&&age<AUTO_MS)||(fresh&&age<APPROVE_MS&&acceptable(old))))return {...old,stale:false};
  if(pending.has(k))return pending.get(k);
  const promise=(async()=>{
   lastAttempt.set(k,Date.now());
   try{
    const response=await fetch('/api/stock?'+new URLSearchParams(x),{cache:'no-store',credentials:'same-origin'});
    if(!response.ok)throw Error('HTTP '+response.status);
    const value=await response.json();
    const result={...value,savedAt:Date.now(),stale:false};
    if(value.source==='error en consulta'||value.error){
     if(old&&acceptable(old)){
      const preserved={...old,stale:true,reason:'No fue posible revalidar ahora; última cantidad conservada',lastError:value.error||value.reason};
      live.set(k,{...preserved,savedAt:old.savedAt});
      inform();return preserved;
     }
    }
    live.set(k,result);
    if(offer){
     // Nunca se cambia updated_at/checked_at del precio con una consulta de existencias.
     offer.stock_qty=value.exact?value.maxQty:null;
     offer.stock_quantity=value.exact?value.maxQty:null;
     offer.stock_checked_at=value.checkedAt;
     offer.available=!!value.available;
     offer.availability=value.available?'available':'out';
    }
    remember();inform();return result;
   }catch(e){
    if(old&&acceptable(old)){
     const preserved={...old,stale:true,reason:'Comprobación pendiente; último stock publicado',lastError:String(e)};
     inform();return preserved;
    }
    const failure={merchant:x.merchant,id:x.id,exact:false,maxQty:0,available:false,stockStatus:'unknown',
     checkedAt:null,savedAt:Date.now(),reason:'No se pudo consultar a la tienda',lastError:String(e)};
    live.set(k,failure);inform();return failure;
   }
  })();
  pending.set(k,promise);
  try{return await promise}finally{pending.delete(k)}
 }
 async function checkGroup(merchant,offers){
  const entries=offers.map(offer=>({offer,ref:resolve(offer)})).filter(x=>x.ref&&x.ref.merchant===merchant);
  if(!entries.length)return;
  const ids=entries.map(x=>x.ref.id).join(',');
  const job=(async()=>{
   const response=await fetch('/api/stock-batch?'+new URLSearchParams({merchant,ids}),{cache:'no-store',credentials:'same-origin'});
   if(!response.ok)throw Error('HTTP '+response.status);
   return await response.json();
  })();
  const checks=entries.map(({offer,ref})=>{
   const k=key(ref),old=live.get(k);
   lastAttempt.set(k,Date.now());
   const promise=job.then(data=>{
    const value=(data.results||[]).find(x=>String(x.id)===ref.id);
    if(!value)throw Error('La tienda no devolvió esta variante');
    if(value.stockStatus==='unknown'&&old&&acceptable(old)){
     const copy={...old,stale:true,reason:'Cantidad previa conservada; pendiente de comprobar la tienda'};
     inform();return copy;
    }
    const result={...value,savedAt:Date.now(),stale:false};
    live.set(k,result);
    offer.stock_qty=value.exact?value.maxQty:null;
    offer.stock_quantity=value.exact?value.maxQty:null;
    offer.stock_checked_at=value.checkedAt;
    offer.available=!!value.available;
    offer.availability=value.available?'available':'out';
    remember();inform();return result;
   }).catch(e=>{
    if(old&&acceptable(old)){inform();return {...old,stale:true,reason:'No fue posible revalidar; cantidad anterior conservada'}}
    const failure={merchant,id:ref.id,exact:false,maxQty:0,available:false,stockStatus:'unknown',savedAt:Date.now(),reason:'La consulta agrupada no respondió'};
    live.set(k,failure);inform();return failure;
   });
   pending.set(k,promise);
   return promise.finally(()=>pending.delete(k));
  });
  await Promise.allSettled(checks);
 }
 async function approve(offer,next,other=0){
  const quantity=Number(next),selected=Number(other);
  if(!Number.isSafeInteger(quantity)||quantity<0||!Number.isSafeInteger(selected)||selected<0)return {ok:false,reason:'Cantidad inválida'};
  const r=await check(offer,{fresh:true});
  if(r.stale||!acceptable(r))return {ok:false,reason:r.reason||'La tienda no confirma unidades exactas'};
  if(quantity+selected>r.maxQty)return {ok:false,reason:'La tienda confirma '+r.maxQty+' unidades; ya tienes '+selected+' asignadas a esta referencia'};
  return {ok:true,record:r};
 }
 function queue(){
  if(tickQueued)return;
  tickQueued=true;setTimeout(()=>{tickQueued=false;refreshSelected().catch(()=>{})},90);
 }
 async function refreshSelected(){
  if(scanning||document.visibilityState==='hidden')return;
  scanning=true;
  try{
   const options=new Map(),put=(offer,priority)=>{
    const ref=resolve(offer);if(!ref)return;
    const k=key(ref),entry=options.get(k);
    if(!entry||entry.priority<priority)options.set(k,{offer,priority});
   };
   // Prioridad alta para lo que se muestra al usuario y lo que ya guarda.
   const model=window.Atlas;
   if(model){
    for(const item of model.allItems()){
     if(model.count('invest',item)+model.count('flip',item)>0||model.state.watchIntent?.[item.id]){
      const o=model.preferred(item);if(o)put(o,8);
     }
    }
   }
   const now=Date.now();
   for(const [k,e] of tracked){
    if(now-e.at>MAX_TRACK_MS){tracked.delete(k);continue}
    put(e.offer,10);
   }
   // Únicamente 8 comprobaciones por tanda; el resto se incorpora en la siguiente.
   const next=[...options.values()].sort((a,b)=>b.priority-a.priority)
    .filter(({offer})=>{
     const r=resolve(offer),k=key(r),cached=live.get(k);
     const waiting=lastAttempt.get(k)||0;
     return !pending.has(k)&&now-waiting>(cached?.stockStatus==='unknown'?ERROR_RETRY_MS:AUTO_MS)
       &&(!cached||now-cached.savedAt>AUTO_MS);
    }).slice(0,12);
   const grouped=new Map(),individual=[];
   for(const {offer} of next){
    const r=resolve(offer);
    if(['okami','khipu','mazmorra','bimba'].includes(r.merchant)){
     if(!grouped.has(r.merchant))grouped.set(r.merchant,[]);
     grouped.get(r.merchant).push(offer);
    }else individual.push(offer);
   }
   // Una sola consulta remota por tienda WooCommerce; cada lote admite hasta 8 variantes.
   const jobs=[...grouped].flatMap(([merchant,offers])=>{
    const chunks=[];for(let i=0;i<offers.length;i+=8)chunks.push(checkGroup(merchant,offers.slice(i,i+8)));
    return chunks;
   });
   // Tiendas sin API agrupada: dos consultas simultáneas como máximo.
   for(let i=0;i<individual.length;i+=2)jobs.push(Promise.allSettled(individual.slice(i,i+2).map(o=>check(o))));
   await Promise.allSettled(jobs.slice(0,6));
  }finally{scanning=false}
 }
 function ageLabels(){
  document.querySelectorAll('[data-stock-age]').forEach(el=>{
   const time=Date.parse(el.dataset.stockAge||'');if(!Number.isFinite(time))return;
   const s=Math.max(0,Math.floor((Date.now()-time)/1000));
   el.textContent=s<60?'Revisado hace '+s+' s':s<3600?'Revisado hace '+Math.floor(s/60)+' min':'Revisado hace '+Math.floor(s/3600)+' h';
  });
 }
 window.TCGStock={resolve,peek,limit,track,check,approve,onUpdate,refreshSelected};
 window.addEventListener('focus',queue);
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')queue()});
 setInterval(()=>{queue();ageLabels()},1000*45);
 setInterval(ageLabels,1000);
 document.addEventListener('DOMContentLoaded',()=>{ageLabels();queue()});
})();