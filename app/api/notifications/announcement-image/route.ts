import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { sql } from '@/lib/db'

export async function GET(request:NextRequest){
  const user=await getAuthUser(request)
  if(!user)return NextResponse.json({error:'Unauthorized'},{status:401})
  const id=request.nextUrl.searchParams.get('id')||''
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))
    return NextResponse.json({error:'Invalid notification'},{status:400})
  try{
    const rows=await sql`SELECT i.mime,i.bytes FROM weave_company_announcement_images i
      JOIN weave_company_announcement_image_recipients r ON r.image_id=i.id
      JOIN notifications n ON n.id=r.notification_id
      WHERE n.id=${id}::uuid AND n.user_id=${user.id}::uuid AND n.type='company_announcement_image'`
    const item=rows[0]
    if(!item)return NextResponse.json({error:'Image not found'},{status:404})
    return new Response(new Uint8Array(item.bytes),{headers:{
      'Content-Type':item.mime,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'
    }})
  }catch(error){
    console.error('Announcement image error',error)
    return NextResponse.json({error:'Image unavailable'},{status:503})
  }
}
