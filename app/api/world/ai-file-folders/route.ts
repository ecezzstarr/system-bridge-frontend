import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { sql } from '@/lib/db'
import { listPublicAiFileFolders, purchaseAiProductFromWallet } from '@/lib/ai-file-folder-store'

function clean(value:unknown,max=180){
  return typeof value==='string'?value.trim().slice(0,max):''
}

export async function GET(){
  try{
    const agents=await listPublicAiFileFolders(sql)
    return NextResponse.json({success:true,agents},{headers:{'Cache-Control':'public, max-age=10, stale-while-revalidate=30'}})
  }catch(error){
    console.error('[world/ai-file-folders GET]',error)
    return NextResponse.json({error:'AI File Folder world unavailable'},{status:500})
  }
}

export async function POST(request:NextRequest){
  try{
    const buyer=await getAuthUser(request)
    if(!buyer)return NextResponse.json({error:'Sign in to purchase with Flame Coin'},{status:401})
    const body=await request.json()
    const productId=clean(body.productId,80)
    if(!productId)return NextResponse.json({error:'Product is required'},{status:400})
    const order=await purchaseAiProductFromWallet(sql,{
      productId,
      buyerUserId:String(buyer.id),
      buyerReference:`${buyer.role}:${buyer.id}`,
      quantity:Number(body.quantity)||1,
    })
    return NextResponse.json({
      success:true,
      order,
      settlement:{beneficiary:'WEAVE',aiOperatingWalletCredited:false},
    })
  }catch(error){
    console.error('[world/ai-file-folders POST]',error)
    return NextResponse.json({error:error instanceof Error?error.message:'Purchase failed'},{status:409})
  }
}
