import {NextRequest,NextResponse} from 'next/server'
import {randomUUID} from 'node:crypto'
import {readFile} from 'node:fs/promises'
import {getAuthUser} from '@/lib/auth-api'
import {getPool} from '@/lib/db'
import {getMediaObjectInfo,saveMediaObject} from '@/lib/weave-media-storage'
import {
  ensureImageWorkshopSchema,IMAGE_MODELS,IMAGE_PRESETS,IMAGE_SIZES,
  IMAGE_WORKSHOP_ROLES,imageWorkshopAssets,imageWorkshopConfigured,
  imageWorkshopDailyLimit,imageWorkshopTodayUsed,
  type ImageModel,type ImagePreset,type ImageSize,
} from '@/lib/weave-image-workshop'

export const runtime='nodejs'
export const dynamic='force-dynamic'
export const maxDuration=180
const reply=(error:string,status:number)=>NextResponse.json({success:false,error},{status,headers:{'Cache-Control':'private, no-store'}})
const uuid=(value:string)=>/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
const MIME=new Set(['image/png','image/jpeg','image/webp'])

function imageBytesMatch(type:string,bytes:Buffer) {
  if(type==='image/png')return bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))
  if(type==='image/jpeg')return bytes[0]===255&&bytes[1]===216&&bytes[2]===255
  if(type==='image/webp')return bytes.subarray(0,4).toString()==='RIFF'&&bytes.subarray(8,12).toString()==='WEBP'
  return false
}
async function checkedImage(file:File){
  if(!MIME.has(file.type)||!file.size||file.size>8*1024*1024)throw new Error('References must be JPG, PNG or WEBP, at most 8 MB each.')
  const bytes=Buffer.from(await file.arrayBuffer())
  if(!imageBytesMatch(file.type,bytes))throw new Error('One reference image has an invalid file format.')
  return {bytes,type:file.type,name:file.name.replace(/[^a-zA-Z0-9._-]/g,'_').slice(0,90)||'reference'}
}

export async function GET(req:NextRequest){
  const user=await getAuthUser(req)
  if(!user)return reply('Sign in to use the Image Workshop.',401)
  if(!IMAGE_WORKSHOP_ROLES.has(user.role))return reply('This position cannot open the Image Workshop.',403)
  try {
    await ensureImageWorkshopSchema()
    const [assets,used]=await Promise.all([imageWorkshopAssets(user.id),imageWorkshopTodayUsed(user.id)])
    return NextResponse.json({success:true,configured:imageWorkshopConfigured(),
      limit:imageWorkshopDailyLimit(),used,assets,presets:Object.keys(IMAGE_PRESETS)},
      {headers:{'Cache-Control':'private, no-store'}})
  }catch(error){
    console.error('[Image Workshop] Gallery unavailable',error)
    return reply('The image gallery is temporarily unavailable.',500)
  }
}

export async function POST(req:NextRequest){
  const user=await getAuthUser(req)
  if(!user)return reply('Sign in to generate images.',401)
  if(!IMAGE_WORKSHOP_ROLES.has(user.role))return reply('This position cannot generate images.',403)
  if(!imageWorkshopConfigured())return reply('AI Image Workshop is not yet activated by Administrations. The classic image layout maker remains available.',503)

  let jobId:string|null=null
  try{
    await ensureImageWorkshopSchema()
    const form=await req.formData()
    const prompt=String(form.get('prompt')||'').trim()
    const preset=String(form.get('preset')||'photographic') as ImagePreset
    const model=String(form.get('model')||IMAGE_MODELS[0]) as ImageModel
    const size=String(form.get('size')||IMAGE_SIZES[0]) as ImageSize
    const quality=String(form.get('quality')||'medium')
    const background=String(form.get('background')||'auto')
    const count=Number(form.get('count')||1)
    const refineId=String(form.get('refineId')||'').trim()
    if(prompt.length<6||prompt.length>5000)return reply('Describe the image in 6 to 5,000 characters.',400)
    if(!(preset in IMAGE_PRESETS)||!IMAGE_MODELS.includes(model)||!IMAGE_SIZES.includes(size)||!['medium','high'].includes(quality)
      ||!['auto','opaque','transparent'].includes(background)||![1,2].includes(count))
      return reply('Choose supported image style, model, quality, format and quantity.',400)
    if(refineId&&!uuid(refineId))return reply('Choose a valid image from your gallery to refine.',400)

    const raw=form.getAll('references')
    if(raw.length>3||raw.some(f=>!(f instanceof File)))return reply('Upload at most three reference images.',400)
    if(raw.length+(refineId?1:0)>3)return reply('Use at most three references including your gallery selection.',400)
    const references=await Promise.all((raw as File[]).map(checkedImage))
    if(refineId){
      const row=(await getPool().query('SELECT object_name FROM weave_image_workshop_assets WHERE id=$1::uuid AND user_id=$2::uuid LIMIT 1',
        [refineId,user.id])).rows[0]
      if(!row)return reply('That reference image is not in your gallery.',404)
      const file=await getMediaObjectInfo(String(row.object_name))
      if(file.size>12*1024*1024)return reply('This saved image is too large to reuse as a reference.',413)
      references.unshift({bytes:await readFile(file.filePath),type:'image/png',name:'previous-weave-image.png'})
    }

    const pool=getPool()
    const client=await pool.connect()
    try{
      await client.query('BEGIN')
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))',['weave-image:'+user.id])
      await client.query(`UPDATE weave_image_workshop_jobs SET status='failed',error_message='Image request interrupted.',completed_at=now()
        WHERE user_id=$1::uuid AND status='running' AND created_at<now()-interval '8 minutes'`,[user.id])
      const active=(await client.query(`SELECT id FROM weave_image_workshop_jobs
        WHERE user_id=$1::uuid AND status='running' LIMIT 1`,[user.id])).rows
      if(active.length){await client.query('ROLLBACK');return reply('An image request is already running. Finish that request before starting another.',409)}
      const used=(await client.query(`SELECT COALESCE(SUM(image_count),0)::int AS used
        FROM weave_image_workshop_jobs WHERE user_id=$1::uuid
        AND created_at>=date_trunc('day',now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'
        AND status IN ('running','completed')`,[user.id])).rows[0]
      if(Number(used?.used||0)+count>imageWorkshopDailyLimit()){
        await client.query('ROLLBACK')
        return reply('Today’s Image Workshop creation limit has been reached. Existing images remain available.',429)
      }
      const inserted=(await client.query(`INSERT INTO weave_image_workshop_jobs
        (user_id,prompt,preset,model,image_size,image_count,status)
        VALUES($1::uuid,$2,$3,$4,$5,$6,'running') RETURNING id`,
        [user.id,prompt,preset,model,size,count])).rows[0]
      jobId=String(inserted.id)
      await client.query('COMMIT')
    }catch(e){await client.query('ROLLBACK').catch(()=>{});throw e}finally{client.release()}

    const instruction=`Create professional original artwork. Direction: ${IMAGE_PRESETS[preset]}\nUser brief: ${prompt}\nKeep any specifically requested writing accurate and readable. Preserve the main subject and intentional details when editing supplied reference images. Do not place unsolicited labels, logos or watermarks.`
    let upstream:Response
    const abort=AbortSignal.timeout(150000)
    if(references.length){
      const body=new FormData()
      const imageField=references.length===1?'image':'image[]'
      for(const [index,ref] of references.entries()){
        const extension=ref.type==='image/jpeg'?'jpg':ref.type==='image/webp'?'webp':'png'
        body.append(imageField,new Blob([new Uint8Array(ref.bytes)],{type:ref.type}),`reference-${index+1}.${extension}`)
      }
      for(const [key,value] of Object.entries({model,prompt:instruction,size,quality,background,n:String(count),output_format:'png'})){
        body.append(key,value)
      }
      upstream=await fetch('https://api.openai.com/v1/images/edits',{
        method:'POST',headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`},
        body,signal:abort,cache:'no-store'})
    }else{
      upstream=await fetch('https://api.openai.com/v1/images/generations',{
        method:'POST',headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json'},
        body:JSON.stringify({model,prompt:instruction,size,quality,background,n:count,output_format:'png'}),
        signal:abort,cache:'no-store'})
    }
    const provider=await upstream.json().catch(()=>({}))
    if(!upstream.ok)throw new Error(upstream.status===429?'The image provider is busy. Please try again.':
      upstream.status===401||upstream.status===403?'Administrations must verify the image-provider configuration.':
      String(provider?.error?.message||'The image provider could not complete the request.').slice(0,220))
    const results=Array.isArray(provider.data)?provider.data:[]
    if(!results.length||results.length>count||results.some((x:unknown)=>typeof (x as {b64_json?:unknown})?.b64_json!=='string'))
      throw new Error('The image provider returned no valid image data.')
    const created:string[]=[]
    for(const result of results){
      const bytes=Buffer.from(String(result.b64_json),'base64')
      if(bytes.length<1000||bytes.length>28*1024*1024||!imageBytesMatch('image/png',bytes))
        throw new Error('The image provider returned an invalid image file.')
      const objectName=`weave-private/images/${user.id}/${randomUUID()}.png`
      await saveMediaObject(objectName,bytes,{contentType:'image/png',cacheControl:'private, no-store'})
      const inserted=(await pool.query(`INSERT INTO weave_image_workshop_assets
        (job_id,user_id,object_name,prompt,preset,image_size,model)
        VALUES($1::uuid,$2::uuid,$3,$4,$5,$6,$7) RETURNING id`,
        [jobId,user.id,objectName,prompt,preset,size,model])).rows[0]
      created.push(String(inserted.id))
    }
    await pool.query(`UPDATE weave_image_workshop_jobs SET status='completed',completed_at=now() WHERE id=$1::uuid`,[jobId])
    const assets=await imageWorkshopAssets(user.id)
    return NextResponse.json({success:true,created,assets,used:await imageWorkshopTodayUsed(user.id),
      limit:imageWorkshopDailyLimit()},{headers:{'Cache-Control':'private, no-store'}})
  }catch(error){
    if(jobId){
      await getPool().query(`UPDATE weave_image_workshop_jobs SET status='failed',completed_at=now(),error_message=$2
        WHERE id=$1::uuid`,[jobId,error instanceof Error?error.message.slice(0,300):'Image request failed']).catch(()=>{})
    }
    console.error('[Image Workshop] Generation failed',error instanceof Error?error.message:'Unknown failure')
    const message=error instanceof Error?error.message:'AI image request failed.'
    const status=message.includes('reference')||message.includes('file')?400:502
    return reply(message.slice(0,260),status)
  }
}
