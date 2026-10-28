(()=>{'use strict';
const KEY='tcg-atlas-trail-v2';
const allowed=['inicio','inversion','reventa','oportunidades','explorar','tiendas','noticias','historial'];
const here=()=>{
 const path=location.pathname;
 if(path==='/'||path.endsWith('/index.html'))return '/?section='+encodeURIComponent(window.Atlas?.state?.selectedPage||'inicio');
 return path+(location.hash||'');
};
const historyGet=()=>{try{const a=JSON.parse(sessionStorage.getItem(KEY)||'[]');return Array.isArray(a)?a:[]}catch{return []}};
const historyPut=a=>{try{sessionStorage.setItem(KEY,JSON.stringify(a.slice(-18)))}catch{}};
let ignore=false;
const record=x=>{if(ignore)return;let s=String(x||''),a=historyGet();if(s&&a.at(-1)!==s)historyPut([...a,s])};
const landing=()=>{
 const u=new URL(location.href);
 const v=u.searchParams.get('section');
 if(v&&allowed.includes(v)&&window.Atlas){
  ignore=true;window.Atlas.state.selectedPage=v;window.Atlas.save();ignore=false;
 }
};
landing();
const go=to=>{
 if(typeof to!=='string'||!to.startsWith('/')||to.startsWith('//'))return;
 if(to.startsWith('/?section=')){
  const page=new URL(to,location.origin).searchParams.get('section');
  if(!allowed.includes(page))return;
  if(location.pathname==='/'||location.pathname==='/index.html'){
   const button=document.querySelector('#menu button[data-page="'+page+'"]');
   if(button){ignore=true;button.click();ignore=false;return}
  }
  location.href='/?section='+encodeURIComponent(page);return;
 }
 if(to===here())return;
 location.href=to;
};
function back(){
 const a=historyGet();let next='';
 while(a.length){const v=a.pop();if(v&&v!==here()){next=v;break}}
 historyPut(a);
 if(next){go(next);return}
 if(location.pathname==='/'||location.pathname==='/index.html'){go('/?section=inicio');return}
 go('/?section=inicio');
}
const nav=document.createElement('div');
nav.id='atlas-dock';nav.className='atlas-dock';
nav.innerHTML='<button type="button" class="dock-back" aria-label="Volver a la sección anterior" title="Volver"><span class="dock-icon" aria-hidden="true">←</span><span>Volver</span></button>';
document.body.append(nav);
nav.querySelector('button').addEventListener('click',()=>{
 const btn=nav.querySelector('button');btn.classList.add('dock-pressed');
 window.setTimeout(()=>btn.classList.remove('dock-pressed'),190);
 back();
});
document.addEventListener('click',e=>{
 if(ignore||e.target.closest('#atlas-dock'))return;
 const a=e.target.closest('a[href]');
 if(a&&!e.ctrlKey&&!e.metaKey&&!e.shiftKey&&!e.altKey&&a.target!=='_blank'){
  try{const u=new URL(a.href);if(u.origin===location.origin&&['/','/index.html','/market.html','/preorders.html','/research.html'].includes(u.pathname)&&u.pathname+u.hash!==here())record(here())}catch{}
 }
 const button=e.target.closest('#menu button[data-page]');
 if(button&&location.pathname==='/'){
  const current=window.Atlas?.state?.selectedPage||'inicio';
  if(current!==button.dataset.page)record('/?section='+encodeURIComponent(current));
 }
},true);
window.AtlasNavigation={go:to=>{record(here());go(to)},back};
})();