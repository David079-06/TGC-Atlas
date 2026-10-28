(()=>{
 'use strict';
 const $=s=>document.querySelector(s);
 const M=()=>window.Atlas,stock=()=>window.TCGStock;
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const query={invest:'',flip:''};
 const money=n=>Number.isFinite(n)?n.toLocaleString('es-ES',{style:'currency',currency:'EUR'}):'N/D';
 const time=t=>t?new Date(t).toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'}):'';
 const langCode=x=>({Inglés:'en',Español:'es',Japonés:'jp',Chino:'zh',Coreano:'ko'}[x]||'unknown');
 function results(kind){
   const root=$('#picker-'+kind);
   if(!root||!M()?.data?.items?.length||M().state.selectedPage!==(kind==='invest'?'inversion':'reventa'))return;
   const term=query[kind].trim().toLowerCase();
   const included=M().allItems().filter(x=>M().count(kind,x)===0&&M().state.watchIntent?.[x.id]!==kind)
    .filter(x=>!term||[x.name,x.family,x.format,x.lang].some(y=>String(y||'').toLowerCase().includes(term)))
    .map(item=>({item,offer:M().preferred(item),catalog:false}));
   const watchedLinks=new Set(M().allItems().filter(x=>M().state.watchIntent?.[x.id]===kind||M().count(kind,x)>0).map(x=>M().preferred(x)?.product_url).filter(Boolean));
   const offers=term.length>=2?(M().data.offers||[]).filter(o=>o.market==='PE'&&o.currency==='PEN'&&Number(o.price)>0&&o.available===true&&!o.preorder_evidence&&o.franchise!=='otro_tcg'&&
    (o.title+' '+o.merchant+' '+o.language+' '+o.product_kind).toLowerCase().includes(term)&&!watchedLinks.has(o.product_url))
    .map(o=>({item:{id:'offer-'+o.merchant+'-'+o.external_id,name:o.title,lang:langCode(o.language)},offer:o,catalog:true})):[];
   const exists=new Set(included.map(x=>x.offer?.product_url).filter(Boolean));
   const all=[...included,...offers.filter(x=>!exists.has(x.offer.product_url))];
   all.sort((a,b)=>(a.offer?0:1)-(b.offer?0:1)||((a.catalog?1:0)-(b.catalog?1:0))||a.item.name.localeCompare(b.item.name,'es'));
   const visible=all.slice(0,9),list=root.querySelector('[data-results]'),totals=root.querySelector('[data-count]');
   totals.textContent=all.length+' resultado'+(all.length===1?'':'s');
   const scrollY=list.scrollTop;
   list.innerHTML=visible.map(({item,offer,catalog})=>{
     const live=stock()?.peek(offer);
     const other=offer?M().reservedFor(offer,kind,catalog?null:item.id):0;
     const exact=live?.stockStatus==='verified'&&live.exact;
     const available=exact&&live.maxQty>other;
     const watching=!available,mode=watching?'watch':'unit';
     const phrase=!offer?'Sin oferta peruana vigente':
       !stock()?.resolve(offer)?'Sin referencia exacta del comercio':
       !live?'Comprobando stock…':
       exact?'Tienda: '+live.maxQty+' ud. · '+time(live.checkedAt):
       live.stockStatus==='out'?'Agotado':'Disponible';
     const rate=M().valueRate(),cost=offer&&rate?Number(offer.price)*rate:null;
     return '<article class="pick-card"><div class="pick-head"><strong>'+esc(item.name)+'</strong><small>'+
      esc(item.lang==='en'?'Inglés':item.lang==='es'?'Español':item.lang==='jp'?'Japonés':item.lang==='ko'?'Coreano':'Idioma por confirmar')+
      (catalog?' · '+esc(offer.merchant):'')+'</small></div>'+
      '<div class="pick-meta"><b>'+(offer?'S/ '+Number(offer.price).toFixed(2):'N/D')+'</b><small>'+(cost===null?'EUR pendiente':money(cost))+'</small></div>'+
      '<div class="pick-stock '+(exact?'confirmed':'unknown')+'">'+esc(phrase)+'</div>'+
      '<button type="button" class="pick-add" data-pick-kind="'+kind+'" data-pick-id="'+esc(item.id)+'" data-pick-mode="'+mode+'" '+(catalog?'data-pick-offer="'+esc(offer.merchant+':'+offer.external_id)+'"':'')+' '+(!offer?'disabled':'')+'>'+(available?'+ 1 unidad':live?.stockStatus==='out'?'Seguir reposición':'+ Guardar')+'</button></article>';
   }).join('') || '<div class="pick-empty">No hay productos que coincidan con tu búsqueda. El catálogo no incluye preventas aquí.</div>';
   list.scrollTop=scrollY;
   for(const o of visible.map(x=>x.offer).filter(Boolean))stock()?.track(o);
 }
 function install(){
   for(const kind of ['invest','flip']){
     const table=$('#'+(kind==='invest'?'invest-table':'flip-table'));
     if(!table||$('#picker-'+kind))continue;
     const box=document.createElement('div');
     box.id='picker-'+kind;box.className='portfolio-picker';
     box.innerHTML='<div class="picker-heading"><div><div class="picker-eyebrow">TU SELECCIÓN</div><h3>Añadir un producto</h3><p>Guárdalo al instante para seguirlo. Si tiene unidades confirmadas, podrás sumarlas directamente; cada aumento se valida con la tienda.</p></div><a href="/market.html#explorer" class="picker-catalog-link">Ver catálogo completo ↗</a></div>'+
       '<div class="picker-search"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="m15.5 15.5 5 5" fill="none" stroke="currentColor" stroke-width="1.8"/></svg><input type="search" data-search-kind="'+kind+'" placeholder="Buscar cajas, ETB, colecciones… " autocomplete="off" aria-label="Buscar productos para añadir"><span data-count></span></div>'+
       '<div class="pick-grid" data-results></div><div class="picker-footnote">Guardar un producto no compra ni reserva unidades. El límite de cantidad se verifica al añadir unidades; la disponibilidad puede cambiar.</div>';
     table.parentElement.insertBefore(box,table);
     box.querySelector('[data-search-kind]').addEventListener('input',e=>{query[kind]=e.target.value;results(kind)});
   }
 }
 function render(){install();for(const kind of ['invest','flip'])results(kind);}
 document.addEventListener('click',async e=>{
  const btn=e.target.closest('[data-pick-id]');if(!btn)return;
  const kind=btn.dataset.pickKind,raw=btn.dataset.pickOffer;
  let item=M()?.allItems().find(x=>x.id===btn.dataset.pickId);
  const offer=raw?(M().data.offers||[]).find(o=>o.merchant+':'+o.external_id===raw):item&&M().preferred(item);
  if(!offer)return;
  btn.disabled=true;btn.textContent='Comprobando…';
  try{
   if(btn.dataset.pickMode==='watch'){
    if(raw){
     const id=M().watchCandidate({shop_id:offer.merchant,external_id:offer.external_id,title:offer.title,
      lang:langCode(offer.language),price:Number(offer.price),currency:offer.currency,product_url:offer.product_url});
     item=M().allItems().find(x=>x.id===id);
    }
    if(!item||!M().watchItem(item.id,kind,offer.merchant||offer.shop_id))throw Error('No se ha podido guardar en seguimiento');
    window.AtlasViews?.render();render();return;
   }
   // Solo al añadir unidades se exige una cifra de stock confirmada.
   const otherKind=kind==='invest'?'flip':'invest';
   const existing=raw?M().allItems().find(x=>x.manual&&x._fromShop===offer.merchant&&String(x._fromCandidateId)===String(offer.external_id)):item;
   const count=(existing?M().count(kind,existing):0)+1;
   const other=M().reservedFor(offer,kind,existing?.id||null);
   const result=await stock().approve(offer,count,other);
   if(!result.ok)throw Error(result.reason||'Sin unidades exactas verificadas');
   if(raw){
    const id=M().watchCandidate({shop_id:offer.merchant,external_id:offer.external_id,title:offer.title,
       lang:langCode(offer.language),price:Number(offer.price),currency:offer.currency,product_url:offer.product_url});
    item=M().allItems().find(x=>x.id===id);
   }
   if(!item||!M().changeCount(kind,item.id,count))throw Error('El stock confirmado no permite esa cantidad.');
   window.AtlasViews?.render();render();
  }catch(err){
   const notice=$('#notice');if(notice){notice.textContent='No se pudo añadir: '+(err.message||String(err));notice.className='notice error'}
   render();
  }
 });
 window.TCGPortfolio={render};
 document.addEventListener('DOMContentLoaded',render,{once:true});
 stock()?.onUpdate(render);
})();