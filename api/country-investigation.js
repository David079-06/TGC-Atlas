import {db,scheduler} from 'hatchable';
import {AUTO_DISCOVERY_ENABLED,directoryNotice} from 'lib/directory-mode.js';
import {supportedCountry} from 'lib/country-investigation.js';
import {prepareCountryAreas} from 'lib/country-areas.js';
import {seedFreeKnownShops} from 'lib/free-shop-leads.js';
import {investigationStatus as status} from 'lib/investigation-status.js';
export const access='admin';export const methods=['GET','POST'];
const codeOf=v=>String(v||'').trim().toUpperCase();
export default async function(req,res){
 const body=req.method==='POST'?(typeof req.body==='string'?JSON.parse(req.body):req.body||{}):req.query||{};
 const country=codeOf(body.country);
 if(!supportedCountry(country))return res.status(400).json({error:'País no admitido'});
 if(!AUTO_DISCOVERY_ENABLED)return res.json({...await status(country),paused:true,started:false,message:directoryNotice});
 if(req.method==='GET')return res.json(await status(country));
 if(body.action!=='start')return res.status(400).json({error:'Acción incorrecta'});
 const force=body.force===true;
 // Free, already configured shop domains give an immediate starting shortlist.
 // They remain unverified candidates until evidence is checked.
 const [geo,known]=await Promise.allSettled([
  prepareCountryAreas(country,force),seedFreeKnownShops(country)
 ]);
 if(geo.status!=='fulfilled')return res.status(503).json({error:'No se pudo preparar la cobertura geográfica'});
 const plan=geo.value;
 // A missing optional connector lead must never stop the national scanner.
 const seedWarning=known.status==='rejected'?'Algunas fuentes conocidas no se pudieron recuperar. ':'';
 const current=(await db.query('SELECT status,updated_at,area_source,phase FROM country_investigations WHERE country=$1',[country])).rows[0];
 const age=Date.now()-Date.parse(current?.updated_at||0),newCoverage=current?.area_source!==plan.source;
 if(!plan.areas)return res.json({...await status(country),started:false,message:'No hay coordenadas de exploración disponibles para este país'});
 if(current&&!force&&!newCoverage&&['queued','running','partial','limited'].includes(current.status)&&age<2*3600000)
  return res.json({...await status(country),started:false,message:seedWarning+'Ya se está investigando este país. Los cambios aparecen automáticamente.'});
 const check=await status(country);
 if(current&&!force&&!newCoverage&&current.status==='completed'&&check.totalCandidates>0&&check.remaining===0&&age<86400000)
  return res.json({...check,started:false,message:seedWarning+'Ronda reciente consultada. El resultado es parcial, no un censo de tiendas.'});
 await db.query(`INSERT INTO country_investigations(country,status,phase,last_note,area_source,area_limitations)
  VALUES($1,'queued','discover','Preparando búsqueda regional y de ciudades.',$2,$3)
  ON CONFLICT(country) DO UPDATE SET status='queued',phase='discover',cursor=0,checked_zones=0,failed_zones=0,
  checked_sites=0,last_error=NULL,last_note='Buscando comercios Pokémon TCG por regiones y ciudades.',last_city=NULL,
  area_source=$2,area_limitations=$3,generation=country_investigations.generation+1,
  started_at=NOW(),updated_at=NOW(),finished_at=NULL,next_attempt=NOW(),locked_at=NULL`,
  [country,plan.source||'Fuente geográfica abierta',plan.limitation||'Cobertura de negocios no exhaustiva']);
 let scheduled=true;try{await scheduler.now('/api/jobs/country-investigation',{country})}catch{scheduled=false}
 return res.json({...await status(country),started:true,scheduled,message:seedWarning+(scheduled?'Escaneo regional iniciado. El avance se actualiza automáticamente.':'Escaneo en cola para el procesador programado.')});
}