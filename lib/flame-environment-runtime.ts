import type {NextRequest} from 'next/server'
import {GET as getDailyProspect,POST as claimDailyProspect} from '@/app/api/bridger/daily-prospect/route'
import {GET as getDistribution} from '@/app/api/agent/distribution/route'
import {GET as getFileFolder} from '@/app/api/client/file-folder-world/route'
import {flameDirections,flameNavigate,flameOperationIntent,type FlameMovement} from '@/lib/flame-environment'

/** Fixed capability adapters only. Original endpoints re-authenticate and apply their
 * own role, funding and business rules. No arbitrary URL, model tool or user ID. */
export async function runFlameEnvironment(request:NextRequest,role:string,message:string):Promise<FlameMovement|null>{
 const intent=flameOperationIntent(message)
 if(!intent)return null
 if(intent.kind==='navigate')return flameNavigate(role,intent.query,intent.auto)
 const daily=intent.kind==='claim_daily_prospect'||intent.kind==='check_daily_prospect'
 const permitted=daily?role==='bridger':intent.kind==='check_distribution'?role==='agent':role==='client'
 const kind=intent.kind==='claim_daily_prospect'?'execution':'inspection'
 if(!permitted)return {kind,state:'blocked',summary:'This operation is not available to your current position.',directions:[]}
 const paths=daily?['/weave/market/prospects','/bridger/my-prospects']:intent.kind==='check_distribution'?['/agent/distribution']:['/client/system-switch']
 const directions=flameDirections(role,paths)
 try{
  const response=intent.kind==='claim_daily_prospect'?await claimDailyProspect(request):intent.kind==='check_daily_prospect'?await getDailyProspect(request):intent.kind==='check_distribution'?await getDistribution(request):await getFileFolder(request)
  const data=await response.json()
  if(!response.ok||data.success!==true)return {kind,state:'blocked',summary:data.gate==='daily_pool_empty'?'No unused daily prospect is available.':'The original workshop did not confirm this operation. Open it to inspect the current status; do not assume it succeeded.',directions}
  let summary:string
  if(intent.kind==='claim_daily_prospect'){
   if(!data.claim)return {kind,state:'blocked',summary:'The workshop did not return a confirmed claim. Inspect My Prospects.',directions}
   summary=data.already_claimed?'Your daily free prospect was already claimed.':'The daily free prospect was claimed and recorded by the Prospect Market.'
   summary+=' Open My Prospects to review the candidate and decide how to contact them. No message was sent; response and contact validity are not guaranteed.'
  }else if(intent.kind==='check_daily_prospect'){
   summary=data.claimed?'Your daily free prospect is recorded as claimed. Review My Prospects for actual outreach.':'The workshop records no daily claim yet. Say claim my daily free prospect to request it.'
  }else if(intent.kind==='check_distribution'){
   summary='Distribution inspected: '+(Array.isArray(data.outlets)?data.outlets.length:0)+' recorded outlets, '+(Array.isArray(data.stock)?data.stock.length:0)+' stock records. Review the original ledger before promising delivery.'
  }else{
   const world=data.world
   if(!world||!Array.isArray(world.builds)||!Array.isArray(world.systems))return {kind,state:'blocked',summary:'The File Folder did not return a usable snapshot.',directions}
   summary='File Folder inspected: '+world.builds.filter((b:any)=>b.status==='building'||b.status==='funding_gate').length+' unfinished builds and '+world.systems.filter((s:any)=>s.status==='active').length+' active systems in the returned snapshot. Open your File Folder to continue.'
  }
  return {kind,state:'verified',summary,directions,...(directions[0]?{navigate:directions[0].href}:{})}
 }catch{return {kind,state:'blocked',summary:'The workshop could not confirm this movement. Check the original records before retrying.',directions}}
}
