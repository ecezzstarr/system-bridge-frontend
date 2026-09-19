import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { getSql } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)

    if (!user) {
      return NextResponse.json({error:'Unauthorized'}, {status:401})
    }

    const { depositId, receipt } = await request.json()

    if (!depositId || !receipt) {
      return NextResponse.json(
        {error:'Receipt required'},
        {status:400}
      )
    }

    const sql = getSql()

    await sql`
      UPDATE deposits
      SET 
        receipt_data=${receipt},
        status='pending',
        updated_at=NOW()
      WHERE id=${depositId}::uuid
      AND user_id=${user.id}::uuid
    `

    return NextResponse.json({
      success:true,
      message:'Receipt submitted. Awaiting admin verification.'
    })

  } catch(error:any){
    return NextResponse.json(
      {error:error.message},
      {status:500}
    )
  }
}
