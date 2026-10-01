import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import {
  connectGoogleMailbox,
  disconnectGoogleMailbox,
  getMailboxSummary,
} from '@/lib/weave-mailbox'

function allowed(role:string){
  return role==='admin'||role==='bridger'
}

export async function GET(request:NextRequest){
  const user=await getAuthUser(request)
  if(!user)return NextResponse.json({error:'Unauthorized'},{status:401})
  if(!allowed(user.role))return NextResponse.json({error:'Mailbox connection is available to Administration and Bridgers'},{status:403})
  try{
    return NextResponse.json({success:true,mailbox:await getMailboxSummary(user.id)})
  }catch(error){
    console.error('[weave mailbox] read failed',error)
    return NextResponse.json({error:'Unable to read mailbox connection'},{status:500})
  }
}

export async function POST(request:NextRequest){
  const user=await getAuthUser(request)
  if(!user)return NextResponse.json({error:'Unauthorized'},{status:401})
  if(!allowed(user.role))return NextResponse.json({error:'Mailbox connection is available to Administration and Bridgers'},{status:403})
  try{
    const body=await request.json()
    const mailbox=await connectGoogleMailbox({
      userId:user.id,
      role:user.role,
      email:String(body.email||''),
      appPassword:String(body.appPassword||''),
    })
    return NextResponse.json({success:true,mailbox})
  }catch(error){
    console.error('[weave mailbox] connection failed',error)
    return NextResponse.json({error:'Google mailbox authentication failed. Check the address and Google app password.'},{status:400})
  }
}

export async function DELETE(request:NextRequest){
  const user=await getAuthUser(request)
  if(!user)return NextResponse.json({error:'Unauthorized'},{status:401})
  if(!allowed(user.role))return NextResponse.json({error:'Mailbox connection is available to Administration and Bridgers'},{status:403})
  try{
    return NextResponse.json({success:true,mailbox:await disconnectGoogleMailbox(user.id)})
  }catch(error){
    console.error('[weave mailbox] disconnect failed',error)
    return NextResponse.json({error:'Unable to disconnect mailbox'},{status:500})
  }
}
