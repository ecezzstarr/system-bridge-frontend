import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/db'
import type { PoolClient } from 'pg'
import { FILE_FOLDER_PRICING } from '@/lib/file-folder-pricing'
import { accrueAiProviderAllocation } from '@/lib/ai-provider-settlement'
import { ensureFlameSchema } from '@/lib/flame-schema'
import { matchesVerifiedPayment } from '@/lib/payment-verification'
export async function GET(request: NextRequest) {
 const base=process.env.NEXTAUTH_URL || new URL(request.url).origin
 const back=(message:string)=>NextResponse.redirect(`${base}/system-switch?${message}`)
 const params=request.nextUrl.searchParams, reference=params.get('ref'), transactionId=params.get('transaction_id')
 if(!reference||!transactionId||!/^[0-9]+$/.test(transactionId))return back('error=invalid_payment_params')
 if(!process.env.FLW_SECRET_KEY)return back('error=verification_unavailable')
 let db:PoolClient|undefined
 try {
  const response=await fetch(`https://api.flutterwave.com/v3/transactions/${transactionId}/verify`,{headers:{Authorization:`Bearer ${process.env.FLW_SECRET_KEY}`}})
  const verified=await response.json()
  if(!response.ok||verified.status!=='success')return back('error=verification_failed')
  const fileFolder=params.get('type')==='file_folder'
  if(fileFolder)await ensureFlameSchema()
  db=await getPool().connect();await db.query('BEGIN')
  const sql=async(strings:TemplateStringsArray,...values:any[])=>{let query=strings[0];values.forEach((_,i)=>{query+=`$${i+1}${strings[i+1]}`});return (await db!.query(query,values)).rows}
  const [pending]=fileFolder
   ?await sql`SELECT * FROM file_folder_purchases WHERE payment_reference=${reference} FOR UPDATE`
   :await sql`SELECT * FROM pending_deposits WHERE reference=${reference} FOR UPDATE`
  const expected=fileFolder?Number(pending?.amount_trx)/FILE_FOLDER_PRICING.flameCoinPerUsd:Number(pending?.amount_usd)
  if(!pending||!matchesVerifiedPayment(verified.data,reference,expected)){await db.query('ROLLBACK');return back('error=payment_verification_mismatch')}
  if(fileFolder){
   if(!['confirmed','folder_issued','paid_pending_folder'].includes(pending.status)){
    const [owner]=await sql`SELECT id FROM users WHERE id=${pending.client_id}::uuid AND file_number=${pending.file_number} AND is_active=true LIMIT 1`
    const [folder]=owner?await sql`UPDATE client_file_folders SET client_id=${owner.id}::uuid,status='active',claimed_at=COALESCE(claimed_at,NOW()),updated_at=NOW() WHERE file_number=${pending.file_number} AND (client_id IS NULL OR client_id=${owner.id}::uuid) RETURNING file_number`:[]
    if(folder){
     await sql`UPDATE file_folder_purchases SET status='confirmed',confirmed_at=NOW() WHERE id=${pending.id}::uuid`
     await accrueAiProviderAllocation({sql,purchaseId:String(pending.id),fileNumber:folder.file_number,grossAmount:Number(pending.amount_trx),bridgeCode:pending.bridge_code,providerKey:pending.provider_key,providerName:pending.provider_name,flameExternalId:pending.flame_external_id,flameName:pending.flame_name})
    }else await sql`UPDATE file_folder_purchases SET status='paid_pending_folder',confirmed_at=NOW() WHERE id=${pending.id}::uuid`
   }
  }else if(pending.status==='pending'){
   const amount=Number(pending.amount_trx)
   if(!Number.isFinite(amount)||amount<=0)throw new Error('Invalid deposit amount')
   const rows=await sql`UPDATE wallets SET balance_trx=COALESCE(balance_trx,0)+${amount},updated_at=NOW() WHERE user_id=${pending.user_id}::uuid AND is_primary=true RETURNING id`
   if(rows.length!==1)throw new Error('Primary wallet unavailable')
   await sql`UPDATE pending_deposits SET status='completed',updated_at=NOW() WHERE reference=${reference}`
  }
  await db.query('COMMIT')
  return fileFolder?back('success=file_folder_payment_recorded'):NextResponse.redirect(`${base}/wallet/deposit-withdraw?success=true`)
 }catch{if(db)await db.query('ROLLBACK').catch(()=>{});return back('error=processing_failed')}finally{db?.release()}
}
