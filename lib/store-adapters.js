import {collectWoo,collectShop} from 'lib/collect.js';
/* Allowlist: only domains verified and reviewed for read-only public catalogue.
 * Do not fetch user-supplied hosts directly. */
export const SOURCES={
 okami:{name:'Okamidex',host:'okamidex.pe',country:'PE',platform:'woocommerce',kind:'hybrid',
  city:'Lima',address:'Av. Benavides 347, CC Expocentro, tienda 34B, Miraflores, Lima',addressType:'physical',
  contact:'https://okamidex.pe/contacto/',evidence:'https://okamidex.pe/contacto/',
  email:'ventas@okamidex.pe',phone:'+51 930 133 751',preorders:'https://okamidex.pe/categoria-producto/preventas/'},
 mazmorra:{name:'La Mazmorra TCG',host:'lamazmorratcg.com',country:'PE',platform:'woocommerce',kind:'hybrid',
  city:'Lima',address:'Psje. Luis Montero 140, local 203, Santiago de Surco, Lima',addressType:'physical',
  contact:'https://lamazmorratcg.com/contacto/',evidence:'https://lamazmorratcg.com/contacto/',
  email:'contacto@lamazmorratcg.com',phone:'+51 988 158 221'},
 khipu:{name:'Khipu Club TCG',host:'khipuclubtcg.com',country:'PE',platform:'woocommerce',kind:'online'},
 bimba:{name:'BimbaCards',host:'bimbacards.com',country:'ES',platform:'woocommerce',kind:'online',
  city:'Valencia',address:'Calle Río Nervión 19, 46025 Valencia',addressType:'legal',
  contact:'https://bimbacards.com/condiciones-de-venta/',evidence:'https://bimbacards.com/condiciones-de-venta/',
  email:'info@bimbacards.com',phone:'+34 664 211 126'},
 noraku:{name:'Noraku',host:'noraku.es',country:'ES',platform:'shopify',kind:'online',
  city:'Granada',address:'Calle Albero 11, Granada',addressType:'legal',
  contact:'https://noraku.es/pages/contacto',evidence:'https://noraku.es/policies/terms-of-service',
  email:'info@noraku.es',preorders:'https://noraku.es/collections/preventas'},
 pokemillon:{name:'Pokemillon',host:'www.pokemillon.com',country:'ES',platform:'shopify',kind:'hybrid',
  city:'Salou',address:'Calle Salauris 3, local 8, 43840 Salou',addressType:'pickup',
  contact:'https://www.pokemillon.com/pages/contacto',evidence:'https://www.pokemillon.com/pages/contacto',
  preorders:'https://www.pokemillon.com/collections/reservas'},
 theboosterbox:{name:'The Booster Box',host:'theboosterbox.es',country:'ES',platform:'shopify',kind:'online',
  city:'Madrid',address:'Calle Condesa de Venadito 1, 28027 Madrid',addressType:'legal',
  contact:'https://theboosterbox.es/policies/legal-notice',evidence:'https://theboosterbox.es/policies/legal-notice',
  email:'hola@theboosterbox.es'}
};
const normalizedHost=h=>String(h||'').toLowerCase().replace(/^www\./,'');
export function sourceForHost(host){return Object.entries(SOURCES).find(([,v])=>normalizedHost(v.host)===normalizedHost(host))||null}
export function supportsConnector(store){
 const spec=SOURCES[store.id];return !!spec&&store.selected===true&&store.approved_host===true&&store.auto_enabled===true&&
 normalizedHost(store.host)===normalizedHost(spec.host)&&store.platform===spec.platform;
}
export async function scanStore(store,{firstPage=false,pages=1}={}){
 if(!supportsConnector(store))throw Error('Conector sin autorización para esta tienda');
 const spec=SOURCES[store.id],page=firstPage?1:Math.min(12,Math.max(1,Number(store.scan_page_cursor)||1));
 if(spec.platform==='woocommerce'){
  const read=await collectWoo(store.id,'https://'+spec.host,{market:spec.country,startPage:page,endPage:page+Math.min(3,pages)-1});
  return {...read,nextPage:read.read>=100*Math.min(3,pages)?(page+Math.min(3,pages)>12?1:page+Math.min(3,pages)):1};
 }
 const read=await collectShop(store.id,spec.host,Math.min(3,pages),page,spec.country);
 return {...read,nextPage:read.pageFull?(page+Math.min(3,pages)>12?1:page+Math.min(3,pages)):1};
}