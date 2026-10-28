import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { sql } from '@/lib/db'
import { WORLD_RULES } from '@/lib/world/constants'
import { notifyDepositSubmitted } from '@/lib/deposit-notifications'
import { submitClientTronDeposit, normalizeTronTxHash, normalizeTronAmount } from '@/lib/client-trx-deposits'

export const dynamic='force-dynamic'

export async function GET(request:NextRequest){
  const user=await getAuthUser(request)
  if(!user||user.role!=='client')return NextResponse.json({error:'Client login required'},{status:403})
  try{
    const deposits=await sql`
      SELECT id,amount_trx,amount_usd,method,currency,status,receipt_data,created_at,updated_at,verified_at
      FROM deposits WHERE user_id=${user.id}::uuid AND method IN ('tron','paystack')
      ORDER BY created_at DESC LIMIT 30
    `
    return NextResponse.json({success:true,deposits},{headers:{'Cache-Control':'private, no-store'}})
  }catch(error){console.error('[client TRX deposit history]',error);return NextResponse.json({error:'Deposit history unavailable'},{status:503})}
}
export async function POST() {
  return NextResponse.json(
    { error: 'Manual TRX wallet funding is retired. Use the authenticated Paystack deposit checkout at /api/deposit/paystack.' },
    { status: 410 },
  )
}
