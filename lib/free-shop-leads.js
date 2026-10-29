import {db} from 'hatchable';
import {PERU_VISIBLE_CANDIDATES} from 'lib/directory-mode.js';
import {SOURCES} from 'lib/store-adapters.js';
import {hostFor} from 'lib/research-identity.js';
import {storeResearchCandidates} from 'lib/research-store.js';

// Curated starting leads from connectors already configured in this project.
// Presence here does NOT mean the shop has a valid license, current stock,
// a safe checkout or an independently verified commercial reputation.
export async function seedFreeKnownShops(country){
 const leads=[];
 for(const [key,item] of Object.entries(SOURCES)){
  if(item.country!==country)continue;
  if(country==='PE'&&!PERU_VISIBLE_CANDIDATES.includes('connector-'+key))continue;
  const host=hostFor('https://'+String(item.host||''));
  if(!host)continue;
  const website='https://'+host+'/';
  leads.push({
   id:'connector-'+key,country,name:String(item.name||key).slice(0,150),
   city:String(item.city||'').slice(0,100),address:null,
   website,phone:null,lat:null,lon:null,
   store_type:item.kind==='hybrid'?'hybrid':'online',
   shop_kind:'trading_cards',source:'Conector público conocido · pendiente de contraste',
   source_url:website,evidence_level:'category_match',
   pokemon_signal:false
  });
 }
 if(!leads.length)return {received:0,unique:0,duplicates:0,queued:0};
 // Reopening a country does not pretend that a known domain has just been checked.
 const found=await db.query('SELECT id,website FROM discovered_shops WHERE country=$1 AND expires_at>NOW()',[country]);
 const hosts=new Set(found.rows.map(r=>hostFor(r.website)).filter(Boolean));
 const missing=leads.filter(s=>!hosts.has(hostFor(s.website)));
 return missing.length?storeResearchCandidates(missing):
  {received:0,unique:0,duplicates:0,queued:0};
}