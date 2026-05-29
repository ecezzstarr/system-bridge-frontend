import { NextRequest, NextResponse } from 'next/server'
import { requireWorkshopAuthorization } from '@/lib/workshop-auth'
import { neon } from '@/lib/pg-neon'

const getDb = () => neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest) {
  const auth = await requireWorkshopAuthorization()
  if (!auth.authorized) return auth.response

  try {
    const sql = getDb()
    const siblings = await sql`
      SELECT s.*, u.username as sibling_username, u.name as sibling_name
      FROM sibling_agreements s
      JOIN users u ON s.sibling_id = u.id
      ORDER BY s.created_at DESC
    `
    return NextResponse.json({ success: true, data: siblings })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireWorkshopAuthorization()
  if (!auth.authorized) return auth.response

  try {
    const body = await request.json()
    const { 
      sibling_id, 
      title, 
      business_description, 
      capital_amount, 
      monthly_return_percent, 
      duration_months 
    } = body

    const monthly_return_amount = (capital_amount * monthly_return_percent) / 100
    const created_by = auth.session.user.id

    const sql = getDb()
    const result = await sql`
      INSERT INTO sibling_agreements (
        sibling_id, 
        created_by, 
        title, 
        business_description, 
        capital_amount, 
        monthly_return_percent, 
        monthly_return_amount, 
        duration_months,
        status
      ) VALUES (
        ${sibling_id}, 
        ${created_by}, 
        ${title}, 
        ${business_description}, 
        ${capital_amount}, 
        ${monthly_return_percent}, 
        ${monthly_return_amount}, 
        ${duration_months},
        'active'
      ) RETURNING *
    `

    return NextResponse.json({ success: true, data: result[0] })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
