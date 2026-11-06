import { NextRequest, NextResponse } from 'next/server'
import { verifyPaystackWebhookSignature } from '@/lib/paystack'
import { settlePaystackDeposit } from '@/lib/paystack-deposits'
import { getPool } from '@/lib/db'
import { notifyAdministrators } from '@/lib/deposit-notifications'
import { settleDepartmentEntryPaystackTicket } from '@/lib/department-entry-paystack'
import { settleFileFolderPaystackPurchase } from '@/lib/file-folder-paystack'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  if (!(await verifyPaystackWebhookSignature(
    rawBody, request.headers.get('x-paystack-signature'), request.headers.get('paystack-signature'),
  ))) {
    return NextResponse.json({error:'Invalid Paystack signature'},{status:401})
  }
  try {
    const event=JSON.parse(rawBody)
    const reference=typeof event?.data?.reference==='string'?event.data.reference:''
    if (event?.event === 'charge.success' && reference) {
      // The server generates distinct references for each payment product.
      // Route recognized references directly, avoiding unrelated schema queries.
      if (reference.startsWith('CJLOAN-')) {
        // Retired CJ Paystack route: never treat a historical loan reference as
        // a Pro activation fee or credit the former loan register.
        await notifyAdministrators({
          type:'deposit_payment_event',title:'Retired CJ Paystack reference requires reconciliation',
          content:'Paystack reported a charge for historical reference '+reference+
            '. Pro activation uses USDT TRC-20 and manual Forensics approval. Inspect the Paystack payment independently; do not auto-activate or auto-credit.',
          link:'/admin/pro-activations',fromUserName:'WEAVE Paystack',
        })
      } else if (reference.startsWith('ENTRY-')) {
        await settleDepartmentEntryPaystackTicket(reference)
      } else if (reference.startsWith('FOLDER-')) {
        await settleFileFolderPaystackPurchase(reference)
      } else if (/^(ADMIN|AGENT|BRIDGER|CLIENT)-/.test(reference)) {
        await settlePaystackDeposit(reference, event.data)
      } else {
        // Keep compatibility with older Paystack references that lack a role prefix.
        const ticketResult = await settleDepartmentEntryPaystackTicket(reference)
        if (!ticketResult.matched) {
          const fileFolderResult = await settleFileFolderPaystackPurchase(reference)
          if (!fileFolderResult.matched) await settlePaystackDeposit(reference, event.data)
        }
      }
    } else if ((event?.event === 'charge.failed' || event?.event === 'refund.processed') && reference) {
      if(reference.startsWith('CJLOAN-')){
        await notifyAdministrators({
          type:'deposit_payment_event',title:'Retired CJ Paystack refund or failure requires review',
          content:'Paystack reported '+event.event+' for historical reference '+reference+
            '. Reconcile the provider record; no Pro fee or Client wallet is changed automatically.',
          link:'/admin/pro-activations',fromUserName:'WEAVE Paystack',
        })
        return NextResponse.json({received:true})
      }
      const pool=getPool()
      const client=await pool.connect()
      try {
        await client.query('BEGIN')
        const found=await client.query("SELECT id,user_id,amount_usd,amount_trx,status FROM deposits WHERE method='paystack' AND receipt_data=$1 FOR UPDATE",[reference])
        const deposit=found.rows[0]
        if (deposit) {
          if (event.event==='charge.failed' && deposit.status==='pending') await client.query("UPDATE deposits SET status='rejected',updated_at=NOW() WHERE id=$1::uuid AND status='pending'",[deposit.id])
          await client.query("INSERT INTO ledger_entries(user_id,entry_type,amount,currency,description,metadata) VALUES($1::uuid,'deposit',0,'Flame Coin',$2,$3::jsonb)",[deposit.user_id,event.event==='refund.processed'?'Paystack refund/reversal event recorded':'Paystack charge failure recorded',JSON.stringify({deposit_id:deposit.id,payment_method:'Paystack',reference,event_type:event.event,event_id:event.data?.id||null,amount_ngn:Number(deposit.amount_usd),flame_coin_amount:Number(deposit.amount_trx),deposit_status:deposit.status,requires_administration_review:true})])
          await client.query('COMMIT')
          await notifyAdministrators({type:'deposit_payment_event',title:event.event==='refund.processed'?'Paystack refund requires review':'Paystack payment failed',content:`Paystack event ${event.event} was recorded for deposit ${deposit.id} (reference ${reference}). Review the deposit ledger before taking any wallet action.`,link:'/admin/control-center#deposits',fromUserName:'WEAVE Paystack'})
        } else await client.query('COMMIT')
      } catch(error) { await client.query('ROLLBACK').catch(()=>{}); throw error }
      finally { client.release() }
    }
    return NextResponse.json({received:true})
  } catch(error) {
    console.error('[Paystack webhook settlement]',error)
    return NextResponse.json({error:'Paystack event could not be processed'},{status:503})
  }
}
