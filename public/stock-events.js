(()=>{'use strict';
const $=s=>document.querySelector(s);
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const valid=u=>{try{const x=new URL(u);return x.protocol==='https:'?x.href:'#'}catch{return '#'}};
const time=s=>new Date(s).toLocaleString('es-ES',{dateStyle:'short',timeStyle:'short'});
async function update(){
 const host=$('#stockActivity');if(!host)return;
 try{
 const r=await fetch('/api/stock-events',{credentials:'same-origin',cache:'no-store'});
 if(!r.ok)throw Error('Consulta no disponible');
 const d=await r.json();
 const events=(d.events||[]).slice(0,12);
 host.innerHTML='<div class="stock-panel-title"><div><h2>Movimientos de stock</h2><p>Solo cambios observados en las tiendas. Para comprar, comprueba siempre la ficha original.</p></div><span>Historial de 14 días</span></div>'+
 (events.length?'<div class="stock-events">'+events.map(x=>'<div class="stock-event"><div><span class="stock-event-type '+(x.kind==='agotado'?'out':x.kind==='pocas unidades'?'low':'in')+'">'+escape(x.kind)+'</span><strong>'+escape(x.title)+'</strong><small>'+escape(x.merchant)+' · '+time(x.at)+' · '+escape(x.source)+'</small></div><div class="stock-event-end">'+(x.available?(x.qty!==null?x.qty+' ud.':'Disponible'):'Agotado')+'<a href="'+valid(x.url)+'" target="_blank" rel="noopener noreferrer">Tienda ↗</a></div></div>').join('')+'</div>':'<p class="empty-changes">No se han observado cambios confirmados de stock en los últimos 14 días. No significa que todas las tiendas estén sincronizadas en tiempo real.</p>');
 }catch(e){host.innerHTML='<p class="empty-changes">No se puede consultar el historial de cambios en este momento.</p>'}
}
window.addEventListener('DOMContentLoaded',()=>{if($('#stockActivity')){update();setInterval(()=>{if(document.visibilityState==='visible')update()},60000)}});
})();