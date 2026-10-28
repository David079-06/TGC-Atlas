(()=>{'use strict';
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safe=u=>{try{const v=new URL(u);return v.protocol==='https:'?v.href:'#'}catch{return '#'}};
const when=s=>s?new Date(s).toLocaleString('es-ES',{dateStyle:'short',timeStyle:'short'}):'Sin escaneo';
const number=n=>Number(n||0).toLocaleString('es-ES');
const status=s=>s==='rate-limited'?['Acceso limitado por la tienda','source-old']:s==='scan-error'?['Error de actualización','source-old']:s==='fresh'?['Datos recientes','source-recent']:s==='delayed'?['Revisión pendiente','source-old']:s==='stale'?['Catálogo desactualizado','source-old']:['Sin datos','source-unknown'];
async function refresh(){
 const el=document.querySelector('#stores')||document.querySelector('#trustGrid');
 if(!el)return;
 let report;
 try{
  const r=await fetch('/api/store-audit',{cache:'no-store',credentials:'same-origin'});
  if(!r.ok)throw Error('La consulta no está disponible');
  report=await r.json();
 }catch(e){
  const old=document.querySelector('.source-audit');
  if(old)old.innerHTML='<p class="source-error">No se ha podido actualizar la comprobación de tiendas. Vuelve a intentarlo más tarde.</p>';
  return;
 }
 let panel=document.querySelector('.source-audit');
 if(!panel){panel=document.createElement('section');panel.className='source-audit';panel.setAttribute('aria-label','Estado real de las fuentes');el.parentElement.insertBefore(panel,el)}
 const stores=report.automated||[],manual=report.manual||[];
 panel.innerHTML='<div class="audit-top"><div><span class="audit-eyebrow">ESTADO DE LAS FUENTES</span><h3>Tiendas conectadas</h3><p>Separamos las tiendas con catálogo automático de las que necesitan una consulta manual. Ninguna está certificada como segura solo por aparecer aquí.</p></div><span class="audit-count">'+stores.length+' catálogos conectados</span></div>'+
 '<div class="source-cards">'+stores.map(x=>{
  const [title,cl]=status(x.status);
  return '<article class="audit-shop"><div class="audit-line"><strong>'+escape(x.name)+'</strong><span class="source-pill '+cl+'">'+title+'</span></div>'+
  '<p>'+escape(x.market==='PE'?'Perú':'España')+' · '+escape(x.method||'Catálogo web')+'</p>'+
  '<div class="audit-metrics"><span><b>'+number(x.products)+'</b><small>fichas en base de datos</small></span><span><b>'+number(x.priced)+'</b><small>con precio válido</small></span><span><b>'+number(x.available)+'</b><small>anunciadas disponibles</small></span></div>'+
  '<p class="audit-time">Última lectura completa del catálogo: '+escape(when(x.lastCatalogScan))+'</p>'+(x.scanError&&['rate-limited','scan-error'].includes(x.status)?'<p class="audit-warning">La última consulta falló: '+escape(x.status==='rate-limited'?'demasiadas peticiones (429); se conservan los precios anteriores':x.scanError)+'.</p>':'')+
  (x.withoutPrice?'<p class="audit-warning">'+number(x.withoutPrice)+' fichas sin precio calculable.</p>':'')+
  '<a href="'+safe(x.url)+'" target="_blank" rel="noopener noreferrer">Web de la tienda ↗</a>'+
  (x.preordersUrl?' <a href="'+safe(x.preordersUrl)+'" target="_blank" rel="noopener noreferrer">Sus preventas ↗</a>':'')+
 '</article>'}).join('')+'</div>'+
 '<details class="audit-manual"><summary>'+manual.length+' tiendas adicionales sin consulta automática</summary><p>Se muestran solo como directorio. No se inventan precios, existencias ni fecha de actualización.</p>'+manual.map(x=>'<div class="manual-row"><span>'+escape(x.name)+' · '+escape(x.reason)+'</span><a href="'+safe(x.url)+'" target="_blank" rel="noopener noreferrer">Consultar ↗</a></div>').join('')+'</details>';
}
window.addEventListener('DOMContentLoaded',refresh);
})();