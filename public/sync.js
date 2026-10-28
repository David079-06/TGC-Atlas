(()=>{'use strict';const lang={Inglés:'en',Español:'es',Japonés:'jp',Chino:'zh'};const staticMap={'Delta Reign|Booster Box 36|Inglés':'delta-bb','Delta Reign|Elite Trainer Box|Inglés':'delta-etb','Delta Reign|Booster Bundle 6|Inglés':'delta-bundle','Evoluciones Prismáticas|Super Premium Collection|Inglés':'prismatic-spc','Destined Rivals|Elite Trainer Box|Inglés':'destined-etb','Evoluciones Prismáticas|Premium Figure Collection|Español':'prismatic-figure','Chaos Rising|Booster Box 36|Inglés':'chaos-bb','Chaos Rising|Elite Trainer Box|Inglés':'chaos-etb','30.º aniversario|Binder Collection|Español':'30-binder'};
function watchOffer(p,strategy='hold'){
 if(!p||p.market!=='PE'||!p.external_id)return {ok:false,reason:'Falta una referencia peruana verificable'};
 const code=lang[p.language]||'unknown';
 const pairs=window.__smartComparisons||[];
 const pair=pairs.find(x=>x.pe?.merchant===p.merchant&&String(x.pe.external_id)===String(p.external_id));
 const matchedKey=pair?[pair.groupName,pair.format,pair.language].join('|'):null;
 const coreId=matchedKey&&p.merchant==='okami'?staticMap[matchedKey]:null;
 let id=coreId||'radar-'+p.merchant+'-'+p.external_id;
 const key='tcg-atlas-v3-state';let state={};
 try{state=JSON.parse(localStorage.getItem(key)||'{}')}catch{}
 state.customItems=state.customItems||[];state.preferredStores=state.preferredStores||{};
 state.watchIntent=state.watchIntent||{};
 const previous=state.customItems.find(x=>x._fromShop===p.merchant&&String(x._fromCandidateId)===String(p.external_id));
 if(previous)id=previous.id;
 if(!coreId||previous){
  let item=state.customItems.find(x=>x.id===id);
  if(!item){
   item={id,name:p.title,family:pair?.groupName||'Producto seleccionado',lang:code,format:pair?.format||p.product_kind||'otro',priority:99,method:'ambos',preferred:p.merchant,manual:true,_fromShop:p.merchant,_fromCandidateId:String(p.external_id)};
   state.customItems.push(item);
  }
  if(pair?.es){item._fromEsMerchant=pair.es.merchant;item._fromEsExternalId=String(pair.es.external_id)}
 }else state.preferredStores[id]=p.merchant;
 state.watchIntent[id]=strategy==='flip'?'flip':'invest';
 try{localStorage.setItem(key,JSON.stringify(state))}catch(e){return {ok:false,reason:'El navegador no permite guardar la cartera'}}
 return {ok:true,id};
}
window.AtlasFollow={watchOffer};
async function sync(){if(!window.AtlasRadar){alert('La lista aún no ha cargado.');return}const selection=window.AtlasRadar.active();if(!selection.length){alert('Añade primero productos a la cartera del radar.');return}const stateKey='tcg-atlas-v3-state';let state={};try{state=JSON.parse(localStorage.getItem(stateKey)||'{}')}catch{};state.invest=state.invest||{};state.flip=state.flip||{};state.watchIntent=state.watchIntent||{};state.customItems=state.customItems||[];state.preferredStores=state.preferredStores||{};const pairs=window.__smartComparisons||[];let copied=0,skipped=0;for(const entry of selection){const p=entry.o;const code=lang[p.language];if(!code){skipped++;continue}if(entry.qty>0){let verified;try{verified=await window.TCGStock.approve(p,entry.qty)}catch(e){verified={ok:false,reason:e.message}}if(!verified.ok){skipped++;continue}}const pair=pairs.find(x=>x.pe?.merchant===p.merchant&&x.pe?.external_id===p.external_id),matchedKey=pair?[pair.groupName,pair.format,pair.language].join('|'):null;const coreId=matchedKey&&p.merchant==='okami'?staticMap[matchedKey]:null;const id=coreId||'radar-'+p.merchant+'-'+p.external_id;const target=entry.strategy==='flip'?'flip':'invest',other=target==='flip'?'invest':'flip';if(!coreId){let item=state.customItems.find(x=>x.id===id);if(!item){item={id,name:p.title,family:pair?.groupName||'Radar Perú',lang:code,format:'custom',priority:20,method:'ambos',growth:[-.12,.08,.25],preferred:p.merchant,manual:true,_fromShop:p.merchant,_fromCandidateId:String(p.external_id),_fromEsMerchant:pair?.es?.merchant||null,_fromEsExternalId:pair?.es?.external_id?String(pair.es.external_id):null};state.customItems.push(item)}else{item._fromEsMerchant=pair?.es?.merchant||item._fromEsMerchant||null;item._fromEsExternalId=pair?.es?.external_id?String(pair.es.external_id):item._fromEsExternalId||null}}else{state.preferredStores[id]=p.merchant}state.watchIntent[id]=target;if(entry.qty>0)state[target][id]=Math.max(Number(state[target][id]||0),entry.qty);copied++}localStorage.setItem(stateKey,JSON.stringify(state));alert('Se han enviado '+copied+' productos a las carteras principales.'+(skipped?' '+skipped+' no sincronizados por falta de idioma o stock confirmado.':'')+' Al abrir el panel principal verás las cantidades sincronizadas.');}
window.addEventListener('DOMContentLoaded',()=>{
 const button=document.getElementById('syncMain');
 if(button)button.addEventListener('click',sync);
 const refresh=document.getElementById('refreshSources');
 if(refresh)refresh.addEventListener('click',async()=>{
  refresh.disabled=true;refresh.textContent='Solicitando comprobación…';
  try{
   const res=await fetch('/api/refresh-market',{method:'POST',credentials:'same-origin'});
   if(!res.ok)throw Error(res.status===403?'Solo el propietario puede solicitar actualizaciones':'HTTP '+res.status);
   const d=await res.json();
   alert(d.queued?'Comprobación solicitada. Los datos se actualizarán por etapas; vuelve a abrir el radar para verlos.':d.reason||'Hay una revisión reciente.');
  }catch(e){alert('No se pudo iniciar la consulta: '+e.message)}
  finally{refresh.disabled=false;refresh.textContent='↻ Verificar fuentes'}
 });
});})();