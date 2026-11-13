import {randomBytes,createHash} from 'node:crypto'
import {sql,getPool} from '@/lib/db'
import {ensureProFileNumberVerificationSchema} from '@/lib/pro-file-number-verification'
import {ensureProActivationSchema} from '@/lib/pro-file-folder-activation'
import {staffOfferTokenHash,ensureCompanyClientStaffSchema} from '@/lib/company-client-staff'
import {passwordRecoveryEmailProvider} from '@/lib/password-recovery'
import {sendAuthenticatedGoogleMail,systemGoogleMailbox} from '@/lib/weave-mail'
import {getAdministrationGoogleMailboxCredential} from '@/lib/weave-mailbox'

/**
 * External Client self-registration after independently verified Pro identity
 * and payment. Never return the original staff invitation token to the holder
 * of a File Number or verification ticket. Only the approved candidate's
 * independently recorded email receives the private one-time invitation.
 */
export async function ensureProClientRegistrationInvitationSchema(){
 await ensureProFileNumberVerificationSchema()
 await ensureCompanyClientStaffSchema()
 await ensureProActivationSchema()
 await sql`CREATE TABLE IF NOT EXISTS pro_client_registration_invitation_delivery (
   verification_id uuid PRIMARY KEY REFERENCES pro_file_number_verifications(id) ON DELETE CASCADE,
   window_started_at timestamptz NOT NULL DEFAULT now(),
   sent_count integer NOT NULL DEFAULT 0,
   last_sent_at timestamptz,
   updated_at timestamptz NOT NULL DEFAULT now()
 )`
}

function sourceOrigin(requestOrigin:string){
 const configured=String(process.env.NEXT_PUBLIC_APP_URL||
  process.env.NEXT_PUBLIC_SITE_URL||process.env.WEAVE_PUBLIC_URL||'').trim()
 const origin=configured||requestOrigin
 try{
  const url=new URL(origin)
  if(url.protocol!=='https:' &&
     !(process.env.NODE_ENV!=='production'&&url.hostname==='localhost'))
   throw new Error('Secure website origin required')
  if(url.username||url.password)throw new Error('Unsafe website origin')
  return url.origin
 }catch{throw new Error('Public HTTPS website origin is not configured for secure Client registration emails.')}
}
async function deliverProClientInvitation(email:string,name:string,link:string){
 const provider=await passwordRecoveryEmailProvider()
 if(provider==='none')throw new Error('Company email delivery is unavailable; contact Administrations for secure onboarding.')
 const subject='WEAVE Pro File Folder · Verified Client registration'
 const message=`Hello ${name},

Administrations has independently verified the identity and payment attached to your Pro File Folder. Complete your private company account registration using the following link:

${link}

This invitation is private and meant only for your approved company email. You must create your own password. Do not share this link or any payment information.

Your Pro File Folder is already activated. Registration connects your account to that same Folder. There is no second activation charge.

WEAVE of Presence · Pro Staff Verification`
 if(provider==='gmail'){
  const credential=systemGoogleMailbox()||await getAdministrationGoogleMailboxCredential()
  if(!credential)throw new Error('Company email transport is not configured')
  await sendAuthenticatedGoogleMail({credential,to:email,subject,text:message})
 }else{
  const apiKey=process.env.RESEND_API_KEY
  const from=process.env.PASSWORD_RECOVERY_EMAIL_FROM
  if(!apiKey||!from)throw new Error('Company mail transport is unavailable')
  const response=await fetch('https://api.resend.com/emails',{
   method:'POST',headers:{Authorization:'Bearer '+apiKey,'Content-Type':'application/json'},
   body:JSON.stringify({from,to:[email],subject,text:message}),cache:'no-store'})
  if(!response.ok)throw new Error('Company registration invitation could not be delivered')
 }
}

export async function sendVerifiedProClientRegistrationInvite(ticket:string,requestOrigin:string){
 if(!/^[a-f0-9]{64}$/i.test(ticket))throw new Error('Private verification session required.')
 const provider=await passwordRecoveryEmailProvider()
 if(provider==='none')throw new Error('Company email delivery is unavailable; Administrations must arrange secure account access.')
 const origin=sourceOrigin(requestOrigin)
 await ensureProClientRegistrationInvitationSchema()
 const hash=createHash('sha256').update(ticket.toLowerCase()).digest('hex')
 const db=await getPool().connect()
 let delivery:null|{email:string;name:string;fileNumber:string;token:string}=null
 try{
  await db.query('BEGIN')
  const rows=await db.query(`SELECT v.id,v.file_number,v.status,v.signed_name,v.identity_verified_at,
     v.payment_verified_at,v.payment_verified_amount_usdt,a.activated_at,
     o.id AS offer_id,o.candidate_name,o.candidate_email,o.status AS offer_status,
     o.folder_tier,o.client_id,o.monthly_salary_usdt
    FROM pro_file_number_verifications v
    JOIN company_client_staff_offers o ON o.file_number=v.file_number
    JOIN pro_file_folder_activations a ON a.file_number=v.file_number
      AND a.status='active' AND a.payment_tx_hash=v.payment_tx_hash
    WHERE v.access_token_hash=$1 FOR UPDATE OF v,o`,[hash])
  const row=rows.rows[0]
  if(!row||row.status!=='paid_pending_account'||!row.identity_verified_at||!row.activated_at||
   !row.payment_verified_at||Number(row.payment_verified_amount_usdt)!==680||
   row.offer_status!=='approved'||row.folder_tier!=='pro'||row.client_id||
   Number(row.monthly_salary_usdt)<=0||
   String(row.signed_name||'').trim().toLowerCase()!==
     String(row.candidate_name||'').trim().toLowerCase()||
   !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(row.candidate_email||'')))
   throw new Error('Identity, exact approved employment, or independently verified Pro payment is not ready for registration.')
  const existing=await db.query('SELECT id FROM users WHERE lower(email)=lower($1) LIMIT 1',[row.candidate_email])
  if(existing.rows.length)throw new Error('Your company email already has an account. Sign in or use secure password recovery.')
  const counter=await db.query(`SELECT sent_count,window_started_at,last_sent_at
     FROM pro_client_registration_invitation_delivery WHERE verification_id=$1::uuid FOR UPDATE`,[row.id])
  const previous=counter.rows[0]
  const inWindow=previous&&Date.now()-new Date(previous.window_started_at).getTime()<24*60*60*1000
  const sentCount=inWindow?Number(previous.sent_count):0
  if(sentCount>=3)throw new Error('Daily registration invitation limit reached; contact Administrations.')
  if(previous?.last_sent_at&&Date.now()-new Date(previous.last_sent_at).getTime()<2*60*1000)
   throw new Error('An invitation was recently requested. Check your approved email or try again after the resend interval.')
  const token=randomBytes(32).toString('hex')
  const issued=await db.query(`UPDATE company_client_staff_offers
    SET token_hash=$2,updated_at=now() WHERE id=$1::uuid AND status='approved'
      AND client_id IS NULL RETURNING candidate_email`,[row.offer_id,staffOfferTokenHash(token)])
  if(issued.rows.length!==1)throw new Error('This employment invitation has already been claimed.')
  await db.query(`INSERT INTO pro_client_registration_invitation_delivery
    (verification_id,window_started_at,sent_count,last_sent_at)
    VALUES($1::uuid,now(),1,now())
    ON CONFLICT(verification_id) DO UPDATE SET
     window_started_at=CASE WHEN $2 THEN pro_client_registration_invitation_delivery.window_started_at ELSE now() END,
     sent_count=CASE WHEN $2 THEN pro_client_registration_invitation_delivery.sent_count+1 ELSE 1 END,
     last_sent_at=now(),updated_at=now()`,[row.id,Boolean(inWindow)])
  delivery={email:String(row.candidate_email),name:String(row.candidate_name),
   fileNumber:String(row.file_number),token}
  const link=origin+'/client/register?fileNumber='+encodeURIComponent(delivery.fileNumber)+
   '&staffOffer='+encodeURIComponent(delivery.token)
  // Do not commit a replacement invite token or consume a resend allowance
  // unless company email delivery actually succeeds.
  await deliverProClientInvitation(delivery.email,delivery.name,link)
  await db.query('COMMIT')
 }catch(e){await db.query('ROLLBACK').catch(()=>{});throw e}
 finally{db.release()}
 if(!delivery)throw new Error('Unable to prepare registration invitation')
 return {success:true,message:'A private account registration link has been sent to the company-approved email address. Check your inbox. Never share the link. No new activation payment is required.'}
}
