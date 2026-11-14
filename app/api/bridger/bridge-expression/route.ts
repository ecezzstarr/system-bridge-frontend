import { NextRequest, NextResponse } from 'next/server'
import { requireApiUser } from '@/lib/api-auth'
import { listOwnedBridgeExpressions, saveBridgerBridgeExpression } from '@/lib/bridger-expression'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function owner(request:NextRequest) {
  const user=await requireApiUser(request)
  return user?.role==='bridger'&&user.is_active?user:null
}

export async function GET(request:NextRequest) {
  const user=await owner(request)
  if(!user)return NextResponse.json({error:'Active Hope Bridger required'},{status:403})
  try {
    return NextResponse.json({expressions:await listOwnedBridgeExpressions(user.id)},{
      headers:{'Cache-Control':'private, no-store'},
    })
  }catch(err){
    console.error('[bridge-expression GET] failed',err)
    return NextResponse.json({error:'Unable to load your personal Weave workshop'},{status:503})
  }
}

export async function PATCH(request:NextRequest) {
  const user=await owner(request)
  if(!user)return NextResponse.json({error:'Active Hope Bridger required'},{status:403})
  try {
    const input=await request.json().catch(()=>null)
    if(!input||typeof input.bridgeCode!=='string'||JSON.stringify(input).length>4000) {
      return NextResponse.json({error:'Provide one valid Bridge AI expression'},{status:400})
    }
    const expression=await saveBridgerBridgeExpression({
      bridgerId:user.id,bridgeCode:input.bridgeCode,
      specialty:input.specialty,publicTitle:input.publicTitle,
      purpose:input.purpose,expression:input.expression,invitation:input.invitation,
    })
    return NextResponse.json({success:true,expression},{
      headers:{'Cache-Control':'private, no-store'},
    })
  }catch(err){
    if(err instanceof Error && /Choose an existing|Complete your title|not yours/.test(err.message)){
      return NextResponse.json({error:err.message},{status:400})
    }
    console.error('[bridge-expression PATCH] failed',err)
    return NextResponse.json({error:'Unable to save your expression'},{status:503})
  }
}
