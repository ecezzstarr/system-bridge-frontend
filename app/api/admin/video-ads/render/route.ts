import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { getPool } from '@/lib/db'
import { ensureVideoAdWorkshopSchema, mapVideoAdProject, type VideoAdScene } from '@/lib/video-ad-workshop'
import { ensureVideoAdStudioSchema, VIDEO_STUDIO_CUSTOMER_ROLES } from '@/lib/video-ad-studio'
import { spawn } from 'node:child_process'
import { createWriteStream } from 'node:fs'
import { copyFile, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { mediaObjectNameFromUrl, mediaObjectPath, saveMediaFile } from '@/lib/weave-media-storage'

export const runtime = 'nodejs'
export const maxDuration = 900

const LEGACY_GCS_PREFIX = 'https://storage.googleapis.com/ssbnow-status-feed-media/'
const FONT_PATH = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'

async function runFfmpeg(args: string[]) {
  await new Promise<void>((resolve, reject) => {
    const child = spawn('ffmpeg', args, { stdio: ['ignore', 'ignore', 'pipe'] })
    let stderr = ''
    child.stderr.on('data', chunk => { stderr = (stderr + chunk.toString()).slice(-16000) })
    child.on('error', reject)
    child.on('close', code => code === 0 ? resolve() : reject(new Error(`Video renderer exited with code ${code}: ${stderr.slice(-3000)}`)))
  })
}

function safeConcatPath(filePath: string) {
  return filePath.replace(/'/g, "'\\''")
}

async function downloadAsset(url: string, destination: string) {
  const localObject = mediaObjectNameFromUrl(url)
  if (localObject) {
    const allowed = localObject.startsWith('video-ads/assets/') || localObject.startsWith('video-ads/customer-assets/')
    if (!allowed) throw new Error('Unrecognized Video Ad Studio media path')
    await copyFile(mediaObjectPath(localObject), destination)
    return
  }

  // Preserve existing projects created before self-hosting. Public legacy GCS
  // URLs can still be read over HTTPS without requiring a Google SDK credential.
  if (url.startsWith(LEGACY_GCS_PREFIX)) {
    const objectName = decodeURIComponent(url.slice(LEGACY_GCS_PREFIX.length))
    const allowed = objectName.startsWith('video-ads/assets/') || objectName.startsWith('video-ads/customer-assets/')
    if (!allowed) throw new Error('Unrecognized legacy Video Ad Studio media path')
    const response = await fetch(url, { cache: 'no-store' })
    if (!response.ok || !response.body) throw new Error(`Legacy media fetch failed (${response.status})`)
    await pipeline(Readable.fromWeb(response.body as any), createWriteStream(destination))
    return
  }

  throw new Error('Video Ad Studio only renders media held by WEAVE storage')
}

function extFor(url: string, fallback: string) {
  try {
    const parsed = new URL(url, 'https://weavingsystem.online')
    const ext = path.extname(parsed.pathname).slice(0, 8)
    return ext || fallback
  } catch {
    return fallback
  }
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  const isAdmin = user.role === 'admin'
  if (!isAdmin && !VIDEO_STUDIO_CUSTOMER_ROLES.has(user.role || '')) return NextResponse.json({ success: false, error: 'Video Studio access required' }, { status: 403 })

  let projectId = ''
  let workDir = ''
  try {
    const body = await request.json()
    projectId = String(body?.projectId || '')
    if (!projectId) return NextResponse.json({ success: false, error: 'Project id is required' }, { status: 400 })

    await ensureVideoAdWorkshopSchema()
    await ensureVideoAdStudioSchema()
    const pool = getPool()
    const current = await pool.query('SELECT * FROM admin_video_ad_projects WHERE id=$1::uuid', [projectId])
    const row = current.rows[0]
    if (!row) return NextResponse.json({ success: false, error: 'Video production not found' }, { status: 404 })

    if (!isAdmin) {
      if (String(row.created_by) !== String(user.id) || !row.order_id) return NextResponse.json({ success:false, error:'You can render only your own paid Video Studio production' },{status:403})
      const paid = await pool.query(`SELECT id FROM video_ad_studio_orders WHERE id=$1::uuid AND user_id=$2::uuid AND project_id=$3::uuid AND price_flame_coin>=0 LIMIT 1`,[row.order_id,user.id,projectId])
      if (!paid.rows[0]) return NextResponse.json({ success:false, error:'A paid Studio order is required before rendering' },{status:403})
    }
    if (row.status === 'rendering') return NextResponse.json({ success: false, error: 'This video is already rendering' }, { status: 409 })

    const scenes = (Array.isArray(row.storyboard) ? row.storyboard : []) as VideoAdScene[]
    if (!scenes.length) return NextResponse.json({ success: false, error: 'Storyboard has no scenes' }, { status: 400 })
    const total = scenes.reduce((sum, scene) => sum + Number(scene.durationSeconds || 0), 0)
    if (total !== Number(row.duration_seconds)) return NextResponse.json({ success: false, error: `Scene timing must total ${row.duration_seconds} seconds before rendering` }, { status: 400 })
    const missing = scenes.find(scene => !scene.assetUrl || !scene.assetType)
    if (missing) return NextResponse.json({ success: false, error: `Scene ${missing.order} needs an image or video before rendering` }, { status: 400 })

    await pool.query("UPDATE admin_video_ad_projects SET status='rendering',error_message=NULL,updated_at=NOW() WHERE id=$1::uuid", [projectId])
    workDir = await mkdtemp(path.join(tmpdir(), 'weave-video-ad-'))
    const segmentDir = path.join(workDir, 'segments')
    await mkdir(segmentDir, { recursive: true })
    const segments: string[] = []

    for (const scene of scenes) {
      const inputPath = path.join(workDir, `asset-${scene.order}${extFor(scene.assetUrl!, scene.assetType === 'image' ? '.jpg' : '.mp4')}`)
      const textPath = path.join(workDir, `text-${scene.order}.txt`)
      const segmentPath = path.join(segmentDir, `scene-${String(scene.order).padStart(2, '0')}.mp4`)
      await downloadAsset(scene.assetUrl!, inputPath)
      await writeFile(textPath, String(scene.text || '').replace(/\r/g, '').slice(0, 300), 'utf8')

      const duration = Math.max(1, Number(scene.durationSeconds || 1))
      const visualFilter = [
        'scale=720:1280:force_original_aspect_ratio=increase',
        'crop=720:1280',
        'setsar=1',
        'drawbox=x=0:y=ih*0.79:w=iw:h=ih*0.21:color=black@0.39:t=fill',
        `drawtext=fontfile=${FONT_PATH}:textfile=${textPath}:fontcolor=white:fontsize=36:line_spacing=10:x=(w-text_w)/2:y=h*0.855:box=1:boxcolor=black@0.08:boxborderw=16`,
        'fade=t=in:st=0:d=0.25',
        `fade=t=out:st=${Math.max(0, duration - 0.25)}:d=0.25`,
      ].join(',')
      const inputArgs = scene.assetType === 'image'
        ? ['-loop', '1', '-framerate', '30', '-i', inputPath]
        : ['-stream_loop', '-1', '-i', inputPath]
      await runFfmpeg(['-y', ...inputArgs, '-t', String(duration), '-vf', visualFilter, '-an', '-r', '30', '-c:v', 'libx264', '-preset', 'fast', '-crf', '20', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', segmentPath])
      segments.push(segmentPath)
    }

    const concatPath = path.join(workDir, 'concat.txt')
    await writeFile(concatPath, segments.map(file => `file '${safeConcatPath(file)}'`).join('\n'), 'utf8')
    const silentPath = path.join(workDir, 'silent.mp4')
    await runFfmpeg(['-y', '-f', 'concat', '-safe', '0', '-i', concatPath, '-c', 'copy', '-movflags', '+faststart', silentPath])

    let finalPath = silentPath
    const narrationUrl = row.narration_url ? String(row.narration_url) : ''
    const soundtrackUrl = row.soundtrack_url ? String(row.soundtrack_url) : ''
    if (narrationUrl || soundtrackUrl) {
      // The narrator remains intelligible: voice is the principal channel,
      // background music is deliberately quieter. Never treat script TEXT
      // as if it had already been synthesized into speech.
      const duration = Number(row.duration_seconds)
      const inputs = ['-y', '-i', silentPath]
      const tracks: string[] = []
      let inputIndex = 1
      let narratorTrack = ''
      let musicTrack = ''
      if (narrationUrl) {
        const narrationPath = path.join(workDir, `narration${extFor(narrationUrl, '.mp3')}`)
        await downloadAsset(narrationUrl, narrationPath)
        inputs.push('-i', narrationPath)
        narratorTrack = `[${inputIndex}:a]atrim=duration=${duration},asetpts=PTS-STARTPTS,apad,highpass=f=75,acompressor=threshold=-18dB:ratio=2.5:attack=10:release=180,volume=1.25[voice]`
        tracks.push('[voice]')
        inputIndex++
      }
      if (soundtrackUrl) {
        const soundtrackPath = path.join(workDir, `soundtrack${extFor(soundtrackUrl, '.mp3')}`)
        await downloadAsset(soundtrackUrl, soundtrackPath)
        inputs.push('-stream_loop', '-1', '-i', soundtrackPath)
        musicTrack = `[${inputIndex}:a]atrim=duration=${duration},asetpts=PTS-STARTPTS,volume=${narrationUrl ? '0.16' : '0.80'},apad[music]`
        tracks.push('[music]')
      }
      const audioFilter = [narratorTrack,musicTrack].filter(Boolean)
      if (tracks.length === 2) audioFilter.push(`${tracks.join('')}amix=inputs=2:duration=first:dropout_transition=0[mix]`)
      else audioFilter.push(`${tracks[0]}anull[mix]`)
      finalPath = path.join(workDir, 'final.mp4')
      await runFfmpeg([...inputs,'-filter_complex',audioFilter.join(';'),'-map','0:v:0','-map','[mix]','-t',String(duration),'-c:v','copy','-c:a','aac','-b:a','192k','-movflags','+faststart',finalPath])
    }

    const outputObject = `video-ads/renders/${new Date().toISOString().slice(0, 10)}/${projectId}.mp4`
    const outputUrl = await saveMediaFile(outputObject, finalPath, {
      contentType: 'video/mp4',
      cacheControl: 'public, max-age=31536000, immutable',
    })
    const updated = await pool.query("UPDATE admin_video_ad_projects SET status='ready',output_url=$2,error_message=NULL,updated_at=NOW() WHERE id=$1::uuid RETURNING *", [projectId, outputUrl])
    if (row.order_id) {
      await pool.query("UPDATE video_ad_studio_orders SET status='ready',output_url=$2,updated_at=NOW() WHERE id=$1::uuid", [row.order_id, outputUrl])
      await pool.query("UPDATE video_ad_service_orders SET status='ready',output_url=$2,updated_at=NOW() WHERE studio_order_id=$1::uuid",[row.order_id,outputUrl])
    }
    return NextResponse.json({ success: true, project: mapVideoAdProject(updated.rows[0]) })
  } catch (error: any) {
    console.error('[Video Ad Studio] render failed:', error)
    if (projectId) {
      try {
        const pool = getPool()
        await pool.query("UPDATE admin_video_ad_projects SET status='failed',error_message=$2,updated_at=NOW() WHERE id=$1::uuid", [projectId, String(error.message || 'Render failed').slice(0, 2000)])
      } catch {}
    }
    return NextResponse.json({ success: false, error: error.message || 'Video render failed' }, { status: 500 })
  } finally {
    if (workDir) await rm(workDir, { recursive: true, force: true }).catch(() => {})
  }
}
