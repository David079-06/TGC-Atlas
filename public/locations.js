(()=>{'use strict';
const normalize=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es').trim();
const $=s=>document.querySelector(s);
const defaults={
 ES:[['Madrid',40.4168,-3.7038],['Barcelona',41.3874,2.1686],['Salamanca',40.9701,-5.6635],['Valencia',39.4699,-0.3763],['Sevilla',37.3891,-5.9845],['Málaga',36.7213,-4.4214],['Zaragoza',41.6488,-0.8891],['Bilbao',43.263,-2.935]],
 PE:[['Lima',-12.0464,-77.0428],['Arequipa',-16.3988,-71.5369],['Cusco',-13.5319,-71.9675],['Trujillo',-8.1116,-79.0287],['Piura',-5.1945,-80.6328],['Chiclayo',-6.7714,-79.8409]],
 MX:[['Ciudad de México',19.4326,-99.1332],['Guadalajara',20.6597,-103.3496],['Monterrey',25.6866,-100.3161]],
 CO:[['Bogotá',4.711,-74.0721],['Medellín',6.2442,-75.5812],['Cali',3.4516,-76.532]],
 CL:[['Santiago',-33.4489,-70.6693],['Valparaíso',-33.0472,-71.6127],['Concepción',-36.8201,-73.0444]],
 US:[['Nueva York',40.7128,-74.006],['Los Ángeles',34.0522,-118.2437],['Miami',25.7617,-80.1918]],
 JP:[['Tokio',35.6762,139.6503],['Osaka',34.6937,135.5023],['Kioto',35.0116,135.7681]],
 FR:[['París',48.8566,2.3522],['Marsella',43.2965,5.3698],['Lyon',45.764,4.8357]],
 DE:[['Berlín',52.52,13.405],['Múnich',48.1351,11.582],['Hamburgo',53.5511,9.9937]],
 GB:[['Londres',51.5074,-0.1278],['Manchester',53.4808,-2.2426],['Birmingham',52.4862,-1.8904]],
 AR:[['Buenos Aires',-34.6037,-58.3816],['Córdoba',-31.4201,-64.1888],['Rosario',-32.9442,-60.6505]]
};

let map=null,countryLayer=null,cityLayer=null,selectionLayer=null,opts=null,world=null,worldPromise=null;
let activeToken=0,remoteController=null,lastRemote=0,debounce=null,signal=null;
let suggestions=[],activeSuggestion=-1,viewportLoad=null,viewportKey='';
const countryLabel=code=>opts?.countries?.[code]?.[0]||code;
const nameFor=code=>{
 try{return new Intl.DisplayNames(['es'],{type:'region'}).of(code)||code}catch{return code}
};
function defaultWorld(){
 if(!opts)return;
 if(map){map.setView([20,0],2,{animate:false});} 
}
function countryBounds(code){
 const box=opts?.countries?.[code]?.[1];
 return box?[[box[1],box[0]],[box[3],box[2]]]:null;
}
function updateHeading(){
 const display=$('#store-location-selection');
 const c=opts?.country||'';
 if(display)display.textContent=opts?.city?'📍 '+opts.city+', '+countryLabel(c):c?'🌍 '+countryLabel(c):'🌐 Todos los países';
 const help=$('#store-map-help');
 if(help)help.textContent=map?.getZoom()>=7?
 'CIUDADES · Toca una ciudad marcada o su nombre en el mapa.':
 'PAÍSES · Pulsa una zona delimitada para seleccionar el país; acerca el mapa para elegir ciudades.';
 const el=$('#store-map-country');if(el)el.textContent=c?countryLabel(c):'Mundo';
}
async function loadWorld(){
 if(world)return world;
 if(worldPromise)return worldPromise;
 worldPromise=fetch('/geo/countries.min.json',{cache:'force-cache'}).then(r=>{
  if(!r.ok)throw Error('Límites de países no disponibles');return r.json();
 }).then(geo=>{
  world=geo;
  const additional={};
  for(const f of geo.features||[]){
   const code=f.properties?.code;
   if(!code||!/^[A-Z]{2}$/.test(code))continue;
   if(!opts.countries[code]||!opts.countries[code][1]){
    let box=null;
    try{
     const bounds=window.L?.geoJSON(f).getBounds();
     if(bounds?.isValid())box=[bounds.getWest(),bounds.getSouth(),bounds.getEast(),bounds.getNorth()];
    }catch{}
    opts.countries[code]=[opts.countries[code]?.[0]||nameFor(code),box];
   }
   additional[code]=f.properties?.name||code;
  }
  opts.onCountries?.(opts.countries);
  return geo;
 }).catch(e=>{worldPromise=null;throw e});
 return worldPromise;
}
function clearMap(){
 activeToken++;
 clearTimeout(viewportLoad);clearTimeout(debounce);
 if(remoteController){remoteController.abort();remoteController=null}
 if(map){try{map.off();map.remove()}catch{}}map=null;
 countryLayer=null;cityLayer=null;selectionLayer=null;viewportKey='';
}
function makeCountries(){
 if(!map||!world||!window.L)return;
 const selected=opts.country;
 countryLayer=window.L.geoJSON(world,{
  filter:f=>/^[A-Z]{2}$/.test(f.properties?.code||''),
  style:f=>{const s=f.properties?.code===selected;return{
   color:s?'#174c6f':'#91a8b8',weight:s?2.5:.85,
   fillColor:s?'#3c97c8':'#aec7d4',fillOpacity:s?.28:.12
  }},
  onEachFeature:(feature,layer)=>{
   const code=feature.properties.code;
   const name=countryLabel(code);
   layer.bindTooltip(name,{sticky:true,direction:'top'});
   layer.on('click',e=>{
    window.L.DomEvent.stopPropagation(e);
    opts.onSelect({type:'country',code,city:null,fromMap:true});
   });
  }
 }).addTo(map);
 applyCountryVisibility();
}
function applyCountryVisibility(){
 if(!map||!countryLayer)return;
 if(map.getZoom()>=7){if(map.hasLayer(countryLayer))map.removeLayer(countryLayer)}
 else{
  if(!map.hasLayer(countryLayer))map.addLayer(countryLayer);
  countryLayer.eachLayer(l=>{
   const chosen=l.feature?.properties?.code===opts.country;
   l.setStyle({color:chosen?'#17628d':'#91a8b8',weight:chosen?3:.85,fillColor:chosen?'#298fbc':'#aec7d4',fillOpacity:chosen?.32:.11});
  });
 }
}
function localCity(country,city){
 for(const [c,name]of [[country,city]]){
  const item=(defaults[c]||[]).find(x=>normalize(x[0])===normalize(name));
  if(item)return {type:'city',code:c,city:item[0],lat:item[1],lon:item[2]};
 }
 return null;
}
function allCitiesInView(){
 if(!map)return[];
 const countries=opts.countries||{},bounds=map.getBounds();
 const result=[],seen=new Set();
 for(const [code,arr] of Object.entries(defaults)){
  for(const [name,lat,lon] of arr){
   if(!bounds.contains([lat,lon]))continue;
   const k=code+':'+normalize(name);if(seen.has(k))continue;seen.add(k);
   result.push({code,city:name,lat,lon,type:'city'});
  }
 }
 for(const store of opts.shops||[]){
  if(!store.city||!Number.isFinite(store.lat)||!Number.isFinite(store.lon))continue;
  const k=store.country+':'+normalize(store.city);
  if(seen.has(k)||!bounds.contains([store.lat,store.lon]))continue;
  seen.add(k);result.push({code:store.country,city:store.city,lat:store.lat,lon:store.lon,type:'city'});
 }
 return result.slice(0,85);
}
function showCities(){
 if(!map||!window.L)return;
 if(cityLayer){map.removeLayer(cityLayer);cityLayer=null}
 if(map.getZoom()<6)return;
 cityLayer=window.L.layerGroup().addTo(map);
 const zoom=map.getZoom();
 for(const place of allCitiesInView()){
  const selected=place.code===opts.country&&normalize(place.city)===normalize(opts.city);
  const marker=window.L.circleMarker([place.lat,place.lon],{
   radius:selected?9:zoom<8?6:7,weight:2,color:selected?'#1b4c71':'#396d8b',fillColor:selected?'#37a7cf':'#fff',fillOpacity:1
  });
  marker.bindTooltip(place.city,{permanent:zoom>=8,direction:'top',offset:[0,-8],className:'city-label'});
  marker.on('click',e=>{window.L.DomEvent.stopPropagation(e);opts.onSelect({...place,fromMap:true})});
  marker.addTo(cityLayer);
 }
 if(zoom>=8){
  for(const shop of (opts.shops||[]).filter(s=>s.discovery==='osm'&&Number.isFinite(s.lat)&&Number.isFinite(s.lon)&&map.getBounds().contains([s.lat,s.lon])).slice(0,60)){
   const m=window.L.circleMarker([shop.lat,shop.lon],{radius:6,weight:2,color:'#ba7b24',fillColor:'#f7c35e',fillOpacity:.95});
   m.bindTooltip(shop.name,{direction:'top'});
   m.on('click',e=>{window.L.DomEvent.stopPropagation(e);opts.onShop(shop.id)});
   m.addTo(cityLayer);
  }
 }
}
function redraw(){
 applyCountryVisibility();
 showCities();
 updateHeading();
}
function flyTo(place){
 if(!map)return;
 if(place?.city&&Number.isFinite(place.lat)&&Number.isFinite(place.lon)){
  map.flyTo([place.lat,place.lon],10,{duration:.35});
 }else if(place?.code&&countryBounds(place.code)){
  map.fitBounds(countryBounds(place.code),{padding:[14,14],animate:false,maxZoom:6});
 }else defaultWorld();
 redraw();
}
async function resolveCityAt(point){
 if(!map||map.getZoom()<7)return;
 const token=++activeToken,help=$('#store-map-help');
 if(help)help.textContent='Identificando la ciudad en este punto…';
 try{
  const args=new URLSearchParams({mode:'reverse',lat:point.lat.toFixed(5),lon:point.lng.toFixed(5),zoom:String(map.getZoom())});
  const r=await fetch('/api/geo?'+args,{credentials:'same-origin'});
  const d=await r.json();if(token!==activeToken)return;
  const place=(d.places||[]).find(p=>p.type==='city');
  if(!r.ok||!place)throw Error('La ciudad no está disponible');
  opts.onSelect({...place,fromMap:true});
 }catch(e){if(help)help.textContent='No pude identificar una ciudad. Selecciona un marcador, o búscala por nombre.'}
}
function fallbackMap(){
 const frame=$('#store-map-fallback'),target=$('#store-map');
 if(!frame||!target)return;
 frame.hidden=false;target.hidden=true;
 const box=opts.country&&opts.countries[opts.country]?.[1]||[-180,-60,180,85];
 frame.src='https://www.openstreetmap.org/export/embed.html?'+new URLSearchParams({bbox:box.join(','),layer:'mapnik'});
 $('#store-map-help').textContent='Mapa simplificado disponible. Usa la búsqueda y el selector de país si no aparecen zonas clicables.';
}
async function initMap(){
 const node=$('#store-map');if(!node||!window.L)return fallbackMap();
 try{
  map=window.L.map(node,{zoomControl:true,worldCopyJump:false,scrollWheelZoom:false,preferCanvas:true,
   zoomSnap:1,minZoom:2,maxZoom:15});
  window.L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{
   maxZoom:18,attribution:'© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>'
  }).addTo(map);
  if(opts.country&&countryBounds(opts.country))flyTo({code:opts.country});
  else defaultWorld();
  map.on('zoomend moveend',redraw);
  map.on('click',e=>resolveCityAt(e.latlng));
  await loadWorld();
  if(!map||!document.contains(node))return;
  makeCountries();redraw();setTimeout(()=>map?.invalidateSize(),100);
 }catch(e){clearMap();fallbackMap()}
}
function localSuggestions(q){
 const query=normalize(q);if(!query)return [];
 const result=[];
 for(const [code,info] of Object.entries(opts.countries)){
  if(normalize(info[0]).includes(query)||normalize(code)===query)
   result.push({kind:'country',label:info[0],code,city:null});
 }
 const cityKeys=new Set();
 for(const [code,cities] of Object.entries(defaults)){
  for(const [city,lat,lon] of cities){
   if(!normalize(city).includes(query))continue;
   result.push({kind:'city',label:city+', '+countryLabel(code),code,city,lat,lon});
   cityKeys.add(code+'|'+normalize(city));
  }
 }
 for(const shop of opts.shops||[]){
  if(shop.city&&normalize(shop.city).includes(query)&&!cityKeys.has(shop.country+'|'+normalize(shop.city))){
   cityKeys.add(shop.country+'|'+normalize(shop.city));
   result.push({kind:'city',label:shop.city+', '+countryLabel(shop.country),code:shop.country,city:shop.city});
  }
  if(normalize(shop.name).includes(query)){
   result.push({kind:'shop',label:shop.name+' · '+countryLabel(shop.country),code:shop.country,id:shop.id,city:null});
  }
 }
 // Cuando ya se está en un país, priorizar localidades de allí sin ocultar otros países.
 return result.sort((a,b)=>(a.code===opts.country?-1:1)-(b.code===opts.country?-1:1)).slice(0,9);
}
function renderSuggestions(){
 const list=$('#store-suggestions'),input=$('#store-search');if(!list||!input)return;
 if(!input.value.trim()||!suggestions.length){list.hidden=true;list.innerHTML='';input.setAttribute('aria-expanded','false');return}
 list.hidden=false;input.setAttribute('aria-expanded','true');
 list.innerHTML=suggestions.map((s,i)=>'<button type="button" role="option" aria-selected="'+(i===activeSuggestion)+'" data-location-index="'+i+'" class="geo-suggestion '+(i===activeSuggestion?'active':'')+'">'+
 '<span class="geo-suggestion-icon">'+(s.kind==='country'?'🌍':s.kind==='shop'?'🏪':'📍')+'</span><span><strong>'+escape(s.label)+'</strong><small>'+(s.kind==='country'?'País':s.kind==='shop'?'Tienda registrada':'Ciudad')+'</small></span></button>').join('');
}
function escape(s){return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function selectSuggestion(i){
 const chosen=suggestions[i];if(!chosen)return;
 closeSuggestions();
 const input=$('#store-search');if(input)input.value='';
 if(chosen.kind==='shop'){opts.onShop(chosen.id);return}
 opts.onSelect({type:chosen.kind,code:chosen.code,city:chosen.city||null,
  lat:chosen.lat,lon:chosen.lon,fromMap:false});
}
function closeSuggestions(){
 suggestions=[];activeSuggestion=-1;
 const list=$('#store-suggestions');if(list){list.hidden=true;list.innerHTML=''}
 $('#store-search')?.setAttribute('aria-expanded','false');
}
let nextPromise=Promise.resolve();
function queryRemote(q){
 if(q.length<3)return;
 if(remoteController)remoteController.abort();
 remoteController=new AbortController();
 const token=++activeToken;
 const wait=Math.max(0,2200-(Date.now()-lastRemote));
 clearTimeout(debounce);
 debounce=setTimeout(async()=>{
  if(token!==activeToken||!$('#store-search')?.value.trim())return;
  lastRemote=Date.now();
  try{
   const params=new URLSearchParams({mode:'suggest',q});
   const result=await fetch('/api/geo?'+params,{credentials:'same-origin',signal:remoteController.signal});
   if(!result.ok)return;
   const data=await result.json();if(token!==activeToken)return;
   const known=new Set(suggestions.map(s=>s.code+'|'+normalize(s.city||s.label)));
   for(const place of data.places||[]){
    if(place.type!=='city')continue;
    const key=place.code+'|'+normalize(place.city);
    if(known.has(key))continue;known.add(key);
    suggestions.push({kind:'city',label:place.label,code:place.code,city:place.city,lat:place.lat,lon:place.lon});
   }
   suggestions=suggestions.slice(0,9);renderSuggestions();
  }catch(e){}
 },550+wait);
}
function startSearch(input){
 const q=input.value.trim();
 opts.onQuery(q);
 if(!q){closeSuggestions();return}
 suggestions=localSuggestions(q);
 activeSuggestion=-1;renderSuggestions();
 if(q.length>=3&&suggestions.filter(s=>s.kind==='city').length<4)queryRemote(q);
}
function mount(options){
 clearMap();
 opts=options;
 const input=$('#store-search'),list=$('#store-suggestions');
 if(!input||!list)return;
 input.addEventListener('input',()=>startSearch(input));
 input.addEventListener('focus',()=>{if(input.value)startSearch(input)});
 input.addEventListener('keydown',e=>{
  if(e.key==='Escape'){closeSuggestions();input.blur();return}
  if(!suggestions.length)return;
  if(e.key==='ArrowDown'){e.preventDefault();activeSuggestion=Math.min(suggestions.length-1,activeSuggestion+1);renderSuggestions()}
  else if(e.key==='ArrowUp'){e.preventDefault();activeSuggestion=Math.max(0,activeSuggestion-1);renderSuggestions()}
  else if(e.key==='Enter'&&suggestions.length){e.preventDefault();selectSuggestion(activeSuggestion>=0?activeSuggestion:0)}
 });
 list.addEventListener('click',e=>{const btn=e.target.closest('[data-location-index]');if(btn)selectSuggestion(Number(btn.dataset.locationIndex))});
 const clear=$('#store-clear-location');
 clear?.addEventListener('click',()=>{opts.onSelect({type:'country',code:opts.country,city:null,fromMap:false});input.value='';closeSuggestions()});
 const dismiss=e=>{if(!e.target.closest('.store-searchbox'))closeSuggestions()};
 document.removeEventListener('pointerdown',signal);
 signal=dismiss;document.addEventListener('pointerdown',signal);
 initMap();updateHeading();
}
function updateOptions(newOptions){if(!opts)return;opts={...opts,...newOptions}}
function updateCountry(code,city){
 if(!opts)return;
 opts.country=code;opts.city=city||'';
 const text=$('#store-location-selection');if(text)text.textContent=city?'📍 '+city+', '+countryLabel(code):'🌍 '+countryLabel(code);
 if(map&&opts.countries[code]){
  flyTo(city?localCity(code,city)||{type:'city',code,city}: {type:'country',code});
 }
}
function updateOptions(next){if(!opts)return;opts={...opts,...next};if(map&&map.getZoom()>=6)showCities()}
function updateCountry(code,city,chosen){
 if(!opts)return;
 opts.country=code||'';opts.city=city||'';
 let place=city&&(Number.isFinite(chosen?.lat)&&Number.isFinite(chosen?.lon)?chosen:localCity(code,city));
 if(!place&&city){place={code,city}}
 flyTo(place||(code?{code}:{type:'world'}));
 updateHeading();
}
window.TCGLocation={mount,clearMap,updateOptions,updateCountry,flyTo};
})();