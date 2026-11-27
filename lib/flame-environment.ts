import {getWeaveSearchDirectory,isWeaveSearchRole,searchWeaveActions} from '@/lib/weave-action-search'

export type FlameDirection={title:string;href:string;detail:string;requirements:string}
export type FlameMovement={kind:'navigation'|'inspection'|'execution';state:'ready'|'verified'|'blocked';summary:string;directions:FlameDirection[];navigate?:string}
const normalize=(v:string)=>v.trim().toLowerCase().replace(/[.!?]+$/,'')
export function flameOperationIntent(message:string){
 const q=normalize(message).replace(/^(?:flame[, ]+)?(?:please\s+|could you\s+|can you\s+|would you\s+|i want you to\s+|i need you to\s+)*/,'').replace(/\s+please$/,'').trim()
 // Imperative, bounded grammar. Questions about how to perform a task
 // must not be treated as authorization to execute it.
 if(/^(?:claim|get|collect) (?:me )?(?:my |today's |the |a )?(?:daily )?free prospect(?: for me| for today| today)?$/.test(q))return {kind:'claim_daily_prospect'} as const
 if(/^(?:check|show|review|inspect|tell me) (?:me )?(?:my |today's |the )?(?:daily |free |daily free )?prospect(?: status| claim| for today| today)?$/.test(q)||/^(?:have i|did i) claim(?:ed)? (?:my |the )?(?:daily )?free prospect(?: today)?$/.test(q))return {kind:'check_daily_prospect'} as const
 if(/^(?:check|show|review|inspect|tell me about) (?:me )?(?:my )?(?:distribution|stock|outlet)(?: status| records)?$/.test(q))return {kind:'check_distribution'} as const
 if(/^(?:check|show|review|inspect|tell me about) (?:me )?(?:my )?(?:file folder|builds?|construction)(?: status| records| progress)?$/.test(q)||/^how (?:is my file folder|are my builds) (?:doing|progressing)$/.test(q))return {kind:'check_file_folder'} as const
 if(/^(?:check|show|review|inspect) (?:me )?(?:the |our |company )?(?:release|deployment|production|system continuity)(?: status| evidence| health)?$/.test(q))return {kind:'check_release'} as const
 const nav=q.match(/^(?:open|go to|take me to|navigate to|bring me to|find|show me where to find)\s+(.+)$/)
 if(nav)return {kind:'navigate',query:nav[1].slice(0,160),auto:!/^(?:find|show me where to find) /.test(q)} as const
 const guide=q.match(/^(?:how (?:do|can|should) i|where (?:do|can) i|i want to|i need to)\s+(.+)$/)
 if(guide)return {kind:'navigate',query:guide[1].slice(0,160),auto:false} as const
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

/** Resolve a conversational reference only to navigation, never to a mutation.
 * The last recorded assistant movement is server-owned and its destination must
 * still be present in the current role's directory. */
export function flameFollowupDirection(role:string,message:string,previous?:FlameMovement):string|null{
 const q=normalize(message)
 if(!/^(?:open it|open that|take me there|go there|open the first one|open the second one|open the third one)$/.test(q))return null
 if(!previous||previous.state==='blocked')return null
 const index=q.includes('second')?1:q.includes('third')?2:q.includes('first')?0:previous.directions.length===1?0:-1
 const href=previous.directions[index]?.href
 return href&&flameDirections(role,[href]).length===1?'open '+href:null
}
