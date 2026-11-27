import {getWeaveSearchDirectory,isWeaveSearchRole,searchWeaveActions} from '@/lib/weave-action-search'

export type FlameDirection={title:string;href:string;detail:string;requirements:string}
export type FlameMovement={kind:'navigation'|'inspection'|'execution';state:'ready'|'verified'|'blocked';summary:string;directions:FlameDirection[];navigate?:string}
const normalize=(v:string)=>v.trim().toLowerCase().replace(/[.!?]+$/,'')
export function flameOperationIntent(message:string){
 const q=normalize(message)
 if(/^(?:please )?(?:claim|get) (?:my |today's |the )?(?:daily )?free prospect$/.test(q))return {kind:'claim_daily_prospect'} as const
 if(/^(?:please )?(?:check|show|review) (?:my |today's |the )?daily prospect$/.test(q))return {kind:'check_daily_prospect'} as const
 if(/^(?:please )?(?:check|show|review) (?:my )?(?:distribution|stock|outlet) status$/.test(q))return {kind:'check_distribution'} as const
 if(/^(?:please )?(?:check|show|review) (?:my )?(?:file folder|build|construction) status$/.test(q))return {kind:'check_file_folder'} as const
 const nav=q.match(/^(?:please )?(?:open|go to|take me to|navigate to|find)\s+(.+)$/)
 if(nav)return {kind:'navigate',query:nav[1].slice(0,160),auto:!q.startsWith('find ')} as const
 return null
}
export function flameDirections(role:string,paths:string[]):FlameDirection[]{
 if(!isWeaveSearchRole(role))return []
 const entries=getWeaveSearchDirectory(role)
 return paths.flatMap(href=>{
  const item=entries.find(e=>e.href===href)
  return item?[{title:item.title,href:item.href,detail:item.nextStep,requirements:item.requirements}]:[]
 })
}
export function flameNavigate(role:string,query:string,auto:boolean):FlameMovement{
 if(!isWeaveSearchRole(role))return {kind:'navigation',state:'blocked',summary:'This account has no registered operational directory.',directions:[]}
 const entries=getWeaveSearchDirectory(role)
 const q=normalize(query)
 const exact=entries.filter(e=>normalize(e.title)===q||e.href===q)
 const ranked=exact.length?exact:searchWeaveActions(role,query,4)
 const directions=ranked.map(e=>({title:e.title,href:e.href,detail:e.nextStep,requirements:e.requirements}))
 const navigate=auto&&exact.length===1?exact[0].href:undefined
 return {kind:'navigation',state:directions.length?'ready':'blocked',summary:directions.length?(navigate?'Opening the registered environment. Its own access gates remain active.':'Choose the matching registered environment. Flame will guide you from there.'):'No matching authorized environment was found.',directions,...(navigate?{navigate}:{})}
}
