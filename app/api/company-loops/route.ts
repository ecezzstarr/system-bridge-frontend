import { NextRequest, NextResponse } from 'next/server'
import { requireApiUser } from '@/lib/api-auth'
import { ensureCompanyLoopsSchema, getDb, normalizeAudience } from '@/lib/company-loops'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const sql = getDb()
    await ensureCompanyLoopsSchema(sql)
    const requestedRole = request.nextUrl.searchParams.get('role')
    const role = requestedRole && ['client', 'agent', 'bridger', 'admin'].includes(requestedRole) ? requestedRole : null
    const rows = role
      ? await sql`SELECT id, loop_number, title, purpose, stage, position, functions, economics, responsibilities, boundaries, agreement_version, audience, status, created_at, updated_at, published_at FROM company_loops WHERE status = 'published' AND (${role} = ANY(audience) OR 'all' = ANY(audience)) ORDER BY loop_number ASC, created_at ASC`
      : await sql`SELECT id, loop_number, title, purpose, stage, position, functions, economics, responsibilities, boundaries, agreement_version, audience, status, created_at, updated_at, published_at FROM company_loops WHERE status = 'published' ORDER BY loop_number ASC, created_at ASC`
    return NextResponse.json({ loops: rows })
  } catch (error) {
    console.error('Company loops GET error:', error)
    return NextResponse.json({ error: 'Unable to load company loops' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireApiUser(request)
    if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    const body = await request.json()
    const loopNumber = Number(body.loopNumber)
    const title = String(body.title || '').trim()
    if (!Number.isInteger(loopNumber) || loopNumber < 1 || !title) return NextResponse.json({ error: 'loopNumber and title are required' }, { status: 400 })
    const sql = getDb()
    await ensureCompanyLoopsSchema(sql)
    const audience = normalizeAudience(body.audience)
    const publish = body.status === 'published'
    const rows = publish
      ? await sql`INSERT INTO company_loops (loop_number, title, purpose, stage, position, functions, economics, responsibilities, boundaries, agreement_version, audience, status, created_by, published_at) VALUES (${loopNumber}, ${title}, ${String(body.purpose || '')}, ${String(body.stage || '')}, ${String(body.position || 'all')}, ${String(body.functions || '')}, ${String(body.economics || '')}, ${String(body.responsibilities || '')}, ${String(body.boundaries || '')}, ${body.agreementVersion ? String(body.agreementVersion) : null}, ${audience}, 'published', ${user.id}::uuid, NOW()) RETURNING *`
      : await sql`INSERT INTO company_loops (loop_number, title, purpose, stage, position, functions, economics, responsibilities, boundaries, agreement_version, audience, status, created_by) VALUES (${loopNumber}, ${title}, ${String(body.purpose || '')}, ${String(body.stage || '')}, ${String(body.position || 'all')}, ${String(body.functions || '')}, ${String(body.economics || '')}, ${String(body.responsibilities || '')}, ${String(body.boundaries || '')}, ${body.agreementVersion ? String(body.agreementVersion) : null}, ${audience}, 'draft', ${user.id}::uuid) RETURNING *`
    return NextResponse.json({ loop: rows[0] }, { status: 201 })
  } catch (error) {
    console.error('Company loops POST error:', error)
    return NextResponse.json({ error: 'Unable to create company loop' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireApiUser(request)
    if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    const body = await request.json()
    const id = String(body.id || '')
    const status = ['draft', 'published', 'archived'].includes(body.status) ? body.status : null
    if (!id || !status) return NextResponse.json({ error: 'id and valid status are required' }, { status: 400 })
    const sql = getDb()
    await ensureCompanyLoopsSchema(sql)
    const rows = await sql`UPDATE company_loops SET status = ${status}, updated_at = NOW(), published_at = CASE WHEN ${status} = 'published' THEN COALESCE(published_at, NOW()) ELSE published_at END WHERE id = ${id}::uuid RETURNING *`
    if (!rows[0]) return NextResponse.json({ error: 'Loop not found' }, { status: 404 })
    return NextResponse.json({ loop: rows[0] })
  } catch (error) {
    console.error('Company loops PATCH error:', error)
    return NextResponse.json({ error: 'Unable to update company loop' }, { status: 500 })
  }
}
