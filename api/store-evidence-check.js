import {db} from 'hatchable';
import {SOURCES} from 'lib/store-adapters.js';
export const access='admin';export const methods=['GET','POST'];
const COUNTRY=/^[A-Z]{2}$/;
// Candidatas contrastadas en una fuente independiente y con dominio publicado; no implica confianza comercial.
const CANDIDATES={
 'researched-play-jesus-maria':{country:'PE',host:'playboardgamestore.com'},
 'researched-carton-fino':{country:'PE',host:'cartonfino.pe'},
 'researched-control-wavi':{country:'PE',host:'controlwavi.pe'}
};
const TARGETS={...Object.fromEntries(Object.entries(SOURCES).map(([id,s])=>[id,{country:s.country,host:s.host}])),...CANDIDATES};
async function list(country){
 const r=await db.query('SELECT merchant,http_status,reachable,checked_at,error FROM store_site_checks');
 return r.rows.filter(x=>!!TARGETS[x.merchant]&&(!country||TARGETS[x.merchant].country===country));
}
async function check(id){
 const entry=TARGETS[id];if(!entry)return null;
 const recent=await db.query("SELECT merchant,http_status,reachable,checked_at,error FROM store_site_checks WHERE merchant=$1 AND checked_at>NOW()-INTERVAL '6 hours'",[id]);
 if(recent.rows.length)return {...recent.rows[0],cached:true};
 let status=null,reachable=null,error=null;
 try{
  // Only preapproved hosts; no arbitrary URL is ever fetched from this endpoint.
  const result=await fetch('https://'+entry.host+'/',{method:'HEAD',redirect:'manual',
   headers:{Accept:'text/html'},signal:AbortSignal.timeout(4200)});
  status=result.status;
  reachable=status>=200&&status<400?true:[403,405,429].includes(status)?null:false;
 }catch(e){error=String(e).slice(0,150);reachable=null}
 const r=await db.query(`INSERT INTO store_site_checks(merchant,http_status,reachable,checked_at,error)
 VALUES($1,$2,$3,NOW(),$4) ON CONFLICT(merchant) DO UPDATE
 SET http_status=$2,reachable=$3,checked_at=NOW(),error=$4
 RETURNING merchant,http_status,reachable,checked_at,error`,[id,status,reachable,error]);
 return {...r.rows[0],cached:false};
}
export default async function(req,res){
 const b=req.method==='POST'?(typeof req.body==='string'?JSON.parse(req.body):req.body||{}):req.query||{};
 const country=String(b.country||'').toUpperCase();
 if(country&&!COUNTRY.test(country))return res.status(400).json({error:'País incorrecto'});
 if(req.method==='GET')return res.json({checks:await list(country)});
 if(b.action==='country'){
  const ids=Object.keys(TARGETS).filter(id=>TARGETS[id].country===country);
  if(!country||!ids.length)return res.json({checks:[],checked:0,total:0,note:'No hay conectores revisados en este país'});
  // Limit to 2 simultaneous checks, with a 6h DB cache for each shop.
  const results=[];
  for(let i=0;i<ids.length;i+=2){
   const portion=await Promise.allSettled(ids.slice(i,i+2).map(check));
   for(const item of portion)if(item.status==='fulfilled'&&item.value)results.push(item.value);
  }
  return res.json({checks:results,checked:results.length,total:ids.length,
   note:'Se ha comprobado accesibilidad de webs previamente autorizadas, NO seguridad comercial, identidad o entregas.'});
 }
 const id=String(b.id||'');
 if(!TARGETS[id]||(country&&TARGETS[id].country!==country))return res.status(404).json({error:'Comercio no disponible para comprobar'});
 return res.json({check:await check(id),note:'La accesibilidad de la web es una comprobación técnica, nunca una certificación del comercio'});
}