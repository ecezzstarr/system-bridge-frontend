import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { getPool } from '@/lib/db'
import { getTrxPaymentNgnRate } from '@/lib/trx-payment'
import { ngnToFlameCoin } from '@/lib/flame-coin'
import { createPaystackReference, initializePaystackTransaction } from '@/lib/paystack'
import { getPaystackConfig } from '@/lib/paystack-config'
import { notifyDepositSubmitted } from '@/lib/deposit-notifications'

export const dynamic = 'force-dynamic'

/** Authenticated user's Paystack payment history; display status without assuming payment. */
export async function GET(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const result = await getPool().query(
      `SELECT d.id,d.amount_usd,d.amount_trx,d.method,d.currency,d.status,d.receipt_data,
         d.created_at,d.verified_at,
         EXISTS(
           SELECT 1 FROM ledger_entries l
           WHERE l.user_id=d.user_id AND l.entry_type='deposit' AND l.amount>0
             AND l.metadata->>'deposit_id'=d.id::text
             AND l.metadata->>'event_type'='paystack.manual_admin_credit'
         ) AS manual_credited
       FROM deposits d WHERE d.user_id=$1::uuid AND d.method='paystack'
       ORDER BY d.created_at DESC LIMIT 30`,
      [user.id],
    )
    return NextResponse.json({ success: true, deposits: result.rows }, {
      headers: { 'Cache-Control': 'private, no-store', Vary: 'Authorization' },
    })
  } catch (error) {
    console.error('[Paystack deposit history]', error)
    return NextResponse.json({ error: 'Deposit history is temporarily unavailable' }, { status: 503 })
  }
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user) return NextResponse.json({error:'Unauthorized'},{status:401})
  if (!['admin','agent','bridger','client'].includes(user.role)) return NextResponse.json({error:'This role cannot fund a Flame Coin wallet.'},{status:403})
  try {
    const body = await request.json()
    const amountNgn = Number(body?.amount)
    const amountKobo = Math.round(amountNgn * 100)
    if (!Number.isFinite(amountNgn) || amountNgn < 1 || amountNgn > 100000000 ||
        !Number.isSafeInteger(amountKobo) || Math.abs(amountNgn * 100 - amountKobo) > 0.000001) {
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
      "INSERT INTO ledger_entries(user_id,entry_type,amount,currency,description,metadata) VALUES($1::uuid,'deposit',0,'Flame Coin','Paystack deposit pending payment verification',$2::jsonb)",
      [user.id,JSON.stringify({deposit_id:inserted.rows[0].id,payment_method:'Paystack',reference,ngn_amount:amountNgn,amount_kobo:amountKobo,rate_ngn_per_trx:rateNgnPerTrx,rate_source:rateSource,status:'pending'})],
    )
    try {
      const config=await getPaystackConfig()
      const origin=(config.publicOrigin||process.env.WEAVE_PUBLIC_ORIGIN||new URL(request.url).origin).replace(/\/$/,'')
      if (!origin.startsWith('https://')) throw new Error('WEAVE_PUBLIC_ORIGIN must be the canonical HTTPS production origin')
      const checkout=await initializePaystackTransaction({
        email:user.email,amountKobo:amountKobo,reference,
        callbackUrl:origin+'/api/deposit/paystack/verify',
        metadata:{deposit_id:inserted.rows[0].id,user_id:user.id,user_role:user.role,flame_coin_amount:flameCoin,rate_ngn_per_trx:rateNgnPerTrx,rate_source:rateSource,custom_fields:[{display_name:'Weave deposit ID',variable_name:'weave_deposit_id',value:inserted.rows[0].id},{display_name:'Flame Coin credit',variable_name:'flame_coin_amount',value:String(flameCoin)}]},
      })
      await notifyDepositSubmitted({
        depositorId:user.id,
        depositorName:user.name||user.username||user.email,
        role:user.role==='admin'?'Administrations':user.role==='client'?'Client':user.role==='bridger'?'Bridger':'Agent',
        depositId:String(inserted.rows[0].id),
        rail:'PAYSTACK',
        amountLabel:'₦'+amountNgn.toLocaleString(),
        secondaryLabel:flameCoin.toLocaleString()+' Flame Coin pending Paystack confirmation',
        adminLink:'/admin/control-center#deposits',
      })
      return NextResponse.json({success:true,depositId:inserted.rows[0].id,reference,amountNgn,flameCoin,paymentLink:checkout.authorizationUrl,status:'pending'})
    } catch(error) {
      await pool.query("UPDATE deposits SET status='rejected',updated_at=NOW() WHERE id=$1::uuid AND status='pending'",[inserted.rows[0].id])
      await pool.query(
        "INSERT INTO ledger_entries(user_id,entry_type,amount,currency,description,metadata) VALUES($1::uuid,'deposit',0,'Flame Coin','Paystack checkout initialization failed',$2::jsonb)",
        [user.id,JSON.stringify({deposit_id:inserted.rows[0].id,payment_method:'Paystack',reference,ngn_amount:amountNgn,amount_kobo:amountKobo,status:'initialization_failed'})],
      )
      throw error
    }
  } catch(error) {
    console.error('[Paystack deposit initialization]',error)
    return NextResponse.json({error:error instanceof Error?error.message:'Paystack checkout could not be initialized.'},{status:503})
  }
}
