import { NextRequest,NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { getUsdNgnDepositQuote } from '@/lib/weave-usd-finance'

export const dynamic='force-dynamic'
export async function GET(request:NextRequest){
  const user=await getAuthUser(request)
  if(!user)return NextResponse.json({error:'Not authenticated'},{status:401})
  if(!['admin','agent','bridger'].includes(user.role))return NextResponse.json({error:'Staff account required'},{status:403})
  if(process.env.WEAVE_USD_DEPOSIT_ENABLED!=='true')return NextResponse.json({error:'USD staff funding is not active'},{status:503})
  try{
    const quote=await getUsdNgnDepositQuote()
    return NextResponse.json({
      success:true,baseCurrency:'USD',displayCurrency:'NGN',
      ngnPerUsd:quote.ngnPerUsd,source:quote.source,
      updatedAt:quote.updatedAt,indicativePreview:true,
    },{headers:{'Cache-Control':'private, no-store'}})
  }catch{
    return NextResponse.json(
      {success:false,error:'Verified USD/NGN rate unavailable. Checkout cannot be quoted.'},
      {status:503,headers:{'Cache-Control':'no-store'}},
    )
  }
}