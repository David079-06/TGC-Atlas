(()=>{'use strict';
const $=id=>document.getElementById(id);
const money=n=>Number.isFinite(Number(n))?Number(n).toLocaleString('es-ES',{style:'currency',currency:'EUR'}):'—';
const sol=n=>Number.isFinite(Number(n))?'S/ '+Number(n).toLocaleString('es-PE',{maximumFractionDigits:2}):'—';
const n=v=>{const x=Number(v);return Number.isFinite(x)?x:0};
const integer=v=>Number.isFinite(n(v))?Math.max(0,Math.floor(n(v))):0;
const pct=v=>(v>0?'+':'')+v.toFixed(1)+' %';
const html=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeUrl=u=>{try{const v=new URL(u);return v.protocol==='https:'?v.href:'#'}catch{return '#'}};
const when=t=>t?new Date(t).toLocaleString('es-ES',{dateStyle:'medium',timeStyle:'short'}):'Sin fecha';
let all=[],current=null,report=null,match=null,fxMeta=null,matches=[],busy=false;
let chosenKey=new URLSearchParams(location.search).get('product')||'';
function notice(msg,warn=false){$('status').textContent=msg;$('status').classList.toggle('warning',warn)}
function option(x){return html(x.title)+' · '+html(x.merchant)+(x.stock_quantity!=null?' · stock: '+x.stock_quantity:'');}
function list(){
 const q=$('search').value.toLowerCase().trim();
 const offers=all.filter(x=>x.market==='PE'&&x.price>0&&(!q||(x.title+' '+x.merchant).toLowerCase().includes(q)));
 offers.sort((a,b)=>Number(b.available)-Number(a.available)||Date.parse(b.updated_at)-Date.parse(a.updated_at));
 const list=offers.slice(0,300);if(chosenKey){const chosen=offers.find(x=>x.merchant+':'+x.external_id===chosenKey);if(chosen&&!list.includes(chosen)){list.unshift(chosen);list.pop()}}
 $('product').innerHTML='<option value="">Elegir producto ('+offers.length+' resultados)</option>'+list.map(x=>'<option value="'+html(x.merchant+':'+x.external_id)+'">'+option(x)+'</option>').join('');
 if(chosenKey&&list.some(x=>x.merchant+':'+x.external_id===chosenKey))$('product').value=chosenKey;
 else if(!chosenKey&&list.length){chosenKey=list[0].merchant+':'+list[0].external_id;$('product').value=chosenKey;choose()}
}
function dataQuality(){
 if(!current)return;
 const days=report?.summary?.distinctDays||0,records=report?.summary?.samples||0;
 const exact=window.TCGStock?.peek(current);
 const stock=exact?.exact?exact.maxQty+' unidades publicadas':current.available?'Disponible · comprobar cantidad al comprar':'Agotado o sin disponibilidad';
 const spanish=match?.es?'Precio publicado por '+match.es.merchant+(match.es.available?' · disponible':' · producto agotado')+'. No demuestra una venta cerrada.':'No hay ficha idéntica confirmada en los catálogos españoles';
 $('quality').innerHTML='<div class="qitem"><b>Stock para comprar</b><small>'+html(stock)+'</small></div>'
 +'<div class="qitem"><b>Historial disponible</b><small>'+records+' lecturas en '+days+' día'+(days===1?'':'s')+'. '+(days>=7?'Se puede estudiar la variación observada.':'Aún no hay suficientes días para deducir una tendencia.')+'</small></div>'
 +'<div class="qitem"><b>Mercado español</b><small>'+html(spanish)+'</small></div>'
 +'<div class="qitem"><b>Riesgo de reposiciones</b><small>Pokémon ha comunicado que seguirá aumentando la producción. No hay confirmación específica sobre esta referencia.</small></div>'
 +'<div class="qitem"><b>Reventa real</b><small>Sin ventas completadas ni volumen de operaciones verificables. No podemos medir la liquidez de este producto.</small></div>';
 const last=window.TCGStock?.peek(current);
 const stockText=last?.exact?String(last.maxQty):current.available?'Disponible':'Agotado';
 const eur=fxRate()>0?money(n(current.price)*fxRate()):'Sin cambio';
 const change=report?.summary?.changePercent;
 const metrics=[
 ['Precio en Perú',sol(current.price),html(current.merchant)],
 ['Coste convertido',eur,fxRate()>0?'1 S/ = '+fxRate().toFixed(5)+' €':'Cambio no acreditado'],
 ['Unidades comprobadas',stockText,last?.exact?'Consulta puntual de la tienda':'Cantidad no publicada en fuente pública'],
 ['Variación observada',change!==null&&change!==undefined?pct(change):'No calculable',days>=2?'Entre la primera y última lectura':'Hace falta más de un día']
 ];
 $('metrics').innerHTML=metrics.map(x=>'<div class="metric"><small>'+x[0]+'</small><strong>'+x[1]+'</strong><em>'+x[2]+'</em></div>').join('');
 $('historyDays').textContent=days+' día'+(days===1?'':'s')+' registrado'+(days===1?'':'s');
 $('source').innerHTML='Última lectura de '+html(current.merchant)+': '+when(current.updated_at)+'. <a href="'+safeUrl(current.product_url)+'" target="_blank" rel="noopener noreferrer">Abrir ficha original ↗</a> '+(match?.es?'<a href="'+safeUrl(match.es.product_url)+'" target="_blank" rel="noopener noreferrer">Referencia española ↗</a>':'');
}
function fxRate(){return n($('fx').value)}
function calc(){
 if(!current||!(fxRate()>0))return ['—','—','—'];
 const ask=n($('sale').value),sellDiscount=n($('discount').value)/100,fee=n($('fees').value)/100;
 const buy=n(current.price)*fxRate()*(1+n($('spread').value)/100);
 const cogs=buy+n($('ship').value)+n($('tax').value)+n($('other').value);
 const received=ask*(1-sellDiscount)*(1-fee);
 const profit=received-cogs,roi=cogs>0?profit/cogs*100:null;
 const breakEven=(1-sellDiscount)*(1-fee)>0?cogs/((1-sellDiscount)*(1-fee)):null;
 return [ask>0?profit:null,ask>0?roi:null,breakEven];
}
function showCalc(){
 const [gain,roi,breakeven]=calc();
 $('profit').textContent=gain===null||gain==='—'?'No calculable':money(gain);
 $('roi').textContent=roi===null||roi==='—'?'—':pct(roi);
 $('breakeven').textContent=breakeven===null||breakeven==='—'?'—':money(breakeven);
 $('profit').className=typeof gain==='number'?(gain>=0?'pos':'neg'):'';
 const info=window.TCGStock?.peek(current);
 let verdict=!current?'Selecciona un producto':
   info?.stockStatus==='out'?'Producto agotado en la tienda':
   !match?.es?'Sin producto idéntico acreditado en España':!match.es.available?'Referencia española agotada: valor orientativo, no precio de salida disponible':
   typeof gain!=='number'?'Faltan costes o precio de salida':
   gain<=0?'Con estos gastos, la reventa daría pérdidas':
   roi<15?'Hay margen aparente, pero es reducido frente a posibles cambios de precio':
   'La diferencia de precios es interesante, pero faltan ventas cerradas y liquidez acreditada';
 $('decision').textContent='Evaluación de los datos: '+verdict;
 $('calcnote').textContent=match?.es?
 'Referencia española de '+match.es.merchant+(match.es.available?' disponible':' agotada')+'. No es una venta cerrada. Los gastos e impuestos introducidos son orientativos.':
 'Sin oferta comparable acreditada en España. Si introduces un precio de venta, es un objetivo manual, no un precio de mercado verificado.';
}
function chart(container,points,labels,series){
 if(!points.length){container.innerHTML='<div class="placeholder">Aún no hay observaciones verificables para dibujar la evolución.</div>';return;}
 const w=780,h=248,p={l:63,r:18,t:21,b:35},all=points.flatMap(x=>series.map(s=>x[s.key])).filter(Number.isFinite);
 let lo=Math.min(...all),hi=Math.max(...all),d=Math.max(hi-lo,hi*.03,.1);lo-=d*.14;hi+=d*.14;
 const X=i=>p.l+i/Math.max(1,points.length-1)*(w-p.l-p.r);
 const Y=v=>h-p.b-(v-lo)/(hi-lo)*(h-p.b-p.t);
 const lines=Array.from({length:5},(_,i)=>{const val=lo+(hi-lo)*i/4,y=Y(val);return '<line x1="'+p.l+'" x2="'+(w-p.r)+'" y1="'+y+'" y2="'+y+'" stroke="#e8eef5"/><text x="'+(p.l-11)+'" y="'+(y+4)+'" text-anchor="end" fill="#8a9aac" font-size="11">'+Math.round(val)+'</text>'}).join('');
 let body='';
 for(const s of series){
   const pts=points.map((x,i)=>X(i)+','+Y(x[s.key])).join(' ');
   const path=points.map((x,i)=>(i?'L':'M')+X(i)+' '+Y(x[s.key])).join(' ');
   const area=path+' L'+X(points.length-1)+' '+(h-p.b)+' L'+X(0)+' '+(h-p.b)+' Z';
   body+='<path d="'+area+'" fill="'+s.fill+'" opacity=".75"/><path d="'+path+'" fill="none" stroke="'+s.color+'" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>';
   if(points.length<=6)body+=points.map((x,i)=>'<circle cx="'+X(i)+'" cy="'+Y(x[s.key])+'" r="4" fill="'+s.color+'" stroke="white" stroke-width="1.5"/>').join('');
 }
 let ticks=[0,Math.floor((points.length-1)/2),points.length-1].filter((v,i,a)=>a.indexOf(v)===i);
 body+=ticks.map(i=>'<text x="'+X(i)+'" y="'+(h-9)+'" text-anchor="middle" fill="#889aab" font-size="10">'+html(labels[i]||'')+'</text>').join('');
 container.innerHTML='<svg viewBox="0 0 '+w+' '+h+'" preserveAspectRatio="none" role="img" aria-label="Datos de precio con fechas"><defs><linearGradient id="shade1" x1="0" x2="0" y1="0" y2="1"><stop stop-color="#4687b7" stop-opacity=".27"/><stop offset="1" stop-color="#4687b7" stop-opacity=".01"/></linearGradient><linearGradient id="shade2" x1="0" x2="0" y1="0" y2="1"><stop stop-color="#20a78c" stop-opacity=".14"/><stop offset="1" stop-color="#20a78c" stop-opacity="0"/></linearGradient></defs>'+lines+body+'</svg><div class="tooltip" hidden></div>';
 const svg=container.querySelector('svg'),tip=container.querySelector('.tooltip');
 svg.addEventListener('mousemove',ev=>{
  const rect=svg.getBoundingClientRect(),v=(ev.clientX-rect.left)/rect.width;
  const i=Math.max(0,Math.min(points.length-1,Math.round((v-p.l/w)/((w-p.l-p.r)/w)*Math.max(1,points.length-1))));
  const x=points[i],label=labels[i]||'';
  tip.textContent=label+' · '+series.map(s=>s.label+': '+money(x[s.key])).join(' | ');
  tip.hidden=false;tip.style.left=Math.max(0,Math.min(container.clientWidth-tip.offsetWidth,ev.clientX-rect.left+9))+'px';tip.style.top='8px';
 });
 svg.addEventListener('mouseleave',()=>tip.hidden=true);
}
function historyGraph(){
 const rows=report?.observations||[];
 const points=rows.map(x=>({price:n(x.price)}));
 const dates=rows.map(x=>new Date(x.checked_at).toLocaleString('es-ES',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}));
 chart($('historyChart'),points,dates,[{key:'price',label:'Publicado',color:'#3373a7',fill:'url(#shade1)'}]);
 const lo=report?.summary?.minimum,hi=report?.summary?.maximum;
 $('historyRange').textContent=rows.length?'Mín. '+sol(lo)+' · Máx. '+sol(hi):'Sin valores';
}
function scenarioGraph(){
 const chartEl=$('scenarioChart');
 if(!current){chartEl.innerHTML='<div class="placeholder">Selecciona un producto</div>';return}
 const fx=fxRate(),base=match?.es&&match.es.available?n(match.es.price):null;
 const years=integer($('horizon').value)/12;
 if(base===null||!(base>0)||!(fx>0)){
   $('baseline').textContent='No existe una oferta española comparable confirmada y un cambio válido.';
   $('requiredGrowth').textContent='No es posible estimar ganancias futuras netas sin un precio de salida contrastable.';
   chartEl.innerHTML='<div class="placeholder">Falta un comparable español. No se genera una curva ficticia.</div>';
   $('scenarios').textContent='Pendiente de fuentes suficientes.';return;
 }
 const cost=n(current.price)*fx*(1+n($('spread').value)/100)
  +n($('ship').value)+n($('tax').value)+n($('other').value);
 const factor=(1-n($('discount').value)/100)*(1-n($('fees').value)/100);
 const storage=n($('storage').value);
 if(!(factor>0)||!(cost>0)){chartEl.innerHTML='<div class="placeholder">Revisa los parámetros del cálculo.</div>';return}
 $('baseline').textContent='Referencia española: '+money(base)+' publicada por '+match.es.merchant+'. Son precios solicitados, no operaciones cerradas.';
 const required=((cost+storage*years)/(base*factor))**(1/years)-1;
 $('requiredGrowth').textContent='Para cubrir compra, venta, gastos y custodia en '+years+' año'+(years===1?'':'s')+
 ', el precio español tendría que cambiar al menos '+pct(required*100)+' anual (supuesto de capitalización constante).';
 const series=[
  {key:'bad',label:'Caída',color:'#cb7781',fill:'none'},
  {key:'mid',label:'Estable',color:'#18a48d',fill:'url(#shade2)'},
  {key:'good',label:'Alcista',color:'#3373a7',fill:'url(#shade1)'}
 ];
 const rates=['bad','mid','good'].map(k=>n($(k).value)/100);
 for(const k of ['bad','mid','good'])$(k+'Val').textContent=(n($(k).value)>0?'+':'')+n($(k).value)+' % anual';
 const points=Array.from({length:years*12+1},(_,i)=>{
  const t=i/12;
  return Object.fromEntries(['bad','mid','good'].map((k,j)=>[k,
   base*Math.pow(Math.max(.01,1+rates[j]),t)*factor-cost-storage*t]));
 });
 const labels=points.map((_,i)=>i+' meses');
 chart(chartEl,points,labels,series);
 $('scenarios').innerHTML=
 '<span>Caída: <b>'+money(points.at(-1).bad)+'</b></span>'+
 '<span>Estable: <b>'+money(points.at(-1).mid)+'</b></span>'+
 '<span>Subida: <b>'+money(points.at(-1).good)+'</b></span>';
}
function render(){dataQuality();historyGraph();showCalc();scenarioGraph()}
async function newsFeed(){
 try{
  const r=await fetch('/api/news-radar',{cache:'no-store'});if(!r.ok)throw Error('Titulares no disponibles');
  const d=await r.json(),items=(d.items||[]).filter(x=>x.article_url&&x.headline).slice(0,6);
  $('newsFeed').innerHTML=items.length?items.map(x=>'<article><time>'+html(when(x.published_at))+' · '+html(x.source||'Fuente por revisar')+'</time><h3>'+html(x.headline)+'</h3><p>Recogido del radar automático. Comprueba la noticia original y su fecha antes de tomar decisiones.</p><a href="'+safeUrl(x.article_url)+'" target="_blank" rel="noopener noreferrer">Revisar noticia ↗</a></article>').join(''):'<p class="sub">No hay noticias recientes en el radar.</p>';
 }catch(e){$('newsFeed').innerHTML='<p class="sub">El radar de titulares no está disponible ahora.</p>'}
}
async function choose(){
 const key=$('product').value;chosenKey=key;current=all.find(x=>x.merchant+':'+x.external_id===key)||null;
 if(!current){notice('Selecciona un producto para ver el análisis');return;}
 match=matches.find(x=>x.pe?.merchant===current.merchant&&String(x.pe?.external_id)===String(current.external_id)&&x.es)||null;
 $('sale').value=match?.es?n(match.es.price).toFixed(2):'0';
 notice('Comprobando fuentes de '+current.merchant+'…');
 const url='/api/research?'+new URLSearchParams({merchant:current.merchant,id:current.external_id});
 const [a,b]=await Promise.allSettled([fetch(url,{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('Historial no disponible');return r.json()}),window.TCGStock.check(current,{fresh:true})]);
 report=a.status==='fulfilled'?a.value:null;
 if(key!==chosenKey)return;
 const s=b.status==='fulfilled'?b.value:null;
 notice(s?.exact?'Stock: '+s.maxQty+' unidades publicadas.':s?.available?'Disponible según tienda. El seguimiento no requiere cantidad exacta.':'Sin disponibilidad confirmada.',!s?.available);
 render();
}
async function init(){
 try{
  const [m,o,currency]=await Promise.all([
   fetch('/api/market',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('No se pueden leer las tiendas');return r.json()}),
   fetch('/api/opportunities',{cache:'no-store'}).then(r=>r.ok?r.json():{matches:[]}),
   fetch('/api/fx',{cache:'no-store'}).then(r=>r.ok?r.json():{status:'unavailable'}).catch(()=>({status:'unavailable'}))
  ]);
  all=(m.offers||[]).map(x=>({...x,price:n(x.price)}));
  matches=o.matches||[];fxMeta=currency;
  if(currency.status==='verified'&&n(currency.rate)>0){$('fx').value=n(currency.rate).toFixed(6);$('fxStatus').textContent='Revisión diaria: '+when(currency.checkedAt)+' · '+(currency.source||'fuente de cambio');}
  else{$('fx').value='';$('fxStatus').textContent='Sin tipo diario válido; no se calcula hasta verificarlo o introducir una tasa manual.';}
  notice('Selecciona un producto. Los precios corresponden a la última consulta documentada.');
  list();if(new URLSearchParams(location.search).has('product')&&$('product').value)choose();if(!$('product').value)$('metrics').innerHTML='<div class="metric">Sin productos con precios accesibles</div>';
 }catch(e){notice('No se pudieron cargar los datos: '+e.message,true)}
}
$('product').addEventListener('change',choose);
$('search').addEventListener('input',list);
for(const x of ['sale','fx','ship','fees','tax','other','storage','spread','discount'])$(x).addEventListener('input',()=>{if(x==='fx')$('fxStatus').textContent='Tipo de cambio modificado manualmente · no es una cotización validada';showCalc();scenarioGraph()});
for(const x of ['bad','mid','good','horizon'])$(x).addEventListener('input',scenarioGraph);
$('refresh').addEventListener('click',async()=>{if(!current)return init();await choose()});
setInterval(async()=>{if(current&&document.visibilityState==='visible'&&!busy){busy=true;try{await choose()}finally{busy=false}}},300000);
window.TCGStock?.onUpdate(()=>{if(current){dataQuality();showCalc()}});
init();newsFeed();
})();