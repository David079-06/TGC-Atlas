import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/index.mjs';

const invoke=(path,method='GET')=>worker.fetch(new Request('https://local.invalid'+path,{method}),{});

test('Migration health never claims that a private app is deployed',async()=>{
 const r=await invoke('/__migration_health');
 assert.equal(r.status,200);
 const body=await r.json();
 assert.equal(body.production,false);
 assert.equal(body.authenticationConfigured,false);
 assert.equal(body.backendReady,false);
 assert.equal(body.automaticDiscoveryEnabled,false);
 assert.match(r.headers.get('Cache-Control'),/no-store/);
});

test('All private routes fail closed before an auth layer is installed',async()=>{
 for(const path of ['/','/api/stores','/api/discovery?country=PE','/api/store-verification','/api/jobs/stores-sweep']){
  const r=await invoke(path);
  assert.equal(r.status,503,path);
  assert.equal((await r.json()).error,'not_migrated');
  assert.equal(r.headers.get('Access-Control-Allow-Origin'),null);
  assert.equal(r.headers.get('X-Robots-Tag'),'noindex, nofollow');
 }
});

test('Health does not accept writes or accidentally enable mutation',async()=>{
 const r=await invoke('/__migration_health','POST');
 assert.equal(r.status,503);
});
