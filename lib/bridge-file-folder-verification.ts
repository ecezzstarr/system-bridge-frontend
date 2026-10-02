import { sql,getPool } from '@/lib/db'
import { generateFileNumber } from '@/lib/fne'
import { ensureClientFileFolderSchema } from '@/lib/client-file-folder'
import { getFileFolderTier } from '@/lib/file-folder-pricing'
import { accrueAiProviderAllocation } from '@/lib/ai-provider-settlement'
import { recordSystemEvent } from '@/lib/system-events'

export async function ensureBridgePurchaseVerificationSchema(){
  await sql`ALTER TABLE file_folder_purchases ADD COLUMN IF NOT EXISTS payment_verification_source varchar(40)`
  await sql`ALTER TABLE file_folder_purchases ADD COLUMN IF NOT EXISTS payment_verified_at timestamptz`
  await sql`ALTER TABLE file_folder_purchases ADD COLUMN IF NOT EXISTS verified_tx_from varchar(80)`
  await sql`ALTER TABLE file_folder_purchases ADD COLUMN IF NOT EXISTS verified_tx_to varchar(80)`
}

async function provisionPersistentFolder(fileNumber:string,clientName:string){
  await ensureClientFileFolderSchema(sql)
  await sql`
    INSERT INTO client_file_folders (
      file_number,client_name,workshop_type,status
    )
    VALUES (
      ${fileNumber},${clientName},'pending_personalization','waiting_for_login'
    )
    ON CONFLICT (file_number) DO UPDATE SET
      client_name=COALESCE(client_file_folders.client_name,EXCLUDED.client_name),
      workshop_type=CASE
        WHEN client_file_folders.client_id IS NULL
          AND client_file_folders.workshop_type='formation'
        THEN 'pending_personalization'
        ELSE client_file_folders.workshop_type
      END,
      updated_at=NOW()
  `
}

export type FinalizedBridgePurchase={
  purchase:any
  fileNumber:string
  fileFolderTier:'standard'|'premium'
  registerUrl:string
  systemSwitchUrl:string
  allocation:any|null
  replayed:boolean
}

export async function finalizeBridgeRadiancePurchase(input:{
  purchaseId:string
  verifierId?:string|null
  verifierRole?:string|null
  verificationSource:'tron_solidified'|'administration'
  txFrom?:string|null
  txTo?:string|null
}):Promise<FinalizedBridgePurchase>{
  await ensureBridgePurchaseVerificationSchema()
  const pool=getPool()
  const lockClient=await pool.connect()
  const lockKey=`bridge-file-folder-purchase:${input.purchaseId}`

  try{
    await lockClient.query('SELECT pg_advisory_lock(hashtext($1))',[lockKey])

    const [purchase]=await sql`
      SELECT *
      FROM file_folder_purchases
      WHERE id=${input.purchaseId}::uuid
      LIMIT 1
    `
    if(!purchase)throw new Error('Bridge Radiance File Folder purchase not found')

    const fileFolderTier=getFileFolderTier(Number(purchase.amount_trx))
    if(!fileFolderTier)throw new Error('Stored File Folder amount is outside the current Standard/Premium pricing rules')

    if(purchase.status==='confirmed'&&purchase.file_number){
      return {
        purchase,
        fileNumber:String(purchase.file_number),
        fileFolderTier,
        registerUrl:`/client/register?fileNumber=${encodeURIComponent(String(purchase.file_number))}`,
        systemSwitchUrl:'/client/system-switch',
        allocation:null,
        replayed:true,
      }
    }

    if(purchase.status!=='pending_admin_confirmation'){
      throw new Error(`File Folder purchase cannot be confirmed from status ${purchase.status}`)
    }

    const prospectName=String(
      purchase.buyer_name||purchase.buyer_email||'Bridge Radiance Prospect'
    ).trim().slice(0,255)
    const prospectPhone=String(purchase.buyer_phone||'').trim().slice(0,80)

    const fileFolder=await generateFileNumber(null,{
      name:prospectName,
      phone:prospectPhone,
      bridgeCode:purchase.bridge_code||null,
      purchaseId:purchase.id,
      txHash:purchase.payment_reference,
      amountTrx:Number(purchase.amount_trx),
      providerName:purchase.provider_name||null,
      flameName:purchase.flame_name||null,
      verificationSource:input.verificationSource,
      txFrom:input.txFrom||null,
      txTo:input.txTo||null,
    })
    const fileNumber=String(fileFolder.file_number)

    await provisionPersistentFolder(fileNumber,prospectName)

    const [confirmed]=await sql`
      UPDATE file_folder_purchases
      SET
        file_number=${fileNumber},
        status='confirmed',
        confirmed_at=NOW(),
        confirmed_by=${input.verifierId||null}::uuid,
        payment_verification_source=${input.verificationSource},
        payment_verified_at=NOW(),
        verified_tx_from=${input.txFrom||null},
        verified_tx_to=${input.txTo||null}
      WHERE id=${input.purchaseId}::uuid
        AND status='pending_admin_confirmation'
      RETURNING *
    `
    if(!confirmed)throw new Error('File Folder purchase changed before verification completed')

    if(confirmed.bridge_code){
      await sql`
        UPDATE chatgpt_bridge_sessions
        SET crossing_state='file_number_issued'
        WHERE code=${confirmed.bridge_code}
      `
    }

    const allocation=await accrueAiProviderAllocation({
      sql,
      purchaseId:String(confirmed.id),
      fileNumber,
      grossAmount:Number(confirmed.amount_trx),
      bridgeCode:confirmed.bridge_code,
      providerKey:confirmed.provider_key,
      providerName:confirmed.provider_name,
      flameExternalId:confirmed.flame_external_id,
      flameName:confirmed.flame_name,
    })

    await recordSystemEvent({
      eventType:'file_number_issued',
      actorId:input.verifierId||null,
      actorRole:input.verifierRole||'system',
      subjectType:'client_file_folder',
      subjectId:fileNumber,
      source:input.verificationSource==='tron_solidified'
        ?'bridge-radiance-tron-verification'
        :'bridge-radiance-file-folder',
      payload:{
        purchaseId:input.purchaseId,
        bridgeCode:confirmed.bridge_code||null,
        amountFlameCoin:Number(confirmed.amount_trx),
        fileFolderTier,
        verificationSource:input.verificationSource,
        txFrom:input.txFrom||null,
        txTo:input.txTo||null,
      },
    })

    return {
      purchase:confirmed,
      fileNumber,
      fileFolderTier,
      registerUrl:`/client/register?fileNumber=${encodeURIComponent(fileNumber)}`,
      systemSwitchUrl:'/client/system-switch',
      allocation:allocation?.allocation||null,
      replayed:false,
    }
  }finally{
    try{await lockClient.query('SELECT pg_advisory_unlock(hashtext($1))',[lockKey])}catch{}
    lockClient.release()
  }
}
