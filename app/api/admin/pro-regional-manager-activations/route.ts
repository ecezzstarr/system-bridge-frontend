import {NextRequest,NextResponse} from 'next/server'
import {getAuthUser} from '@/lib/auth-api'
import {getPool,sql} from '@/lib/db'
import {ensureProRegionalManagerActivationSchema,prepareApprovedProRegionalManager,
 PRO_MANAGER_ACTIVATION_FEE_USDT,PRO_MANAGER_NETWORK} from '@/lib/pro-regional-manager-activation'
import {ensureClientFileFolderSchema} from '@/lib/client-file-folder'
import {ensureClientWorkshopSchema} from '@/lib/client-system-workshop'
import {ensureProActivationSchema,isTronAddress} from '@/lib/pro-file-folder-activation'

export const dynamic='force-dynamic'
const headers={'Cache-Control':'private, no-store'}

async function adminUser(request:NextRequest){
 const user=await getAuthUser(request)
 return user?.role==='admin'?user:null
}

export async function GET(request:NextRequest){
 const admin=await adminUser(request)
 if(!admin)return NextResponse.json({error:'Administrations access required'},{status:403,headers})
 try{
  await ensureProRegionalManagerActivationSchema()
  const rows=await sql`SELECT p.user_id,p.file_number,p.source_role,p.status,
     p.signed_name,p.signed_at,p.payment_wallet,p.payment_tx_hash,p.payment_submitted_at,
     p.payment_verified_at,p.verified_amount_usdt,p.verified_evidence_reference,
     p.rejection_reason,p.activated_at,a.business_name,
     a.agreed_monthly_salary_usdt,a.employment_terms_reference,
     a.operating_country,a.operating_region,a.operating_city,
     u.name,u.email,u.is_active,u.role AS current_role
    FROM weave_pro_regional_manager_activations p
    JOIN weave_pro_regional_manager_applications a ON a.user_id=p.user_id
    JOIN users u ON u.id=p.user_id
    ORDER BY CASE p.status WHEN 'pending_forensics' THEN 0 WHEN 'payment_rejected' THEN 1
     WHEN 'payment_required' THEN 2 WHEN 'awaiting_signature' THEN 3 ELSE 4 END,
     p.updated_at DESC LIMIT 200`
  return NextResponse.json({success:true,activations:rows,
    feeUSDT:PRO_MANAGER_ACTIVATION_FEE_USDT,network:PRO_MANAGER_NETWORK},{headers})
 }catch(e){console.error('[Pro Manager Forensics GET]',e)
  return NextResponse.json({error:'Unable to read Pro Regional Manager activation register'},{status:503,headers})}
}

export async function POST(request:NextRequest){
 const admin=await adminUser(request)
 if(!admin)return NextResponse.json({error:'Administrations access required'},{status:403,headers})
 try{
  const body=await request.json().catch(()=>null)
  const id=String(body?.userId||'').trim()
  const action=String(body?.action||'')
  if(!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(id))
   return NextResponse.json({error:'Valid applicant account required'},{status:400,headers})
  if(action==='prepare'){
   const activation=await prepareApprovedProRegionalManager(id)
   return NextResponse.json({success:true,activation},{headers})
  }
  if(!['approve_payment','reject_payment'].includes(action))
   return NextResponse.json({error:'Unknown Forensics action'},{status:400,headers})
  if(body.independentlyVerified!==true||body.confirmation!=='VERIFY PRO MANAGER')
   return NextResponse.json({error:'Explicit independent Forensics confirmation is required'},{status:400,headers})
  const hash=String(body.verifiedTxHash||'').trim().toLowerCase()
  const wallet=String(body.verifiedWallet||'').trim()
  const network=String(body.network||'')
  const evidence=String(body.evidenceReference||'').trim()
  const amount=Number(body.verifiedAmountUSDT)
  const reason=String(body.reason||'').trim()
  if(action==='approve_payment'&&(
   !/^[a-f0-9]{64}$/.test(hash)||!isTronAddress(wallet)||
   network!==PRO_MANAGER_NETWORK||amount!==PRO_MANAGER_ACTIVATION_FEE_USDT||
   evidence.length<12||evidence.length>255||body.onChainConfirmed!==true))
   return NextResponse.json({error:'Independently verify the full 680 USDT TRC-20 transfer, exact transaction, receiving wallet and documented blockchain evidence.'},{status:400,headers})
  if(action==='reject_payment'&&reason.length<10)
   return NextResponse.json({error:'Record a reason for rejecting the unverified payment.'},{status:400,headers})
  await ensureProRegionalManagerActivationSchema()
  await ensureClientFileFolderSchema()
  await ensureClientWorkshopSchema()
  await ensureProActivationSchema()
  const db=await getPool().connect()
  try{
   await db.query('BEGIN')
   const result=await db.query(`SELECT p.*,a.status AS application_status,
     a.source_role AS application_role,a.business_plan,a.business_name,
     a.agreed_monthly_salary_usdt,a.employment_terms_reference,
     u.name,u.role,u.is_active
    FROM weave_pro_regional_manager_activations p
    JOIN weave_pro_regional_manager_applications a ON a.user_id=p.user_id
    JOIN users u ON u.id=p.user_id
    WHERE p.user_id=$1::uuid FOR UPDATE OF p,a,u`,[id])
   const row=result.rows[0]
   if(!row||row.status!=='pending_forensics'||!row.payment_tx_hash||
      !row.payment_wallet||!row.payment_submitted_at||!row.signed_at||
      row.application_status!=='approved_pending_verification'||
      row.role!==row.source_role||row.application_role!==row.source_role||
      !['agent','bridger'].includes(row.role)||!row.is_active||
      Number(row.agreed_monthly_salary_usdt)<=0||!row.employment_terms_reference||
      !row.business_plan)
    throw new Error('A signed, independently approved Agent/Bridger Pro activation awaiting Forensics is required.')
   if(action==='reject_payment'){
    await db.query(`UPDATE weave_pro_regional_manager_activations
      SET status='payment_rejected',rejection_reason=$2,payment_tx_hash=NULL,
       payment_wallet=NULL,payment_submitted_at=NULL,updated_at=now()
      WHERE user_id=$1::uuid AND status='pending_forensics'`,[id,reason])
    await db.query('COMMIT')
    return NextResponse.json({success:true,status:'payment_rejected'},{headers})
   }
   if(row.payment_tx_hash!==hash||row.payment_wallet!==wallet)
    throw new Error('Payment proof does not match the submitted transaction and receiving address.')
   // Prevent a proof from being assigned across the Client Pro and the three-role
   // Pro activation records. No self-reported or unverified funds are credited.
   await db.query(`SELECT pg_advisory_xact_lock(hashtext('weave_pro_manager_tx:'||$1))`,[hash])
   const duplicates=await db.query(`SELECT id FROM pro_file_folder_activations
      WHERE payment_tx_hash=$1 LIMIT 1`,[hash])
   if(duplicates.rows.length)throw new Error('Transaction already claimed by another Pro File Folder activation.')
   const [clientNumberTable]= (await db.query(`SELECT to_regclass('public.pro_file_number_verifications') AS table_name`)).rows
   if(clientNumberTable?.table_name){
    const dupExternal=await db.query(`SELECT id FROM pro_file_number_verifications
      WHERE payment_tx_hash=$1 LIMIT 1`,[hash])
    if(dupExternal.rows.length)throw new Error('Transaction already used by a Client Pro verification.')
   }
   const ownerFolders=await db.query(`SELECT client_id,file_number,status FROM client_file_folders
    WHERE client_id=$1::uuid OR file_number=$2 FOR UPDATE`,[id,row.file_number])
   if(ownerFolders.rows.some((f:any)=>f.file_number!==row.file_number||
      (f.client_id&&String(f.client_id)!==id)))
    throw new Error('A different original File Folder is already assigned to this account or File Number.')
   const reserved=await db.query(`UPDATE file_folders
     SET client_id=$1::uuid,status='registered',registered_at=COALESCE(registered_at,now()),updated_at=now()
     WHERE file_number=$2 AND status='pending' AND client_id IS NULL
     RETURNING id`,[id,row.file_number])
   if(reserved.rows.length!==1)throw new Error('The original reserved Pro File Number is unavailable; reconcile ownership before activating.')
   // Pro defines the Folder tier and the owner's company position, not a
   // workshop industry. Each manager's approved business plan determines what
   // this otherwise unformed workshop will become. CJ's crypto workshop is a
   // separate, individually owned Client business and must not be copied here.
   const folder=await db.query(`INSERT INTO client_file_folders
    (client_id,file_number,client_name,workshop_type,status,claimed_at)
    VALUES($1::uuid,$2,$3,'formation','active',now())
    ON CONFLICT(file_number) DO NOTHING RETURNING id`,[id,row.file_number,row.name])
   if(folder.rows.length!==1)throw new Error('Pro File Folder ownership could not be created without conflict.')
   const workshop=await db.query(`INSERT INTO client_system_workshops
    (client_id,file_number,workshop_type,title,description)
    VALUES($1::uuid,$2,'formation',
      $3||' · Pro File Folder',
      'Your Pro File Folder carries your approved individual business plan. Build the workshop and services that belong to your own work in life.')
    ON CONFLICT(client_id) DO NOTHING RETURNING id`,[id,row.file_number,row.business_name])
   if(workshop.rows.length!==1)throw new Error('Pro Manager workshop conflicts with an existing workspace.')
   const activated=await db.query(`UPDATE weave_pro_regional_manager_activations
    SET status='active',payment_verified_at=now(),verified_amount_usdt=$2,
     verified_by=$3::uuid,verified_evidence_reference=$4,
     rejection_reason=NULL,activated_at=now(),updated_at=now()
    WHERE user_id=$1::uuid AND status='pending_forensics' RETURNING file_number,status`,
    [id,amount,admin.id,evidence])
   if(activated.rows.length!==1)throw new Error('Pro activation changed during review.')
   await db.query('COMMIT')
   return NextResponse.json({success:true,status:'active',fileNumber:row.file_number,
    notice:'Independently verified Pro activation completed. The original Agent/Bridger account retains its department and now owns a separate Pro File Folder.'},{headers})
  }catch(e){await db.query('ROLLBACK').catch(()=>{});throw e}
  finally{db.release()}
 }catch(e){console.error('[Pro Manager Forensics POST]',e)
  return NextResponse.json({error:e instanceof Error?e.message:'Unable to verify Pro activation'},{status:409,headers})}
}
