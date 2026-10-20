import {NextRequest,NextResponse} from 'next/server'
import {getAuthUser} from '@/lib/auth-api'
import {sql} from '@/lib/db'
import {ensureLegionEmploymentSchema} from '@/lib/legion-employment'

export async function GET(request:NextRequest){
  const admin=await getAuthUser(request)
  if(!admin||admin.role!=='admin')return NextResponse.json({error:'Administration required'},{status:403})
  try{
    await ensureLegionEmploymentSchema(sql)
    const releases=await sql`
      SELECT r.id,r.legion_id,r.client_id,r.source_user_id,r.actor_user_id,
        r.actor_position,r.reason,r.pending_orders,r.unpaid_orders,r.released_at,
        l.name AS legion_name,l.source_role,l.function_title,
        owner.name AS client_name,employee.name AS employee_name
      FROM legion_employment_releases r
      JOIN enterprise_legions l ON l.id=r.legion_id
      LEFT JOIN users owner ON owner.id=r.client_id
      LEFT JOIN users employee ON employee.id=r.source_user_id
      ORDER BY r.released_at DESC
      LIMIT 150
    `
    return NextResponse.json({success:true,releases},{headers:{'Cache-Control':'private, no-store'}})
  }catch(error){
    console.error('[Admin Legion releases]',error)
    return NextResponse.json({error:'Legion release audit unavailable'},{status:500})
  }
}
