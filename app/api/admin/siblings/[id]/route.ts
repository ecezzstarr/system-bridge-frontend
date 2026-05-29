import { NextRequest, NextResponse } from 'next/server'
import { requireWorkshopAuthorization } from '@/lib/workshop-auth'
import { neon } from '@/lib/pg-neon'

const getDb = () => neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireWorkshopAuthorization()
  if (!auth.authorized) return auth.response

  try {
    const sql = getDb()
    const result = await sql`
      SELECT s.*, u.username as sibling_username, u.name as sibling_name
      FROM sibling_agreements s
      JOIN users u ON s.sibling_id = u.id
      WHERE s.id = ${params.id}
    `
    
    if (result.length === 0) {
      return NextResponse.json({ success: false, error: 'Agreement not found' }, { status: 404 })
    }
    
    return NextResponse.json({ success: true, data: result[0] })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireWorkshopAuthorization()
  if (!auth.authorized) return auth.response

  try {
    const body = await request.json()
    const sql = getDb()
    
    const fields = Object.keys(body).filter(k => ['title', 'business_description', 'status'].includes(k))
    if (fields.length === 0) {
      return NextResponse.json({ success: false, error: 'No valid fields to update' }, { status: 400 })
    }

    const setClause = fields.map((f, i) => `${f} = $${i + 1}`).join(', ')
    const values = fields.map(f => body[f])
    values.push(params.id)

    const result = await sql(
      `UPDATE sibling_agreements SET ${setClause}, updated_at = NOW() WHERE id = $${values.length} RETURNING *`,
      values
    )

    return NextResponse.json({ success: true, data: result[0] })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
