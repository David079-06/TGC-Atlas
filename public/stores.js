(()=>{'use strict';
const $=s=>document.querySelector(s);
const AUTO_DISCOVERY_ENABLED=false; // Buscador pospuesto hasta la fase final
const h=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safe=x=>{try{const u=new URL(x);return u.protocol==='https:'?u.href:null}catch{return null}};
const fmt=x=>Number(x||0).toLocaleString('es-ES');
const time=x=>{if(!x)return 'Pendiente';const d=new Date(x);return Number.isNaN(d.getTime())?'Pendiente':d.toLocaleString('es-ES',{dateStyle:'short',timeStyle:'short'})};
const sourceDate=x=>/^\d{4}-\d{2}-\d{2}$/.test(String(x||''))?x.slice(8,10)+'/'+x.slice(5,7)+'/'+x.slice(0,4):time(x);
const countries={PE:['Perú',[-82.3,-18.8,-68,0.4]],ES:['España',[-10.1,35.5,4.6,44.1]],
MX:['México',[-119.5,13.5,-86.5,33]],CO:['Colombia',[-79.1,-4.7,-66.9,13.7]],
CL:['Chile',[-76.5,-56.5,-65.4,-17.2]],US:['Estados Unidos',[-126,24,-66.8,49.8]],
JP:['Japón',[129,30,146,46]],FR:['Francia',[-5.8,41,10.2,51.5]],DE:['Alemania',[5.4,47.2,15.3,55]],
GB:['Reino Unido',[-8.4,49.5,2.1,59]],AR:['Argentina',[-75,-56,-53,-21]]};
let shops=[],savedShops=[],cityPlaces=[],researchedShops=[],country='',city='',selected='',search='',filter='all',typeFilter='all',initialized=false,
 working=false,noticeTimer=null;
let siteChecks=new Map(),countryInvestigation=null,investigationToken=0,nextResearchPollAt=0;
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es');
const researchPhases={discover:'Buscando tiendas y fuentes',verify:'Comprobando webs y datos de comercios',finished:'Investigación de zonas finalizada'};
function renderCountryInvestigation(){
 const el=$('#store-investigation-status');if(!el)return;
 if(!AUTO_DISCOVERY_ENABLED||!country){el.hidden=true;el.innerHTML='';return}
 if(!window.TCGScanProgress)return;
 window.TCGScanProgress({el,countryName:countries[country]?.[0]||country,data:countryInvestigation,h,fmt,time});
}
async function loadCountryInvestigation(start=false,force=false){
 if(!AUTO_DISCOVERY_ENABLED){countryInvestigation=null;renderCountryInvestigation();return}
 if(!country){countryInvestigation=null;nextResearchPollAt=0;renderCountryInvestigation();return}
 const code=country,token=++investigationToken;
 try{
  const url='/api/country-investigation';
  const r=start?await fetch(url,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'start',country:code,force})}):await fetch(url+'?country='+encodeURIComponent(code),{credentials:'same-origin',cache:'no-store'});
  const data=await r.json();if(!r.ok)throw Error(data.error||'No se pudo consultar la investigación');
  if(country!==code||token!==investigationToken)return;
  const previous=countryInvestigation;
  countryInvestigation=data;renderCountryInvestigation();
  const due=Date.parse(data.job?.next_attempt||0),now=Date.now();
  const scanning=['queued','running','partial','limited'].includes(data.job?.status);
  const paused=Number.isFinite(due)&&due>now+60000;
  nextResearchPollAt=now+(scanning&&!paused?12000:120000);
  const oldQueue=previous?.verificationQueue||{},newQueue=data.verificationQueue||{};
  const changed=!!previous&&(previous.totalCandidates!==data.totalCandidates||
    previous.reviewed!==data.reviewed||previous.documented!==data.documented||
    oldQueue.done!==newQueue.done||oldQueue.retry!==newQueue.retry||
    oldQueue.running!==newQueue.running||oldQueue.failed!==newQueue.failed||
    previous.job?.cursor!==data.job?.cursor||
    previous.job?.checked_sites!==data.job?.checked_sites);
  if(start||data.started||changed)refreshResearch();
 }catch(e){if(country===code&&token===investigationToken){
  nextResearchPollAt=Date.now()+60000;
  countryInvestigation={job:{status:'limited',last_note:'El agente de investigación no está disponible ahora.',last_error:String(e.message||e)}};renderCountryInvestigation()
 }}
}
const matchesCity=s=>!city||(s.city&&norm(s.city)===norm(city))||(s.address&&norm(s.address).includes(norm(city)));
const inArea=s=>(!country||s.country===country)&&matchesCity(s);
const shownShops=()=>{
 const index=new Map(),knownSites=new Set(shops.filter(s=>s.selected&&s.website).map(s=>s.country+'|'+norm(s.name)+'|'+safe(s.website))),savedIds=new Set(shops.filter(s=>s.selected).map(s=>s.id));
 for(const s of [...shops,...researchedShops,...cityPlaces]){
  if(!inArea(s)||index.has(s.id))continue;
  if(['osm','researched'].includes(s.discovery)&&savedIds.has('saved-'+s.id))continue;
  if(['osm','researched'].includes(s.discovery)&&s.website&&knownSites.has(s.country+'|'+norm(s.name)+'|'+safe(s.website)))continue;
  index.set(s.id,s);
 }
 return [...index.values()];
};
let discoverStatus='',coverage=null,areaToken=0,researchPages=1,lastListMarkup='';
function updateStoreList(node,markup){
 if(lastListMarkup===markup&&node.childElementCount)return;
 lastListMarkup=markup;
 const template=document.createElement('template');
 template.innerHTML=markup;
 const previous=new Map([...node.querySelectorAll(':scope > [data-store]')].map(el=>[el.dataset.store,el]));
 const fragment=document.createDocumentFragment();
 for(const fresh of [...template.content.children]){
  const current=fresh.dataset.store?previous.get(fresh.dataset.store):null;
  if(current&&current.outerHTML===fresh.outerHTML){fragment.appendChild(current);continue}
  if(!current&&fresh.dataset.store){
   fresh.classList.add('just-added');
   fresh.addEventListener('animationend',()=>fresh.classList.remove('just-added'),{once:true});
  }
  fragment.appendChild(fresh);
 }
 const scroll=node.scrollTop;
 node.replaceChildren(fragment);
 node.scrollTop=scroll;
}
async function refreshResearch(triggerPlace=null){
 if(!AUTO_DISCOVERY_ENABLED)triggerPlace=null;
 if(!country){researchedShops=[];coverage=null;renderList();return}
 const token=++areaToken,where={country,city};
 if(triggerPlace){
  discoverStatus='Investigación por zonas solicitada. Mostrando las fuentes disponibles mientras se revisan otras.';
  renderList();
 }
 try{
  let result;
  if(triggerPlace){
   const request={action:'start',country,city};
   if(city&&Number.isFinite(triggerPlace.lat)&&Number.isFinite(triggerPlace.lon)){
    request.lat=triggerPlace.lat;request.lon=triggerPlace.lon;
   }
   const r=await fetch('/api/discovery',{method:'POST',credentials:'same-origin',
    headers:{'Content-Type':'application/json'},body:JSON.stringify(request)});
   result=await r.json();if(!r.ok)throw Error(result.error||'No se pudo iniciar la investigación');
  }else{
   let combined=[];
   for(let page=1;page<=researchPages;page++){
    const r=await fetch('/api/discovery?'+new URLSearchParams({...where,page}),{credentials:'same-origin',cache:'no-store'});
    const data=await r.json();if(!r.ok)throw Error(data.error||'No se pudo recuperar la investigación');
    if(page===1)result=data;
    combined.push(...(data.shops||[]));
    if(combined.length>=Number(data.total||0))break;
   }
   result.shops=[...new Map(combined.map(x=>[x.id,x])).values()];
  }
  if(token!==areaToken||country!==where.country||city!==where.city)return;
  coverage=result;
  researchedShops=(result.shops||[]).map(v=>({...v,discovery:'researched',typeLabel:v.shop_kind||'Comercio local',
   badge:v.trust?.level||'yellow',selected:false,siteCheck:siteChecks.get(v.id)||null,scanStatus:'not_registered',approvedHost:false,
   storeType:v.store_type||'physical',products:0,pokemon:0,other:0,preorders:0,unclassified:0}));
  const times=result.areas?.length||0;
  discoverStatus=fmt(result.total)+' comercios candidatos documentados; '+fmt(result.pokemonIndicated)+' con indicios de Pokémon TCG. ' +
   (result.total>researchedShops.length?'Mostrando '+fmt(researchedShops.length)+'; puedes cargar más. ':'')+
   'La búsqueda y la revisión avanzan arriba. Cobertura limitada a las fuentes disponibles.';
  renderList();renderRecs();if(selected&&researchedShops.some(x=>x.id===selected))renderDetail();window.TCGLocation?.updateOptions({shops:shownShops()});
  // El trabajo remoto es independiente de la navegación y tiene sus propios límites.
  if(result.added>0){
   fetch('/api/discovery-run',{method:'POST',credentials:'same-origin'}).then(()=>setTimeout(()=>{
    if(country===where.country&&city===where.city)refreshResearch();
   },900)).catch(()=>{});
  }
 }catch(e){
  if(token!==areaToken)return;
  discoverStatus='No fue posible continuar la investigación ahora: '+String(e.message||e);
  renderList();
 }
}

function chooseLocation(place){
 const next=String(place.code||'').toUpperCase();
 if(next&&!countries[next])return;
 const changed=next!==country,oldCity=city;
 country=next;city=place.city||'';search='';selected='';
 cityPlaces=[];researchedShops=[];coverage=null;discoverStatus='';countryInvestigation=null;researchPages=1;++areaToken;++investigationToken;
 if(changed){shell();if(place.city&&Number.isFinite(place.lat)&&Number.isFinite(place.lon))requestAnimationFrame(()=>window.TCGLocation?.flyTo(place))}
 else{
  const input=$('#store-search');if(input)input.value='';
  const countryInput=$('#store-country');if(countryInput)countryInput.value=country;
  window.TCGLocation?.updateCountry(country,city,place);
  renderList();renderRecs();renderDetail();
 }
 if(country){refreshResearch();if(AUTO_DISCOVERY_ENABLED)loadCountryInvestigation(true)}
 if(city)renderList();
}
function chooseStoreBySuggestion(id){
 const shop=[...shops,...researchedShops,...cityPlaces].find(s=>s.id===id);if(!shop)return;
 const changed=shop.country!==country;
 country=shop.country;city='';search='';selected=id;
 if(changed)shell();else{
  const input=$('#store-search');if(input)input.value='';
  window.TCGLocation?.updateCountry(country,'');
  renderDetail();
 }
 if(mobileScreen())requestAnimationFrame(()=>jumpTo('#store-detail'));
}

const selectedStore=()=>shownShops().find(s=>s.id===selected)||null;
const mobileScreen=()=>window.matchMedia('(max-width: 800px)').matches;
function jumpTo(selector){
 const node=document.querySelector(selector);if(!node)return;
 const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 node.scrollIntoView({behavior:reduced?'auto':'smooth',block:'start'});
}
function note(msg){const el=$('#store-notice');if(!el)return;el.textContent=msg;clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>{if(el.textContent===msg)el.textContent=''},8500)}
function trustOf(s){
 return s?.trust||{level:'yellow',label:'Pendiente de comprobación',summary:'No hay evidencias suficientes para evaluar este comercio.',positives:[],cautions:['Comprobar identidad, condiciones de compra y opiniones externas.'],sources:[],review:null,recommended:false,confidence:'no evaluada'};
}
function badge(s){
 const t=trustOf(s),style=t.level==='green'?'good':t.level==='red'?'risk':'warn';
 return '<span class="store-tag '+style+'" title="Nivel de evidencias; nunca una garantía de compra">'+h(t.label)+'</span>';
}
function scanState(s){
 const states={ok:'Actualizada',partial:'Lectura parcial',failed:'Error de lectura',blocked:'Acceso limitado',
 running:'Recopilando',queued:'Pendiente de primera lectura',not_supported:'Conector pendiente',not_added:'Disponible para añadir',not_registered:'Descubierta en OSM',old:'Datos antiguos',pending:'Pendiente'};
 return states[s.scanStatus]||'Pendiente';
}
const mapSrc=()=> 'https://www.openstreetmap.org/export/embed.html?'+new URLSearchParams({bbox:(countries[country]?.[1]||[-180,-60,180,85]).join(','),layer:'mapnik'});
function shell(){
 const el=$('#store-app');if(!el)return;
 window.TCGLocation?.clearMap();
 el.innerHTML='<div class="stores-toolbar"><div><label for="store-country">País</label><select id="store-country">'+
 '<option value=""'+(!country?' selected':'')+'>🌐 Todos los países</option>'+Object.entries(countries).sort((a,b)=>a[1][0].localeCompare(b[1][0],'es')).map(([code,v])=>'<option value="'+code+'"'+(code===country?' selected':'')+'>'+h(v[0])+'</option>').join('')+'</select></div>'+
 '<div class="store-searchbox"><label for="store-search">Buscar país, ciudad o tienda</label><input id="store-search" type="search" placeholder="Ej. Salamanca, Lima, Noraku…" value="'+h(search)+'" autocomplete="off" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="store-suggestions"><div id="store-suggestions" class="geo-suggestions" role="listbox" hidden></div></div>'+
 '<button type="button" class="store-refresh" id="store-refresh">↻ Actualizar información</button>'+
 '<details class="store-register"><summary>+ Añadir tienda real</summary><form id="store-form">'+
 '<label>Dirección web HTTPS<input type="url" name="website" required placeholder="https://tienda.com/"></label>'+
 '<label>Nombre comercial (opcional si ya tiene conector)<input name="name" maxlength="110" placeholder="Ej. Mi tienda de cartas"></label><label>País de la tienda<select id="store-form-country" name="shop_country" required><option value="">Selecciona país</option>'+Object.entries(countries).sort((a,b)=>a[1][0].localeCompare(b[1][0],"es")).map(([code,v])=>'<option value="'+code+'"'+(country===code?' selected':'')+'>'+h(v[0])+'</option>').join('')+'</select></label>'+ 
 '<button type="submit">Añadir y comprobar</button><p>Algunas tiendas tienen conectores aprobados y se importarán al añadirlas. Las demás quedan registradas para integrar su API sin rastreos inseguros.</p></form></details></div>'+
 '<div class="store-location-active"><span id="store-location-selection">'+(country?'🌍 '+h(countries[country][0]):'🌐 Todos los países')+'</span><button type="button" id="store-clear-location" title="Quitar filtro de ciudad">Quitar filtro de ciudad</button><button type="button" id="store-world">← Ver mundo</button></div>'+ 
 '<div id="store-investigation-status" class="store-investigation-status" role="status" aria-live="polite"></div><div class="store-layout"><div class="store-map-column"><div class="store-map-head"><span>SELECCIONA UN PAÍS O UNA CIUDAD</span><span id="store-map-country">'+h(countries[country]?.[0]||'Mundo')+'</span></div>'+
 '<div id="store-map" role="application" aria-label="Mapa interactivo para seleccionar país o ciudad"></div><iframe id="store-map-fallback" title="Mapa de '+h(countries[country]?.[0]||'Mundo')+'" hidden loading="lazy" data-src="'+mapSrc()+'"></iframe>'+
 '<div class="geo-map-hint" id="store-map-help" aria-live="polite">Pulsa en el mapa: país con zoom lejano, ciudad al acercarte.</div>'+
 '<div class="map-bottom"><span id="store-map-note">Mapa general. Solo se ubicarán negocios con dirección presencial acreditada.</span><a id="store-map-link" target="_blank" rel="noopener noreferrer" href="https://www.openstreetmap.org/">Abrir mapa ↗</a></div></div>'+
 '<div class="store-list-column"><div class="store-list-head"><div><b>Tiendas en '+h(countries[country]?.[0]||'el mundo')+'</b><small id="store-count"></small></div>'+
 '<div class="store-list-filters"><select id="store-type-filter"><option value="all">Online y físicas</option><option value="online">Solo online</option><option value="physical">Solo físicas</option><option value="hybrid">Mixtas</option></select><select id="store-filter"><option value="all">Todas</option><option value="followed">Mis tiendas</option><option value="osm">Descubiertas</option><option value="corroborated">Identidad corroborada</option><option value="caution">Con precaución</option><option value="risk">Riesgo documentado</option></select></div></div>'+
 '<div id="store-list" class="store-list"></div><div id="store-discovery-status" class="store-discovery-status"></div></div></div>'+
 '<div class="stores-recommendations"><div class="stores-section-head"><div><div class="eyebrow">FIABILIDAD DOCUMENTADA</div><h2>Identidad comercial corroborada</h2><p>Tiendas con referencias documentales coincidentes. Esta sección no certifica pagos, pedidos ni entregas.</p></div></div><div class="trust-legend"><span class="trust-dot good">●</span>Identidad corroborada <span class="trust-dot warn">●</span>Precaución / aún no recomendada <span class="trust-dot risk">●</span>Riesgo grave documentado</div>'+
 '<p class="store-audit-status" id="store-audit-status" role="status" aria-live="polite">Selecciona un país para comprobar las webs de los comercios conocidos. La identidad y las reseñas se contrastan con fuentes independientes.</p><div class="store-recs" id="store-recs"></div></div><section id="store-detail" class="store-detail"></section>'+
 '<div id="store-notice" class="store-notice" role="status" aria-live="polite"></div>';
 renderList();renderRecs();renderDetail();renderCountryInvestigation();
 window.TCGLocation?.mount({
  countries,country,city,shops:shownShops(),
  onSelect:chooseLocation,
  onShop:chooseStoreBySuggestion,
  onCountries:entries=>{
   const select=$('#store-country');if(!select)return;
   const prev=country;
   select.innerHTML='<option value="">🌐 Todos los países</option>'+Object.entries(entries)
    .sort((a,b)=>a[1][0].localeCompare(b[1][0],'es'))
    .map(([code,v])=>'<option value="'+code+'">'+h(v[0])+'</option>').join('');
   select.value=prev;
   const registration=$('#store-form-country');if(registration){const old=registration.value||prev;registration.innerHTML='<option value="">Selecciona país</option>'+Object.entries(entries).sort((a,b)=>a[1][0].localeCompare(b[1][0],'es')).map(([code,v])=>'<option value="'+code+'">'+h(v[0])+'</option>').join('');registration.value=old;}
  },
  onQuery:q=>{search=q;renderList();renderRecs()}
 });
}
function renderList(){
 const all=shownShops().filter(s=>{
  if(typeFilter==='physical'&&!['physical','hybrid'].includes(s.storeType))return false;
  if(typeFilter==='online'&&!['online','hybrid'].includes(s.storeType))return false;
  if(typeFilter==='hybrid'&&s.storeType!=='hybrid')return false;
  if(filter==='followed'&&!s.selected)return false;
  if(filter==='known')return false;
  if(filter==='osm'&&!['osm','researched'].includes(s.discovery))return false;
  if(filter==='corroborated'&&trustOf(s).level!=='green')return false;
  if(filter==='caution'&&trustOf(s).level!=='yellow')return false;
  if(filter==='risk'&&trustOf(s).level!=='red')return false;
  return !search||norm(s.name+' '+(s.city||'')+' '+(countries[s.country]?.[0]||'')).includes(norm(search));
 }).sort((a,b)=>Number(b.selected)-Number(a.selected)||
   ({green:2,yellow:1,red:0}[trustOf(b).level]||0)-({green:2,yellow:1,red:0}[trustOf(a).level]||0)||
   Number(!!trustOf(b).checkedAt)-Number(!!trustOf(a).checkedAt)||
   (Date.parse(b.last_seen||b.lastSeen||0)||0)-(Date.parse(a.last_seen||a.lastSeen||0)||0)||
   a.name.localeCompare(b.name,'es'));
 const node=$('#store-list');if(!node)return;
 const area=city?' en '+city:country?' en '+(countries[country]?.[0]||country):' en todos los países';
 $('#store-count').textContent=all.length+' comercios'+area;
 const summary=$('#store-discovery-status');
 if(summary){summary.innerHTML=h(!AUTO_DISCOVERY_ENABLED?
 (country==='PE'?'Selección provisional: Okamidex y La Mazmorra TCG. El buscador automático está pausado.':
 'Buscador automático pausado hasta terminar el resto de la aplicación. Se muestran los datos existentes.'):
 (discoverStatus||(city?'La exploración de esta ciudad se ejecuta por zonas. Las tiendas online sin ciudad registrada aparecen en el nivel de país.':'Fuentes disponibles: tiendas incorporadas, conectores revisados e investigación geográfica parcial.')))+
 (AUTO_DISCOVERY_ENABLED&&country?' <span class="store-autoscan-label"><span class="store-autoscan-dot"></span>Actualización automática</span>':'')+
 (country&&coverage?.total>researchedShops.length?' <button type="button" id="store-more">Mostrar más tiendas ('+fmt(coverage.total-researchedShops.length)+' restantes)</button>':'');}
 const markup=all.length?all.map(s=>{
  const source=['osm','researched'].includes(s.discovery)?'· <span class="source-tag">Temporal · '+h(s.source||'Fuente pública')+'</span>':
   s.discovery==='known_connector'?'· <span class="source-tag">Conector disponible</span>':
   '· <span class="source-tag">Guardada</span>';
  const labels=s.storeType==='physical'?'Física':s.storeType==='hybrid'?'Online y física':'Online';
  const trust=trustOf(s);
  const reviewed=!!trust.checkedAt;
  const pendingState={queued:'En cola de verificación',running:'Verificando ahora',
   retry:'Reintento programado',failed:'Sin completar · requiere revisión'};
  const stage=reviewed?(trust.level==='green'?'Identidad y actividad respaldadas':
   trust.level==='red'?'Riesgo respaldado por fuentes':'Expediente incompleto · comprobar fuentes'):
   (pendingState[s.queueStatus]||'Pendiente de documentación');
  const stageClass=reviewed?'checked':'pending';
  return '<button type="button" data-store="'+h(s.id)+'" class="store-item'+(selected===s.id?' current':'')+'" aria-pressed="'+(selected===s.id)+'">'+
   '<span class="store-item-row"><strong>'+h(s.name)+'</strong>'+badge(s)+'</span>'+
   '<span class="store-item-description">'+h(s.city||s.country)+' · '+h(labels)+' '+source+'</span>'+
   '<span class="store-review-stage '+stageClass+'"><span class="store-stage-dot" aria-hidden="true"></span>'+h(stage)+(reviewed?' · '+h(time(trust.checkedAt)):'')+'</span>'+
   '<span class="store-item-meta trust-list-meta"><span>'+h(trust.summary||'Identidad pendiente de contrastar')+'</span>'+
   (trust.review?'<span>★ '+Number(trust.review.rating).toFixed(1)+' / 5 · '+fmt(trust.review.count)+' opiniones</span>':'')+
   '</span></button>';
 }).join(''):'<div class="store-empty">'+
  (city?'Todavía no hay comercios documentados para '+h(city)+'. Puedes añadir tiendas reales por URL.':
  'Aún no hay resultados en este filtro. La búsqueda seguirá incorporando tiendas a medida que las encuentre.')+'</div>';
 updateStoreList(node,markup);
}
function renderRecs(){
 const target=$('#store-recs');if(!target)return;
 const verified=shownShops().filter(s=>trustOf(s).level==='green')
  .sort((a,b)=>Number(trustOf(b).review?.count||0)-Number(trustOf(a).review?.count||0)).slice(0,8);
 if(!verified.length){
  target.innerHTML='<p class="store-empty">Todavía no hay comercios de esta zona con identidad respaldada por suficientes fuentes externas. Un catálogo disponible no es prueba de seguridad.</p>';
  return;
 }
 target.innerHTML=verified.map((s,i)=>{
  const t=trustOf(s);
  return '<button type="button" class="store-rec trust-rec" data-store="'+h(s.id)+'">'+
   '<span class="store-rec-num">'+String(i+1).padStart(2,'0')+'</span>'+
   '<span class="trust-rec-content"><b>'+h(s.name)+'</b><small>'+h(s.city||s.country)+' · '+h(t.label)+'</small>'+
   '<span class="trust-rec-note">'+h(t.summary)+'</span></span>'+
   '<span class="trust-rec-rating">'+(t.review?'★ '+Number(t.review.rating).toFixed(1)+'/5 <small>'+fmt(t.review.count)+' opiniones</small>':'Identidad respaldada<small>Compra no certificada</small>')+'</span></button>';
 }).join('');
}
function updateMap(s){
 const text=$('#store-map-note'),link=$('#store-map-link');if(!text||!link)return;
 const loc=s?.address&&(s.addressType==='physical'||s.addressType==='pickup');
 text.textContent=loc?'Dirección publicada: '+s.address+(s.addressType==='pickup'?' (recogida)':''):'Mapa general; no se inventan ubicaciones de tiendas';
 link.href=loc?'https://www.openstreetmap.org/search?query='+encodeURIComponent(s.address):'https://www.openstreetmap.org/';
}
function storeTypeLabel(s,t){
 const kind=t.verification?.storeType||'unknown',external=!!t.verification?.independentPhysicalLocation;
 if(kind==='hybrid')return external?'Online y física · local contrastado':'Online y física · declarado por web';
 if(kind==='physical')return external?'Física · local contrastado':'Física · local sin corroborar';
 if(kind==='online')return 'Online · actividad publicada';
 return s.storeType==='physical'?'Comercio físico según fuente · por confirmar':
  'Modalidad de venta pendiente de comprobar';
}
function detailEvidence(s){
 const t=trustOf(s),reg=t.registration||{},technical=t.verification||{};
 const sourceLinks=(t.sources||[]).filter(x=>safe(x.url));
 const list=(entries,fallback)=>entries?.length?entries.map(x=>'<li>'+h(x)+'</li>').join(''):
  '<li>'+h(fallback)+'</li>';
 const locations=(t.locations||[]).length?t.locations:[];
 const addresses=locations.length?locations.map((loc,i)=>'<div class="store-audit-location">'+
  '<div><strong>Local '+(i+1)+' · '+h(loc.district||loc.city||'Ubicación publicada')+'</strong>'+
  '<span class="store-audit-location-status '+(loc.corroborated?'confirmed':'declared')+'">'+
   h(loc.corroborated?'Coincidencia con fuente externa':'Declarado por la tienda; contraste pendiente')+'</span></div>'+
  '<p>'+h(loc.address||'Dirección no indicada')+'</p>'+
  (loc.schedule?'<small>'+h(loc.schedule)+'</small>':'')+
  '</div>').join(''):
  '<p>'+h(s.address||'La ubicación física no está documentada')+
   '<small>Una dirección fiscal o una ubicación en mapas no confirma por sí sola un local abierto al público.</small></p>';
 const registration=reg.identifier?
  '<strong>'+h(reg.name||'Titular registrado')+'</strong>'+
  '<span>'+h((s.country==='PE'?'RUC: ':'Identificador: ')+reg.identifier)+'</span>'+
  '<span>'+h(reg.officialChecked?'Contrastado con registro oficial':'Datos registrados en fuente secundaria; verificación oficial pendiente')+'</span>'+
  (safe(reg.officialCheckUrl)?'<a href="'+safe(reg.officialCheckUrl)+'" target="_blank" rel="noopener noreferrer">Consultar el registro oficial ↗</a>':''):
  '<span>Razón social y registro todavía no corroborados.</span>'+((reg.publishedIdentifiers||[]).length?'<small>Identificadores detectados en la web (no verificados): '+h(reg.publishedIdentifiers.join(', '))+'</small>':'');
 const contact=t.contact||{};
 const contactHtml=(contact.email?'<span>'+h(contact.email)+'</span>':'')+
  (contact.phone?'<span>'+h(contact.phone)+'</span>':'')+
  (!contact.email&&!contact.phone?'<span>'+h(s.phone||'No se ha contrastado contacto directo')+'</span>':'');
 const sourceHtml=sourceLinks.length?sourceLinks.map(x=>
  '<div class="store-audit-source"><div><span class="store-audit-kind">'+
  h(x.type==='comercio'?'Declaración del comercio':x.type==='oficial'?'Organismo público':'Fuente externa')+
  '</span><strong>'+h(x.label||x.publisher)+'</strong></div>'+
  '<p>'+h(x.finding||'Consultar la referencia original para conocer el dato respaldado')+'</p>'+
  '<div><a target="_blank" rel="noopener noreferrer" href="'+safe(x.url)+'">Ver fuente original ↗</a>'+
  (x.checkedAt?'<small>Consultada: '+h(sourceDate(x.checkedAt))+'</small>':'')+'</div></div>').join(''):
  '<p>No hay referencias externas verificadas para esta tienda.</p>';
 const technicalLine=technical.websiteCheckedAt?
  (technical.technicalStatus==='accessible'?'Web accesible al comprobarla':
    'Accesibilidad de la web no concluyente')+' · '+time(technical.websiteCheckedAt):
  'Web aún sin comprobación técnica reciente';
 const typeLabel=storeTypeLabel(s,t);
 const discovered=s.discovery==='researched'||s.discovery==='osm';
 const primaryAction=discovered?'<button type="button" data-action="add-candidate">＋ Añadir a Mis tiendas</button>':
  s.discovery==='known_connector'?'<button type="button" data-action="add-known">＋ Añadir tienda</button>':
  (s.selected?'<span class="store-audit-saved">✓ En Mis tiendas</span>':
    '<button type="button" data-action="follow">＋ Seguir tienda</button>');
 const linkHtml=safe(s.website)?'<a href="'+safe(s.website)+'" target="_blank" rel="noopener noreferrer">Visitar web ↗</a>':'';
 const recheck=safe(s.website)?'<button type="button" data-action="verify-site" class="store-audit-check">↻ Comprobar web</button>':'';
 const checked=t.checkedAt?time(t.checkedAt):'Sin expediente documental completo';
 return '<div class="store-detail-head"><div><div class="eyebrow">EXPEDIENTE DE TIENDA · '+h(s.country)+'</div>'+
  '<h2>'+h(s.name)+'</h2><div class="store-tags">'+badge(s)+
  '<span class="store-tag subtle">'+h(typeLabel)+'</span></div></div>'+
  '<div class="store-detail-actions"><button type="button" class="store-back" data-action="back">← Volver</button>'+
  primaryAction+recheck+linkHtml+'</div></div>'+
  '<div class="trust-verdict '+(t.level==='green'?'trust-positive':t.level==='red'?'trust-negative':'trust-caution')+'">'+
   '<strong>'+h(t.label)+'</strong><p>'+h(t.summary)+'</p>'+
   '<small>Última comprobación documental: '+h(checked)+
   '. No certifica pagos, autenticidad del inventario ni entregas.</small></div>'+
  '<div class="store-audit-overview">'+
   '<div><span>Actividad comercial</span><strong>'+h(typeLabel)+'</strong></div>'+
   '<div><span>Fuentes distintas</span><strong>'+fmt(technical.independentSources||0)+'</strong></div>'+
   '<div><span>Registro oficial</span><strong>'+h(reg.officialChecked?'Consultado':'Pendiente')+'</strong></div>'+
   '<div><span>Estado técnico</span><strong>'+h(technical.technicalStatus==='accessible'?'Web accesible':technical.technicalStatus==='unavailable'?'Sin respuesta':'Sin comprobar')+'</strong></div>'+
  '</div>'+
  '<div class="store-audit-section-grid">'+
   '<section><h3>Identidad y registro</h3><div class="store-audit-facts">'+registration+'</div>'+
   '<h3>Contactos publicados</h3><div class="store-audit-facts">'+contactHtml+'</div></section>'+
   '<section><h3>Locales y puntos de atención</h3>'+addresses+'</section>'+
  '</div>'+
  '<div class="store-audit-section-grid">'+
   '<section><h3>Datos respaldados</h3><ul>'+list(t.positives,'Faltan evidencias independientes.')+'</ul></section>'+
   '<section><h3>Limitaciones y precauciones</h3><ul>'+list(t.cautions,'Las condiciones de compra no se han auditado completamente.')+'</ul></section>'+
  '</div>'+
  '<section class="store-audit-technical"><h3>Comprobación técnica independiente de la etiqueta</h3>'+
  '<p>'+h(technicalLine)+'.</p>'+ 
  '<p>Secciones comprobadas: '+fmt(technical.checkedPages?.length||0)+
  ' · contacto '+h(technical.contactPageFound?'consultado':'no encontrado')+
  ' · condiciones '+h(technical.termsPageFound?'consultadas en la web':technical.termsDocumented?'documentadas en fuentes':'sin comprobar')+'.</p>'+
  (technical.websiteError?'<p class="research-error">'+h(technical.websiteError)+'</p>':'')+
  '<p>Que la web cargue, acepte pagos o publique stock no demuestra por sí solo fiabilidad comercial.</p></section>'+
  '<section class="store-audit-sources"><div><h3>Pruebas y procedencia</h3><p>Consulta las referencias originales. Varias páginas de un mismo comercio no son pruebas independientes.</p></div>'+
  '<div class="store-audit-source-grid">'+sourceHtml+'</div></section>'+
  '<div class="trust-footer-note">La misma evaluación documental se aplica a todos los países. Si falta evidencia, aparece precaución; un fallo de conexión no cambia una identidad corroborada.</div>';
}
function renderDetail(){
 const el=$('#store-detail');if(!el)return;
 const s=selectedStore();updateMap(s);
 if(!s){el.innerHTML='<div class="store-empty"><b>Selecciona una tienda para ver sus pruebas.</b><p>Se mostrarán identidad, ubicaciones, datos legales, fuentes y limitaciones documentadas.</p></div>';return}
 el.innerHTML=detailEvidence(s);
}
function renderOsmDetail(s){
 const el=$('#store-detail');if(el)el.innerHTML=detailEvidence(s);
}
async function loadCountryOptions(){
 try{
  const r=await fetch('/api/country-options',{credentials:'same-origin'});
  if(!r.ok)return;
  const data=await r.json();
  for(const item of data.countries||[]){
   if(!/^[A-Z]{2}$/.test(item.code)||countries[item.code])continue;
   const lat=Number(item.lat),lon=Number(item.lon);
   const bounds=item.lat!==null&&item.lon!==null&&Number.isFinite(lat)&&Number.isFinite(lon)?[lon-1.2,lat-1.2,lon+1.2,lat+1.2]:null;
   countries[item.code]=[item.name||item.code,bounds];
  }
 }catch(e){}
}
async function getStores(){
 const response=await fetch('/api/stores?compact=1',{cache:'no-store',credentials:'same-origin'});
 if(!response.ok)throw Error('No se pudo consultar Mis tiendas');
 const data=await response.json();
 savedShops=(data.shops||[]).filter(s=>s.selected===true);
 shops=savedShops;
 for(const s of shops)s.siteCheck=siteChecks.get(s.id)||null;
 if(selected&&!shownShops().some(s=>s.id===selected))selected='';
}
async function refresh({full=false}={}){
 await getStores();
 if(full)shell();else{window.TCGLocation?.updateOptions({shops:shownShops()});renderList();renderRecs();renderDetail()}
}
async function post(url,body){
 const r=await fetch(url,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 const data=await r.json().catch(()=>({}));
 if(!r.ok)throw Object.assign(new Error(data.error||data.message||'Error de servidor'),{details:data,status:r.status});
 return data;
}
async function scan(id,initial=false){
 const s=shops.find(x=>x.id===id);
 const button=$('#store-sync');
 if(button){button.disabled=true;button.textContent='Recopilando catálogo…'}
 note('Consultando la API pública de '+(s?.name||'la tienda')+'. Se mantendrán los datos válidos si hay algún bloqueo.');
 try{
  const data=await post('/api/store-sync',{id,initial});
  await getStores();if(selected===id)renderDetail();else{renderList();renderRecs()}
  note('Conexión actualizada. La comprobación de la fuente se ha completado; los productos se gestionarán en otro apartado.');
 }catch(e){
  await getStores();if(selected===id)renderDetail();else renderList();
  note('La lectura no se completó: '+e.message+'. Los precios anteriores, si existen, no se han eliminado.');
 }
}
async function onAction(fn){if(working)return;working=true;try{await fn()}catch(e){note(e.message||String(e))}finally{working=false}}
function wire(){
 const container=$('#store-app');
 container.addEventListener('change',e=>{
  if(e.target.id==='store-country'){chooseLocation({code:e.target.value,city:null})}
  if(e.target.id==='store-filter'){filter=e.target.value;renderList()}
  if(e.target.id==='store-type-filter'){typeFilter=e.target.value;renderList()}
 });
 container.addEventListener('click',e=>{
  const row=e.target.closest('[data-store]');
  if(row){selected=row.dataset.store;renderDetail();if(mobileScreen())requestAnimationFrame(()=>jumpTo('#store-detail'));return}
  if(e.target.closest('#store-world')){chooseLocation({code:'',city:null});return}
  if(e.target.closest('#store-discover')){
   if(country){refreshResearch();loadCountryInvestigation();}return;
  }
  if(e.target.closest('#store-more')){researchPages=Math.min(25,researchPages+1);refreshResearch();return;}
  if(e.target.closest('#store-research-again')){loadCountryInvestigation(true,true);return}
  if(e.target.closest('#store-refresh')){onAction(async()=>{await refresh();if(country){await loadCountryInvestigation();await refreshResearch()}note('Datos del directorio actualizados')});return}
  const b=e.target.closest('[data-action]');if(!b)return;
  if(b.dataset.action==='back'){jumpTo('.store-list-column');return}
  const s=selectedStore();if(!s)return;
  if(b.dataset.action==='verify-site'){
   onAction(async()=>{
    note('Comprobando la web pública de '+s.name+' sin modificar las pruebas independientes…');
    const response=await post('/api/store-verification',{action:'check_web',id:s.id});
    await getStores();
    if(country)await refreshResearch();
    renderList();renderRecs();renderDetail();
    note(response.message||'Comprobación realizada; consulta las pruebas y la fecha de la ficha.');
   });
   return;
  }
  if(b.dataset.action==='add-known'||b.dataset.action==='add-osm'){
   onAction(async()=>{
    if(!safe(s.website))throw Error('Esta tienda no tiene una web verificable');
    const result=await post('/api/stores',{action:'register',website:s.website,country:s.country,name:s.name,discoveredId:['osm','researched'].includes(s.discovery)?s.id:null});
    selected=result.id;country=result.country||country;city='';await refresh({full:true});note(result.message);
    if(result.importAvailable)scan(result.id,true);
   });return;
  }
  if(b.dataset.action==='add-candidate'){
   onAction(async()=>{
    const result=await post('/api/stores',{action:'add_candidate',country:s.country,id:s.id});
    selected=result.id;await getStores();await refreshResearch();renderDetail();renderList();renderRecs();
    note(result.message||'Tienda añadida a Mis tiendas');
   });return;
  }
  if(b.dataset.action==='sync'){scan(s.id,!s.lastScanFinished);return}
  if(b.dataset.action==='remove'){
   if(!confirm('¿Eliminar '+s.name+' y su catálogo guardado de tu directorio?'))return;
   onAction(async()=>{await post('/api/stores',{action:'delete',id:s.id});selected='';await refresh();note('Tienda eliminada')});
  }else if(b.dataset.action==='follow'){
   onAction(async()=>{await post('/api/stores',{action:'follow',id:s.id,followed:!s.selected});await refresh();note('Seguimiento actualizado')});
  }
 });
 container.addEventListener('submit',e=>{
  if(e.target.id!=='store-form')return;
  e.preventDefault();
  const f=e.target,data=new FormData(f),url=String(data.get('website')||''),name=String(data.get('name')||''),chosenCountry=String(data.get('shop_country')||country);
  onAction(async()=>{
   const saved=await post('/api/stores',{action:'register',country:chosenCountry,website:url,name});
   country=saved.country||country;selected=saved.id;city='';search='';
   await refresh({full:true});note(saved.message);
   if(mobileScreen())requestAnimationFrame(()=>jumpTo('#store-detail'));
   if(saved.importAvailable)scan(saved.id,!shops.find(s=>s.id===saved.id)?.lastScanFinished);
  });
 });
}
async function init(){
 if(initialized||!$('#store-app'))return;initialized=true;
 wire();
 await loadCountryOptions();
 let loadError=null;
 try{await getStores()}catch(e){loadError=e;shops=[];savedShops=[]}
 shell();
 if(loadError)note('No se pudieron recuperar Mis tiendas. Puedes seguir investigando países; se volverá a intentar automáticamente: '+String(loadError.message||loadError));
 // El estado se actualiza sin intervención del usuario y sin recargar el mapa.
 setInterval(()=>{
  if(!AUTO_DISCOVERY_ENABLED||document.visibilityState==='hidden'||!country||Date.now()<nextResearchPollAt)return;
  nextResearchPollAt=Date.now()+15000;
  loadCountryInvestigation();
 },10000);
 // La base de tiendas guardadas se consulta con menor frecuencia; el escaneo no depende de ella.
 setInterval(()=>{
  if(document.visibilityState==='hidden'||working)return;
  getStores().then(()=>{window.TCGLocation?.updateOptions({shops:shownShops()});renderList();renderRecs();}).catch(()=>{});
 },180000);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();