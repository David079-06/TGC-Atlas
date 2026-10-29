import {hostFor} from 'lib/research-identity.js';

// No paid lookup or LLM. Fetches at most three HTML pages from the SAME public
// HTTPS merchant domain. Technical accessibility is deliberately NOT a trust vote.
const cut=(value,length=240)=>String(value||'').trim().slice(0,length);
const strip=html=>String(html||'').replace(/<script\b[^>]*>[\s\S]*?<\/script>/ig,' ')
 .replace(/<style\b[^>]*>[\s\S]*?<\/style>/ig,' ')
 .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/ig,' ')
 .replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/ig,' ')
 .replace(/&amp;/ig,'&').replace(/&ntilde;/ig,'ñ')
 .replace(/&aacute;/ig,'á').replace(/&eacute;/ig,'é')
 .replace(/&iacute;/ig,'í').replace(/&oacute;/ig,'ó')
 .replace(/&uacute;/ig,'ú').replace(/\s+/g,' ').trim().slice(0,25000);
function links(html,base,host){
 const found=[],re=/<a\s+[^>]*href\s*=\s*["']([^"'<>]{1,500})["'][^>]*>/ig;
 let match;while((match=re.exec(html||''))&&found.length<12){
  try{
   const raw=match[1].trim();
   if(/^(mailto:|tel:|javascript:|#)/i.test(raw))continue;
   // Isolate bug guard: a two-argument URL constructor can treat an absolute
   // URL as a relative path. Absolute addresses are always parsed alone.
   const full=/^https:\/\//i.test(raw)?raw:
    raw.startsWith('//')?'https:'+raw:
    'https://'+host+'/'+raw.replace(/^\/+|^\.\/+/, '');
   const u=new URL(full);
   if(u.protocol!=='https:'||hostFor(full)!==host)continue;
   const path=u.pathname.toLowerCase();
   if(!/(?:^|\/)(?:contacto?|cont[aá]ctanos|about(?:-us)?|nosotros|ubicacion|tienda-fisica|politica|policies|policy|terms?|terminos|condiciones|devoluciones|refund|shipping|envios)(?:[-_\/]|$)/i.test(path))continue;
   const value=u.origin+u.pathname;
   if(!found.includes(value))found.push(value);
  }catch{}
 }return found;
}
function keyPage(url){const p=new URL(url).pathname.toLowerCase();
 if(/contact|contacto|ubicaci/.test(p))return 'contact';
 if(/polic|policy|termin|term|condici|devoluc|refund|shipping|envio/.test(p))return 'terms';
 return 'home';
}
async function download(url,host){
 const r=await fetch(url,{
  method:'GET',redirect:'manual',
  headers:{Accept:'text/html', 'User-Agent':'TCGAtlas-PrivateVerification/1.0 (limited manual public-web check)'},
  signal:AbortSignal.timeout(8000)});
 if(r.status>=300&&r.status<400){
  // No automatic redirects; a cross-host redirect can be a login, tracker or
  // private destination. Report as inconclusive rather than following it.
  throw Error('La página redirige; no se ha seguido automáticamente.');
 }
 if(!r.ok)throw Error('HTTP '+r.status);
 const mime=r.headers.get('content-type')||'';
 if(mime&&!/text\/html/i.test(mime))throw Error('La respuesta no es HTML');
 const size=Number(r.headers.get('content-length')||0);
 if(size>650000)throw Error('Página demasiado grande');
 const html=(await r.text()).slice(0,650000);
 if(hostFor(r.url||url)!==host)throw Error('El destino cambió de dominio');
 return {url,html,text:strip(html)};
}
function structuredLocations(html){
 const places=[],seen=new Set(),types=new Set();
 const re=/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/ig;
 let m;
 function visit(item,depth=0){
  if(!item||depth>5)return;
  if(Array.isArray(item)){for(const x of item.slice(0,40))visit(x,depth+1);return}
  if(typeof item!=='object')return;
  const kind=String(item['@type']||'');
  if(kind)types.add(kind);
  if(item['@graph'])visit(item['@graph'],depth+1);
  if(item.department)visit(item.department,depth+1);
  if(item.location)visit(item.location,depth+1);
  const a=item.address;
  if(a&&typeof a==='object'&&/store|localbusiness|shop|organization|place/i.test(kind)){
   const line=[a.streetAddress,a.addressLocality,a.addressRegion,a.postalCode,a.addressCountry].filter(Boolean)
      .map(x=>String(x).slice(0,110)).join(', ').slice(0,240);
   if(line.length>=8&&!seen.has(line)){seen.add(line);places.push({address:line,city:String(a.addressLocality||'').slice(0,100),
    source:'JSON-LD del comercio',corroborated:false})}
  }
 }
 let count=0;while((m=re.exec(html||''))&&count++<25){
  try{visit(JSON.parse(m[1]))}catch{}
 }
 return {places:places.slice(0,8),schemaTypes:[...types].slice(0,12)};
}
export async function checkMerchantWebsite(shop){
 const host=hostFor(shop.website);
 if(!host)return {technical:{reachable:null,checkedPages:[],notice:'No hay web HTTPS válida para comprobar'},
  error:'La dirección web no es válida'};
 const url='https://'+host+'/';
 let home;
 try{home=await download(url,host);}
 catch(e){return {technical:{reachable:null,checkedPages:[],notice:'La web no pudo consultarse; su identidad documental no cambia.'},
  error:cut(e.message||e)};}
 const candidates=links(home.html,url,host);
 const contact=candidates.find(x=>keyPage(x)==='contact')||null;
 const pages=[home],missed=[];
 // Follow at most one contact page and one conditions page, always on the
 // same public host. Additional links found in Contact may reveal the terms.
 if(contact){
  try{pages.push(await download(contact,host))}catch(e){missed.push({url:contact,error:cut(e.message||e,130)})}
 }
 const termsLinks=[...candidates,...pages.slice(1).flatMap(p=>links(p.html,p.url,host))];
 const terms=termsLinks.find(x=>keyPage(x)==='terms')||null;
 if(terms&&!pages.some(p=>p.url===terms)){
  try{pages.push(await download(terms,host))}catch(e){missed.push({url:terms,error:cut(e.message||e,130)})}
 }
 const structured=pages.map(p=>structuredLocations(p.html));
 const declaredLocations=[...new Map(structured.flatMap(x=>x.places).map(x=>[x.address.toLowerCase(),x])).values()].slice(0,8);
 const schemaTypes=[...new Set(structured.flatMap(x=>x.schemaTypes))].slice(0,12);
 const pageTexts=pages.map(p=>p.text);
 const all=pageTexts.join(' ');
 const contactText=pages.filter(p=>keyPage(p.url)==='contact').map(p=>p.text).join(' ');
 const termsText=pages.filter(p=>keyPage(p.url)==='terms').map(p=>p.text).join(' ');
 const emails=[...new Set((all.match(/[\w.+-]+@[a-z0-9.-]+\.[a-z]{2,}/ig)||[]).map(s=>s.toLowerCase()))]
  .filter(x=>!/(example|noreply|test@|placeholder)/i.test(x)).slice(0,4);
 const foundPhones=[...new Set((contactText.match(/\+?\d[\d() .-]{7,18}\d/g)||[]).map(s=>s.trim()))];
 const dial={PE:'51',ES:'34',US:'1',MX:'52',CO:'57',CL:'56',AR:'54',GB:'44',
  FR:'33',DE:'49',JP:'81',CA:'1',BR:'55'}[shop.country];
 // Prefer the country code published on the merchant's contact page; do not
 // mistake generic theme support numbers for the local store's own phone.
 const matchingDial=dial?foundPhones.filter(x=>x.replace(/[() .-]/g,'').startsWith('+'+dial)):[];
 const phoneMatches=(matchingDial.length?matchingDial:
  foundPhones.filter(x=>!x.startsWith('+')&&/\d{8,15}/.test(x.replace(/\D/g,'')))).slice(0,3);
 const physicalClaim=/vis[ií]tanos\s+en|visita\s+(nuestra|la)\s+tienda\s+f[ií]sica|tienda\s+f[ií]sica|encu[eé]ntranos\s+en|ub[ií]canos|local\s+\d{1,4}/i.test(contactText+' '+home.text);
 const onlineCatalog=/a[nñ]adir\s+al\s+carrito|add\s+to\s+cart|comprar\s+ahora|tienda\s+online|tienda\s+virtual|s\/\s*\d+[.,]\d{2}|cat[aá]logo\s+de\s+productos/i.test(home.text);
 const termsPresent=!!termsText&&/devoluc|env[ií]o|return|refund|compra|compra|t[eé]rmin|pago|pago/i.test(termsText);
 const identifiers=(all.match(/\b(?:RUC|NIT|RFC|CIF|VAT|SIRET|NIF)\s*[:#-]?\s*[a-z0-9-]{7,18}\b/ig)||[]).slice(0,3);
 const checkedAt=new Date().toISOString();
 return {technical:{
  reachable:true,checkedAt,checkedPages:pages.map(p=>({url:p.url,kind:keyPage(p.url),checkedAt})),
  missingPages:missed,
  contactPageFound:!!contactText,termsPageFound:termsPresent,
  physicalClaimPublished:physicalClaim||declaredLocations.length>0,
  declaredLocations,schemaTypes,
  ecommerceIndicated:onlineCatalog,
  emails,phones:phoneMatches,legalIdentifiersPublished:identifiers,
  notice:'Datos declarados en la web; las coincidencias técnicas no verifican registros, compras ni reseñas.'
 },error:null};
}