import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { getPool } from '@/lib/db'
import {
  clampVideoAdDuration,
  ensureVideoAdWorkshopSchema,
  generateVideoAdStoryboard,
  mapVideoAdProject,
  type VideoAdScene,
} from '@/lib/video-ad-workshop'

async function requireAdmin(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user) return { error: NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 }) }
  if (user.role !== 'admin') return { error: NextResponse.json({ success: false, error: 'Administration access required' }, { status: 403 }) }
  return { user }
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  try {
    await ensureVideoAdWorkshopSchema()
    const pool = getPool()
    const result = await pool.query('SELECT * FROM admin_video_ad_projects ORDER BY updated_at DESC LIMIT 40')
    return NextResponse.json({ success: true, projects: result.rows.map(mapVideoAdProject) })
  } catch (error: any) {
    console.error('[Video Ad Workshop] list failed:', error)
    return NextResponse.json({ success: false, error: error.message || 'Unable to load video ads' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  try {
    const body = await request.json()
    const title = String(body?.title || '').trim().slice(0, 160)
    const subject = String(body?.subject || '').trim().slice(0, 1200)
    const objective = String(body?.objective || '').trim().slice(0, 1200)
    const audience = String(body?.audience || '').trim().slice(0, 700)
    const durationSeconds = clampVideoAdDuration(body?.durationSeconds)
    if (!title || !subject || !objective || !audience) {
      return NextResponse.json({ success: false, error: 'Title, subject, objective and audience are required' }, { status: 400 })
    }

    const generated = await generateVideoAdStoryboard({ title, subject, objective, audience, durationSeconds })
    await ensureVideoAdWorkshopSchema()
    const pool = getPool()
    const result = await pool.query(
      `INSERT INTO admin_video_ad_projects
        (created_by,title,subject,objective,audience,duration_seconds,aspect_ratio,status,storyboard)
       VALUES ($1::uuid,$2,$3,$4,$5,$6,'9:16','planned',$7::jsonb)
       RETURNING *`,
      [auth.user.id, title, subject, objective, audience, durationSeconds, JSON.stringify(generated.scenes)]
    )
    return NextResponse.json({ success: true, project: mapVideoAdProject(result.rows[0]), provider: generated.provider })
  } catch (error: any) {
    console.error('[Video Ad Workshop] create failed:', error)
    return NextResponse.json({ success: false, error: error.message || 'Unable to form video ad' }, { status: 500 })
  }
}

function sanitizeStoryboard(value: unknown): VideoAdScene[] | null {
  if (!Array.isArray(value) || value.length < 1 || value.length > 24) return null
  return value.map((scene: any, index): VideoAdScene => ({
    id: String(scene?.id || `scene-${index + 1}`).slice(0, 48),
    order: index + 1,
    durationSeconds: Math.max(1, Math.min(90, Math.round(Number(scene?.durationSeconds || 1)))),
    beat: String(scene?.beat || '').slice(0, 64),
    text: String(scene?.text || '').slice(0, 160),
    visualDirection: String(scene?.visualDirection || '').slice(0, 700),
    voiceover: String(scene?.voiceover || '').slice(0, 700),
    assetUrl: scene?.assetUrl ? String(scene.assetUrl).slice(0, 2048) : null,
    assetType: scene?.assetType === 'video' ? 'video' : scene?.assetType === 'image' ? 'image' : null,
  }))
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  try {
    const body = await request.json()
    const id = String(body?.id || '')
    if (!id) return NextResponse.json({ success: false, error: 'Project id is required' }, { status: 400 })
    await ensureVideoAdWorkshopSchema()
    const pool = getPool()
    const current = await pool.query('SELECT * FROM admin_video_ad_projects WHERE id=$1::uuid', [id])
    if (!current.rows.length) return NextResponse.json({ success: false, error: 'Video ad project not found' }, { status: 404 })

    const storyboard: VideoAdScene[] | null = body.storyboard === undefined
      ? (Array.isArray(current.rows[0].storyboard) ? current.rows[0].storyboard as VideoAdScene[] : null)
      : sanitizeStoryboard(body.storyboard)
    if (!storyboard) return NextResponse.json({ success: false, error: 'Storyboard is invalid' }, { status: 400 })
    const total = storyboard.reduce((sum: number, scene: VideoAdScene) => sum + Number(scene.durationSeconds || 0), 0)
    if (total !== Number(current.rows[0].duration_seconds)) {
      return NextResponse.json({ success: false, error: `Scene timing must total ${current.rows[0].duration_seconds} seconds` }, { status: 400 })
    }

    const soundtrackUrl = body.soundtrackUrl === undefined ? current.rows[0].soundtrack_url : (body.soundtrackUrl ? String(body.soundtrackUrl).slice(0, 2048) : null)
    const result = await pool.query(
      `UPDATE admin_video_ad_projects
       SET storyboard=$2::jsonb,soundtrack_url=$3,status=CASE WHEN status='ready' THEN 'planned' ELSE status END,output_url=CASE WHEN status='ready' THEN NULL ELSE output_url END,error_message=NULL,updated_at=NOW()
       WHERE id=$1::uuid
       RETURNING *`,
      [id, JSON.stringify(storyboard), soundtrackUrl]
    )
    return NextResponse.json({ success: true, project: mapVideoAdProject(result.rows[0]) })
  } catch (error: any) {
    console.error('[Video Ad Workshop] update failed:', error)
    return NextResponse.json({ success: false, error: error.message || 'Unable to update video ad' }, { status: 500 })
  }
}
