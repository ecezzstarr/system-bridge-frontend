import { NextRequest, NextResponse } from 'next/server'
import { requireWorkshopAuthorization } from '@/lib/workshop-auth'
import { neon } from '@/lib/pg-neon'

const getDb = () => neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireWorkshopAuthorization()
  if (!auth.authorized) return auth.response

  try {
    const sql = getDb()
    const result = await sql`
      UPDATE sibling_agreements 
      SET status = 'capital_returned', capital_return_date = NOW(), updated_at = NOW() 
      WHERE id = ${params.id} 
      RETURNING *
    `
    return NextResponse.json({ success: true, data: result[0] })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
