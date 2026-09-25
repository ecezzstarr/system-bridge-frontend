import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { getDivineShieldState, setDivineShieldState } from '@/lib/weave-infrastructure'

export const dynamic='force-dynamic'

export async function GET(request:NextRequest){
  const user=await getAuthUser(request)
  if(!user) return NextResponse.json({error:'Unauthorized'},{status:401})
  if(user.role!=='admin') return NextResponse.json({error:'Forbidden'},{status:403})
  try{
    return NextResponse.json({success:true,state:await getDivineShieldState()})
  }catch(error){
    console.error('[Divine Shield] admin read error:',error)
    return NextResponse.json({success:false,error:'Unable to read Divine Shield'},{status:500})
  }
}

export async function POST(request:NextRequest){
  const user=await getAuthUser(request)
  if(!user) return NextResponse.json({error:'Unauthorized'},{status:401})
  if(user.role!=='admin') return NextResponse.json({error:'Forbidden'},{status:403})
  try{
    const body=await request.json()
    if(typeof body?.active!=='boolean'){
      return NextResponse.json({success:false,error:'active must be boolean'},{status:400})
    }
    const title=typeof body.title==='string' ? body.title.trim().slice(0,255) : undefined
    const message=typeof body.message==='string' ? body.message.trim().slice(0,2000) : undefined
    const state=await setDivineShieldState({active:body.active,title,message,adminId:user.id})
    return NextResponse.json({success:true,state})
  }catch(error){
    console.error('[Divine Shield] update error:',error)
    return NextResponse.json({success:false,error:'Unable to update Divine Shield'},{status:500})
  }
}
