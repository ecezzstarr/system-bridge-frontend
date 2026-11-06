import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { getFinancialRecordPage } from '@/lib/ledger'

export const dynamic = 'force-dynamic'
const noStore={ 'Cache-Control':'private, no-store, max-age=0', Vary:'Authorization' }

export async function GET(request:NextRequest) {
  const authUser=await getAuthUser(request)
  if (!authUser?.id) return NextResponse.json(
    {success:false,error:'Not authenticated'}, {status:401,headers:noStore},
  )
  try {
    const value=request.nextUrl.searchParams.get('limit')
    const limit=value==null?50:Number(value)
    if (!Number.isInteger(limit) || limit<1 || limit>100) {
      return NextResponse.json(
        {success:false,error:'Record limit must be between 1 and 100'},
        {status:400,headers:noStore},
      )
    }
    const cursor=request.nextUrl.searchParams.get('cursor')
    const data=await getFinancialRecordPage(authUser.id,limit,cursor)
    return NextResponse.json({success:true,data},{headers:noStore})
  } catch(error) {
    console.error('[WEAVE Record] persistent data retrieval failed:',error)
    const invalid=error instanceof Error && error.message==='Invalid record page cursor'
    return NextResponse.json({
      success:false,
      error:invalid?'Invalid record cursor. Refresh Record to restart history.':'Financial records are temporarily unavailable. No balance has been replaced or reset.',
    },{status:invalid?400:503,headers:noStore})
  }
}
