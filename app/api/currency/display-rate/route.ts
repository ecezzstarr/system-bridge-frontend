import { NextRequest,NextResponse } from 'next/server'
import { isUserDisplayCurrency } from '@/lib/user-display-currency'
import { getDisplayCurrencyRate } from '@/lib/display-currency-rates'

export async function GET(request:NextRequest){
  const currency=request.nextUrl.searchParams.get('currency')
  if(!isUserDisplayCurrency(currency)){
    return NextResponse.json({error:'Unsupported currency'},{status:400})
  }
  const result=await getDisplayCurrencyRate(currency)
  if(!result) return NextResponse.json(
    {error:'Exchange-rate reference unavailable; no conversion was assumed'},
    {status:503,headers:{'Cache-Control':'no-store'}},
  )
  return NextResponse.json({...result,indicativeOnly:true},{
    headers:{'Cache-Control':'public, max-age=600, stale-while-revalidate=3600'},
  })
}
