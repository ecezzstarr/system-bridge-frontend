import { NextRequest, NextResponse } from 'next/server'
import { Storage } from '@google-cloud/storage'
import { getAuthUser } from '@/lib/auth-api'
import { getPool } from '@/lib/db'
import { ensureVideoAdWorkshopSchema, mapVideoAdProject, type VideoAdScene } from '@/lib/video-ad-workshop'
import { spawn } from 'node:child_process'
import { createReadStream } from 'node:fs'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { pipeline } from 'node:stream/promises'

export const runtime = 'nodejs'
export const maxDuration = 900

const BUCKET_NAME = 'ssbnow-status-feed-media'
const PUBLIC_PREFIX = `https://storage.googleapis.com/${BUCKET_NAME}/`
const FONT_PATH = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
const storage = new Storage()

function gcsObjectName(url: string) {
  if (!url.startsWith(PUBLIC_PREFIX)) throw new Error('Video Ad Workshop only renders media uploaded to the WEAVE media bucket')
  const name = decodeURIComponent(url.slice(PUBLIC_PREFIX.length))
  if (!name.startsWith('video-ads/assets/')) throw new Error('Unrecognized Video Ad Workshop media path')
  return name
}

async function runFfmpeg(args: string[]) {
  await new Promise<void>((resolve, reject) => {
    const child = spawn('ffmpeg', args, { stdio: ['ignore', 'ignore', 'pipe'] })
    let stderr = ''
    child.stderr.on('data', chunk => {
      stderr = (stderr + chunk.toString()).slice(-16000)
    })
    child.on('error', reject)
    child.on('close', code => {
      if (code === 0) resolve()
      else reject(new Error(`Video renderer exited with code ${code}: ${stderr.slice(-3000)}`))
    })
  })
}

function safeConcatPath(filePath: string) {
  return filePath.replace(/'/g, "'\\''")
}

async function downloadAsset(url: string, destination: string) {
  const objectName = gcsObjectName(url)
  await storage.bucket(BUCKET_NAME).file(objectName).download({ destination })
}

function extFor(url: string, fallback: string) {
  try {
    const ext = path.extname(new URL(url).pathname).slice(0, 8)
    return ext || fallback
  } catch {
    return fallback
  }
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  if (user.role !== 'admin') return NextResponse.json({ success: false, error: 'Administration access required' }, { status: 403 })

  let projectId = ''
  let workDir = ''
  try {
    const body = await request.json()
    projectId = String(body?.projectId || '')
    if (!projectId) return NextResponse.json({ success: false, error: 'Project id is required' }, { status: 400 })

    await ensureVideoAdWorkshopSchema()
    const pool = getPool()
    const current = await pool.query('SELECT * FROM admin_video_ad_projects WHERE id=$1::uuid FOR UPDATE', [projectId])
    const row = current.rows[0]
    if (!row) return NextResponse.json({ success: false, error: 'Video ad project not found' }, { status: 404 })
    if (row.status === 'rendering') return NextResponse.json({ success: false, error: 'This video ad is already rendering' }, { status: 409 })

    const scenes = (Array.isArray(row.storyboard) ? row.storyboard : []) as VideoAdScene[]
    if (!scenes.length) return NextResponse.json({ success: false, error: 'Storyboard has no scenes' }, { status: 400 })
    const total = scenes.reduce((sum, scene) => sum + Number(scene.durationSeconds || 0), 0)
    if (total !== Number(row.duration_seconds)) {
      return NextResponse.json({ success: false, error: `Scene timing must total ${row.duration_seconds} seconds before rendering` }, { status: 400 })
    }
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
        'drawbox=x=0:y=ih*0.70:w=iw:h=ih*0.30:color=black@0.42:t=fill',
        `drawtext=fontfile=${FONT_PATH}:textfile=${textPath}:fontcolor=white:fontsize=44:line_spacing=12:x=(w-text_w)/2:y=h*0.78:box=1:boxcolor=black@0.14:boxborderw=20`,
        'fade=t=in:st=0:d=0.25',
        `fade=t=out:st=${Math.max(0, duration - 0.25)}:d=0.25`,
      ].join(',')

      const inputArgs = scene.assetType === 'image'
        ? ['-loop', '1', '-framerate', '30', '-i', inputPath]
        : ['-stream_loop', '-1', '-i', inputPath]
      await runFfmpeg([
        '-y',
        ...inputArgs,
        '-t', String(duration),
        '-vf', visualFilter,
        '-an',
        '-r', '30',
        '-c:v', 'libx264',
        '-preset', 'veryfast',
        '-crf', '24',
        '-pix_fmt', 'yuv420p',
        '-movflags', '+faststart',
        segmentPath,
      ])
      segments.push(segmentPath)
    }

    const concatPath = path.join(workDir, 'concat.txt')
    await writeFile(concatPath, segments.map(file => `file '${safeConcatPath(file)}'`).join('\n'), 'utf8')
    const silentPath = path.join(workDir, 'silent.mp4')
    await runFfmpeg(['-y', '-f', 'concat', '-safe', '0', '-i', concatPath, '-c', 'copy', '-movflags', '+faststart', silentPath])

    let finalPath = silentPath
    if (row.soundtrack_url) {
      const soundtrackPath = path.join(workDir, `soundtrack${extFor(row.soundtrack_url, '.mp3')}`)
      await downloadAsset(row.soundtrack_url, soundtrackPath)
      finalPath = path.join(workDir, 'final.mp4')
      await runFfmpeg([
        '-y',
        '-i', silentPath,
        '-stream_loop', '-1',
        '-i', soundtrackPath,
        '-t', String(row.duration_seconds),
        '-map', '0:v:0',
        '-map', '1:a:0',
        '-c:v', 'copy',
        '-c:a', 'aac',
        '-b:a', '160k',
        '-shortest',
        '-movflags', '+faststart',
        finalPath,
      ])
    }

    const outputObject = `video-ads/renders/${new Date().toISOString().slice(0, 10)}/${projectId}.mp4`
    const blob = storage.bucket(BUCKET_NAME).file(outputObject)
    await pipeline(
      createReadStream(finalPath),
      blob.createWriteStream({
        resumable: false,
        metadata: { contentType: 'video/mp4', cacheControl: 'public, max-age=31536000' },
      })
    )
    const outputUrl = `https://storage.googleapis.com/${BUCKET_NAME}/${outputObject}`
    const updated = await pool.query(
      "UPDATE admin_video_ad_projects SET status='ready',output_url=$2,error_message=NULL,updated_at=NOW() WHERE id=$1::uuid RETURNING *",
      [projectId, outputUrl]
    )
    return NextResponse.json({ success: true, project: mapVideoAdProject(updated.rows[0]) })
  } catch (error: any) {
    console.error('[Video Ad Workshop] render failed:', error)
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
