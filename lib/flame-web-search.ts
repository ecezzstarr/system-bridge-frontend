import {getPool,sql} from '@/lib/db'

export function flameWebQuery(message:string):string|null{
 const match=message.trim().match(/^(?:flame[, ]+)?(?:please\s+|could you\s+|can you\s+)?(?:web search\s*:\s*|search the (?:web|internet) for\s+|search online for\s+|look up online\s+)([\s\S]+)$/i)
 return match?match[1].trim():null
}
export function validateFlameWebQuery(query:string){
 if(query.length<3||query.length>400||query.split(/\s+/).length>60||/[\r\n]/.test(query))throw Error('Enter a public search topic of 3–400 characters on one line.')
 if(/(?:-----BEGIN|\bBearer\s+\S+|\b(?:password|api[_ -]?key|secret|token)\s*[:=])/i.test(query))throw Error('Do not send credentials or confidential records to web search.')
 return query
}
let schema:Promise<void>|null=null
async function ensureSearchBudget(){
 if(!schema)schema=(async()=>{
  await sql`CREATE TABLE IF NOT EXISTS weave_flame_web_search_budget (
   scope text NOT NULL, day date NOT NULL, requests integer NOT NULL DEFAULT 0,
   PRIMARY KEY(scope,day)
  )`
 })().catch(error=>{schema=null;throw error})
 return schema
}
async function reserveSearch(actorId:string){
 await ensureSearchBudget()
 const conn=await getPool().connect()
 try{
  await conn.query('BEGIN')
  for(const [scope,limit] of [['company',500],['account:'+actorId,20]] as const){
   const result=await conn.query(`INSERT INTO weave_flame_web_search_budget(scope,day,requests)
    VALUES($1,(NOW() AT TIME ZONE 'UTC')::date,1)
    ON CONFLICT(scope,day) DO UPDATE SET requests=weave_flame_web_search_budget.requests+1
    WHERE weave_flame_web_search_budget.requests<$2 RETURNING requests`,[scope,limit])
   if(!result.rowCount)throw Error('Web search daily limit reached. Try again after UTC midnight.')
  }
  await conn.query('COMMIT')
 }catch(error){await conn.query('ROLLBACK').catch(()=>{});throw error}
 finally{conn.release()}
}
function publicResultUrl(value:unknown){
 try{
  if(typeof value!=='string'||value.length>2048)return null
  const url=new URL(value)
  if(!['https:','http:'].includes(url.protocol)||url.username||url.password)return null
  return url.href
 }catch{return null}
}
const plain=(v:unknown,max:number)=>String(v||'').replace(/<[^>]*>/g,' ').replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim().slice(0,max)
export function normalizeFlameSearch(body:unknown){
 const results=(body as {web?:{results?:unknown}})?.web?.results
 if(!Array.isArray(results))return []
 return results.slice(0,8).flatMap(item=>{
  const url=publicResultUrl(item?.url)
  const title=plain(item?.title,180)
  if(!url||!title)return []
  return [{title,url,description:plain(item?.description,300)}]
 })
}
/** Fixed, non-generative search endpoint. Only the explicit public query leaves
 * Weave; no conversation, user identity, source code or model output is sent. */
export async function searchFlameWeb(actorId:string,rawQuery:string){
 const query=validateFlameWebQuery(rawQuery)
 const key=process.env.WEAVE_WEB_SEARCH_API_KEY?.trim()
 if(!key)throw Error('Web search is not configured. Administrations must configure the company search credential.')
 await reserveSearch(actorId)
 const url=new URL('https://api.search.brave.com/res/v1/web/search')
 url.searchParams.set('q',query)
 url.searchParams.set('count','8')
 url.searchParams.set('safesearch','moderate')
 url.searchParams.set('text_decorations','false')
 const response=await fetch(url,{headers:{Accept:'application/json','X-Subscription-Token':key},cache:'no-store',redirect:'error',signal:AbortSignal.timeout(10000)})
 if(!response.ok){await response.body?.cancel().catch(()=>{});throw Error('Public search provider unavailable (HTTP '+response.status+').')}
 if(!response.body)throw Error('Public search returned no readable response.')
 const reader=response.body.getReader()
 const decoder=new TextDecoder()
 let bytes=0,body=''
 try{
  while(true){
   const part=await reader.read()
   if(part.done)break
   bytes+=part.value.byteLength
   if(bytes>512*1024)throw Error('Search response exceeded the size limit.')
   body+=decoder.decode(part.value,{stream:true})
  }
  body+=decoder.decode()
 }finally{await reader.cancel().catch(()=>{});reader.releaseLock()}
 const results=normalizeFlameSearch(JSON.parse(body))
 return {query,results,observedAt:new Date().toISOString()}
}
export async function flameWebSearchReply(actorId:string,query:string){
 const result=await searchFlameWeb(actorId,query)
 return 'Public web search: '+result.query+'\nRetrieved: '+result.observedAt+'\n'+(result.results.length?result.results.map((r,i)=>(i+1)+'. '+r.title+'\n'+r.description+'\n'+r.url).join('\n\n'):'No matching web results were returned.')+'\n\nSearch index excerpts are leads, not independently verified facts. Open the sources to confirm their relevance, date and accuracy.'
}
