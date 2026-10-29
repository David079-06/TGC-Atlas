// Pure identity and deduplication rules. Never infer trust from a matching record.
export const cleanName=value=>String(value||'').normalize('NFD')
 .replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().slice(0,100);
export const hostFor=value=>{
 try{
  const input=String(value||'').trim();
  const address=/^https?:\/\//i.test(input)?input:
    /^[a-z0-9.-]+(?:\/.*)?$/i.test(input)?'https://'+input:null;
  if(!address)return null;
  const u=new URL(address);
  const host=u.hostname.toLowerCase().replace(/^www\./,'');
  if(!['https:','http:'].includes(u.protocol)||u.username||u.password||u.port||host.length>130||
     !/^[a-z0-9.-]+$/.test(host)||host.includes('..')||
     /^(localhost|.*\.local|.*\.internal|.*\.test|.*\.invalid|\d+\.\d+\.\d+\.\d+)$/.test(host))return null;
  return host;
 }catch{return null}
};
export const osmKey=record=>{
 const value=String(record?.source_url||'');
 const match=value.match(/^https:\/\/(?:www\.)?openstreetmap\.org\/(node|way|relation)\/(\d+)(?:[/?#]|$)/);
 if(match)return match[1]+':'+match[2];
 const id=String(record?.id||'');
 const m=id.match(/^(?:osm|photon)-(node|way|relation|N|W|R)-(\d+)$/);
 if(!m)return null;
 return ({N:'node',W:'way',R:'relation'}[m[1]]||m[1])+':'+m[2];
};
function nearby(a,b,maxKm=.45){
 const al=Number(a.lat),bl=Number(b.lat),ao=Number(a.lon),bo=Number(b.lon);
 if(![al,bl,ao,bo].every(Number.isFinite)||a.lat==null||b.lat==null||a.lon==null||b.lon==null)return false;
 const dlat=(al-bl)*111.2;
 const dlon=(ao-bo)*111.2*Math.cos((al+bl)*Math.PI/360);
 return Math.hypot(dlat,dlon)<=maxKm;
}
export function sameMerchant(a,b){
 if(!a||!b||a.country!==b.country)return false;
 if(a.id===b.id)return true;
 if(osmKey(a)&&osmKey(a)===osmKey(b))return true;
 const ac=cleanName(a.city),bc=cleanName(b.city);
 const ha=hostFor(a.website),hb=hostFor(b.website);
 // Separate branches of a retail chain in different towns/addresses.
 if(ha&&ha===hb&&((a.store_type==='online'||b.store_type==='online')||ac===bc||nearby(a,b,.6)))return true;
 const na=cleanName(a.name),nb=cleanName(b.name);
 if(na&&na===nb&&nearby(a,b,.4))return true;
 return false;
}
export function dedupeCandidates(found,existing=[]){
 const result=[],baseline=Array.isArray(existing)?existing:[];
 for(const raw of found||[]){
  const c={...raw};
  if(!c.name||!c.country||!c.id)continue;
  const match=[...baseline,...result].find(v=>sameMerchant(v,c));
  if(!match){result.push(c);continue}
  c.id=match.id;
  const current=result.find(v=>v.id===match.id);
  if(!current){result.push(c);continue}
  current.pokemon_signal=!!(current.pokemon_signal||c.pokemon_signal);
  if(!current.website&&c.website)current.website=c.website;
  if(!current.phone&&c.phone)current.phone=c.phone;
  if(!current.address&&c.address)current.address=c.address;
  if(current.evidence_level==='category_match'&&c.evidence_level==='pokemon_mentioned')current.evidence_level=c.evidence_level;
 }
 return result;
}