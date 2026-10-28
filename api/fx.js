import {db} from 'hatchable';
export const access='admin';export const methods=['GET'];
export default async function(req,res){
 const r=await db.query("SELECT rate,source,source_date,fetched_at FROM fx_rates WHERE from_code='PEN' AND to_code='EUR' ORDER BY fetched_at DESC LIMIT 1");
 const x=r.rows[0]||null,rate=x?Number(x.rate):null;
 const valid=rate!==null&&Number.isFinite(rate)&&rate>0.1&&rate<0.5;
 const age=x?Date.now()-new Date(x.fetched_at).getTime():Infinity;
 res.json({rate:valid?rate:null,source:x?.source||null,sourceTime:x?.source_date||null,checkedAt:x?.fetched_at||null,
 status:!valid?'unavailable':age>36*3600000?'stale':'verified',
 note:'Se consulta diariamente mediante fuente de divisas. No es tipo de cambio bancario garantizado ni incluye comisiones.'});
}