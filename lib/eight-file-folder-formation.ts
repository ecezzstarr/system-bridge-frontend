import {askEight} from './eight-engine'
import {deriveFormationDesign} from './file-folder-formation-engine'
import type {GeneratedPartProposal} from './file-folder-generative-formation'

export async function analyzeClientFormation(proposal:GeneratedPartProposal){
 const local=deriveFormationDesign(proposal)
 try{
  const response=await askEight(
   'Provide a conceptual engineering analysis only. Respond with JSON containing data.summary, data.risks, data.questions, each with concise text. Never claim a system is implemented or verified. Client description: '+proposal.prompt,
   {userRole:'client_formation_design'}
  )
  if(!response.success||!response.data||typeof response.data!=='object')return {design:local,source:'local'}
  const data=response.data as Record<string,unknown>
  const strings=(value:unknown)=>Array.isArray(value)?value.filter((v):v is string=>typeof v==='string').slice(0,8).map(v=>v.slice(0,200)):[]
  return {source:'eight',design:{...local,summary:typeof data.summary==='string'?data.summary.slice(0,1500):local.summary,risks:[...local.risks,...strings(data.risks)],questions:[...local.questions,...strings(data.questions)]}}
 }catch{return {design:local,source:'local'}}
}
