import {runDiscoveryArea} from 'lib/discovery-worker.js';
export const access='admin';export const methods=['POST'];
export default async function(req,res){
 const result=await runDiscoveryArea();
 return res.json(result);
}