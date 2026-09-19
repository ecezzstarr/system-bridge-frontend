import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { sql } from '@/lib/db'

export async function GET(request: NextRequest) {
  const admin = await getAuthUser(request)
  if (!admin || admin.role !== 'admin') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }
  try {
    const templates = await sql`
      SELECT * FROM bridge_templates ORDER BY created_at DESC
    `
    return NextResponse.json({ success: true, templates })
  } catch (error: any) {
    console.error('[bridge-ai templates GET] error:', error)
    return NextResponse.json({ error: 'Failed to load templates' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const admin = await getAuthUser(request)
  if (!admin || admin.role !== 'admin') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }
  try {
    const { name, description, welcomeMessage, systemPrompt } = await request.json()
    if (!name || !welcomeMessage || !systemPrompt) {
      return NextResponse.json({ error: 'name, welcomeMessage, systemPrompt required' }, { status: 400 })
    }
    const result = await sql`
      INSERT INTO bridge_templates (name, description, welcome_message, system_prompt, status, created_by)
      VALUES (${name}, ${description || ''}, ${welcomeMessage}, ${systemPrompt}, 'draft', ${admin.id}::uuid)
      RETURNING *
    `
    return NextResponse.json({ success: true, template: result[0] })
  } catch (error: any) {
    console.error('[bridge-ai templates POST] error:', error)
    return NextResponse.json({ error: 'Failed to create template' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const admin = await getAuthUser(request)
  if (!admin || admin.role !== 'admin') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }
  try {
    const { id, name, description, welcomeMessage, systemPrompt, status } = await request.json()
    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 })
    }

    const existing = await sql`SELECT * FROM bridge_templates WHERE id = ${id}::uuid`
    if (existing.length === 0) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    const validStatuses = ['draft', 'published', 'archived']
    const nextStatus = status && validStatuses.includes(status) ? status : existing[0].status

    const result = await sql`
      UPDATE bridge_templates
      SET
        name = ${name ?? existing[0].name},
        description = ${description ?? existing[0].description},
        welcome_message = ${welcomeMessage ?? existing[0].welcome_message},
        system_prompt = ${systemPrompt ?? existing[0].system_prompt},
        status = ${nextStatus},
        version = version + 1,
        updated_at = NOW()
      WHERE id = ${id}::uuid
      RETURNING *
    `
    return NextResponse.json({ success: true, template: result[0] })
  } catch (error: any) {
    console.error('[bridge-ai templates PUT] error:', error)
    return NextResponse.json({ error: 'Failed to update template' }, { status: 500 })
  }
}
