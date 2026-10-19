import { NextRequest,NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { sql } from '@/lib/db'

export async function GET(request:NextRequest){
  const user=await getAuthUser(request)
  if(!user||user.role!=='admin')return NextResponse.json({success:false,error:'Administration only'},{status:403})
  try{
    const page=Math.min(30,Math.max(0,Number.parseInt(request.nextUrl.searchParams.get('page')||'0',10)||0))
    const offset=page*100
    const [alerts,totals]=await Promise.all([
      sql`SELECT id,type,title,content,link,is_read,created_at
        FROM notifications
        WHERE user_id=${user.id}::uuid AND type LIKE 'order_%'
        ORDER BY created_at DESC LIMIT 100 OFFSET ${offset}`,
      sql`SELECT COUNT(*)::int AS total,
        COUNT(*) FILTER(WHERE NOT is_read)::int AS unread
        FROM notifications WHERE user_id=${user.id}::uuid AND type LIKE 'order_%'`,
    ])
    return NextResponse.json({success:true,alerts,page,total:Number(totals[0]?.total||0),unread:Number(totals[0]?.unread||0)},
      {headers:{'Cache-Control':'private, no-store'}})
  }catch(error){
    console.error('[admin orders inbox] Unable to fetch order alerts',error)
    return NextResponse.json({success:false,error:'Unable to load Administration order alerts'},{status:500})
  }
}
