import {COUNTRY_CODES} from 'lib/country-codes.js';
export const acceptableCountry=c=>COUNTRY_CODES.has(c)||['SG','AD','MC','LI','LU','MT','VA','SM','BH','QA','HK'].includes(c);
export const safeUrl=input=>{
 let u;try{u=new URL(input)}catch{return null}
 if(u.protocol!=='https:'||u.username||u.password||u.port)return null;
 const host=u.hostname.toLowerCase(),parts=host.split('.');
 if(parts.length<2||host.length>130||!parts.every(x=>/^[a-z0-9-]{1,63}$/.test(x))||host.endsWith('.local')||host.endsWith('.internal')||host.endsWith('.localhost')||/^(localhost|.*\.test|.*\.invalid)$/.test(host)||/^(\d+\.){3}\d+$/.test(host)||host.includes('..'))return null;
 return {host,website:'https://'+host+'/'};
};