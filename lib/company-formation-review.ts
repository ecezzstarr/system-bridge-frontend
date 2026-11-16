import {getPool} from '@/lib/db'
import {ensureMarketTables} from '@/lib/market'
import {ensureCompanyFormationSchema,recordCompanyFormationMovement,syncFormationOwnership,
  activeCompanyFormationRecipients,formationIncome,type CompanyFormationEvent} from '@/lib/company-formation-movement'

/**
 * Daily authenticated Company of Time reconciliation:
 *  - retry missing commercial alerts from the last seven days
 *  - open persistent four-month review reminders
 *  - never fabricate sales, credits, profits or event attendance
 */
export async function runCompanyFormationDailyReview(){
  await ensureMarketTables()
  await ensureCompanyFormationSchema()
  const pool=getPool()
  const [packages,folders,deposits]=await Promise.all([
    pool.query(`SELECT id FROM market_prospect_packages
      WHERE status='sold' AND purchased_at>=NOW()-INTERVAL '7 days'
      ORDER BY purchased_at DESC LIMIT 40`),
    pool.query(`SELECT id,status FROM file_folder_purchases
      WHERE status IN ('pending_admin_confirmation','confirmed')
        AND created_at>=NOW()-INTERVAL '7 days'
      ORDER BY created_at DESC LIMIT 40`),
    pool.query(`SELECT id,status FROM bridge_deposits
      WHERE status IN ('pending','approved') AND created_at>=NOW()-INTERVAL '7 days'
      ORDER BY created_at DESC LIMIT 40`)
  ])
  const sources:{kind:CompanyFormationEvent;id:string}[]=[]
  for(const row of packages.rows)sources.push({kind:'prospect_purchased',id:String(row.id)})
  for(const row of folders.rows){
    sources.push({kind:'file_folder_payment_submitted',id:String(row.id)})
    if(row.status==='confirmed')sources.push({kind:'file_folder_verified',id:String(row.id)})
  }
  for(const row of deposits.rows){
    sources.push({kind:'bridge_payment_submitted',id:String(row.id)})
    if(row.status==='approved')sources.push({kind:'bridge_deposit_verified',id:String(row.id)})
  }
  let reconciled=0,errors=0
  for(const item of sources){
    try{if(await recordCompanyFormationMovement(item.kind,item.id))reconciled++}
    catch(error){errors++;console.error('[formation movement reconciliation]',item.kind,item.id,error)}
  }
  await syncFormationOwnership()
  const {rows}=await pool.query(`SELECT id,client_id,file_number,purchase_value_system_switch,
      activated_at,stage FROM weave_company_formation_cases
      WHERE activated_at IS NOT NULL AND verified_at IS NOT NULL
        AND stage NOT IN ('closed')
        AND activated_at>=NOW()-INTERVAL '8 months'
      ORDER BY activated_at DESC LIMIT 150`)
  const recipients=await activeCompanyFormationRecipients()
  let reminders=0
  for(const c of rows){
    const {rows:status}=await pool.query(`SELECT
      NOW()>=$1::timestamptz+INTERVAL '1 month' AS m1,
      NOW()>=$1::timestamptz+INTERVAL '2 months' AS m2,
      NOW()>=$1::timestamptz+INTERVAL '3 months' AS m3,
      NOW()>=$1::timestamptz+INTERVAL '4 months' AS m4`,[c.activated_at])
    const due=status[0]
    const month=due.m4?4:due.m3?3:due.m2?2:due.m1?1:0
    if(!month)continue
    const income=month===4?await formationIncome(c):null
    const kind='formation_m'+month
    const summary=month===4?
      income?.status==='provisional_target_met'
        ?'The four-month provisional in-system cost-recovery target is recorded as met; independently review operating costs, refunds, taxes and other obligations.'
        :'The four-month operating review is due. Check actual verified Client earnings, business costs and unresolved support needs. No income is guaranteed.'
      :'Month '+month+' business formation review is due. Inspect actual customer activity, the Client offer, the Company Loop, obstacles and the next practical action.'
    const link='/company/formation?caseId='+encodeURIComponent(String(c.id))+'&milestone='+month
    const to=[...new Set([...recipients.map(r=>r.id),...(c.client_id?[String(c.client_id)]:[])])]
    for(const id of to){
      const response=await pool.query(`INSERT INTO notifications(user_id,type,title,content,from_user_name,link)
        SELECT $1::uuid,$2,$3,$4,'WEAVE · Company of Time',$5
        WHERE NOT EXISTS(SELECT 1 FROM notifications n
          WHERE n.user_id=$1::uuid AND n.type=$2 AND n.link=$5)
        RETURNING id`,
        [id,kind,'File Folder business formation · Month '+month,summary,link]).catch(error=>{
          console.error('[formation milestone notification]',error);return {rowCount:0}
        })
      if(response.rowCount)reminders++
    }
  }
  return {reconciled,failedReconciliations:errors,formationCasesReviewed:rows.length,reminders}
}
