import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { getPool } from '@/lib/db'
import { getTrxPaymentNgnRate } from '@/lib/trx-payment'
import { ngnToFlameCoin } from '@/lib/flame-coin'
import { createPaystackReference, initializePaystackTransaction } from '@/lib/paystack'
import { getPaystackConfig } from '@/lib/paystack-config'
import { notifyDepositSubmitted } from '@/lib/deposit-notifications'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user) return NextResponse.json({error:'Unauthorized'},{status:401})
  if (!['admin','agent','bridger','client'].includes(user.role)) return NextResponse.json({error:'This role cannot fund a Flame Coin wallet.'},{status:403})
  try {
    const body = await request.json()
    const amountNgn = Number(body?.amount)
    if (!Number.isFinite(amountNgn) || amountNgn < 1 || amountNgn > 100000000 || Math.round(amountNgn*100)!==amountNgn*100) {
      return NextResponse.json({error:'Enter a valid NGN amount (minimum ₦1, maximum ₦100,000,000, up to two decimals).'}, {status:400})
    }
    if (!user.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email)) return NextResponse.json({error:'A valid email is required on your Weave account for Paystack checkout.'},{status:400})
    const {rateNgnPerTrx,source:rateSource}=await getTrxPaymentNgnRate()
    const flameCoin=ngnToFlameCoin(amountNgn,rateNgnPerTrx)
    if (!Number.isFinite(flameCoin)||flameCoin<=0) return NextResponse.json({error:'This amount cannot produce a valid Flame Coin credit.'},{status:400})
    const reference=createPaystackReference(user.role.toUpperCase())
    const pool=getPool()
    const inserted=await pool.query(
      "INSERT INTO deposits(user_id,amount_usd,amount_trx,status,method,currency,receipt_data,created_at,updated_at) VALUES($1::uuid,$2,$3,'pending','paystack','NGN',$4,NOW(),NOW()) RETURNING id",
      [user.id,amountNgn,flameCoin,reference],
    )
    await pool.query(
      "INSERT INTO ledger_entries(user_id,entry_type,amount,currency,description,metadata) VALUES($1::uuid,'deposit',$2,'Flame Coin','Paystack deposit pending payment verification',$3::jsonb)",
      [user.id,flameCoin,JSON.stringify({deposit_id:inserted.rows[0].id,payment_method:'Paystack',reference,ngn_amount:amountNgn,amount_kobo:Math.round(amountNgn*100),rate_ngn_per_trx:rateNgnPerTrx,rate_source:rateSource,status:'pending'})],
    )
    await notifyDepositSubmitted({
      depositorId:user.id,
      depositorName:user.name||user.username||user.email,
      role:user.role==='admin'?'Administration':user.role==='client'?'Client':user.role==='bridger'?'Bridger':'Agent',
      depositId:String(inserted.rows[0].id),
      rail:'PAYSTACK',
      amountLabel:'₦'+amountNgn.toLocaleString(),
      secondaryLabel:flameCoin.toLocaleString()+' Flame Coin after verified payment',
      adminLink:'/admin/control-center#deposits',
    })
    try {
      const config=await getPaystackConfig()
      const origin=(config.publicOrigin||process.env.WEAVE_PUBLIC_ORIGIN||new URL(request.url).origin).replace(/\/$/,'')
      if (!origin.startsWith('https://')) throw new Error('WEAVE_PUBLIC_ORIGIN must be the canonical HTTPS production origin')
      const checkout=await initializePaystackTransaction({
        email:user.email,amountKobo:Math.round(amountNgn*100),reference,
        callbackUrl:origin+'/api/deposit/paystack/verify',
        metadata:{deposit_id:inserted.rows[0].id,user_id:user.id,user_role:user.role,flame_coin_amount:flameCoin,rate_ngn_per_trx:rateNgnPerTrx,rate_source:rateSource,custom_fields:[{display_name:'Weave deposit ID',variable_name:'weave_deposit_id',value:inserted.rows[0].id},{display_name:'Flame Coin credit',variable_name:'flame_coin_amount',value:String(flameCoin)}]},
      })
      return NextResponse.json({success:true,depositId:inserted.rows[0].id,reference,amountNgn,flameCoin,paymentLink:checkout.authorizationUrl,status:'pending'})
    } catch(error) {
      await pool.query("UPDATE deposits SET status='rejected',updated_at=NOW() WHERE id=$1::uuid AND status='pending'",[inserted.rows[0].id])
      await pool.query(
        "INSERT INTO ledger_entries(user_id,entry_type,amount,currency,description,metadata) VALUES($1::uuid,'deposit',0,'Flame Coin','Paystack checkout initialization failed',$2::jsonb)",
        [user.id,JSON.stringify({deposit_id:inserted.rows[0].id,payment_method:'Paystack',reference,ngn_amount:amountNgn,amount_kobo:Math.round(amountNgn*100),status:'initialization_failed'})],
      )
      throw error
    }
  } catch(error) {
    console.error('[Paystack deposit initialization]',error)
    return NextResponse.json({error:error instanceof Error?error.message:'Paystack checkout could not be initialized.'},{status:503})
  }
}
