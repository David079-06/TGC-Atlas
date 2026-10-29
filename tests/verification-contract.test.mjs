import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {hostFor, dedupeCandidates} from '../lib/research-identity.js';
import {AUTO_DISCOVERY_ENABLED, PERU_VISIBLE_CANDIDATES} from '../lib/directory-mode.js';

// The production evaluation lives alongside the Hatchable DB adapters.
// Load the same source with its I/O imports replaced, without contacting
// Hatchable or changing real shop records. Codex should later extract this
// pure function to a shared, directly importable module.
const filename=new URL('../lib/store-verification.js',import.meta.url);
const code=readFileSync(filename,'utf8')
  .replace(/^import[^\n]*\n/gm,'')
  .replace(/^export /gm,'');
const policy=new Function('db','hostFor','SOURCES',
  code+'\nreturn {evaluateVerification,verificationKey,pendingTrust};')(
  {query:()=>{throw Error('The policy test must not query production data')}},
  hostFor,{});
const {evaluateVerification,verificationKey}=policy;

function dossier(country='PE') {
 return {
  country,name:'Tienda de prueba',evaluated_at:'2026-10-29T08:00:00Z',
  facts:{
   legal:{name:'Entidad de prueba',country,identifier:'00000000001',officialChecked:false},
   locations:[{purpose:'store',address:'Una calle de prueba',corroborated:true}],
   ecommerce:{catalog:true}
  },
  evidence:[
   {kind:'first_party',claim:'online_catalog',publisher:'Comercio',confirmed:true,
    url:'https://comercio.example.org/catalogo',label:'Catálogo'},
   {kind:'registry_secondary',claim:'legal_active',publisher:'Registro independiente',confirmed:true,
    url:'https://registro.example.org/empresa',label:'Registro'},
   {kind:'supplier_listing',claim:'physical_location_match',publisher:'Distribuidor',confirmed:true,
    url:'https://proveedor.example.org/tiendas',label:'Listado de puntos de venta'}
  ],
  technical:{reachable:true}
 };
}

test('La misma identidad tiene la misma clave en tiendas temporales y guardadas',()=>{
 const a=verificationKey({id:'connector-okami',country:'PE',website:'https://www.okamidex.pe/'});
 const b=verificationKey({id:'saved-connector-okami',country:'PE',website:'https://okamidex.pe/'});
 assert.equal(a,b);
 assert.equal(a,'PE|okamidex.pe');
 assert.notEqual(verificationKey({id:'connector-okami',country:'ES',website:'https://okamidex.pe/'}),a);
});

test('Identidad comercial respaldada: verde, pero no compra garantizada',()=>{
 const report=evaluateVerification(dossier());
 assert.equal(report.level,'green');
 assert.equal(report.storeType,'hybrid');
 assert.equal(report.verification.independentSources,2);
 assert.equal(report.verification.officialRegistryChecked,false);
 assert.equal(report.transactionSafety,'not_verified');
 assert.equal(report.recommended,false);
});

test('Una web accesible nunca basta para una etiqueta verde',()=>{
 const report=dossier();
 report.evidence=report.evidence.slice(0,1);
 assert.equal(evaluateVerification(report).level,'yellow');
});

test('Dos referencias del mismo publicador no son dos fuentes independientes',()=>{
 const report=dossier();
 report.evidence[1].publisher='Mismo emisor';
 report.evidence[2].publisher='Mismo emisor';
 assert.equal(evaluateVerification(report).level,'yellow');
});

test('Un fallo HTTP posterior no elimina la corroboración documental',()=>{
 const report=dossier();
 report.technical.reachable=false;
 report.website_error='HTTP 503';
 const result=evaluateVerification(report);
 assert.equal(result.level,'green');
 assert.equal(result.verification.technicalStatus,'unavailable');
});

test('La etiqueta roja requiere un riesgo oficial documentado',()=>{
 const report=dossier();
 report.evidence.push({kind:'official_sanction',claim:'serious_active_risk',
  confirmed:true,publisher:'Autoridad pública',url:'https://autoridad.example.org/documento'});
 assert.equal(evaluateVerification(report).level,'red');
 const normal=dossier();
 normal.evidence.push({kind:'independent_reviews',claim:'negative_review',
  confirmed:true,publisher:'Reseña',url:'https://resenas.example.org'});
 assert.equal(evaluateVerification(normal).level,'green');
});

test('La clasificación se aplica igual a PE, ES y otros países',()=>{
 for(const code of ['PE','ES','JP','US']){
  const report=dossier(code);
  assert.equal(evaluateVerification(report).level,'green');
  assert.equal(evaluateVerification(report).storeType,'hybrid');
 }
});

test('Modalidades online, física y desconocida no se inventan',()=>{
 const physical=dossier();physical.facts.ecommerce.catalog=false;
 assert.equal(evaluateVerification(physical).storeType,'physical');
 const online=dossier();online.facts.locations=[];
 assert.equal(evaluateVerification(online).storeType,'online');
 assert.equal(evaluateVerification(null).verification.storeType,'unknown');
});

test('No se reactiva la búsqueda ni se amplía la lista peruana',()=>{
 assert.equal(AUTO_DISCOVERY_ENABLED,false);
 assert.deepEqual([...PERU_VISIBLE_CANDIDATES].sort(),
  ['connector-mazmorra','connector-okami']);
});

test('Deduplicación no fusiona ciudades diferentes por nombre',()=>{
 const first={id:'osm-node-1',country:'ES',city:'Madrid',name:'Tienda TCG',lat:40.4,lon:-3.7};
 const second={id:'osm-node-2',country:'ES',city:'Bilbao',name:'Tienda TCG',lat:43.26,lon:-2.93};
 assert.equal(dedupeCandidates([first,second]).length,2);
 const duplicate={...first,id:'photon-node-1'};
 assert.equal(dedupeCandidates([first,duplicate]).length,1);
});
