import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getDivineShieldState } from '@/lib/weave-infrastructure'

export const dynamic='force-dynamic'

export async function POST(request:NextRequest){
  try{
    const shield=await getDivineShieldState()
    if(!shield.active){
      return NextResponse.json({success:true,evacuated:false,reason:'shield_not_active'})
    }

    const authHeader=request.headers.get('authorization')
    const token=authHeader?.replace(/^Bearer\s+/i,'').trim()
    if(!token){
      return NextResponse.json({success:true,evacuated:false,reason:'no_session'})
    }

    const rows=await sql`
      SELECT s.user_id,u.role
      FROM sessions s
      JOIN users u ON u.id=s.user_id
      WHERE s.token=${token}
        AND s.expires_at>NOW()
      LIMIT 1
    `
    const session=rows[0]
    if(!session){
      return NextResponse.json({success:true,evacuated:false,reason:'session_missing'})
    }

    if(session.role==='admin'){
      return NextResponse.json({success:true,evacuated:false,administrationBypass:true})
    }

    await sql`DELETE FROM sessions WHERE token=${token}`

    return NextResponse.json({success:true,evacuated:true})
  }catch(error){
    console.error('[Divine Shield] evacuation error:',error)
    return NextResponse.json({success:false,error:'Unable to evacuate session'},{status:500})
  }
}
