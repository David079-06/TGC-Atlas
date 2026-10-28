(()=>{'use strict';
window.TCGScanProgress = function({el,countryName,data,h,fmt,time}){
 if(!el)return;
 el.hidden=false;
 const x=data||{},j=x.job||{},phase=j.phase||'discover';
 const finished=phase==='finished',active=!finished&&['queued','running','partial','limited'].includes(j.status);
 const count=Number(x.totalCandidates||0),reviewed=Number(x.reviewed||0),saved=Number(x.savedStores||0);
 const pct=x.progress||{},totalZones=Number(x.zonesPlanned||0),doneZones=Number(x.areasAttempted||0),failedZones=Number(x.areasFailed||0);
 const phases=[{name:'Buscar tiendas',detail:doneZones+' de '+totalZones+' áreas planificadas'+(failedZones?' · '+failedZones+' sin respuesta':'') ,percent:pct.search||0,stage:'discover'},
  {name:'Verificar una a una',detail:reviewed+' / '+count+' tiendas',percent:pct.verification||0,stage:'verify'},
  {name:'Recomendar',detail:(x.documented||0)+' con pruebas suficientes',percent:finished?100:0,stage:'finished'}];
 const label=finished?'Revisión de resultados terminada':phase==='verify'?'Verificando comercios individualmente':phase==='discover'&&reviewed>0?'Buscando y verificando tiendas a la vez':
  j.status==='queued'?'Preparando investigación':j.status==='limited'?'Investigación con limitaciones':'Buscando comercios Pokémon TCG';
 const latest=x.latestReviews||[],queue=x.verificationQueue||{},sources=x.providers||[];
 const sourceName={photon:'Photon / OSM',overpass:'Overpass / OSM',brave:'Búsqueda comercial'};
 const sourceState=s=>(s.failuresInRow>0?'Limitada temporalmente':'Operativa · '+fmt(s.requestsToday||0)+' consultas hoy');
 el.innerHTML='<div class="scan-top"><div class="scan-heading"><span class="scan-eyebrow">ESCANEO DEL PAÍS · '+h(countryName)+'</span>'+
 '<h3>'+h(label)+'</h3><p>'+h(j.last_note||'Buscando comercios físicos y online en las fuentes disponibles…')+'</p>'+
 '<p class="scan-country-limits"><strong>Ámbito:</strong> '+fmt(x.plannedRegions||0)+' regiones y '+fmt(x.plannedLocalities||0)+' áreas de localidades planificadas. <strong>No es un censo nacional.</strong></p></div>'+
 '<div class="scan-actions"><span class="scan-live '+(active?'is-active':'is-done')+'"><i></i>'+(active?'Seguimiento automático':'Resultados disponibles')+'</span>'+
 '<button type="button" id="store-research-again" title="Volver a comprobar tiendas y fuentes">↻ Repetir escaneo</button></div></div>'+
 '<div class="scan-overview"><div class="scan-ring" style="--pct:'+Math.min(100,Number(pct.overall||0))+'"><div><b>'+fmt(pct.overall||0)+'%</b><small>de la ronda</small></div></div>'+
 '<div class="scan-numbers"><div><b>'+fmt(count)+'</b><span>Detectadas</span></div><div><b>'+fmt(reviewed)+'</b><span>Revisadas</span></div>'+
 '<div><b>'+fmt(x.documented||0)+'</b><span>Corroboradas</span></div><div><b>'+fmt(saved)+'</b><span>Añadidas por ti</span></div></div></div>'+
 '<div class="scan-steps">'+phases.map((p,i)=>'<div class="scan-step '+((phase===p.stage||(phase==='discover'&&p.stage==='verify'&&reviewed>0))&&!finished?'current':finished||phases.findIndex(k=>k.stage===phase)>i?'complete':'waiting')+'">'+
 '<div class="scan-step-head"><span class="scan-step-icon">'+(finished||phases.findIndex(k=>k.stage===phase)>i?'✓':i+1)+'</span><strong>'+h(p.name)+'</strong><small>'+fmt(p.percent)+'%</small></div>'+
 '<div class="scan-line"><span style="width:'+Math.min(100,p.percent)+'%"></span></div><small class="scan-step-sub">'+h(p.detail)+'</small></div>').join('')+'</div>'+
 '<div class="scan-queue-summary"><strong>Verificaciones individuales</strong><div class="scan-queue-pills">'+
 '<span>'+fmt(queue.queued||0)+' en cola</span><span>'+fmt(queue.running||0)+' en revisión</span>'+
 '<span>'+fmt(queue.retry||0)+' con reintento</span><span>'+fmt(queue.done||0)+' completadas</span>'+
 (queue.failed?'<span>'+fmt(queue.failed)+' requieren revisión manual</span>':'')+
 '</div><small>Las tiendas aparecen en la lista en cuanto se descubren; su etiqueta se actualiza después de cada comprobación.</small>'+
 '<div class="scan-source-row">'+sources.map(s=>'<span>'+h(sourceName[s.name]||s.name)+' · '+h(sourceState(s))+'</span>').join('')+
 (x.commercialSearchConfigured?'':'<span>Búsqueda web comercial: pendiente de clave API</span>')+'</div></div>'+
 '<div class="scan-activity"><div><strong>Últimas verificaciones</strong><small>Datos contrastados durante esta investigación</small></div>'+
 (latest.length?'<ul>'+latest.slice(0,3).map((r,i)=>'<li><span class="scan-event-dot '+(r.verification_level==='documented'?'good':'caution')+'"></span>'+
 '<span><b>'+h(r.name)+'</b><small>'+h(r.verification_level==='documented'?'Con fuentes corroboradas':r.website_reachable?'Web accesible · fiabilidad pendiente':'Sin pruebas suficientes · pendiente')+'</small></span>'+
 '<time>'+h(time(r.last_checked_at))+'</time></li>').join('')+'</ul>':
 '<p class="scan-none">'+(active?'La lista se actualizará cuando empiecen las comprobaciones.':'No hay verificaciones realizadas todavía.')+'</p>')+'</div>'+
 '<p class="scan-footnote"><strong>'+h(x.coverage?.notice||'El porcentaje mide esta ronda de búsqueda, no las tiendas del país.')+'</strong> '+h(x.cache||'Las tiendas descubiertas son temporales; únicamente se guardan al añadirlas a Mis tiendas.')+' '+h(x.sourceNote||'La cobertura puede ser parcial.')+'</p>'+
 (x.coverage?.limitations?'<p class="research-error">Límite de cobertura: '+h(x.coverage.limitations)+'</p>':'')+
 (j.last_error?'<p class="research-error">Fuente: '+h(j.last_error)+'</p>':'');
};

})();