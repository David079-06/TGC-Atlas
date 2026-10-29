import {db} from 'hatchable';
import {PERU_VISIBLE_CANDIDATES} from 'lib/directory-mode.js';
import {SOURCES} from 'lib/store-adapters.js';
import {trustForShop} from 'lib/store-trust.js';
import {enrichWithVerification} from 'lib/store-verification.js';
export const access='admin';export const methods=['GET'];
export default async function(req,res){
 const country=String(req.query?.country||'').toUpperCase();
 if(country&&!/^[A-Z]{2}$/.test(country))return res.status(400).json({error:'País inválido'});
 // Los conectores integrados NO aparecen como tiendas preguardadas.
 // Solo se exponen si se solicita expresamente un catálogo de integraciones.
 if(String(req.query?.include_connectors||'')!=='1')return res.json({shops:[],count:0,note:'Ninguna tienda precargada. Las tiendas se muestran cuando una investigación las encuentra o el usuario las añade.'});
 const saved=await db.query('SELECT id FROM store_registry');
 const selected=new Set(saved.rows.map(x=>x.id));
 const shops=Object.entries(SOURCES).filter(([id,s])=>(!country||s.country===country)&&!selected.has(id)&&
   (s.country!=='PE'||PERU_VISIBLE_CANDIDATES.includes('connector-'+id)))
  .map(([id,s])=>({
   id,name:s.name,country:s.country,city:s.city||null,trust:trustForShop(id),
   website:'https://'+s.host+'/',address:s.address||null,addressType:s.addressType||null,
   email:s.email||null,phone:s.phone||null,contactUrl:s.contact||null,evidenceUrl:s.evidence||null,preordersUrl:s.preorders||null,
   platform:s.platform,storeType:s.kind,products:0,pokemon:0,other:0,preorders:0,unclassified:0,
   badge:'yellow',scanStatus:'not_added',selected:false,discovery:'known_connector',approvedHost:true,
   sourceUrl:s.evidence||'https://'+s.host+'/',
   note:'Conector disponible, aún no añadida. El catálogo se importa al guardar la tienda.'
  }));
 res.json({shops:await enrichWithVerification(shops),coverage:'El directorio incluye tiendas con conectores revisados; no representa todas las tiendas online del país.',
  count:shops.length,checkedAt:new Date().toISOString()});
}