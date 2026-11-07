import {NextRequest,NextResponse} from 'next/server'
import {getAuthUser} from '@/lib/auth-api'
import {getPool,sql} from '@/lib/db'
import {ensureProActivationSchema,getReceivingWallet,isTronAddress,
  PRO_ACTIVATION_FEE_USDT,writeProActivationAudit,publicHeaders} from '@/lib/pro-file-folder-activation'
import {CJ_DORADO_FILE_NUMBER} from '@/lib/client-file-folder'
export const dynamic='force-dynamic'

async function reviewer(request:NextRequest){
  const user=await getAuthUser(request)
  return user?.role==='admin'?user:null // Forensics is an authorized Administrations function.
}
async function notify(clientId:string,title:string,content:string){
 try{await sql`INSERT INTO notifications(user_id,type,title,content,from_user_name,link)
  VALUES(${clientId}::uuid,'file_folder_upgrade',${title},${content},'WEAVE Forensics','/client/pro-activation')`}
 catch(e){console.error('[Pro activation notice]',e)}
}
export async function GET(request:NextRequest){
 const user=await reviewer(request)
 if(!user)return NextResponse.json({error:'Administrations required'},{status:403,headers:publicHeaders})
 try{
  await ensureProActivationSchema()
  const rows=await sql`SELECT a.*,u.name AS client_name,u.email AS client_email
    FROM pro_file_folder_activations a JOIN users u ON u.id=a.client_id
    ORDER BY CASE WHEN a.status='pending_forensics' THEN 0 ELSE 1 END,a.updated_at DESC LIMIT 100`
  const [cj]=await sql`SELECT id,name,email,file_number FROM users
    WHERE file_number=${CJ_DORADO_FILE_NUMBER} AND role='client' AND is_active=true LIMIT 1`
  return NextResponse.json({success:true,activations:rows,cjClient:cj||null,
    wallet:await getReceivingWallet(),feeUSDT:PRO_ACTIVATION_FEE_USDT},{headers:publicHeaders})
 }catch(e){console.error('[Pro activation registry]',e);return NextResponse.json({error:'Activation register unavailable'},{status:500,headers:publicHeaders})}
}
export async function POST(request:NextRequest){
 const user=await reviewer(request)
 if(!user)return NextResponse.json({error:'Administrations required'},{status:403,headers:publicHeaders})
 const body=await request.json().catch(()=>({}))
 const action=String(body.action||'')
 try{
  await ensureProActivationSchema()
  if(action==='configure_wallet')
   return NextResponse.json({error:'Company wallet configuration has moved to the audited Administrations Company Active Wallet workspace. Open /admin/company-active-wallet.'},
     {status:409,headers:publicHeaders})
  const fileNumber=String(body.fileNumber||'').trim().toUpperCase()
  if(!fileNumber||fileNumber.length>120)throw new Error('Provide the exact issued File Number.')
  const clients=await sql`SELECT id,name,file_number FROM users
    WHERE file_number=${fileNumber} AND role='client' AND is_active=true LIMIT 2`
  if(clients.length!==1)throw new Error('Exactly one active Client must own this File Number.')
  const client=clients[0]
  if(fileNumber===CJ_DORADO_FILE_NUMBER&&!/\bcj\s+dorado\b/i.test(String(client.name||'')))
   throw new Error('CJ Dorado identity mismatch. Reconcile the existing account, do not create another.')
  if(action==='prepare'){
   if(body.confirmation!=='PREPARE PRO ACTIVATION')throw new Error('Confirm PREPARE PRO ACTIVATION.')
   const [folderTable]=await sql`SELECT to_regclass('public.client_file_folders') AS name`
   if(!folderTable?.name)throw new Error('File Folder ownership register unavailable.')
   const [folder]=await sql`SELECT file_number,client_id FROM client_file_folders
      WHERE file_number=${fileNumber} LIMIT 1`
   if(!folder||String(folder.client_id)!==String(client.id))
    throw new Error('Existing File Folder ownership must match the Client before preparing Pro.')
   if(fileNumber!==CJ_DORADO_FILE_NUMBER){
    const [grantTable]=await sql`SELECT to_regclass('public.company_client_staff_offers') AS name`
    const [purchaseTable]=await sql`SELECT to_regclass('public.file_folder_purchases') AS name`
    const [grant]=grantTable?.name?await sql`SELECT 1 FROM company_client_staff_offers
      WHERE client_id=${client.id}::uuid AND file_number=${fileNumber} AND status='approved'
        AND folder_tier='pro' LIMIT 1`:[]
    const [purchase]=purchaseTable?.name?await sql`SELECT 1 FROM file_folder_purchases
      WHERE client_id=${client.id}::uuid AND file_number=${fileNumber}
        AND file_folder_tier='pro' AND status IN ('confirmed','approved') LIMIT 1`:[]
    if(!grant&&!purchase)throw new Error('A verified Pro entitlement is required; no other tier may be charged.')
   }
   const [a]=await sql`INSERT INTO pro_file_folder_activations(client_id,file_number)
      VALUES(${client.id}::uuid,${fileNumber}) ON CONFLICT DO NOTHING RETURNING id`
   if(!a)throw new Error('Activation already prepared. Review its record instead of duplicating.')
   await writeProActivationAudit(String(a.id),'prepared',user.id)
   await notify(client.id,'Pro File Folder agreement required',
     'Your 680 USDT one-time Pro activation terms require signed acceptance before the business-plan and payment stages.')
   return NextResponse.json({success:true,status:'awaiting_signature'},{status:201,headers:publicHeaders})
  }
  if(action==='confirm_signature'){
   const reference=String(body.agreementReference||'').trim()
   if(!body.signatureChecked||reference.length<6||reference.length>255)
    throw new Error('Independently review the Client electronic signature and record its reference.')
   const [signed]=await sql`SELECT client_signature_name,client_signature_at
     FROM pro_file_folder_activations WHERE client_id=${client.id}::uuid
      AND file_number=${fileNumber} AND status='awaiting_signature' LIMIT 1`
   if(!signed?.client_signature_name||!signed?.client_signature_at)
    throw new Error('The Client must electronically sign the 680 USDT Pro agreement before Administrations verification.')
   const [a]=await sql`UPDATE pro_file_folder_activations
      SET signed_agreement_reference=${reference},signed_agreement_verified_at=now(),
          signed_agreement_verified_by=${user.id}::uuid,
          status='business_plan_required',updated_at=now()
      WHERE client_id=${client.id}::uuid AND file_number=${fileNumber}
        AND status='awaiting_signature' AND client_signature_at IS NOT NULL
      RETURNING id`
   if(!a)throw new Error('Already signed, activated, or not prepared. Do not overwrite signed terms.')
   await writeProActivationAudit(String(a.id),'signature_verified',user.id,{reference})
   await notify(client.id,'Pro signature received',
     'Your Pro agreement is recorded. Open your activation workspace and submit your business plan.')
   return NextResponse.json({success:true,status:'business_plan_required'},{headers:publicHeaders})
  }
  if(action==='approve_payment'||action==='reject_payment'){
   const db=await getPool().connect()
   let approved=false
   let reason=''
   try{
    await db.query('BEGIN')
    const result=await db.query(`SELECT * FROM pro_file_folder_activations
       WHERE client_id=$1::uuid AND file_number=$2 FOR UPDATE`,[client.id,fileNumber])
    const row=result.rows[0]
    if(!row||row.status!=='pending_forensics'||!row.payment_tx_hash||!row.wallet_address||
       !row.signed_agreement_verified_at||!row.business_plan_submitted_at)
      throw new Error('A complete, pending Pro payment is required for Forensics review.')
    if(action==='approve_payment'){
     const checkedHash=String(body.verifiedTxHash||'').trim().toLowerCase()
     const actualAmount=Number(body.verifiedAmountUSDT)
     const checkedWallet=String(body.verifiedWallet||'').trim()
     if(!body.independentlyVerified||body.network!=='TRC20_USDT'||
       checkedHash!==String(row.payment_tx_hash)||checkedWallet!==String(row.wallet_address)||
       !isTronAddress(checkedWallet)||actualAmount!==PRO_ACTIVATION_FEE_USDT)
       throw new Error('Forensics must independently verify the exact 680 USDT TRC-20 transfer and receiving wallet.')
     const done=await db.query(`UPDATE pro_file_folder_activations
       SET status='active',verified_amount_usdt=$1,verified_at=now(),verified_by=$2::uuid,
           activated_at=now(),updated_at=now(),rejection_reason=NULL WHERE id=$3`,
       [PRO_ACTIVATION_FEE_USDT,user.id,row.id])
     approved=done.rowCount===1
    }else{
     reason=String(body.reason||'').trim()
     if(reason.length<10||reason.length>1500)throw new Error('Provide a specific rejection reason.')
     await db.query(`UPDATE pro_file_folder_activations
       SET status='rejected',rejection_reason=$1,updated_at=now() WHERE id=$2`,[reason,row.id])
    }
    await db.query(`INSERT INTO pro_activation_audit(activation_id,action,actor_id,details)
      VALUES($1::uuid,$2,$3::uuid,$4::jsonb)`,
       [row.id,approved?'payment_approved':'payment_rejected',user.id,
        JSON.stringify({txHash:row.payment_tx_hash,wallet:row.wallet_address,amountUSDT:approved?680:null,reason})])
    await db.query('COMMIT')
   }catch(e){await db.query('ROLLBACK').catch(()=>{});throw e}
   finally{db.release()}
   await notify(client.id,approved?'Your Pro File Folder is active':'Pro payment needs review',
     approved?'Forensics verified the full 680 USDT TRC-20 activation fee. Your existing Pro File Folder can now open.':
       'Forensics could not verify the payment: '+reason)
   return NextResponse.json({success:true,status:approved?'active':'rejected'},{headers:publicHeaders})
  }
  throw new Error('Unknown Pro activation action.')
 }catch(e){console.error('[Pro Forensics workflow]',e);return NextResponse.json({error:e instanceof Error?e.message:'Review unavailable'},{status:409,headers:publicHeaders})}
}
