import { NextResponse } from 'next/server'
import { getUsdNgnDepositQuote } from '@/lib/weave-usd-finance'

export const dynamic='force-dynamic'
export async function GET(){
  try{
    const quote=await getUsdNgnDepositQuote()
    return NextResponse.json({
      success:true,baseCurrency:'USD',displayCurrency:'NGN',
      ngnPerUsd:quote.ngnPerUsd,source:quote.source,
      updatedAt:quote.updatedAt,indicativePreview:true,
    },{headers:{'Cache-Control':'public, max-age=60'}})
  }catch{
    return NextResponse.json(
      {success:false,error:'Verified USD/NGN rate unavailable. Checkout cannot be quoted.'},
      {status:503,headers:{'Cache-Control':'no-store'}},
    )
  }
}