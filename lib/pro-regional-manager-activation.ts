import {sql,getPool} from '@/lib/db'
import {createRandomFileNumberCandidate,ensureFneTables} from '@/lib/fne'
import {ensureClientFileFolderSchema} from '@/lib/client-file-folder'
import {ensureProRegionalManagerApplicationsSchema} from '@/lib/pro-regional-manager-applications'
import {getAuthUser} from '@/lib/auth-api'
import {NextRequest} from 'next/server'
import {PRO_ACTIVATION_FEE_USDT,getReceivingWallet,isTronAddress} from '@/lib/pro-file-folder-activation'

export const PRO_MANAGER_TERMS_VERSION='PRO-REGIONAL-MANAGER-2026-11'
export const PRO_MANAGER_NETWORK='TRC20_USDT'
export const PRO_MANAGER_ACTIVATION_FEE_USDT=PRO_ACTIVATION_FEE_USDT
const validHash=(s:string)=>/^[a-f0-9]{64}$/i.test(s)

export async function ensureProRegionalManagerActivationSchema(){
 await ensureProRegionalManagerApplicationsSchema()
 await sql`CREATE TABLE IF NOT EXISTS weave_pro_regional_manager_activations (
   user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
   file_number varchar(120) NOT NULL UNIQUE,
   source_role varchar(20) NOT NULL CHECK(source_role IN ('bridger','agent')),
   status varchar(40) NOT NULL DEFAULT 'awaiting_signature'
    CHECK(status IN ('awaiting_signature','payment_required','pending_forensics','payment_rejected','active')),
   signed_name varchar(255),
   signed_at timestamptz,
   terms_version varchar(80),
   payment_wallet varchar(64),
   payment_tx_hash char(64) UNIQUE,
   payment_submitted_at timestamptz,
   payment_verified_at timestamptz,
   verified_amount_usdt numeric(16,2),
   verified_by uuid REFERENCES users(id),
   verified_evidence_reference varchar(255),
   rejection_reason text,
   activated_at timestamptz,
   created_at timestamptz NOT NULL DEFAULT NOW(),
   updated_at timestamptz NOT NULL DEFAULT NOW()
 )`
 await sql`CREATE INDEX IF NOT EXISTS weave_pro_manager_activation_status_time
   ON weave_pro_regional_manager_activations(status,created_at DESC)`
 await sql`CREATE TABLE IF NOT EXISTS weave_pro_regional_manager_work (
   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
   user_id uuid NOT NULL REFERENCES weave_pro_regional_manager_activations(user_id) ON DELETE CASCADE,
   source_role varchar(20) NOT NULL CHECK(source_role IN ('bridger','agent')),
   activity_type varchar(36) NOT NULL
     CHECK(activity_type IN ('business_contact','partnership','department_operation','customer_service','follow_up','company_report')),
   title varchar(180) NOT NULL,
   organization varchar(180),
   details text,
   next_action text,
   status varchar(20) NOT NULL DEFAULT 'planned'
     CHECK(status IN ('planned','in_progress','completed','blocked')),
   completed_at timestamptz,
   created_at timestamptz NOT NULL DEFAULT NOW(),
   updated_at timestamptz NOT NULL DEFAULT NOW()
 )`
 await sql`CREATE INDEX IF NOT EXISTS weave_pro_manager_work_user_time
   ON weave_pro_regional_manager_work(user_id,created_at DESC)`
}

/** Allocate a separate Pro File Number only after Administration has reviewed
 * the actual employment terms. This never alters the original user role or
 * ordinary department File Number. The allocation and reservation are atomic. */
export async function prepareApprovedProRegionalManager(userId:string){
 await ensureProRegionalManagerActivationSchema()
 if(!await ensureFneTables())throw new Error('File Number Engine unavailable')
 await ensureClientFileFolderSchema()
 const db=await getPool().connect()
 try{
  await db.query('BEGIN')
  const result=await db.query(`SELECT a.user_id,a.source_role,a.status,
    a.business_name,a.operating_country,a.operating_region,a.operating_city,
    a.agreed_monthly_salary_usdt,a.employment_terms_reference,u.name,u.role,u.is_active
    FROM weave_pro_regional_manager_applications a
    JOIN users u ON u.id=a.user_id
    WHERE a.user_id=$1::uuid FOR UPDATE OF a,u`,[userId])
  const app=result.rows[0]
  if(!app||app.status!=='approved_pending_verification'||!app.is_active||
     !['agent','bridger'].includes(app.role)||app.role!==app.source_role||
     Number(app.agreed_monthly_salary_usdt)<=0||!app.employment_terms_reference)
   throw new Error('Approved Agent or Bridger Pro employment terms are required.')
  const old=await db.query('SELECT file_number,status FROM weave_pro_regional_manager_activations WHERE user_id=$1::uuid',[userId])
  if(old.rows.length){
   await db.query('COMMIT')
   return old.rows[0]
  }
  let allocated:null|string=null
  for(let i=0;i<12;i++){
   const proposed=createRandomFileNumberCandidate()
   const exists=await db.query(`SELECT 1 FROM users WHERE file_number=$1
     UNION ALL SELECT 1 FROM client_file_folders WHERE file_number=$1
     UNION ALL SELECT 1 FROM weave_pro_regional_manager_activations WHERE file_number=$1
     LIMIT 1`,[proposed])
   if(exists.rows.length)continue
   const inserted=await db.query(`INSERT INTO file_folders(file_number,status,identity_data)
     VALUES($1,'pending',$2::jsonb) ON CONFLICT (file_number) DO NOTHING
     RETURNING file_number`,[proposed,JSON.stringify({
      name:app.name,proRegionalManager:true,sourceRole:app.source_role,
      businessName:app.business_name,operatingCountry:app.operating_country,
      operatingRegion:app.operating_region,operatingCity:app.operating_city,
     })])
   if(!inserted.rows.length)continue
   allocated=proposed
   break
  }
  if(!allocated)throw new Error('Unable to reserve a unique Pro File Number.')
  const created=await db.query(`INSERT INTO weave_pro_regional_manager_activations
    (user_id,file_number,source_role,status)
    VALUES($1::uuid,$2,$3,'awaiting_signature')
    RETURNING file_number,status`,[userId,allocated,app.source_role])
  await db.query('COMMIT')
  return created.rows[0]
 }catch(e){
  await db.query('ROLLBACK').catch(()=>{})
  throw e
 }finally{db.release()}
}

export async function getProManagerApplicant(request:NextRequest){
 const user=await getAuthUser(request)
 if(!user||!['agent','bridger'].includes(user.role))return null
 await ensureProRegionalManagerActivationSchema()
 const [row]=await sql`SELECT a.source_role,a.business_name,a.business_plan,
   a.operating_country,a.operating_region,a.operating_city,a.contact_address,
   a.daily_work_plan,a.status AS application_status,
   a.agreed_monthly_salary_usdt,a.employment_terms_reference,
   p.file_number,p.status AS activation_status,p.signed_name,p.signed_at,
   p.terms_version,p.payment_wallet,p.payment_tx_hash,p.payment_submitted_at,
   p.payment_verified_at,p.verified_amount_usdt,p.rejection_reason,p.activated_at,
   u.name AS account_name,u.role,u.is_active
   FROM weave_pro_regional_manager_applications a
   JOIN users u ON u.id=a.user_id
   LEFT JOIN weave_pro_regional_manager_activations p ON p.user_id=a.user_id
   WHERE a.user_id=${user.id}::uuid AND u.role=a.source_role
   AND u.is_active=true LIMIT 1`
 if(!row||row.source_role!==user.role)return null
 return {user,row}
}

/** Original account ownership, verified activation and specific Folder must
 * agree. A simple approved application or payment hash can never grant access. */
export async function getActiveProRegionalManager(request:NextRequest){
 const ctx=await getProManagerApplicant(request)
 if(!ctx||ctx.row.application_status!=='approved_pending_verification'||
    ctx.row.activation_status!=='active'||!ctx.row.payment_verified_at||
    Number(ctx.row.verified_amount_usdt)!==PRO_MANAGER_ACTIVATION_FEE_USDT||
    !ctx.row.signed_at||!ctx.row.file_number)return null
 const [folder]=await sql`SELECT id FROM client_file_folders
   WHERE client_id=${ctx.user.id}::uuid AND file_number=${ctx.row.file_number}
     AND status='active' LIMIT 1`
 return folder?ctx:null
}

export async function signProManagerTerms(userId:string,typedName:string,agreed:boolean){
 if(!agreed)throw new Error('Accept the approved Pro employment and activation terms.')
 const name=typedName.trim().replace(/\s+/g,' ')
 if(name.length<3||name.length>255)throw new Error('Enter your full registered name.')
 const [row]=await sql`SELECT a.status AS app_status,a.agreed_monthly_salary_usdt,
    a.employment_terms_reference,u.name,u.role,u.is_active
    FROM weave_pro_regional_manager_applications a
    JOIN users u ON u.id=a.user_id WHERE a.user_id=${userId}::uuid LIMIT 1`
 if(!row||row.app_status!=='approved_pending_verification'||!row.is_active||
   !['agent','bridger'].includes(row.role)||Number(row.agreed_monthly_salary_usdt)<=0||
   !row.employment_terms_reference||name.toLowerCase()!==
    String(row.name||'').trim().replace(/\s+/g,' ').toLowerCase())
  throw new Error('Your signed name and independently approved company employment record must match.')
 const [signed]=await sql`UPDATE weave_pro_regional_manager_activations
  SET signed_name=${name},signed_at=now(),terms_version=${PRO_MANAGER_TERMS_VERSION},
   status='payment_required',updated_at=now()
  WHERE user_id=${userId}::uuid AND status='awaiting_signature'
  RETURNING status,file_number`
 if(!signed)throw new Error('The agreement was already signed, or this activation is not ready.')
 return signed
}

export async function submitProManagerPayment(userId:string,hashInput:string,walletInput:string){
 const hash=hashInput.trim().toLowerCase(),wallet=walletInput.trim()
 if(!validHash(hash))throw new Error('Enter the actual 64-digit TRON transaction hash.')
 const configuredWallet=await getReceivingWallet()
 if(!configuredWallet||!isTronAddress(configuredWallet)||wallet!==configuredWallet)
  throw new Error('Official USDT TRC-20 receiving wallet not configured or has changed. Do not send funds again.')
 const [entry]=await sql`UPDATE weave_pro_regional_manager_activations
  SET status='pending_forensics',payment_wallet=${wallet},payment_tx_hash=${hash},
   payment_submitted_at=now(),rejection_reason=NULL,updated_at=now()
  WHERE user_id=${userId}::uuid AND signed_at IS NOT NULL
    AND status IN ('payment_required','payment_rejected')
  RETURNING status,file_number`
 if(!entry)throw new Error('Your payment can only be submitted after signed approval; pending receipts cannot be resubmitted.')
 return entry
}
