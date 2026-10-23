import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { getPool } from '@/lib/db'
import { ensureVideoAdWorkshopSchema, mapVideoAdProject } from '@/lib/video-ad-workshop'
import { saveMediaFile } from '@/lib/weave-media-storage'
import { randomUUID } from 'node:crypto'
import { spawn } from 'node:child_process'
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

export const runtime = 'nodejs'
export const maxDuration = 180

function voiceSettings() {
  const executable = process.env.WEAVE_PIPER_BIN || ''
  const model = process.env.WEAVE_PIPER_MODEL || ''
  return { executable, model, enabled: Boolean(executable && model) }
}

// The WEAVE engine runs locally with a licensed neural voice model.
// No script is sent to a third-party voice generation website.
export async function GET(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user) return NextResponse.json({ success:false, error:'Unauthorized' },{status:401})
  if (user.role !== 'admin') return NextResponse.json({ success:false, error:'Administration access required' },{status:403})
  const voice = voiceSettings()
  return NextResponse.json({ success:true, available:voice.enabled, engine:'WEAVE Local Voice', message:voice.enabled?'Local voice engine configured':'Local voice engine not yet configured. Record or upload narration in the Studio.' })
}

async function synthesize(executable: string, model: string, script: string, destination: string) {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(executable, ['--model',model,'--output_file',destination],{
      stdio:['pipe','ignore','pipe'],
      signal:AbortSignal.timeout(150000),
    })
    let stderr = ''
    child.stderr.on('data', chunk => {stderr=(stderr+chunk.toString()).slice(-4000)})
    child.on('error',reject)
    child.on('close',code=>code===0?resolve():reject(new Error(`Local voice engine exited (${code}): ${stderr.slice(-300)}`)))
    child.stdin.on('error', () => {})
    child.stdin.end(script, 'utf8')
  })
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user) return NextResponse.json({ success:false, error:'Unauthorized' },{status:401})
  if (user.role !== 'admin') return NextResponse.json({ success:false, error:'Administration access required' },{status:403})
  const voice = voiceSettings()
  if (!voice.enabled) return NextResponse.json({ success:false, error:'WEAVE Local Voice is not configured on this server. Record or upload a narration track instead.' },{status:503})
  let folder=''
  try {
    await stat(voice.model)
    const body=await request.json()
    const projectId=String(body?.projectId||'')
    if (!/^[0-9a-f-]{36}$/i.test(projectId)) return NextResponse.json({ success:false,error:'Valid project ID required' },{status:400})
    await ensureVideoAdWorkshopSchema()
    const pool=getPool()
    const original=await pool.query('SELECT * FROM admin_video_ad_projects WHERE id=$1::uuid AND created_by=$2::uuid',[projectId,user.id])
    const row=original.rows[0]
    if (!row) return NextResponse.json({ success:false,error:'Production not found' },{status:404})
    if (row.status==='rendering') return NextResponse.json({success:false,error:'Cannot change audio during rendering'},{status:409})
    const script=String(row.narration_script||'')
    if (!script.trim()) return NextResponse.json({success:false,error:'This production has no original narration script'},{status:400})
    if (script.length > 3400) return NextResponse.json({success:false,error:'Split the chapter into smaller episodes before generating narration'},{status:400})

    folder=await mkdtemp(path.join(tmpdir(),'weave-narration-'))
    const wav=path.join(folder,'voice.wav')
    await synthesize(voice.executable,voice.model,script,wav)
    if ((await stat(wav)).size < 1000) throw new Error('Local voice engine returned empty audio')
    const objectName=`video-ads/assets/voice/${new Date().toISOString().slice(0,10)}/${randomUUID()}.wav`
    const url=await saveMediaFile(objectName,wav,{contentType:'audio/wav',cacheControl:'private, max-age=3600'})
    const updated=await pool.query(
      `UPDATE admin_video_ad_projects SET narration_url=$2,status='planned',output_url=NULL,error_message=NULL,updated_at=NOW() WHERE id=$1::uuid AND created_by=$3::uuid RETURNING *`,
      [projectId,url,user.id]
    )
    return NextResponse.json({success:true,project:mapVideoAdProject(updated.rows[0])})
  } catch (error:any) {
    console.error('[WEAVE Voice] generation failed:',error)
    return NextResponse.json({success:false,error:'Local voice production failed. Check the installed voice model and server logs; you can still record or upload narration.'},{status:500})
  } finally {
    if(folder)await rm(folder,{recursive:true,force:true}).catch(()=>{})
  }
}
