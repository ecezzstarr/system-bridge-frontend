import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { getPool, sql } from '@/lib/db'
import { ensureVideoAdWorkshopSchema } from '@/lib/video-ad-workshop'
import { ensureWeaveAdsSchema } from '@/lib/weave-ads'

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  if (user.role !== 'admin') return NextResponse.json({ success: false, error: 'Administration access required' }, { status: 403 })

  try {
    const body = await request.json()
    const projectId = String(body?.projectId || '')
    if (!projectId) return NextResponse.json({ success: false, error: 'Project id is required' }, { status: 400 })

    await ensureVideoAdWorkshopSchema()
    await ensureWeaveAdsSchema()
    const pool = getPool()
    const projectResult = await pool.query(
      'SELECT id,title,objective,output_url,status FROM admin_video_ad_projects WHERE id=$1::uuid LIMIT 1',
      [projectId]
    )
    const project = projectResult.rows[0]
    if (!project || project.status !== 'ready' || !project.output_url) {
      return NextResponse.json({ success: false, error: 'Render the video before sending it to the Ad Workshop' }, { status: 400 })
    }

    const rows = await sql`
      INSERT INTO weave_ads (
        title, body, media_url, media_type, target_roles, placements,
        action_label, action_url, event_key, start_at, end_at,
        frequency, priority, status, created_by, published_at,
        public_movement, movement_code, public_platforms, referral_code, movement_destination
      )
      VALUES (
        ${String(project.title)},
        ${String(project.objective || '')},
        ${String(project.output_url)},
        'video',
        ${['all']}::text[],
        ${['app']}::text[],
        ${null},
        ${null},
        ${'video-ad-workshop'},
        ${new Date().toISOString()},
        ${null},
        'once',
        0,
        'draft',
        ${user.id}::uuid,
        ${null},
        false,
        ${null},
        ${['direct']}::text[],
        ${null},
        '/'
      )
      RETURNING id,title,status
    `

    return NextResponse.json({ success: true, ad: rows[0] }, { status: 201 })
  } catch (error: any) {
    console.error('[Video Ad Workshop] handoff failed:', error)
    return NextResponse.json({ success: false, error: error.message || 'Could not create Ad Workshop draft' }, { status: 500 })
  }
}
