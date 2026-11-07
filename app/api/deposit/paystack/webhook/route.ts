import { NextRequest, NextResponse } from 'next/server'
import { verifyPaystackWebhookSignature } from '@/lib/paystack'
import { settlePaystackDeposit } from '@/lib/paystack-deposits'
import { getPool } from '@/lib/db'
import { notifyAdministrators } from '@/lib/deposit-notifications'
import { settleDepartmentEntryPaystackTicket } from '@/lib/department-entry-paystack'
import { settleFileFolderPaystackPurchase } from '@/lib/file-folder-paystack'

export const dynamic = 'force-dynamic'

async function recordWalletEvent(reference: string, eventType: string, data: Record<string, unknown>, reason?: string) {
  const client = await getPool().connect()
  const eventId = String(data.refund_reference || data.id || '').slice(0, 200)
  const eventKey = eventId || JSON.stringify([data.amount ?? null, data.currency ?? null, data.refunded_at ?? null])
  try {
    await client.query('BEGIN')
    const {rows: [deposit]} = await client.query(
      "SELECT id,user_id,status FROM deposits WHERE method='paystack' AND receipt_data=$1 FOR UPDATE",
      [reference],
    )
    if (deposit) {
      const inserted = await client.query(
        `INSERT INTO ledger_entries(user_id,entry_type,amount,currency,description,metadata)
         SELECT $1::uuid,'deposit',0,'Flame Coin',$2,$3::jsonb
         WHERE NOT EXISTS (
           SELECT 1 FROM ledger_entries
           WHERE user_id=$1::uuid AND metadata->>'deposit_id'=$4
             AND metadata->>'event_type'=$5
             AND COALESCE(metadata->>'event_key',metadata->>'event_id','')=$6
         )`,
        [deposit.user_id, 'Paystack payment requires Administration review',
          JSON.stringify({deposit_id:deposit.id,payment_method:'Paystack',reference,
            event_type:eventType,event_id:eventId || null,event_key:eventKey,provider_amount:data.amount ?? null,
            currency:data.currency ?? null,reason,requires_administration_review:true}),
          deposit.id,eventType,eventKey],
      )
      if (eventType === 'charge.failed' && deposit.status === 'pending') {
        await client.query("UPDATE deposits SET status='rejected',updated_at=NOW() WHERE id=$1::uuid AND status='pending'", [deposit.id])
      }
      if (inserted.rowCount) {
        await client.query(
          `INSERT INTO notifications(user_id,type,title,content,from_user_name,link)
           SELECT id,'deposit_payment_event','Paystack payment requires review',$1,'WEAVE Paystack','/admin/control-center#deposits'
           FROM users WHERE role='admin' AND COALESCE(is_active,true)`,
          [`Paystack ${eventType} for ${reference}. ${reason || 'Inspect the payment evidence before changing the wallet.'}`],
        )
      }
    }
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    throw error
  } finally {
    client.release()
  }
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  if (!(await verifyPaystackWebhookSignature(
    rawBody, request.headers.get('x-paystack-signature'), request.headers.get('paystack-signature'),
  ))) {
    return NextResponse.json({error:'Invalid Paystack signature'},{status:401})
  }
  try {
    const event=JSON.parse(rawBody)
    const providerReference = event?.event === 'refund.processed'
      ? event?.data?.transaction_reference ?? event?.data?.transaction?.reference ?? event?.data?.reference
      : event?.data?.reference
    const reference = typeof providerReference === 'string' ? providerReference.trim() : ''
    const settleWallet = async () => {
      const result = await settlePaystackDeposit(reference, event.data)
      if (!result.settled) await recordWalletEvent(reference, 'charge.success.review', event.data, result.reason)
    }
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
        await settleWallet()
      } else {
        // Keep compatibility with older Paystack references that lack a role prefix.
        const ticketResult = await settleDepartmentEntryPaystackTicket(reference)
        if (!ticketResult.matched) {
          const fileFolderResult = await settleFileFolderPaystackPurchase(reference)
          if (!fileFolderResult.matched) await settleWallet()
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
      await recordWalletEvent(reference, event.event, event.data)
    }
    return NextResponse.json({received:true})
  } catch(error) {
    console.error('[Paystack webhook settlement]',error)
    return NextResponse.json({error:'Paystack event could not be processed'},{status:503})
  }
}
