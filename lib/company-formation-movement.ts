import {getPool} from '@/lib/db'
import {ensureClientFileFolderSchema} from '@/lib/client-file-folder'
import {ensureGuidanceDepartmentSchema,getGuidanceStaffDepartments,type GuidanceDepartment} from '@/lib/weave-guidance-departments'
import {FILE_FOLDER_PRICING} from '@/lib/file-folder-pricing'

export type CompanyFormationEvent='prospect_purchased'|'file_folder_payment_submitted'|'file_folder_verified'|'bridge_payment_submitted'|'bridge_deposit_verified'
export const FORMATION_DEPARTMENTS=['forensic','mandate','lawyer','admin'] as const
export const FORMATION_MILESTONES=[
  {month:1,label:'Recognize the business',purpose:'Agree on a real customer, useful offer, cost basis and first steps.'},
  {month:2,label:'Open practical operations',purpose:'Use the File Folder systems and Customer Door to offer products or services.'},
  {month:3,label:'Serve and improve',purpose:'Fulfil real work, review customer response, verify receipts and record costs.'},
  {month:4,label:'Review cost recovery',purpose:'Compare verified income less recorded operating costs with the File Folder purchase cost.'},
] as const
const EVENT_TITLES:Record<CompanyFormationEvent,string>={
  prospect_purchased:'Hope · Bridger purchased Prospect material',
  file_folder_payment_submitted:'Client File Folder · payment submitted',
  file_folder_verified:'Client File Folder · payment independently verified',
  bridge_payment_submitted:'Bridge File Folder · payment submitted',
  bridge_deposit_verified:'Bridge File Folder · payment independently verified',
}
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
let ready:Promise<void>|null=null

/** These cases coordinate company action; never create a balance, earnings credit or sale. */
export async function ensureCompanyFormationSchema(){
  if(!ready)ready=(async()=>{
    await ensureGuidanceDepartmentSchema()
    await ensureClientFileFolderSchema()
    const pool=getPool()
    await pool.query(`CREATE TABLE IF NOT EXISTS weave_company_formation_cases (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      source_kind varchar(32) NOT NULL CHECK(source_kind IN ('file_folder_purchase','bridge_deposit')),
      source_id uuid NOT NULL,
      client_id uuid REFERENCES users(id),
      file_number varchar(120),
      bridger_id uuid REFERENCES users(id),
      purchase_value_system_switch numeric(30,8) NOT NULL CHECK(purchase_value_system_switch>0),
      stage varchar(24) NOT NULL DEFAULT 'awaiting_verification'
        CHECK(stage IN ('awaiting_verification','awaiting_client','planning','building','selling','review','closed')),
      business_brief text,
      first_customer text,
      first_offer text,
      next_action text,
      created_at timestamptz NOT NULL DEFAULT now(),
      verified_at timestamptz,
      activated_at timestamptz,
      updated_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE(source_kind,source_id)
    )`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_company_formation_client
      ON weave_company_formation_cases(client_id,created_at DESC)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_company_formation_file
      ON weave_company_formation_cases(file_number)`)
    await pool.query(`CREATE TABLE IF NOT EXISTS weave_company_formation_actions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      case_id uuid NOT NULL REFERENCES weave_company_formation_cases(id) ON DELETE CASCADE,
      author_id uuid NOT NULL REFERENCES users(id),
      department varchar(24) NOT NULL CHECK(department IN ('client','forensic','mandate','lawyer','admin')),
      action_type varchar(24) NOT NULL CHECK(action_type IN ('client_brief','client_update','guidance','milestone','review')),
      month_no smallint CHECK(month_no BETWEEN 1 AND 4),
      note text NOT NULL CHECK(char_length(note) BETWEEN 10 AND 2000),
      visibility varchar(16) NOT NULL DEFAULT 'client' CHECK(visibility IN ('client','internal')),
      created_at timestamptz NOT NULL DEFAULT now()
    )`)
    await pool.query('CREATE INDEX IF NOT EXISTS idx_company_formation_actions ON weave_company_formation_actions(case_id,created_at DESC)')
    await pool.query(`CREATE TABLE IF NOT EXISTS weave_company_formation_events (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      kind varchar(40) NOT NULL,
      source_kind varchar(32) NOT NULL,
      source_id uuid NOT NULL,
      formation_case_id uuid REFERENCES weave_company_formation_cases(id),
      actor_id uuid REFERENCES users(id),
      created_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE(kind,source_kind,source_id)
    )`)
    await pool.query('CREATE INDEX IF NOT EXISTS idx_company_formation_events_created ON weave_company_formation_events(created_at DESC)')
  })().catch(error=>{ready=null;throw error})
  await ready
}
const valueFor=(amount:unknown,tier:unknown)=>String(tier)==='plus'
  ?FILE_FOLDER_PRICING.plusFlameCoin:Number(amount)
const eventSource=(kind:CompanyFormationEvent)=>kind==='prospect_purchased'?'prospect_package':
  kind==='bridge_payment_submitted'||kind==='bridge_deposit_verified'?'bridge_deposit':'file_folder_purchase'

/** Pull identity and status from committed company records, never HTTP form claims. */
async function committedMovement(kind:CompanyFormationEvent,sourceId:string){
  const pool=getPool()
  if(kind==='prospect_purchased'){
    const {rows}=await pool.query(`SELECT id,purchased_by AS actor_id,status
      FROM market_prospect_packages WHERE id=$1::uuid AND status='sold' AND purchased_by IS NOT NULL LIMIT 1`,[sourceId])
    return rows[0]?{sourceKind:'prospect_package' as const,actorId:String(rows[0].actor_id),record:rows[0]}:null
  }
  if(kind==='bridge_payment_submitted'||kind==='bridge_deposit_verified'){
    const {rows}=await pool.query(`SELECT b.id,b.bridger_id,b.file_number,b.status,b.tier_trx,b.verified_at,
      f.client_id,f.claimed_at
      FROM bridge_deposits b LEFT JOIN client_file_folders f ON f.file_number=b.file_number
      WHERE b.id=$1::uuid LIMIT 1`,[sourceId])
    const row=rows[0]
    if(!row||(!['pending','approved'].includes(String(row.status)))||
      (kind==='bridge_deposit_verified'&&row.status!=='approved'))return null
    return {sourceKind:'bridge_deposit' as const,actorId:row.bridger_id?String(row.bridger_id):null,record:row}
  }
  const {rows}=await pool.query(`SELECT p.id,p.bridger_id,p.client_id,p.file_number,p.status,
      p.amount_trx,p.file_folder_tier,p.confirmed_at,f.claimed_at,f.client_id AS folder_client_id
      FROM file_folder_purchases p
      LEFT JOIN client_file_folders f ON f.file_number=p.file_number
      WHERE p.id=$1::uuid LIMIT 1`,[sourceId])
  const row=rows[0]
  if(!row||!['pending_admin_confirmation','confirmed'].includes(String(row.status))||
    (kind==='file_folder_verified'&&row.status!=='confirmed'))return null
  return {sourceKind:'file_folder_purchase' as const,actorId:row.bridger_id?String(row.bridger_id):null,record:row}
}
export async function activeCompanyFormationRecipients(){
  const {rows}=await getPool().query(`SELECT u.id,u.role,a.department
    FROM users u LEFT JOIN weave_guidance_staff_applications a
      ON a.user_id=u.id AND a.status='approved'
        AND a.source_role=u.role AND a.department IN ('forensic','mandate','lawyer')
    WHERE COALESCE(u.is_active,true)=true
      AND (u.role='admin' OR a.id IS NOT NULL)
    ORDER BY u.id`)
  const grouped=new Map<string,{id:string;role:string;departments:Set<string>}>()
  for(const row of rows){
    const id=String(row.id)
    if(!grouped.has(id))grouped.set(id,{id,role:String(row.role),departments:new Set()})
    if(row.role==='admin')grouped.get(id)!.departments.add('admin')
    else if(row.department)grouped.get(id)!.departments.add(String(row.department))
  }
  const recipients=[] as {id:string;departments:string[]}[]
  for(const entry of grouped.values()){
    if(entry.role==='admin'){recipients.push({id:entry.id,departments:['admin']});continue}
    // An approved application alone does not bypass the active Lifestyle position.
    const valid=await getGuidanceStaffDepartments({id:entry.id,role:entry.role})
    const departments=[...entry.departments].filter(d=>valid.includes(d as GuidanceDepartment))
    if(departments.length)recipients.push({id:entry.id,departments})
  }
  return recipients
}

/** Can be safely replayed after a payment is committed; duplicate alerts are suppressed. */
export async function recordCompanyFormationMovement(kind:CompanyFormationEvent,sourceId:string){
  if(!uuid.test(sourceId))return false
  await ensureCompanyFormationSchema()
  const source=await committedMovement(kind,sourceId)
  if(!source)return false
  const pool=getPool()
  const recipientList=await activeCompanyFormationRecipients()
  const db=await pool.connect()
  try{
    await db.query('BEGIN')
    await db.query('SELECT pg_advisory_xact_lock(hashtext($1))',['formation:'+kind+':'+sourceId])
    let caseId:string|null=null
    if(source.sourceKind!=='prospect_package'){
      const p=source.record
      const value=valueFor(source.sourceKind==='bridge_deposit'?p.tier_trx:p.amount_trx,
        source.sourceKind==='bridge_deposit'?null:p.file_folder_tier)
      if(!Number.isFinite(value)||value<=0)throw new Error('No verified purchase value for formation target')
      const approved=p.status==='confirmed'||p.status==='approved'
      const clientId=p.folder_client_id||p.client_id||null
      const {rows}=await db.query(`INSERT INTO weave_company_formation_cases
        (source_kind,source_id,client_id,file_number,bridger_id,purchase_value_system_switch,
         stage,verified_at,activated_at)
        VALUES($1,$2::uuid,$3::uuid,$4,$5::uuid,$6,
          $7,CASE WHEN $8 THEN COALESCE($10::timestamptz,NOW()) ELSE NULL END,$9::timestamptz)
        ON CONFLICT(source_kind,source_id) DO UPDATE SET
          client_id=COALESCE(EXCLUDED.client_id,weave_company_formation_cases.client_id),
          file_number=COALESCE(EXCLUDED.file_number,weave_company_formation_cases.file_number),
          verified_at=COALESCE(weave_company_formation_cases.verified_at,EXCLUDED.verified_at),
          activated_at=COALESCE(weave_company_formation_cases.activated_at,EXCLUDED.activated_at),
          stage=CASE WHEN weave_company_formation_cases.stage='awaiting_verification' AND $8
              THEN CASE WHEN $9::timestamptz IS NOT NULL THEN 'planning' ELSE 'awaiting_client' END
              WHEN weave_company_formation_cases.stage='awaiting_client' AND $9::timestamptz IS NOT NULL
              THEN 'planning' ELSE weave_company_formation_cases.stage END,
          updated_at=NOW()
        RETURNING id`,
        [source.sourceKind,sourceId,clientId,p.file_number||null,p.bridger_id||null,
          value,approved?(p.claimed_at?'planning':'awaiting_client'):'awaiting_verification',approved,
            p.claimed_at||null,p.verified_at||p.confirmed_at||null])
      caseId=String(rows[0].id)
    }
    const {rows:events}=await db.query(`INSERT INTO weave_company_formation_events
      (kind,source_kind,source_id,formation_case_id,actor_id)
      VALUES($1,$2,$3::uuid,$4::uuid,$5::uuid)
      ON CONFLICT(kind,source_kind,source_id) DO UPDATE
        SET formation_case_id=COALESCE(weave_company_formation_events.formation_case_id,EXCLUDED.formation_case_id)
      RETURNING id`,[kind,source.sourceKind,sourceId,caseId,source.actorId])
    const eventId=String(events[0].id)
    const link='/company/formation?event='+encodeURIComponent(eventId)
    for(const recipient of recipientList){
      const title=EVENT_TITLES[kind].slice(0,200)
      const content=(recipient.departments.map(d=>d==='admin'?'Administrations':d==='forensic'?'Forensics':d==='lawyer'?'Attorney':'Mandate').join(' / ')+
        ' · '+(source.sourceKind==='prospect_package'
          ?'A Bridger acquired candidate Prospect material. Review supply and the sales-support movement; a candidate is not a verified customer.'
          :kind.includes('verified')
            ?'Payment independently verified. Guide the Client toward a practical business formation and the four-month cost-recovery objective.'
            :'Payment submission recorded; independent verification is still required. Prepare Client formation without treating this as funded income.')).slice(0,1600)
      await db.query(`INSERT INTO notifications
        (user_id,type,title,content,from_user_name,link)
        SELECT $1::uuid,$2,$3,$4,'WEAVE · Company Formation',$5
        WHERE NOT EXISTS (SELECT 1 FROM notifications
          WHERE user_id=$1::uuid AND type=$2 AND link=$5)`,
        [recipient.id,'company_formation_'+kind,title,content,link])
    }
    await db.query('COMMIT')
    return true
  }catch(error){await db.query('ROLLBACK').catch(()=>{});throw error}
  finally{db.release()}
}

/** Linking ownership never grants staff access to an unowned Client File Folder. */
export async function syncFormationOwnership(){
  await ensureCompanyFormationSchema()
  const pool=getPool()
  await pool.query(`UPDATE weave_company_formation_cases c
    SET client_id=f.client_id,activated_at=COALESCE(c.activated_at,f.claimed_at),
        stage=CASE WHEN c.stage='awaiting_client' AND f.claimed_at IS NOT NULL THEN 'planning' ELSE c.stage END,
        updated_at=NOW()
    FROM client_file_folders f
    WHERE f.file_number=c.file_number AND f.client_id IS NOT NULL
      AND (c.client_id IS DISTINCT FROM f.client_id OR
        (c.activated_at IS NULL AND f.claimed_at IS NOT NULL) OR
        (c.stage='awaiting_client' AND f.claimed_at IS NOT NULL))`)
}
export async function backfillClientFormations(clientId:string){
  await ensureCompanyFormationSchema()
  // Historical approved sales create a case, not a fresh event or staff notification.
  await getPool().query(`INSERT INTO weave_company_formation_cases
    (source_kind,source_id,client_id,file_number,bridger_id,purchase_value_system_switch,stage,verified_at,activated_at)
    SELECT 'file_folder_purchase',p.id,$1::uuid,p.file_number,p.bridger_id,
      CASE WHEN p.file_folder_tier='plus' THEN $2 ELSE p.amount_trx END,
      'planning',p.confirmed_at,f.claimed_at
    FROM file_folder_purchases p JOIN client_file_folders f ON f.file_number=p.file_number
    WHERE f.client_id=$1::uuid AND p.status='confirmed' AND p.amount_trx>0
    ON CONFLICT(source_kind,source_id) DO NOTHING`,[clientId,FILE_FOLDER_PRICING.plusFlameCoin])
  await getPool().query(`INSERT INTO weave_company_formation_cases
    (source_kind,source_id,client_id,file_number,bridger_id,purchase_value_system_switch,stage,verified_at,activated_at)
    SELECT 'bridge_deposit',b.id,$1::uuid,b.file_number,b.bridger_id,b.tier_trx,'planning',b.verified_at,f.claimed_at
    FROM bridge_deposits b JOIN client_file_folders f ON f.file_number=b.file_number
    WHERE f.client_id=$1::uuid AND b.status='approved' AND b.tier_trx>0
    ON CONFLICT(source_kind,source_id) DO NOTHING`,[clientId])
}
export async function formationIncome(caseRow:{client_id:string|null;file_number:string|null;purchase_value_system_switch:unknown;activated_at:string|null}){
  const purchase=Number(caseRow.purchase_value_system_switch||0)
  const baseline={available:false,targetSystemSwitch:purchase,verifiedReceiptsSystemSwitch:null as number|null,
    reportedOperatingCostsSystemSwitch:null as number|null,provisionalNetSystemSwitch:null as number|null,
    remainingSystemSwitch:null as number|null,recoveryPercent:null as number|null,
    targetAt:null as string|null,daysRemaining:null as number|null,passedFourMonths:false,
    status:'awaiting_activation',note:'Four-month recovery is a business target, not a promised return.'}
  if(!caseRow.activated_at||!caseRow.client_id||!caseRow.file_number)return baseline
  const pool=getPool()
  const deadline=await pool.query(`SELECT
    ($1::timestamptz + INTERVAL '4 months') AS target_at,
    GREATEST(0,CEIL(EXTRACT(EPOCH FROM (($1::timestamptz + INTERVAL '4 months')-NOW()))/86400))::int AS days_remaining,
    NOW()>=($1::timestamptz + INTERVAL '4 months') AS elapsed`,[caseRow.activated_at])
  const date=deadline.rows[0]
  const ready=await pool.query(`SELECT
    to_regclass('public.client_customer_door_settlements') IS NOT NULL AS settlements,
    to_regclass('public.client_file_folder_operating_costs') IS NOT NULL AS costs,
    to_regclass('public.client_business_stores') IS NOT NULL AS stores`)
  if(!ready.rows[0]?.settlements||!ready.rows[0]?.costs||!ready.rows[0]?.stores)
    return {...baseline,status:'records_unavailable',targetAt:date.target_at,
      daysRemaining:date.days_remaining,passedFourMonths:date.elapsed}
  const [receipts,costs]=await Promise.all([
    pool.query(`SELECT COALESCE(SUM(s.credited_flame_coin),0) AS amount
      FROM client_customer_door_settlements s
      JOIN client_business_stores st ON st.id=s.store_id AND st.client_id=s.client_id
      WHERE s.client_id=$1::uuid AND st.file_number=$2
        AND s.created_at >= $3::timestamptz`,
      [caseRow.client_id,caseRow.file_number,caseRow.activated_at]),
    pool.query(`SELECT COALESCE(SUM(amount),0) AS amount
      FROM client_file_folder_operating_costs
      WHERE client_id=$1::uuid AND file_number=$2 AND currency='FLAME COIN'
        AND recorded_at >=$3::timestamptz`,
      [caseRow.client_id,caseRow.file_number,caseRow.activated_at])
  ])
  const gross=Number(receipts.rows[0]?.amount||0),cost=Number(costs.rows[0]?.amount||0)
  const net=gross-cost,remaining=Math.max(0,purchase-net)
  return {...baseline,available:true,verifiedReceiptsSystemSwitch:gross,
    reportedOperatingCostsSystemSwitch:cost,provisionalNetSystemSwitch:net,
    remainingSystemSwitch:remaining,recoveryPercent:purchase?Math.max(0,Math.round(net/purchase*100)):0,
    targetAt:date.target_at,daysRemaining:date.days_remaining,passedFourMonths:date.elapsed,
    status:net>=purchase?'provisional_target_met':date.elapsed?'target_unmet':'in_progress',
    note:'Only funded Customer Door settlements count as verified receipts. Operating costs are owner-reported; other currencies, refunds, taxes, payroll and external proceeds require separate reconciliation. This is an operating target, not a guaranteed recovery or profit.'}
}
