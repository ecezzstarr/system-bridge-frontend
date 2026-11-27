import {getReleaseWorkshopState} from '@/lib/weave-release-workshop'
import {readWorkshopSource} from '@/lib/weave-code-workshop'

/** Eight's institutional preservation tools are read-only. Code, merge and
 * deployment authority remain with their existing independent workshops. */
export async function readContinuityEvidence(){
 const state=await getReleaseWorkshopState()
 return {
  observedAt:new Date().toISOString(),
  hostProvider:state.hostProvider,
  activeRelease:state.activeRelease,
  workerOnline:state.workerOnline,
  workerLastSeen:state.workerLastSeen,
  healthyReleaseCount:state.healthyReleaseCount,
  recentJobs:state.jobs.slice(0,8).map(job=>({
   action:job.action,status:job.status,targetSha:job.target_sha,
   resolvedSha:job.resolved_sha,requestedAt:job.requested_at,finishedAt:job.finished_at,
  })),
  limitations:'Release evidence is not proof of every workflow being healthy. Missing evidence must be investigated.',
  workshops:{code:'/admin/code-workshop',release:'/admin/release-workshop',infrastructure:'/admin/infrastructure',records:'/admin/deployment-records'},
 }
}

export async function readContinuitySource(actorId:string,path:string,directory=false){
 const result=await readWorkshopSource({actorId,branch:'main',...(directory?{directory:path}:{path})})
 if('content' in result && typeof result.content==='string'){
  const content=result.content
  return {...result,content:content.slice(0,16000),truncated:content.length>16000}
 }
 return result
}

/** Only an explicitly supplied public research topic goes to this fixed
 * scholarly index. No repository content, database context or model-generated
 * queries are sent. Findings are bibliographic leads, not verified conclusions. */
export function publicResearchTopic(command:string):string|null{
 const match=/^research:\s*(.{3,240})$/i.exec(command.trim())
 return match?match[1].trim():null
}

export async function discoverResearch(topic:string){
 if(topic.length<3||topic.length>240)throw Error('Enter a public research topic of 3–240 characters')
 const url=new URL('https://api.crossref.org/works')
 url.searchParams.set('query.bibliographic',topic)
 url.searchParams.set('rows','8')
 url.searchParams.set('select','DOI,title,published,URL,type,publisher')
 const response=await fetch(url,{cache:'no-store',redirect:'error',signal:AbortSignal.timeout(10000),headers:{Accept:'application/json'}})
 if(!response.ok)throw Error('Research index unavailable (HTTP '+response.status+')')
 const body=await response.json()
 if(!Array.isArray(body?.message?.items))throw Error('Research index returned an invalid response')
 return {
  index:'Crossref',topic,observedAt:new Date().toISOString(),
  sources:body.message.items.slice(0,8).map((item:any)=>({
   title:String(item.title?.[0]||'Untitled').slice(0,500),
   doi:String(item.DOI||'').slice(0,250),
   url:String(item.URL||'').slice(0,500),
   published:item.published?.['date-parts']?.[0]||null,
   type:String(item.type||''),publisher:String(item.publisher||'').slice(0,250),
  })),
  limitations:'Bibliographic discovery only. Read primary sources and verify dates, methods, relevance and feasibility before recommending implementation.',
 }
}
