import {db} from 'hatchable';
import {COUNTRY_CODES} from 'lib/country-codes.js';
export const access='admin';export const methods=['GET'];
export default async function(req,res){
 const locale=new Intl.DisplayNames(['es'],{type:'region'});
 const capitals=await db.query('SELECT country,city,lat,lon FROM country_capital_seeds');
 const byCode=new Map(capitals.rows.map(c=>[c.country.trim(),c]));
 const countries=[...COUNTRY_CODES].sort().map(code=>{
  const capital=byCode.get(code);
  return {code,name:locale.of(code)||code,city:capital?.city||null,
   lat:capital?.lat??null,lon:capital?.lon??null};
 });
 return res.json({countries,count:countries.length,note:'Los países sin capital disponible siguen pudiéndose seleccionar para la investigación.'});
}