(()=>{'use strict';
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=(n,c)=>{if(n===null||!Number.isFinite(Number(n)))return 'N/D';return Number(n).toLocaleString('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2})+' '+(c==='PEN'?'S/':'€')};
const num=n=>Number(n).toLocaleString('es-ES',{maximumFractionDigits:2});
const when=t=>t&&Number.isFinite(Date.parse(t))?new Date(t).toLocaleString('es-ES',{dateStyle:'short',timeStyle:'short'}):'No comprobada';
const link=u=>{try{const x=new URL(u);return x.protocol==='https:'?x.href:'#'}catch{return '#'}};
let groups=[],fx=null,stockOverrides=new Map();
function selected(){
 const search=$('#search').value.toLowerCase().trim();
 const country=$('#country').value,stock=$('#stock').value,sort=$('#sort').value;
 return groups.map(group=>{
  const offers=group.offers.filter(o=>(country==='all'||o.country===country)&&
  (stock==='all'||(stock==='available'?(window.TCGStock?.peek(stockRef(o))?.stockStatus!=='out'&&o.available):!o.available))&&
  (!search||(o.title+' '+group.name+' '+o.language+' '+o.format).toLowerCase().includes(search)));
  offers.sort((a,b)=>sort==='name'?a.title.localeCompare(b.title,'es'):
   sort==='price'?((a.currency==='PEN'?(fx?.rate?a.price*fx.rate:Infinity):a.price)??Infinity)-((b.currency==='PEN'?(fx?.rate?b.price*fx.rate:Infinity):b.price)??Infinity):
   Date.parse(b.checkedAt)-Date.parse(a.checkedAt));
  return {...group,offers};
 }).filter(group=>group.offers.length>0);
}
const stockRef=o=>({merchant:o.merchant,external_id:String(o.id).split(':')[1]});
function stockLabel(o){
 const response=window.TCGStock?.peek(stockRef(o));
 if(!response)return '<span class="tag-pill unknown">Consultando stock…</span>';
 if(response.stockStatus==='out')return '<span class="tag-pill out">Agotado</span>';
 if(response.stockStatus==='verified'&&response.exact)return '<span class="tag-pill '+(response.maxQty<=3?'unknown':'available')+'">'+(response.maxQty<=3?'Últimas ':'')+num(response.maxQty)+' ud. publicadas</span>';
 return '<span class="tag-pill available">Disponible</span>';
}
function row(o){
 const eur=o.currency==='PEN'&&fx?.rate?o.price*fx.rate:o.currency==='EUR'?o.price:null;
 return '<tr><td><div class="product-name">'+esc(o.title)+'</div><div class="product-meta">'+esc(o.language||'Idioma sin determinar')+' · '+esc(o.format||'Formato por verificar')+'</div><button type="button" class="detail-trigger" data-detail="'+esc(o.id)+'" aria-expanded="false">Detalles y fuente ▾</button></td>'+
 '<td><div class="amount">'+(o.price==null?'Sin precio':(o.currency==='PEN'?'S/ '+num(o.price):num(o.price)+' €'))+'</div>'+
 '<div class="converted">'+(o.currency==='PEN'?eur===null?'EUR sin tipo actualizado':'≈ '+money(eur,'EUR'): 'Precio anunciado')+'</div></td>'+
 '<td>'+stockLabel(o)+'<div class="source-date">'+when(window.TCGStock?.peek(stockRef(o))?.checkedAt||o.checkedAt)+'</div></td>'+
 '<td>'+(o.releaseDate?'Lanzamiento: '+new Date(o.releaseDate+'T12:00:00Z').toLocaleDateString('es-ES',{dateStyle:'medium'}):'Sin fecha acreditada')+(o.storeAvailableDate?'<small class="store-release-date">En tienda desde: '+new Date(o.storeAvailableDate+'T12:00:00Z').toLocaleDateString('es-ES',{dateStyle:'medium'})+'</small>':'')+'</td>'+
 '<td><a class="product-link" href="'+link(o.url)+'" target="_blank" rel="noopener noreferrer">Ver tienda ↗</a>'+(o.country==='PE'?'<a class="detail-trigger preorder-analyze" href="/research.html?product='+encodeURIComponent(o.id)+'">Analizar inversión ↗</a>':'')+'</td></tr>'+
 '<tr class="details-row" id="details-'+esc(o.id.replace(':','-'))+'" hidden><td colspan="5"><div class="details-inner"><span>Origen: <b>'+esc(o.merchant)+'</b></span><span>Última lectura: '+when(o.checkedAt)+'</span><span>'+esc(o.evidence||'Preventa identificada en la tienda. No es una reserva confirmada.')+'</span>'+
 (o.releaseSource?'<a href="'+link(o.releaseSource)+'" target="_blank" rel="noopener noreferrer">Fecha oficial ↗</a>':'')+(o.preorderCategoryUrl?'<a href="'+link(o.preorderCategoryUrl)+'" target="_blank" rel="noopener noreferrer">Categoría oficial de preventas ↗</a>':'')+
 '<span class="update-source">Stock actualizado automáticamente, sin reserva de unidades.</span></div></td></tr>';
}
function render(){
 const show=selected(),all=show.reduce((s,g)=>s+g.offers.length,0);
 $('#countTotal').textContent=String(all);$('#countShops').textContent=String(show.length);
 $('#storeSections').innerHTML=show.length?show.map(g=>
 '<section class="store-section"><div class="store-head"><div class="shoptitle"><span class="store-mark">'+esc(g.name.slice(0,1))+'</span><div><div class="eyebrow">'+(g.country==='PE'?'PERÚ':'ESPAÑA')+' / TIENDA</div><h2>'+esc(g.name)+'</h2><p>Ofertas de preventa detectadas en su catálogo</p></div></div><div class="shopcount">'+g.offers.length+' producto'+(g.offers.length===1?'':'s')+'</div></div>'+
 '<div class="store-table-wrap"><table class="store-table"><thead><tr><th>Producto</th><th>Precio</th><th>Stock publicado</th><th>Salida anunciada</th><th>Ficha original</th></tr></thead><tbody>'+
 g.offers.map(row).join('')+'</tbody></table></div><p class="pre-section-text">Precios y existencias anunciados. Confirma condiciones de preventa, fecha de cobro, cancelación y entrega en la tienda.</p></section>'
 ).join(''):'<div class="no-items"><b>No hay preventas de Pokémon TCG identificadas con esos filtros.</b>Que una tienda no aparezca no significa que no tenga preventas: su catálogo quizá no las identifique claramente.</div>';
 show.flatMap(g=>g.offers).slice(0,16).forEach(o=>window.TCGStock?.track(stockRef(o)));
}
async function fetchData(){
 $('#status').textContent='Actualizando las preventas desde el catálogo…';
 try{
 const [pre,forex]=await Promise.all([
  fetch('/api/preorders',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('Error al consultar preventas');return r.json()}),
  fetch('/api/fx',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('Error de conversión');return r.json()}).catch(()=>({status:'unavailable'}))
 ]);
 groups=pre.groups||[];fx=forex.status==='verified'?forex:null;
 $('#rate').textContent=fx?.rate?fx.rate.toFixed(6)+' €':'N/D';
 $('#rateNote').textContent=fx?.rate?'1 sol peruano · '+when(fx.checkedAt):'Sin tipo diario confirmado (no se convierte)';
 $('#status').textContent=groups.length?'Fichas de preventa: '+pre.total+' en '+pre.stores+' tienda(s). Última consulta: '+when(pre.updatedAt)+'.':'No se han identificado preventas publicadas de Pokémon TCG en las fuentes actuales.';
 $('#status').classList.toggle('warning',!groups.length);
 render();
 }catch(e){$('#status').classList.add('warning');$('#status').textContent='No ha sido posible actualizar: '+e.message;$('#storeSections').innerHTML='<div class="no-items">No hay una comprobación disponible en este momento.</div>'}
}
for(const id of ['search','country','stock','sort'])$('#'+id).addEventListener(id==='search'?'input':'change',render);
$('#storeSections').addEventListener('click',e=>{
 const button=e.target.closest('[data-detail]');
 if(!button)return;
 const row=document.getElementById('details-'+button.dataset.detail.replace(':','-'));
 if(!row)return;
 row.hidden=!row.hidden;button.setAttribute('aria-expanded',String(!row.hidden));
 button.textContent=row.hidden?'Detalles y fuente ▾':'Ocultar detalles ▴';
});
window.TCGStock?.onUpdate(()=>{
 const expanded=[...document.querySelectorAll('.details-row:not([hidden])')].map(el=>el.id);
 render();
 expanded.forEach(id=>{
  const row=document.getElementById(id);
  if(row){row.hidden=false;const b=row.previousElementSibling?.querySelector('[data-detail]');if(b){b.setAttribute('aria-expanded','true');b.textContent='Ocultar detalles ▴'}}
 });
});
$('#reload').addEventListener('click',fetchData);
setInterval(()=>{if(document.visibilityState==='visible')fetchData()},300000);
fetchData();
})();