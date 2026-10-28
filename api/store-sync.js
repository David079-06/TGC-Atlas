import {runStoreScan} from 'lib/store-scan.js';
export const access='admin';export const methods=['POST'];
export default async function(req,res){
 const b=typeof req.body==='string'?JSON.parse(req.body):req.body||{};
 const id=String(b.id||'').slice(0,128);
 if(!id)return res.status(400).json({error:'Selecciona una tienda'});
 const result=await runStoreScan(id,{manual:true,initial:b.initial===true});
 const code=result.code||200;res.status(code).json(result);
}