/* Interfaz sencilla. Mantiene intactos los motores de precios y carteras. */
(()=>{
'use strict';
const $=s=>document.querySelector(s);
const set=(selector,value)=>{const el=$(selector);if(el)el.textContent=value};
function collapse(el,label,selector){
 if(!el)return;
 const target=el.querySelector(selector);
 if(!target||target.closest('details'))return;
 const d=document.createElement('details');d.className='simple-details';
 const s=document.createElement('summary');s.textContent=label;d.append(s);d.append(target);
 el.append(d);
}
function main(){
 const menu=$('#menu');
 if(!menu)return;
 menu.innerHTML=`
 <button data-page="inicio" class="chosen"><span>⌂</span> Inicio</button>
 <button data-page="inversion"><span>□</span> Guardar a futuro</button>
 <button data-page="reventa"><span>↗</span> Vender en España</button>
 <button data-page="oportunidades"><span>◎</span> Oportunidades</button>
 <button data-page="explorar"><span>⌕</span> Buscar productos</button><a class="analysis-menu-link" href="/preorders.html">◷ <span>Preventas por tienda</span></a><a class="analysis-menu-link" href="/research.html">◒ <span>Análisis de mercado</span></a>
 <details class="side-more"><summary>Más herramientas</summary>
   <button data-page="tiendas"><span>✓</span> Tiendas y seguridad</button>
   <button data-page="noticias"><span>◷</span> Noticias</button>
   <button data-page="historial"><span>▥</span> Historial</button>
   <a class="secondary-link" href="/market.html">Buscador completo</a>
 </details>`;
 const selected=window.Atlas?.state?.selectedPage;
 if(['tiendas','noticias','historial'].includes(selected))menu.querySelector('details').open=true;
 set('.side>.side-label','MI ESPACIO');
 set('.brand small','PRECIOS Y COLECCIÓN');
 set('#page-inicio .hero .eyebrow','RESUMEN');
 const head=$('#page-inicio .hero h1');if(head)head.innerHTML='Tus cartas y cajas, <em>en orden.</em>';
 set('#page-inicio .hero p','Mira lo que sigues, compara precios de Perú y España y decide qué merece la pena comprar.');
 const tags=$('#page-inicio .hero-tags');if(tags)tags.innerHTML='<span>Precios con fuente</span><span>Tu selección</span><span>Comparativas claras</span>';
 set('#page-inicio .hero-side>span','Coste de tu selección');
 set('#page-inicio .hero-foot','Cambio PEN a EUR');
 const summary=$('#page-inicio .hero-foot'); if(summary){
  const b=document.createElement('b');b.id='hero-rate';b.textContent='Sin verificar';summary.append(b);
 }
 set('#page-inicio .panel.wide h2','Cómo podría evolucionar tu selección');
 set('#page-inicio .rightpanel h2','Tus cálculos');
 set('#page-inicio .rightpanel>p','Puedes usar los valores normales o adaptarlos a tus gastos.');
 collapse($('.rightpanel'),'Cambiar comisiones y gastos','.control-list');
 set('#page-inicio .rightpanel .fineprint','Los costes de importación dependen del caso. Revisa los impuestos antes de comprar.');
 // La selección se pinta desde el módulo original de cartera.
 set('#page-inicio .two-columns:last-of-type .panel.wide h2','Lo que quieres guardar');
 set('#page-inicio .two-columns:last-of-type .panel:not(.wide) h2','Precios que destacan');
 set('#page-inversion .pagehead h1','Para guardar a futuro');
 set('#page-inversion .pagehead p','Añade las cajas que quieras conservar. Puedes modificar las cantidades cuando necesites.');
 set('#page-reventa .pagehead h1','Para vender en España');
 set('#page-reventa .pagehead p','Compara lo que cuesta comprar en Perú con una posible venta en España. El beneficio se calcula solo si hay precios comparables.');
 set('#page-oportunidades .pagehead h1','Oportunidades de compra');
 set('#page-oportunidades .pagehead p','Productos encontrados y precios disponibles. Comprueba la ficha original antes de comprar.');
 set('#page-explorar .pagehead h1','Buscar productos');
 set('#page-explorar .pagehead p','Busca por nombre, colección o tienda para ver las ofertas que se hayan podido consultar.');
 set('#page-tiendas .pagehead h1','Tiendas y seguridad');
 set('#page-tiendas .pagehead p','Consulta la información de cada tienda. Ninguna compra está garantizada.');
 set('#page-noticias .pagehead h1','Noticias que pueden afectar los precios');
 set('#page-historial .pagehead h1','Cómo han cambiado los precios');
 set('#page-historial .pagehead p','Muestra únicamente los precios guardados de consultas reales, con su fecha.');
 const rp=$('#daily-report-panel');
 if(rp){const contents=Array.from(rp.children); const d=document.createElement('details');d.className='simple-details';const s=document.createElement('summary');s.textContent='Ver informe diario completo';d.append(s);contents.forEach(c=>d.append(c));rp.append(d);}
 set('#refresh span','Actualizar');
 set('#present span','Ampliar pantalla');
 set('#pdf span','Guardar PDF');
 set('footer','TCG Atlas · Precios orientativos, no beneficios garantizados.');
}
function market(){
 const nav=$('aside nav');if(!nav)return;
 nav.innerHTML=`<a href="/" class="navlink">⌂ Inicio</a><a href="/preorders.html" class="navlink">◷ Preventas</a>
 <a href="#smart" class="navlink active">Comparar precios</a>
 <a href="#holdings" class="navlink">Mi lista</a>
 <a href="#explorer" class="navlink">Ver catálogo</a><a href="/research.html" class="navlink">Análisis de mercado ↗</a>
 <details class="side-more"><summary>Más herramientas</summary>
 <a href="#report" class="navlink">Comparación exacta</a>
 <a href="#verification" class="navlink">Tiendas</a>
 <a href="#news" class="navlink">Noticias</a></details>`;
 set('aside .logo small','TU ESPACIO PERSONAL');
 set('header .eyebrow','PRECIOS DE PERÚ Y ESPAÑA');
 set('header h1','Buscar y comparar');
 set('header p','Busca cajas y productos, consulta sus precios y guarda los que te interesen.');
 set('#smart .eyebrow','01 · OFERTAS');
 set('#smart h2','Compara lo que cuesta aquí y allí');
 set('#smart .sectionHead p','Mostramos comparaciones cuando el formato y el idioma coinciden. Comprueba la tienda antes de comprar.');
 set('#holdings .eyebrow','02 · TU SELECCIÓN');
 set('#holdings h2','Mis productos guardados');
 set('#explorer .eyebrow','03 · CATÁLOGO');
 set('#explorer h2','Buscar en las tiendas');
 set('#report .eyebrow','04 · MÁS INFORMACIÓN');
 set('#report h2','Comparaciones revisadas');
 set('#verification h2','Información de las tiendas');
 set('#news h2','Noticias y riesgos');
 set('#refreshSources','↻ Actualizar');
 set('#smartMore','Ver más productos');
 const smart=$('#smart'), holdings=$('#holdings'), explorer=$('#explorer'), report=$('#report');
 if(smart&&holdings)smart.after(holdings);
 if(explorer&&report)explorer.after(report);
 collapse(smart,'Ajustar comisiones y gastos','.controls');
 collapse(report,'Ajustar gastos de venta','.controls');
 const holdRows=$('#holdRows');if(holdRows)holdRows.setAttribute('aria-live','polite');
 const sections=['smart','holdings','explorer','report','verification','news'];
 const open=(value)=>{
   const page=sections.includes(value.replace('#',''))?value.replace('#',''):'smart';
   for(const id of sections){
     const el=document.getElementById(id);
     if(el){el.classList.toggle('hidden-panel',id!==page);el.setAttribute('aria-hidden',String(id!==page));}
   }
   document.querySelectorAll('aside a[href^="#"]').forEach(a=>a.classList.toggle('active',a.getAttribute('href')==='#'+page));
   if(['report','verification','news'].includes(page))nav.querySelector('details').open=true;
 };
 document.querySelectorAll('aside a[href^="#"]').forEach(a=>a.addEventListener('click',e=>{
   e.preventDefault();const target=a.getAttribute('href');
   if(location.hash!==target)history.pushState(null,'',target);
   open(target);window.scrollTo({top:0,behavior:'smooth'});
 }));
 window.addEventListener('hashchange',()=>open(location.hash));
 window.addEventListener('popstate',()=>open(location.hash));
 open(location.hash);
}
if(location.pathname.endsWith('/market.html'))market();else main();
})();