/**
 * Cloudflare migration scaffold only. Do NOT connect this to the production
 * database or expose the original interface until owner-only auth, D1
 * migrations, and API parity tests have passed.
 *
 * No production data, secrets, catalogue, or user-identifiable material here.
 */
const json=(value,status=200)=>{
 const headers=new Headers({
  'Content-Type':'application/json; charset=utf-8',
  'Cache-Control':'no-store, max-age=0',
  'X-Content-Type-Options':'nosniff',
  'X-Robots-Tag':'noindex, nofollow',
  'Referrer-Policy':'no-referrer',
  'X-Frame-Options':'DENY'
 });
 return new Response(JSON.stringify(value),{status,headers});
};

export default {
 async fetch(request,env){
  const url=new URL(request.url);
  if(request.method==='GET'&&url.pathname==='/__migration_health'){
   return json({
    status:'staging_only',
    production:false,
    backendReady:false,
    dbMigrationComplete:false,
    authenticationConfigured:false,
    automaticDiscoveryEnabled:false,
    message:'La migración requiere autorización, pruebas y control de acceso antes de servir datos.'
   });
  }
  // Private by default. No fallback route may reveal stores, reports,
  // operational endpoints, API documents or production assets.
  return json({error:'not_migrated',message:'El entorno de pruebas no está habilitado para servir datos.'},503);
 }
};
