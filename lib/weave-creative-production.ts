import {randomUUID} from 'node:crypto'
import {NextResponse} from 'next/server'
import {getPool} from '@/lib/db'
import {saveMediaObject} from '@/lib/weave-media-storage'
import {ensureImageWorkshopSchema,IMAGE_PRESETS,IMAGE_SIZES,IMAGE_MODELS,IMAGE_WORKSHOP_ROLES,type ImagePreset,type ImageSize} from '@/lib/weave-image-workshop'
import {withFlameUsage} from '@/lib/flame-usage'
import {FLAME_USAGE_COST} from '@/lib/flame-usage-policy'

export type CreativeKind='image'|'text'
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const headers={'Cache-Control':'private, no-store'}
const reply=(body:object,status=200)=>NextResponse.json(body,{status,headers})
function config(){
 const enabled=process.env.WEAVE_CREATIVE_ENABLED==='true'&&Boolean(process.env.WEAVE_CREATIVE_API_KEY?.trim())
 const imageModel=process.env.WEAVE_CREATIVE_IMAGE_MODEL?.trim()||''
 const textModel=process.env.WEAVE_CREATIVE_TEXT_MODEL?.trim()||''
 const imageReady=enabled&&(IMAGE_MODELS as readonly string[]).includes(imageModel)
 const textReady=enabled&&/^[a-zA-Z0-9._-]{1,80}$/.test(textModel)
 return {imageReady,textReady,imageModel,textModel}
}
export function creativeAvailability(role:string){
 const c=config()
 return {image:c.imageReady,text:c.textReady,costs:{image:role==='admin'?0:FLAME_USAGE_COST.creative_image,text:role==='admin'?0:FLAME_USAGE_COST.creative_text},presets:Object.keys(IMAGE_PRESETS),sizes:IMAGE_SIZES}
}
export function flameCreativeIntent(message:string){
 const m=message.trim().match(/^(?:flame[, ]+)?(?:please\s+)?(generate image|create image|write content|draft content)\s+(?:with provider)\s*:\s*([\s\S]+)$/i)
 return m?{kind:(/image/i.test(m[1])?'image':'text') as CreativeKind,prompt:m[2].trim()}:null
}
let schema:Promise<void>|null=null
async function ensure(){
 if(!schema)schema=(async()=>{
  await ensureImageWorkshopSchema()
  await getPool().query('CREATE TABLE IF NOT EXISTS weave_creative_jobs (id uuid PRIMARY KEY,user_id uuid NOT NULL REFERENCES users(id),kind text NOT NULL CHECK(kind IN (\'image\',\'text\')),prompt text NOT NULL,preset text NOT NULL,image_size text NOT NULL,status text NOT NULL CHECK(status IN (\'running\',\'completed\',\'failed\')),asset_id uuid,content text,created_at timestamptz NOT NULL DEFAULT now(),completed_at timestamptz)')
  await getPool().query('CREATE INDEX IF NOT EXISTS weave_creative_jobs_day ON weave_creative_jobs(created_at,user_id)')
 })().catch(e=>{schema=null;throw e})
 return schema
}
export async function creativeHistory(userId:string){
 await ensure()
 return (await getPool().query('SELECT id,kind,prompt,status,asset_id,content,created_at FROM weave_creative_jobs WHERE user_id=$1::uuid ORDER BY created_at DESC LIMIT 20',[userId])).rows
}
type CreativeInput={kind:CreativeKind;prompt:string;requestId:string;preset:ImagePreset;size:ImageSize}
function parse(body:any):CreativeInput|null{
 if(body?.allowProvider!==true||!uuid.test(String(body?.requestId||'')))return null
 if(body.kind!=='image'&&body.kind!=='text')return null
 const prompt=typeof body.prompt==='string'?body.prompt.trim():''
 if(prompt.length<5||prompt.length>4000||/(?:-----BEGIN|\bBearer\s+\S+|\b(?:password|api[_ -]?key|secret|token)\s*[:=])/i.test(prompt))return null
 const preset=body.preset??'cinematic',size=body.size??'1024x1024'
 if(!Object.prototype.hasOwnProperty.call(IMAGE_PRESETS,preset)||!(IMAGE_SIZES as readonly unknown[]).includes(size))return null
 return {kind:body.kind,prompt,requestId:body.requestId,preset,size}
}
async function reserveJob(userId:string,input:CreativeInput){
 await ensure()
 const conn=await getPool().connect()
 try{
  await conn.query('BEGIN')
  await conn.query("SELECT pg_advisory_xact_lock(hashtext('weave-creative-budget'))")
  const old=(await conn.query('SELECT user_id,kind,prompt,preset,image_size,status,asset_id,content FROM weave_creative_jobs WHERE id=$1::uuid',[input.requestId])).rows[0]
  if(old){
   await conn.query('COMMIT')
   if(String(old.user_id)!==userId||old.kind!==input.kind||old.prompt!==input.prompt||old.preset!==input.preset||old.image_size!==input.size)return {conflict:true} as const
   return {old} as const
  }
  const counts=(await conn.query("SELECT COUNT(*)::int AS total,COUNT(*) FILTER (WHERE user_id=$1::uuid)::int AS personal FROM weave_creative_jobs WHERE kind=$2 AND created_at>=date_trunc('day',now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'",[userId,input.kind])).rows[0]
  const limits=input.kind==='image'?{total:30,personal:3}:{total:150,personal:15}
  if(Number(counts.total)>=limits.total||Number(counts.personal)>=limits.personal){await conn.query('ROLLBACK');return {limited:true} as const}
  await conn.query("INSERT INTO weave_creative_jobs(id,user_id,kind,prompt,preset,image_size,status) VALUES($1::uuid,$2::uuid,$3,$4,$5,$6,'running')",[input.requestId,userId,input.kind,input.prompt,input.preset,input.size])
  await conn.query('COMMIT')
  return {reserved:true} as const
 }catch(e){await conn.query('ROLLBACK').catch(()=>{});throw e}
 finally{conn.release()}
}
async function boundedJson(response:Response,max:number){
 if(!response.ok){await response.body?.cancel().catch(()=>{});throw Error('Creative provider refused the request (HTTP '+response.status+').')}
 if(!response.body)throw Error('Empty provider response')
 const reader=response.body.getReader(),decoder=new TextDecoder()
 let size=0,text=''
 try{
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>max)throw Error('Provider response exceeded the size limit');text+=decoder.decode(value,{stream:true})}
  return JSON.parse(text+decoder.decode())
 }finally{await reader.cancel().catch(()=>{});reader.releaseLock()}
}
async function generate(input:CreativeInput){
 const c=config()
 const isImage=input.kind==='image'
 const key=process.env.WEAVE_CREATIVE_API_KEY?.trim()
 if(!key||!(isImage?c.imageReady:c.textReady))throw Error('Creative provider not enabled.')
 const model=isImage?c.imageModel:c.textModel
 const url=isImage?'https://api.openai.com/v1/images/generations':'https://api.openai.com/v1/responses'
 const body=isImage?{model,prompt:IMAGE_PRESETS[input.preset]+'\nUser brief: '+input.prompt,size:input.size,n:1,quality:'medium',output_format:'png'}:
  {model,input:input.prompt,instructions:'Create original requested content. Do not fabricate company claims, financial guarantees or verified facts; mark uncertainties. Do not claim that you published anything.',max_output_tokens:1800,store:false}
 const response=await fetch(url,{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify(body),redirect:'error',cache:'no-store',signal:AbortSignal.timeout(isImage?120000:45000)})
 const data=await boundedJson(response,isImage?40*1024*1024:1024*1024)
 if(!isImage){
  const text=(Array.isArray(data.output)?data.output:[]).flatMap((item:any)=>item.type==='message'&&Array.isArray(item.content)?item.content:[]).filter((p:any)=>p.type==='output_text').map((p:any)=>String(p.text||'')).join('\n').trim().slice(0,14000)
  if(!text)throw Error('No usable text was generated.')
  return {model,text}
 }
 const encoded=data?.data?.[0]?.b64_json
 if(typeof encoded!=='string'||encoded.length>36*1024*1024)throw Error('No usable image returned')
 const bytes=Buffer.from(encoded,'base64')
 if(bytes.length>26*1024*1024||bytes.length<8||!bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))throw Error('Invalid PNG output')
 return {model,bytes}
}
export async function runCreativeProduction(user:{id:string;role:string},body:unknown){
 if(!IMAGE_WORKSHOP_ROLES.has(user.role))return reply({error:'Creative workshop access denied.'},403)
 const input=parse(body)
 if(!input)return reply({error:'A valid production request, explicit provider consent and public/non-confidential brief are required.'},400)
 const available=creativeAvailability(user.role)
 if(!available[input.kind])return reply({error:'Administrations has not enabled this production engine.'},503)
 const reserved=await reserveJob(String(user.id),input)
 if('conflict' in reserved)return reply({error:'Request identifier conflict.'},409)
 if('limited' in reserved)return reply({error:'Daily creative production limit reached.'},429)
 if('old' in reserved){
  const old=reserved.old
  if(old.status==='completed')return reply({success:true,kind:input.kind,assetId:old.asset_id,content:old.content,replayed:true})
  return reply({error:old.status==='running'?'This request is already in progress. Check its workshop record.':'This request failed. Review the workshop record before starting another.'},409)
 }
 const pool=getPool()
 const markFailed=()=>pool.query("UPDATE weave_creative_jobs SET status='failed',completed_at=now() WHERE id=$1::uuid AND user_id=$2::uuid AND status='running'",[input.requestId,user.id])
 try{
  const result=await withFlameUsage(user.id,user.role,input.kind==='image'?'creative_image':'creative_text',async()=>{
   try{
    const generated=await generate(input)
    if(input.kind==='text'&&generated.text){
     await pool.query("UPDATE weave_creative_jobs SET status='completed',content=$3,completed_at=now() WHERE id=$1::uuid AND user_id=$2::uuid",[input.requestId,user.id,generated.text])
     return reply({success:true,kind:'text',content:generated.text})
    }
    if(!generated.bytes)throw Error('Image missing')
    const assetId=randomUUID(),objectName='weave-private/images/'+user.id+'/'+assetId+'.png'
    await saveMediaObject(objectName,generated.bytes,{contentType:'image/png',cacheControl:'private, no-store'})
    const conn=await pool.connect()
    try{
     await conn.query('BEGIN')
     await conn.query("INSERT INTO weave_image_workshop_jobs(id,user_id,prompt,preset,model,image_size,image_count,status,completed_at) VALUES($1::uuid,$2::uuid,$3,$4,$5,$6,1,'completed',now())",[input.requestId,user.id,input.prompt,input.preset,generated.model,input.size])
     await conn.query("INSERT INTO weave_image_workshop_assets(id,job_id,user_id,object_name,prompt,preset,image_size,model) VALUES($1::uuid,$2::uuid,$3::uuid,$4,$5,$6,$7,$8)",[assetId,input.requestId,user.id,objectName,input.prompt,input.preset,input.size,generated.model])
     await conn.query("UPDATE weave_creative_jobs SET status='completed',asset_id=$3::uuid,completed_at=now() WHERE id=$1::uuid AND user_id=$2::uuid",[input.requestId,user.id,assetId])
     await conn.query('COMMIT')
    }catch(error){await conn.query('ROLLBACK').catch(()=>{});throw error}finally{conn.release()}
    return reply({success:true,kind:'image',assetId})
   }catch{await markFailed().catch(()=>{});return reply({error:'Production could not be confirmed. Check the workshop record before requesting another job.'},503)}
  },b=>b.success===true)
  if(!result.ok)await markFailed().catch(()=>{})
  return result
 }catch{await markFailed().catch(()=>{});return reply({error:'Production could not be confirmed. Check the workshop record.'},503)}
}
