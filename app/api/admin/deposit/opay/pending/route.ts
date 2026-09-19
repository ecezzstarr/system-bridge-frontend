import {NextRequest, NextResponse} from 'next/server'
import {getAuthUser} from '@/lib/auth-api'
import {getSql} from '@/lib/db'

export async function GET(request:NextRequest){

 const admin = await getAuthUser(request)

 if(!admin || admin.role!=='admin'){
  return NextResponse.json({error:'Admin only'},{status:403})
 }

 const sql=getSql()

 const deposits = await sql`
 SELECT 
 d.*,
 d.amount_usd AS amount,
 u.name,
 u.email
 FROM deposits d
 JOIN users u ON u.id=d.user_id
 WHERE d.status='pending'
 ORDER BY d.created_at DESC
 `

 return NextResponse.json(deposits)
}
