import {createHash,randomBytes} from 'node:crypto'
import {sql} from '@/lib/db'
import {ensureClientFileFolderSchema,ensureCjDoradoFolder,CJ_DORADO_FILE_NUMBER} from '@/lib/client-file-folder'
import {ensureProActivationSchema,getReceivingWallet,PRO_ACTIVATION_FEE_USDT} from '@/lib/pro-file-folder-activation'

export const PRO_FILE_NUMBER_VERIFICATION_PATH='/client/pro-verification'
export const proNumberPattern=/^WEAVE-[A-Z0-9-]{6,110}$/
const cleanNumber=(value:unknown)=>String(value||'').trim().toUpperCase()
const hashTicket=(ticket:string)=>createHash('sha256').update(ticket).digest('hex')
const allowedStatuses=['pending_identity','payment_required','pending_forensics','payment_rejected','paid_pending_account','active','rejected'] as const
export const proVerificationPublicHeaders={'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}

export async function ensureProFileNumberVerificationSchema(){
 await sql`CREATE TABLE IF NOT EXISTS pro_file_number_verifications(
   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
   file_number varchar(120) NOT NULL,
   business_name varchar(180) NOT NULL,
   business_plan jsonb NOT NULL,
   signed_name varchar(255) NOT NULL,
   signed_terms_version varchar(64) NOT NULL DEFAULT 'PRO-680-USDT-2026-11',
   terms_accepted_at timestamptz NOT NULL DEFAULT now(),
   access_token_hash char(64) NOT NULL UNIQUE,
   status varchar(40) NOT NULL DEFAULT 'pending_identity'
      CHECK(status IN ('pending_identity','payment_required','pending_forensics',
        'payment_rejected','paid_pending_account','active','rejected')),
   identity_reference varchar(255),
   identity_verified_by uuid REFERENCES users(id),
   identity_verified_at timestamptz,
   payment_wallet varchar(64),
   payment_tx_hash char(64) UNIQUE,
   payment_submitted_at timestamptz,
   payment_verified_by uuid REFERENCES users(id),
   payment_verified_at timestamptz,
   payment_verified_amount_usdt numeric(16,2),
   rejection_reason text,
   created_at timestamptz NOT NULL DEFAULT now(),
   updated_at timestamptz NOT NULL DEFAULT now()
 )`
 await sql`CREATE INDEX IF NOT EXISTS pro_file_number_verifications_file_status
  ON pro_file_number_verifications(file_number,status,created_at DESC)`
}
export async function eligibleProNumber(fileNumber:string){
 if(!proNumberPattern.test(fileNumber))return false
 // A File Number is a locator, not authentication. Never disclose who owns it.
 await ensureClientFileFolderSchema(sql)
 if(fileNumber===CJ_DORADO_FILE_NUMBER)await ensureCjDoradoFolder(sql)
 const [folder]=await sql`SELECT file_number,client_id FROM client_file_folders
  WHERE file_number=${fileNumber} LIMIT 1`
 if(!folder)return false
 if(fileNumber===CJ_DORADO_FILE_NUMBER)return true
 const [activationTable]=await sql`SELECT to_regclass('public.pro_file_folder_activations') AS name`
 if(activationTable?.name){
  const [row]=await sql`SELECT 1 FROM pro_file_folder_activations WHERE file_number=${fileNumber} LIMIT 1`
  if(row)return true
 }
 const [offerTable]=await sql`SELECT to_regclass('public.company_client_staff_offers') AS name`
 if(offerTable?.name){
  const [offer]=await sql`SELECT 1 FROM company_client_staff_offers
   WHERE file_number=${fileNumber} AND status='approved' AND folder_tier='pro' LIMIT 1`
  if(offer)return true
 }
 const [upgradeTable]=await sql`SELECT to_regclass('public.client_folder_upgrades') AS name`
 if(upgradeTable?.name){
  const [upgrade]=await sql`SELECT 1 FROM client_folder_upgrades
   WHERE file_number=${fileNumber} AND tier='pro' LIMIT 1`
  if(upgrade)return true
 }
 return false
}
export async function submitProFileNumberPlan(input:{
 fileNumber:unknown;businessName:unknown;plan:Record<string,unknown>;
 signedName:unknown;termsAccepted:unknown
}){
 const fileNumber=cleanNumber(input.fileNumber)
 const businessName=String(input.businessName||'').trim()
 const signedName=String(input.signedName||'').trim()
 if(!proNumberPattern.test(fileNumber)||businessName.length<3||businessName.length>180
  ||signedName.length<4||signedName.length>255||input.termsAccepted!==true)
  throw new Error('Complete the File Number, business name, electronic signature and fee agreement.')
 const fields=['businessActivity','customers','revenueModel','operations']
 const plan:Record<string,string>={businessName}
 for(const field of fields){
  const value=String(input.plan?.[field]||'').trim()
  if(value.length<10||value.length>3000)
   throw new Error('Complete each business-plan section (10–3000 characters).')
  plan[field]=value
 }
 if(!await eligibleProNumber(fileNumber))
  throw new Error('This File Number is not ready for Pro verification. Contact Administration.')
 await ensureProFileNumberVerificationSchema()
 const [volume]=await sql`SELECT COUNT(*)::int AS total FROM pro_file_number_verifications
  WHERE file_number=${fileNumber} AND created_at>now()-interval '1 hour'`
 if(Number(volume?.total||0)>=5)
  throw new Error('This File Number has recent verification requests. Contact Administration to reconcile them.')
 // Multiple submissions are reviewed independently; no approved record is overwritten.
 const ticket=randomBytes(32).toString('hex')
 const [row]=await sql`INSERT INTO pro_file_number_verifications
  (file_number,business_name,business_plan,signed_name,access_token_hash)
  VALUES(${fileNumber},${businessName},${JSON.stringify(plan)}::jsonb,
   ${signedName},${hashTicket(ticket)})
  RETURNING id,status`
 return {success:true,reference:String(row.id),ticket,status:'pending_identity'}
}
export async function readProFileNumberVerification(ticket:string){
 if(!/^[a-f0-9]{64}$/i.test(ticket))return null
 await ensureProFileNumberVerificationSchema()
 const [row]=await sql`SELECT id,file_number,business_name,status,identity_verified_at,
  payment_submitted_at,payment_verified_at,rejection_reason FROM pro_file_number_verifications
  WHERE access_token_hash=${hashTicket(ticket.toLowerCase())} LIMIT 1`
 if(!row)return null
 const paymentReady=['payment_required','payment_rejected'].includes(String(row.status))
 let receivingWallet:string|null=null
 if(paymentReady){
  await ensureProActivationSchema()
  receivingWallet=await getReceivingWallet()
 }
 return {
  reference:String(row.id),fileNumber:String(row.file_number),businessName:String(row.business_name),
  status:String(row.status),feeUSDT:PRO_ACTIVATION_FEE_USDT,network:'USDT TRON (TRC-20)',
  walletAddress:receivingWallet,
  paymentVerified:Boolean(row.payment_verified_at),
  rejectionReason:row.rejection_reason||null,
 }
}
export async function submitProFileNumberPayment(ticket:string,txHash:string,expectedWallet:string){
 if(!/^[a-f0-9]{64}$/i.test(ticket)||!/^[a-f0-9]{64}$/i.test(txHash))
  throw new Error('A valid private verification reference and TRON transaction hash are required.')
 await ensureProFileNumberVerificationSchema()
 const wallet=await getReceivingWallet()
 if(!wallet||wallet!==expectedWallet)throw new Error('The official receiving wallet is unavailable or changed. Do not transfer again; contact Forensics.')
 const [row]=await sql`UPDATE pro_file_number_verifications
  SET payment_tx_hash=${txHash.toLowerCase()},payment_wallet=${wallet},
   payment_submitted_at=now(),status='pending_forensics',updated_at=now(),
   rejection_reason=NULL
  WHERE access_token_hash=${hashTicket(ticket.toLowerCase())}
   AND status IN ('payment_required','payment_rejected') AND identity_verified_at IS NOT NULL
  RETURNING id`
 if(!row)throw new Error('Identity verification and an approved business plan are required before payment evidence.')
 return {success:true,status:'pending_forensics'}
}
