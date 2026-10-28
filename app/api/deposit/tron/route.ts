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
export async function POST(request:NextRequest){
  const user=await getAuthUser(request)
  if(!user||user.role!=='client')return NextResponse.json({error:'Client login required'},{status:403})
  try{
    const body=await request.json()
    const amount=normalizeTronAmount(body?.amount)
    const hash=normalizeTronTxHash(body?.txHash)
    const submitted=await submitClientTronDeposit(user.id,amount,hash)
    if(!submitted.existing)await notifyDepositSubmitted({
      depositorId:user.id,depositorName:user.name||user.username||user.email,role:'Client',
      depositId:submitted.id,rail:'TRX',amountLabel:amount.toLocaleString()+' TRX',
      secondaryLabel:amount.toLocaleString()+' Flame Coin after verification',
      adminLink:'/admin/client-deposits',
    })
    return NextResponse.json({
      success:true,status:'pending',existing:submitted.existing,depositId:submitted.id,
      txHash:hash,companyTrxWallet:WORLD_RULES.COMPANY_TRX_WALLET,
      message:submitted.existing?'This deposit is already awaiting Administration verification. No second request was created.':'Deposit recorded. Administration must verify the TRX transaction and Company wallet receipt before crediting Flame Coin.',
    })
  }catch(error:any){
    const message=String(error?.message||'TRX deposit could not be submitted')
    const invalid=/transaction ID|amount|already belongs/.test(message)
    console.error('[client TRX deposit]',message)
    return NextResponse.json({error:invalid?message:'TRX deposit could not be submitted'},{status:invalid?400:503})
  }
}
