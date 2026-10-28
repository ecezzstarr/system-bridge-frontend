import { NextRequest, NextResponse } from 'next/server'
import { verifyPaystackWebhookSignature } from '@/lib/paystack'
import { settlePaystackDeposit } from '@/lib/paystack-deposits'
import { getPool } from '@/lib/db'
import { notifyAdministrators } from '@/lib/deposit-notifications'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  if (!verifyPaystackWebhookSignature(rawBody, request.headers.get('x-paystack-signature'))) {
    return NextResponse.json({error:'Invalid Paystack signature'},{status:401})
  }
  try {
    const event=JSON.parse(rawBody)
    const reference=typeof event?.data?.reference==='string'?event.data.reference:''
    if (event?.event === 'charge.success' && reference) {
      // Settlement re-verifies the reference against Paystack's API; webhook JSON alone never credits a wallet.
      await settlePaystackDeposit(reference)
    } else if ((event?.event === 'charge.failed' || event?.event === 'refund.processed') && reference) {
      const pool=getPool()
      const client=await pool.connect()
      try {
        await client.query('BEGIN')
        const found=await client.query(
          "SELECT id,user_id,amount_usd,amount_trx,status FROM deposits WHERE method='paystack' AND receipt_data=$1 FOR UPDATE",
          [reference],
        )
        const deposit=found.rows[0]
        if (deposit) {
          const eventType=String(event.event)
          if (eventType==='charge.failed' && deposit.status==='pending') {
            await client.query("UPDATE deposits SET status='rejected',updated_at=NOW() WHERE id=$1::uuid AND status='pending'",[deposit.id])
          }
          // A refund/reversal is recorded for Administration review. Do not silently debit a wallet;
          // any recovery must follow an explicit, auditable reconciliation decision.
          await client.query(
            "INSERT INTO ledger_entries(user_id,entry_type,amount,currency,description,metadata) VALUES($1::uuid,'deposit',0,'Flame Coin',$2,$3::jsonb)",
            [deposit.user_id,event.event==='refund.processed'?'Paystack refund/reversal event recorded':'Paystack charge failure recorded',JSON.stringify({deposit_id:deposit.id,payment_method:'Paystack',reference,event_type:event.event,event_id:event.data?.id||null,amount_ngn:Number(deposit.amount_usd),flame_coin_amount:Number(deposit.amount_trx),deposit_status:deposit.status,requires_administration_review:true})],
          )
          await client.query('COMMIT')
          await notifyAdministrators({
            type:'deposit_payment_event',
            title:event.event==='refund.processed'?'Paystack refund requires review':'Paystack payment failed',
            content:`Paystack event ${event.event} was recorded for deposit ${deposit.id} (reference ${reference}). Review the deposit ledger before taking any wallet action.`,
            link:'/admin/control-center#deposits',
            fromUserName:'WEAVE Paystack',
          })
        } else {
          await client.query('COMMIT')
        }
      } catch(error) {
        await client.query('ROLLBACK').catch(()=>{})
        throw error
      } finally {
        client.release()
      }
    }
    return NextResponse.json({received:true})
  } catch(error) {
    console.error('[Paystack webhook settlement]',error)
    return NextResponse.json({error:'Paystack event could not be processed'},{status:503})
  }
}
