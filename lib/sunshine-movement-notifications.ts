import {getPool} from '@/lib/db'
import {activeCompanyFormationRecipients} from '@/lib/company-formation-movement'
import {ensureGuidanceDepartmentSchema} from '@/lib/weave-guidance-departments'

export type SunshineMovement =
  'requested'|'interest_verified'|'terms_accepted'|'rejected'|
  'funded'|'interest_received'|'repaid'

const title:Record<SunshineMovement,string>={
  requested:'Sunshine · Purchase-support request received',
  interest_verified:'Sunshine · Bank-interest evidence reviewed',
  terms_accepted:'Sunshine · Written support terms accepted',
  rejected:'Sunshine · Support request declined',
  funded:'Sunshine · Approved support funded',
  interest_received:'Sunshine · Actual bank interest confirmed',
  repaid:'Sunshine · Support repayment recorded',
}
const detail:Record<SunshineMovement,string>={
  requested:'A participant requested interest-based assistance for a Weave purchase. This is an application, not funded money. Administrations and Forensics must review independent evidence before an offer may proceed.',
  interest_verified:'Administrations recorded an independent bank-interest review. No funds have been advanced. Review approved consent and the interest-based cost before any movement.',
  terms_accepted:'The participant accepted repayment of the funded principal plus the disclosed Weave service fee. This is not evidence of funding or a completed purchase.',
  rejected:'A Sunshine purchase-support application was declined with a recorded reason. No funds have been issued for this request.',
  funded:'A Regional Manager recorded a funded wallet-to-wallet advance under the approved release controls. This is repayable credit, not earnings or verified purchase fulfilment.',
  interest_received:'Administrations recorded independent verification of the bank-interest credit. Borrower authorization is still required for repayment.',
  repaid:'The participant authorized repayment; the funded manager principal and company fee were recorded separately in the ledger.',
}
const validUuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Notify only from a committed Sunshine advance state, never from an HTTP request claim.
 * Every active Administrations account and approved Mandate/Forensics/Attorney
 * staff member receives one inbox alert per event, plus the owner and manager.
 * Inserting into notifications queues background push through WEAVE's existing
 * weave_notification_push trigger for subscribed devices.
 */
export async function notifySunshineMovement(event:SunshineMovement,caseId:string):Promise<boolean>{
  if(!validUuid.test(caseId)||!Object.prototype.hasOwnProperty.call(title,event))return false
  let db
  try{
    await ensureGuidanceDepartmentSchema()
    const pool=getPool()
    const {rows}=await pool.query(`SELECT id,user_id,manager_id,status,interest_verified_by,
      terms_accepted_at,funded_at,settlement_verified_by,repaid_at
      FROM weave_sunshine_support_advances WHERE id=$1::uuid`,[caseId])
    const item=rows[0]
    if(!item)return false
    const committed:Record<SunshineMovement,boolean>={
      requested:true,
      interest_verified:Boolean(item.interest_verified_by),
      terms_accepted:Boolean(item.terms_accepted_at),
      rejected:item.status==='rejected',
      funded:Boolean(item.funded_at),
      interest_received:Boolean(item.settlement_verified_by),
      repaid:Boolean(item.repaid_at),
    }
    if(!committed[event])return false
    const staff=await activeCompanyFormationRecipients()
    const recipients=new Set<string>([String(item.user_id),String(item.manager_id)])
    const authorizedStaff=staff.filter(person=>person.departments.some(d=>
      ['admin','forensic','mandate','lawyer'].includes(d)))
    for(const person of authorizedStaff)recipients.add(person.id)
    if(!authorizedStaff.some(person=>person.departments.includes('admin'))){
      console.error('[Sunshine movement] No active Administrations account for event',event,caseId)
    }
    const ids=[...recipients].filter(id=>validUuid.test(id))
    if(!ids.length)return false
    const type='sunshine_support_'+event
    const link='/weave/lifestyles/sunshine?sunshineCase='+encodeURIComponent(caseId)
    db=await pool.connect()
    await db.query('BEGIN')
    await db.query('SELECT pg_advisory_xact_lock(hashtext($1))',[type+':'+caseId])
    await db.query(`INSERT INTO notifications
      (user_id,type,title,content,from_user_name,link)
      SELECT u.id,$2,$3,$4,'WEAVE · Sunshine',$5
      FROM users u
      WHERE u.id=ANY($1::uuid[]) AND COALESCE(u.is_active,true)=true
        AND NOT EXISTS(SELECT 1 FROM notifications n
          WHERE n.user_id=u.id AND n.type=$2 AND n.link=$5)`,
      [ids,type,title[event],detail[event].slice(0,1600),link])
    await db.query('COMMIT')
    return true
  }catch(error){
    if(db)await db.query('ROLLBACK').catch(()=>{})
    console.error('[Sunshine movement] Notification persistence failed',event,caseId,error)
    return false
  }finally{db?.release()}
}
