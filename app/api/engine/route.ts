import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { getEngineRoute } from '@/lib/system-switch'

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ success:false,error:'Unauthorized' },{status:401})
    const route = await getEngineRoute(session.user.id)
    return NextResponse.json({success:true,data:route},{headers:{'Cache-Control':'private, no-store'}})
  } catch(error){
    console.error('Engine route error:',error instanceof Error?error.message:'unknown error')
    return NextResponse.json({success:false,error:'Failed to get engine route'},{status:500})
  }
}
