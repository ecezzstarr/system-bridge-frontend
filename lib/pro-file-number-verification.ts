import {createHash,randomBytes} from 'node:crypto'
import {isProRegionalManagerPosition} from '@/lib/pro-regional-manager-policy'
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
   operating_country varchar(100),
   operating_region varchar(150),
   operating_city varchar(150),
   contact_address text,
   postal_code varchar(30),
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
 await sql`ALTER TABLE pro_file_number_verifications ADD COLUMN IF NOT EXISTS operating_country varchar(100)`
 await sql`ALTER TABLE pro_file_number_verifications ADD COLUMN IF NOT EXISTS operating_region varchar(150)`
 await sql`ALTER TABLE pro_file_number_verifications ADD COLUMN IF NOT EXISTS operating_city varchar(150)`
 await sql`ALTER TABLE pro_file_number_verifications ADD COLUMN IF NOT EXISTS contact_address text`
 await sql`ALTER TABLE pro_file_number_verifications ADD COLUMN IF NOT EXISTS postal_code varchar(30)`
 await sql`CREATE INDEX IF NOT EXISTS pro_file_number_verifications_file_status
  ON pro_file_number_verifications(file_number,status,created_at DESC)`
}
/**
 * The passwordless Pro intake is ONLY for Administration-approved WEAVE
 * employees. A retail Pro purchase, an upgrade, or possession of a File Number
 * never establishes company employment or a monthly salary.
 */
export async function getApprovedProStaffOffer(fileNumber:string) {
 if(!proNumberPattern.test(fileNumber))return null
 const [table]=await sql`SELECT to_regclass('public.company_client_staff_offers') AS name`
 if(!table?.name)return null
 const [offer]=await sql`SELECT id,file_number,candidate_name,position_title,
   monthly_salary_usdt,client_id,folder_tier,status,verified_at
  FROM company_client_staff_offers WHERE file_number=${fileNumber}
   AND status='approved' AND folder_tier='pro' LIMIT 1`
 if(!offer||!offer.position_title||!offer.candidate_name)return null
 // Approved Pro company staff terms include an agreed monthly salary.
 // Do not present a blank/zero salary as a Lifestyle-based entitlement.
 const agreedSalary=Number(offer.monthly_salary_usdt)
 if(!Number.isFinite(agreedSalary)||agreedSalary<=0)return null
 if(fileNumber===CJ_DORADO_FILE_NUMBER){
  if(!/\bcj\s+dorado\b/i.test(String(offer.candidate_name))||
     !isProRegionalManagerPosition(offer.position_title,fileNumber))return null
 }
 return offer
}
export async function eligibleProNumber(fileNumber:string){
 return Boolean(await getApprovedProStaffOffer(fileNumber))
}
export async function submitProFileNumberPlan(input:{
 fileNumber:unknown;businessName:unknown;plan:Record<string,unknown>;
 signedName:unknown;termsAccepted:unknown;
 operatingCountry:unknown;operatingRegion:unknown;operatingCity:unknown;contactAddress:unknown;postalCode:unknown
}){
 const fileNumber=cleanNumber(input.fileNumber)
 const businessName=String(input.businessName||'').trim()
 const signedName=String(input.signedName||'').trim()
 const operatingCountry=String(input.operatingCountry||'').trim()
 const operatingRegion=String(input.operatingRegion||'').trim()
 const operatingCity=String(input.operatingCity||'').trim()
 const contactAddress=String(input.contactAddress||'').trim()
 const postalCode=String(input.postalCode||'').trim()
 if(!operatingCountry||operatingCountry.length>100||operatingRegion.length<2||operatingRegion.length>150||
   operatingCity.length<2||operatingCity.length>150||contactAddress.length<6||contactAddress.length>500||
   postalCode.length>30)
  throw new Error('Provide the country, city, region and contact address for your actual company operating location.')
 if(fileNumber===CJ_DORADO_FILE_NUMBER&&operatingCountry.toLowerCase()!=='spain')
  throw new Error('CJ Dorado has been assigned to Spain; contact Administration if this territory is incorrect.')

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
 // Accept the signed intake without publicly confirming whether a File Number
 // exists. Payment and activation remain blocked unless Administration has an
 // approved Pro employee offer for the same named person and File Number.
 await ensureProFileNumberVerificationSchema()
 const [volume]=await sql`SELECT COUNT(*)::int AS total FROM pro_file_number_verifications
  WHERE file_number=${fileNumber} AND created_at>now()-interval '1 hour'`
 if(Number(volume?.total||0)>=5)
  throw new Error('This File Number has recent verification requests. Contact Administration to reconcile them.')
 // Multiple submissions are reviewed independently; no approved record is overwritten.
 const ticket=randomBytes(32).toString('hex')
 const [row]=await sql`INSERT INTO pro_file_number_verifications
  (file_number,business_name,business_plan,signed_name,access_token_hash,
   operating_country,operating_region,operating_city,contact_address,postal_code)
  VALUES(${fileNumber},${businessName},${JSON.stringify(plan)}::jsonb,
   ${signedName},${hashTicket(ticket)},
   ${operatingCountry},${operatingRegion},${operatingCity},${contactAddress},${postalCode||null})
  RETURNING id,status`
 return {success:true,reference:String(row.id),ticket,status:'pending_identity'}
}
export async function readProFileNumberVerification(ticket:string){
 if(!/^[a-f0-9]{64}$/i.test(ticket))return null
 await ensureProFileNumberVerificationSchema()
 const [row]=await sql`SELECT id,file_number,business_name,status,identity_verified_at,
  operating_country,operating_region,operating_city,
  payment_submitted_at,payment_verified_at,rejection_reason FROM pro_file_number_verifications
  WHERE access_token_hash=${hashTicket(ticket.toLowerCase())} LIMIT 1`
 if(!row)return null
 // Reported CJ event funds are visible only after independently verified identity,
 // never through a File Number alone. They are not a wallet credit.
 let siblingsEvent:null|{reportedAmountUSDT:number;verifiedAmountUSDT:number;status:string;availableForWithdrawal:boolean}=null
 if(row.identity_verified_at&&String(row.file_number)===CJ_DORADO_FILE_NUMBER){
  let reportedAmountUSDT=9000,verifiedAmountUSDT=0,status='pending_mandate_verification'
  const [claimsTable]=await sql`SELECT to_regclass('public.client_siblings_event_claims') AS name`
  if(claimsTable?.name){
   const [claim]=await sql`SELECT reported_amount_usdt,verified_amount_usdt,status
    FROM client_siblings_event_claims WHERE file_number=${CJ_DORADO_FILE_NUMBER} LIMIT 1`
   if(claim){
    reportedAmountUSDT=Number(claim.reported_amount_usdt||0)
    verifiedAmountUSDT=Number(claim.verified_amount_usdt||0)
    status=String(claim.status||status)
   }
  }
  siblingsEvent={reportedAmountUSDT,verifiedAmountUSDT,status,availableForWithdrawal:false}
 }
 let companyPosition:null|{title:string;monthlySalaryUSDT:number|null;salaryStatus:string}=null
 if(row.identity_verified_at){
  const offer=await getApprovedProStaffOffer(String(row.file_number))
  if(offer){
   const salary=Number(offer.monthly_salary_usdt)
   companyPosition={
    title:isProRegionalManagerPosition(offer.position_title,row.file_number)
      ?'Pro Regional Manager':String(offer.position_title),
    monthlySalaryUSDT:Number.isFinite(salary)&&salary>0?salary:null,
    salaryStatus:Number.isFinite(salary)&&salary>0?'agreed_staff_employment_terms':'needs_administration_reconciliation'
   }
  }
 }
 const paymentReady=String(row.status)==='payment_required'
 let receivingWallet:string|null=null
 if(paymentReady){
  await ensureProActivationSchema()
  receivingWallet=await getReceivingWallet()
 }
 return {
  reference:String(row.id),fileNumber:String(row.file_number),businessName:String(row.business_name),
  operatingLocation:row.identity_verified_at?{
   country:String(row.operating_country||''),region:String(row.operating_region||''),city:String(row.operating_city||'')
  }:null,
  status:String(row.status),feeUSDT:PRO_ACTIVATION_FEE_USDT,network:'USDT TRON (TRC-20)',
  walletAddress:receivingWallet,
  paymentVerified:Boolean(row.payment_verified_at),siblingsEvent,companyPosition,
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
   AND status='payment_required' AND payment_tx_hash IS NULL AND identity_verified_at IS NOT NULL
  RETURNING id`
 if(!row)throw new Error('Identity verification and an approved business plan are required before payment evidence.')
 return {success:true,status:'pending_forensics'}
}
