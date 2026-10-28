import {runCountryInvestigation} from 'lib/country-investigation.js';
export const access='scheduler';export const methods=['POST'];
export default async function(req,res){
 const raw=typeof req.body==='string'?JSON.parse(req.body):req.body||{};
 const country=typeof raw.country==='string'&&/^[A-Z]{2}$/.test(raw.country)?raw.country:null;
 const result=await runCountryInvestigation(country);
 return res.json(result);
}