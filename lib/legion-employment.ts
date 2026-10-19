import { ensureClientBusinessStoreSchema } from '@/lib/client-business-store'
import { getPool } from '@/lib/db'
import { ensureEnterpriseDreamSchema } from '@/lib/enterprise-dream'
import { ensureLegionCommerceSchema, legionCarrierPath } from '@/lib/legion-commerce'

export type LegionEmploymentState = {
  active: boolean
  legionId?: string
  clientId?: string
  enterpriseApplicationId?: string
  enterpriseName?: string | null
  clientName?: string | null
  sourceRole?: string | null
  functionTitle?: string | null
  profitParticipation?: string | null
  salesCode?: string | null
  carrierPath?: string | null
}

export async function ensureLegionEmploymentSchema(sql: any) {
  await ensureEnterpriseDreamSchema(sql)
  await ensureClientBusinessStoreSchema(sql)
  await ensureLegionCommerceSchema(sql)
  await sql`ALTER TABLE enterprise_legions ADD COLUMN IF NOT EXISTS source_user_id uuid`
  await sql`ALTER TABLE enterprise_legions ADD COLUMN IF NOT EXISTS source_role varchar(20)`
  await sql`ALTER TABLE enterprise_legions ADD COLUMN IF NOT EXISTS employment_status varchar(30) NOT NULL DEFAULT 'active'`
  await sql`ALTER TABLE enterprise_legions ADD COLUMN IF NOT EXISTS accepted_at timestamptz`
  await sql`ALTER TABLE enterprise_legions ADD COLUMN IF NOT EXISTS released_at timestamptz`
  await sql`ALTER TABLE enterprise_legions ADD COLUMN IF NOT EXISTS released_by uuid`
  await sql`ALTER TABLE enterprise_legions ADD COLUMN IF NOT EXISTS release_reason text`
  await sql`
    CREATE TABLE IF NOT EXISTS legion_employment_releases(
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      legion_id uuid UNIQUE NOT NULL REFERENCES enterprise_legions(id),
      client_id uuid NOT NULL,
      source_user_id uuid,
      actor_user_id uuid NOT NULL,
      actor_position varchar(20) NOT NULL,
      reason text NOT NULL,
      pending_orders integer NOT NULL DEFAULT 0,
      unpaid_orders integer NOT NULL DEFAULT 0,
      released_at timestamptz NOT NULL DEFAULT NOW()
    )
  `
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_enterprise_legions_active_source_user ON enterprise_legions(source_user_id) WHERE source_user_id IS NOT NULL AND active=true AND employment_status='active'`

  await sql`
    CREATE TABLE IF NOT EXISTS legion_lifestyle_applications (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      applicant_user_id uuid NOT NULL,
      applicant_role varchar(20) NOT NULL,
      client_id uuid NOT NULL,
      enterprise_application_id uuid NOT NULL,
      file_number varchar(120) NOT NULL,
      direction varchar(30) NOT NULL,
      status varchar(30) NOT NULL DEFAULT 'pending',
      note text,
      function_title varchar(255),
      profit_participation text,
      created_at timestamptz NOT NULL DEFAULT NOW(),
      updated_at timestamptz NOT NULL DEFAULT NOW(),
      accepted_at timestamptz
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS idx_legion_lifestyle_applicant ON legion_lifestyle_applications(applicant_user_id,status,created_at DESC)`
  await sql`CREATE INDEX IF NOT EXISTS idx_legion_lifestyle_client ON legion_lifestyle_applications(client_id,status,created_at DESC)`
  await sql`CREATE INDEX IF NOT EXISTS idx_legion_lifestyle_enterprise ON legion_lifestyle_applications(enterprise_application_id,status,created_at DESC)`
}

export async function getActiveLegionEmployment(sql: any, userId: string): Promise<LegionEmploymentState> {
  await ensureLegionEmploymentSchema(sql)
  const [row] = await sql`
    SELECT
      l.id AS legion_id,
      l.client_id,
      l.enterprise_application_id,
      l.source_role,
      l.function_title,
      l.profit_participation,
      l.sales_code,
      a.enterprise_name,
      owner.name AS client_name,
      s.public_slug AS store_slug
    FROM enterprise_legions l
    JOIN enterprise_applications a ON a.id=l.enterprise_application_id
    LEFT JOIN users owner ON owner.id=l.client_id
    LEFT JOIN client_business_stores s ON s.client_id=l.client_id AND s.enabled=true
    WHERE l.source_user_id=${userId}::uuid
      AND l.active=true
      AND l.employment_status='active'
    ORDER BY l.accepted_at DESC NULLS LAST,l.created_at DESC
    LIMIT 1
  `
  if (!row) return { active: false }
  return {
    active: true,
    legionId: String(row.legion_id),
    clientId: String(row.client_id),
    enterpriseApplicationId: String(row.enterprise_application_id),
    enterpriseName: row.enterprise_name || null,
    clientName: row.client_name || null,
    sourceRole: row.source_role || null,
    functionTitle: row.function_title || null,
    profitParticipation: row.profit_participation || null,
    salesCode: row.sales_code || null,
    carrierPath: row.store_slug && row.sales_code ? legionCarrierPath(String(row.store_slug), String(row.sales_code)) : null,
  }
}

export async function activateLegionEmployment(sql: any, input: {
  applicantUserId: string
  applicantRole: string
  clientId: string
  enterpriseApplicationId: string
  fileNumber: string
  name: string
  contact?: string | null
  functionTitle?: string | null
  livelihoodRole?: string | null
  profitParticipation?: string | null
}) {
  await ensureLegionEmploymentSchema(sql)
  const existing = await getActiveLegionEmployment(sql, input.applicantUserId)
  if (existing.active) throw new Error('This Agent or Bridger is already serving as a Legion for another Client.')

  const [created] = await sql`
    INSERT INTO enterprise_legions (
      enterprise_application_id,client_id,file_number,name,contact,function_title,livelihood_role,
      profit_participation,source_user_id,source_role,employment_status,accepted_at,active
    ) VALUES (
      ${input.enterpriseApplicationId}::uuid,${input.clientId}::uuid,${input.fileNumber},${input.name},${input.contact || null},
      ${input.functionTitle || 'Enterprise Legion'},${input.livelihoodRole || 'Exclusive Legion service inside the Client enterprise.'},
      ${input.profitParticipation || null},${input.applicantUserId}::uuid,${input.applicantRole},'active',NOW(),true
    )
    RETURNING *
  `
  const [legion] = await sql`
    UPDATE enterprise_legions
    SET sales_code=COALESCE(NULLIF(sales_code,''),'LG-' || UPPER(SUBSTRING(REPLACE(id::text,'-','') FROM 1 FOR 10))),
        sales_enabled=true,
        updated_at=NOW()
    WHERE id=${created.id}::uuid
    RETURNING *
  `
  await sql`
    UPDATE legion_lifestyle_applications
    SET status=CASE WHEN enterprise_application_id=${input.enterpriseApplicationId}::uuid THEN 'accepted' ELSE 'closed' END,
        accepted_at=CASE WHEN enterprise_application_id=${input.enterpriseApplicationId}::uuid THEN NOW() ELSE accepted_at END,
        updated_at=NOW()
    WHERE applicant_user_id=${input.applicantUserId}::uuid
      AND status='pending'
  `
  return legion
}

/**
 * Ends exclusivity without deleting the underlying Agent/Bridger account or
 * historical commerce. Both the Client and the worker can end employment.
 * An unfinished order stays with the Client who owns the Customer Door.
 *
 * PostgreSQL transaction prevents a half-ended position where a Legion can
 * appear released but still retain a functioning sales Carrier.
 */
export async function releaseLegionEmployment(
  sql: any,
  input: {
    legionId: string
    actorUserId: string
    actorPosition: 'client' | 'worker'
    reason: string
  },
) {
  await ensureLegionEmploymentSchema(sql)
  const reason=String(input.reason||'').trim().slice(0,1200)
  if(reason.length<5)throw new Error('Explain the reason for ending Legion employment.')
  const pool=getPool()
  const db=await pool.connect()
  let committed=false
  try {
    await db.query('BEGIN')
    const {rows}=await db.query(`
      SELECT id,client_id,source_user_id,name,active,employment_status,
        sales_enabled,source_role
      FROM enterprise_legions WHERE id=$1::uuid FOR UPDATE
    `,[input.legionId])
    const legion=rows[0]
    if(!legion) {
      await db.query('ROLLBACK')
      return {success:false as const,status:404,error:'Legion employment record not found'}
    }
    const permitted=input.actorPosition==='client'
      ? String(legion.client_id)===input.actorUserId
      : String(legion.source_user_id)===input.actorUserId
    if(!permitted) {
      await db.query('ROLLBACK')
      return {success:false as const,status:403,error:'This position cannot release another Client’s Legion.'}
    }
    if(!legion.active || legion.employment_status!=='active') {
      await db.query('COMMIT');committed=true
      return {success:true as const,alreadyReleased:true,legionId:legion.id}
    }
    const {rows:activity}=await db.query(`
      SELECT
        COUNT(*) FILTER (WHERE status NOT IN ('fulfilled','cancelled'))::int AS pending_orders,
        COUNT(*) FILTER (WHERE payment_status<>'received' AND status<>'cancelled')::int AS unpaid_orders
      FROM client_store_orders WHERE legion_id=$1::uuid
    `,[input.legionId])
    const pending=Number(activity[0]?.pending_orders||0)
    const unpaid=Number(activity[0]?.unpaid_orders||0)
    const released=await db.query(`
      UPDATE enterprise_legions
      SET active=false,employment_status='released',sales_enabled=false,
          released_at=NOW(),released_by=$2::uuid,release_reason=$3,updated_at=NOW()
      WHERE id=$1::uuid AND active=true AND employment_status='active'
      RETURNING id,client_id,source_user_id
    `,[input.legionId,input.actorUserId,reason])
    if(!released.rows.length)throw Error('Legion release conflicted with concurrent position change')
    await db.query(`
      INSERT INTO legion_employment_releases
        (legion_id,client_id,source_user_id,actor_user_id,actor_position,reason,pending_orders,unpaid_orders)
      VALUES($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5,$6,$7,$8)
      ON CONFLICT (legion_id) DO NOTHING
    `,[input.legionId,legion.client_id,legion.source_user_id,input.actorUserId,input.actorPosition,reason,pending,unpaid])
    // The client owns open orders and their fulfillment duty. Leave every
    // order, payment, attribution, commission and receipt untouched.
    const notify=[
      {id:legion.client_id,text:`Legion ${legion.name} was released. ${pending} unfinished Customer Door order(s) remain with your enterprise for fulfillment and settlement.`},
      ...(legion.source_user_id?[{id:legion.source_user_id,text:`Your exclusive Legion employment has ended. Your original ${legion.source_role||'Agent/Bridger'} position is available subject to its normal access rules. Historical orders and earned compensation remain recorded.`}]:[]),
    ]
    for(const notice of notify)await db.query(`
      INSERT INTO notifications(user_id,type,title,content,from_user_name,link)
      VALUES($1::uuid,'legion_release','Legion employment ended',$2,'WEAVE Enterprise','/weave/lifestyles/legion')
    `,[notice.id,notice.text])
    await db.query('COMMIT');committed=true
    return {success:true as const,legionId:legion.id,
      clientId:legion.client_id,sourceUserId:legion.source_user_id,
      pendingOrders:pending,unpaidOrders:unpaid,restoredPosition:legion.source_role}
  } catch (error) {
    if(!committed)await db.query('ROLLBACK').catch(()=>{})
    console.error('[Legion employment release]',error)
    return {success:false as const,status:500,error:'Unable to complete a secure Legion release'}
  } finally {db.release()}
}
