import {NextRequest,NextResponse} from 'next/server'
import {getAuthUser} from '@/lib/auth-api'
import {sql,getPool} from '@/lib/db'
import {ensureProFileNumberVerificationSchema,eligibleProNumber,proVerificationPublicHeaders} from '@/lib/pro-file-number-verification'
import {ensureProActivationSchema,isTronAddress,PRO_ACTIVATION_FEE_USDT} from '@/lib/pro-file-folder-activation'
export const dynamic='force-dynamic'
async function reviewer(request:NextRequest){
 const user=await getAuthUser(request)
 return user?.role==='admin'?user:null
}
export async function GET(request:NextRequest){
 const user=await reviewer(request)
 if(!user)return NextResponse.json({error:'Administration required'},{status:403,headers:proVerificationPublicHeaders})
 try{
  await ensureProFileNumberVerificationSchema()
  const rows=await sql`SELECT id,file_number,business_name,business_plan,signed_name,
   terms_accepted_at,identity_reference,identity_verified_at,
   payment_wallet,payment_tx_hash,payment_submitted_at,payment_verified_at,
   payment_verified_amount_usdt,rejection_reason,status,created_at
   FROM pro_file_number_verifications ORDER BY
    CASE status WHEN 'pending_forensics' THEN 0 WHEN 'pending_identity' THEN 1
      WHEN 'paid_pending_account' THEN 2 ELSE 3 END,created_at DESC LIMIT 100`
  return NextResponse.json({success:true,applications:rows},{headers:proVerificationPublicHeaders})
 }catch(e){console.error('[Pro number Forensics] register',e)
  return NextResponse.json({error:'Unable to read verification register'},{status:500,headers:proVerificationPublicHeaders})
 }
}
export async function POST(request:NextRequest){
 const user=await reviewer(request)
 if(!user)return NextResponse.json({error:'Administration required'},{status:403,headers:proVerificationPublicHeaders})
 const body=await request.json().catch(()=>({}))
 const action=String(body.action||'')
 const id=String(body.id||'')
 if(!/^[0-9a-f-]{36}$/i.test(id))
  return NextResponse.json({error:'Select a valid Pro verification record.'},{status:400,headers:proVerificationPublicHeaders})
 try{
  await ensureProFileNumberVerificationSchema()
  const [current]=await sql`SELECT id,file_number,business_name,signed_name,status
   FROM pro_file_number_verifications WHERE id=${id}::uuid LIMIT 1`
  if(!current)throw new Error('Pro verification request not found.')
  if(action==='verify_identity'){
   if(current.status!=='pending_identity')throw new Error('This identity review has already advanced or closed.')
   if(body.independentlyVerified!==true)throw new Error('Independent File Number identity review required.')
   const ref=String(body.identityReference||'').trim()
   if(ref.length<8||ref.length>255)throw new Error('Provide an identifiable Administration verification reference.')
   if(!await eligibleProNumber(current.file_number))
    throw new Error('The File Number has no current verified Pro entitlement.')
   const [owner]=await sql`SELECT name FROM users WHERE file_number=${current.file_number}
    AND role='client' AND is_active=true LIMIT 1`
   // If account exists, its registered name must match the applicant signature.
   // If not yet registered, Administration is accountable for checking external records.
   if(owner&&String(owner.name||'').trim().toLowerCase()!==
      String(current.signed_name||'').trim().toLowerCase())
    throw new Error('The signed name does not match the registered Client. Resolve identity manually.')
   const [row]=await sql`UPDATE pro_file_number_verifications
    SET status='payment_required',identity_reference=${ref},
     identity_verified_by=${user.id}::uuid,identity_verified_at=now(),updated_at=now()
    WHERE id=${id}::uuid AND status='pending_identity'
    RETURNING id`
   if(!row)throw new Error('Identity verification was already updated.')
   return NextResponse.json({success:true,status:'payment_required'},{headers:proVerificationPublicHeaders})
  }
  if(action==='approve_payment'||action==='reject_payment'){
   const db=await getPool().connect()
   try{
    await db.query('BEGIN')
    const result=await db.query('SELECT * FROM pro_file_number_verifications WHERE id=$1::uuid FOR UPDATE',[id])
    const row=result.rows[0]
    if(!row||row.status!=='pending_forensics'||!row.identity_verified_at||!row.payment_tx_hash||
      !row.payment_wallet||!row.terms_accepted_at)
     throw new Error('A signed, identity-verified request with pending payment evidence is required.')
    if(action==='approve_payment'){
     const hash=String(body.verifiedTxHash||'').toLowerCase().trim()
     const wallet=String(body.verifiedWallet||'').trim()
     const amount=Number(body.verifiedAmountUSDT)
     if(body.independentlyVerified!==true||body.network!=='TRC20_USDT'
       ||hash!==String(row.payment_tx_hash).trim()||wallet!==row.payment_wallet
       ||!isTronAddress(wallet)||amount!==PRO_ACTIVATION_FEE_USDT)
      throw new Error('Forensics must independently confirm exactly 680 USDT TRC-20 to the recorded destination.')
     await ensureProActivationSchema()
     const duplicate=await db.query('SELECT id FROM pro_file_folder_activations WHERE payment_tx_hash=$1 LIMIT 1',[hash])
     if(duplicate.rows.length)throw new Error('This blockchain receipt was already assigned to another Pro activation.')
     await db.query(`UPDATE pro_file_number_verifications
      SET status='paid_pending_account',payment_verified_by=$1::uuid,
       payment_verified_at=now(),payment_verified_amount_usdt=$2,updated_at=now()
      WHERE id=$3::uuid`,[user.id,PRO_ACTIVATION_FEE_USDT,id])
    }else{
     const reason=String(body.reason||'').trim()
     if(reason.length<10||reason.length>1200)throw new Error('Give the specific payment verification finding.')
     await db.query(`UPDATE pro_file_number_verifications
      SET status='payment_rejected',rejection_reason=$1,updated_at=now()
      WHERE id=$2::uuid`,[reason,id])
    }
    await db.query('COMMIT')
    return NextResponse.json({success:true,status:action==='approve_payment'?'paid_pending_account':'payment_rejected'},
      {headers:proVerificationPublicHeaders})
   }catch(e){await db.query('ROLLBACK').catch(()=>{});throw e}
   finally{db.release()}
  }
  if(action==='finalize'){
   if(body.confirmation!=='FINALIZE VERIFIED PRO')
    throw new Error('Finalization requires explicit confirmation.')
   await ensureProActivationSchema()
   const db=await getPool().connect()
   try{
    await db.query('BEGIN')
    const result=await db.query('SELECT * FROM pro_file_number_verifications WHERE id=$1::uuid FOR UPDATE',[id])
    const row=result.rows[0]
    if(!row||row.status!=='paid_pending_account'||!row.payment_verified_at||
       Number(row.payment_verified_amount_usdt)!==PRO_ACTIVATION_FEE_USDT)
     throw new Error('An independently verified 680 USDT receipt is required first.')
    const owner=await db.query(`SELECT id,name FROM users WHERE file_number=$1
     AND role='client' AND is_active=true LIMIT 2`,[row.file_number])
    if(owner.rows.length!==1)throw new Error('Client must have an active verified account before Folder finalization.')
    const clientId=owner.rows[0].id
    if(String(owner.rows[0].name||'').trim().toLowerCase()!==
       String(row.signed_name||'').trim().toLowerCase())
     throw new Error('Client identity and signed name do not match.')
    const folder=await db.query(`SELECT client_id,status FROM client_file_folders
     WHERE file_number=$1 LIMIT 1`,[row.file_number])
    if(folder.rows.length!==1||String(folder.rows[0].client_id)!==String(clientId)||
       folder.rows[0].status!=='active')
     throw new Error('The original File Folder must be active and owned by this Client.')
    const existingRows=await db.query(`SELECT id,status,file_number FROM pro_file_folder_activations
     WHERE client_id=$1::uuid OR file_number=$2 FOR UPDATE`,[clientId,row.file_number])
    if(existingRows.rows.length>1||existingRows.rows[0]&&
      (existingRows.rows[0].file_number!==row.file_number||existingRows.rows[0].status==='active'))
     throw new Error('An active or mismatched Pro activation already exists; reconcile without overwriting.')
    const duplicate=await db.query(`SELECT id FROM pro_file_folder_activations
     WHERE payment_tx_hash=$1 AND client_id<>$2::uuid LIMIT 1`,
      [String(row.payment_tx_hash).trim(),clientId])
    if(duplicate.rows.length)throw new Error('Payment receipt assigned to another Client.')
    const values=[
      clientId,row.file_number,row.signed_name,row.terms_accepted_at,
      row.identity_reference,row.identity_verified_by,row.identity_verified_at,
      JSON.stringify(row.business_plan),row.created_at,String(row.payment_tx_hash).trim(),
      row.payment_wallet,row.payment_submitted_at,row.payment_verified_by,row.payment_verified_at
    ]
    let activationId:string
    if(existingRows.rows.length){
     const updated=await db.query(`UPDATE pro_file_folder_activations SET
      status='active',client_signature_name=$3,client_signature_at=$4,
      client_terms_version='PRO-680-USDT-2026-11',
      signed_agreement_reference=$5,signed_agreement_verified_by=$6::uuid,
      signed_agreement_verified_at=$7,business_plan=$8::jsonb,
      business_plan_submitted_at=$9,payment_tx_hash=$10,
      wallet_address=$11,payment_submitted_at=$12,
      verified_amount_usdt=680,verified_by=$13::uuid,verified_at=$14,
      activated_at=now(),updated_at=now()
      WHERE client_id=$1::uuid AND file_number=$2 AND status<>'active' RETURNING id`,values)
     if(updated.rows.length!==1)throw new Error('Existing Pro activation could not be finalized safely.')
     activationId=String(updated.rows[0].id)
    }else{
     const inserted=await db.query(`INSERT INTO pro_file_folder_activations(
       client_id,file_number,status,client_signature_name,client_signature_at,
       client_terms_version,signed_agreement_reference,signed_agreement_verified_by,
       signed_agreement_verified_at,business_plan,business_plan_submitted_at,
       payment_tx_hash,wallet_address,payment_submitted_at,verified_amount_usdt,
       verified_by,verified_at,activated_at)
      VALUES($1::uuid,$2,'active',$3,$4,'PRO-680-USDT-2026-11',$5,$6::uuid,
       $7,$8::jsonb,$9,$10,$11,$12,680,$13::uuid,$14,now()) RETURNING id`,values)
     if(inserted.rows.length!==1)throw new Error('New Pro activation could not be finalized.')
     activationId=String(inserted.rows[0].id)
    }
    // Set the approved File Folder business name only where one has not already
    // been established. Never silently rename an existing live business.
    await db.query(`UPDATE users SET business_name=$1
     WHERE id=$2::uuid AND (business_name IS NULL OR btrim(business_name)='')`,
     [row.business_name,clientId])
    await db.query(`INSERT INTO pro_activation_audit(activation_id,action,actor_id,details)
     VALUES($1::uuid,'passwordless_pro_finalized',$2::uuid,$3::jsonb)`,
     [activationId,user.id,JSON.stringify({verificationId:id,feeUSDT:680,receipt:String(row.payment_tx_hash).trim()})])
    await db.query(`UPDATE pro_file_number_verifications
     SET status='active',updated_at=now() WHERE id=$1::uuid AND status='paid_pending_account'`,[id])
    await db.query('COMMIT')
    return NextResponse.json({success:true,status:'active'},{headers:proVerificationPublicHeaders})
   }catch(e){await db.query('ROLLBACK').catch(()=>{});throw e}
   finally{db.release()}
  }
  throw new Error('Unknown verification review action.')
 }catch(e){console.error('[Pro number Forensics] review',e)
  return NextResponse.json({error:e instanceof Error?e.message:'Review unavailable'},
   {status:409,headers:proVerificationPublicHeaders})
 }
}
