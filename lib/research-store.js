import {db} from 'hatchable';
import {dedupeCandidates,hostFor,sameMerchant} from 'lib/research-identity.js';
import {enqueueReviews} from 'lib/research-queue.js';
const valid=(lat,lon)=>lat==null||lon==null||(Number.isFinite(Number(lat))&&Number.isFinite(Number(lon))&&
 Number(lat)>=-85&&Number(lat)<=85&&Number(lon)>=-180&&Number(lon)<=180);
export async function storeResearchCandidates(found){
 const raw=(found||[]).filter(s=>s?.id&&s.name?.length>=3&&s.country&&
  ['physical','hybrid','online'].includes(s.store_type)&&valid(s.lat,s.lon));
 if(!raw.length)return {received:0,unique:0,duplicates:0,queued:0};
 const unique=[],provenance=[],seenCountry=new Set(raw.map(s=>s.country));
 for(const country of seenCountry){
  const current=await db.query(`SELECT id,country,city,name,website,lat,lon,source_url,store_type
   FROM discovered_shops WHERE country=$1 AND expires_at>NOW()
   ORDER BY last_seen DESC LIMIT 850`,[country]);
  const group=raw.filter(s=>s.country===country);
  const merged=dedupeCandidates(group,current.rows);
  unique.push(...merged);
  for(const candidate of group){
   const matched=merged.find(x=>sameMerchant(x,candidate));
   if(matched&&/^https:\/\//.test(candidate.source_url||''))provenance.push({shop_id:matched.id,
    provider:String(candidate.source||'Fuente abierta').slice(0,125),
    source_url:String(candidate.source_url).slice(0,320)});
  }
 }
 const validRows=unique.slice(0,120).map(s=>({
  ...s,name:String(s.name).slice(0,150),city:String(s.city||'').slice(0,100),
  source:String(s.source||'Fuente externa').slice(0,130),
  source_url:String(s.source_url||'').slice(0,320),
  website:hostFor(s.website)?'https://'+hostFor(s.website)+'/':null,
  address:s.address?String(s.address).slice(0,250):null,
  phone:s.phone?String(s.phone).slice(0,90):null
 })).filter(s=>/^https:\/\//.test(s.source_url));
 if(!validRows.length)return {received:raw.length,unique:0,duplicates:raw.length,queued:0};
 await db.query(`INSERT INTO discovered_shops
 (id,country,city,name,website,phone,address,lat,lon,store_type,shop_kind,source,
  source_url,evidence_level,pokemon_signal,expires_at)
 SELECT x.id,x.country,x.city,x.name,x.website,x.phone,x.address,x.lat,x.lon,x.store_type,
  x.shop_kind,x.source,x.source_url,x.evidence_level,x.pokemon_signal,
  NOW()+INTERVAL '30 days'
 FROM jsonb_to_recordset($1::jsonb) AS x(
  id text,country char(2),city text,name text,website text,phone text,address text,
  lat double precision,lon double precision,store_type text,shop_kind text,source text,
  source_url text,evidence_level text,pokemon_signal boolean)
 ON CONFLICT(id) DO UPDATE SET
  last_seen=NOW(),expires_at=NOW()+INTERVAL '30 days',
  website=COALESCE(discovered_shops.website,EXCLUDED.website),
  phone=COALESCE(discovered_shops.phone,EXCLUDED.phone),
  address=COALESCE(discovered_shops.address,EXCLUDED.address),
  pokemon_signal=discovered_shops.pokemon_signal OR EXCLUDED.pokemon_signal,
  evidence_level=CASE WHEN discovered_shops.evidence_level='pokemon_mentioned'
   THEN discovered_shops.evidence_level ELSE EXCLUDED.evidence_level END`,[JSON.stringify(validRows)]);
 const acceptedIds=new Set(validRows.map(x=>x.id));
 const sourceRows=provenance.filter(x=>acceptedIds.has(x.shop_id)).slice(0,180);
 if(sourceRows.length)await db.query(`INSERT INTO research_candidate_sources(shop_id,provider,source_url)
  SELECT x.shop_id,x.provider,x.source_url FROM jsonb_to_recordset($1::jsonb)
  AS x(shop_id text,provider text,source_url text)
  ON CONFLICT(shop_id,provider,source_url) DO UPDATE SET last_seen=NOW()`,[JSON.stringify(sourceRows)]);
 const queued=await enqueueReviews(validRows);
 return {received:raw.length,unique:validRows.length,duplicates:raw.length-validRows.length,queued};
}