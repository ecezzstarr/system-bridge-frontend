import { getPool, sql } from '@/lib/db'

export const FOOD_DISTRIBUTION_MONTHLY_TARGET = 200
export const FOOD_DISTRIBUTION_PRODUCT_TYPES = [
  'Agility',
  'Electrolyte',
  'Ember',
  'Daisy Pastries',
  'Farm Produce',
  'Other WEAVE Food Products',
] as const
export type FoodDistributionProductType = typeof FOOD_DISTRIBUTION_PRODUCT_TYPES[number]
export type FoodDistributionCustomerType = 'consumer' | 'business'

export async function ensureFoodDistributionSchema() {
  await sql`
    CREATE TABLE IF NOT EXISTS weave_food_distribution_records (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      manager_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      distributor_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      product_type VARCHAR(80) NOT NULL,
      customer_type VARCHAR(20) NOT NULL CHECK (customer_type IN ('consumer','business')),
      recipient_name VARCHAR(120) NOT NULL,
      quantity INTEGER NOT NULL CHECK (quantity BETWEEN 1 AND 10000),
      evidence_reference TEXT NOT NULL,
      distribution_date DATE NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','verified','rejected')),
      verified_by UUID REFERENCES users(id),
      verification_note TEXT,
      verified_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS weave_food_distribution_manager_month_idx ON weave_food_distribution_records(manager_user_id,distribution_date,status)`
  await sql`CREATE INDEX IF NOT EXISTS weave_food_distribution_status_idx ON weave_food_distribution_records(status,created_at)`
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS weave_food_distribution_evidence_unique_idx ON weave_food_distribution_records(manager_user_id,LOWER(BTRIM(evidence_reference)))`
}

function monthRange(at = new Date()) {
  // WEAVE operates on Nigeria calendar dates (UTC+1), while PostgreSQL DATE is timezone-free.
  const nigeriaNow = new Date(at.getTime() + 60 * 60 * 1000)
  const start = new Date(Date.UTC(nigeriaNow.getUTCFullYear(), nigeriaNow.getUTCMonth(), 1))
  const end = new Date(Date.UTC(nigeriaNow.getUTCFullYear(), nigeriaNow.getUTCMonth() + 1, 1))
  return { start: start.toISOString().slice(0,10), end: end.toISOString().slice(0,10) }
}

export function calculateFoodDistributionCompensation(input: { verifiedDistributions:number; target?:number; monthlySalaryNgn:number }) {
  const verifiedDistributions = Math.max(0, Math.floor(Number(input.verifiedDistributions) || 0))
  const target = input.target ?? FOOD_DISTRIBUTION_MONTHLY_TARGET
  const monthlySalaryNgn = Math.max(0, Math.round(Number(input.monthlySalaryNgn) || 0))
  const teamQualified = verifiedDistributions >= target
  return {
    target, verifiedDistributions, teamQualified,
    monthlySalaryNgn,
    salaryEntitlementNgn: teamQualified ? monthlySalaryNgn : 0,
    paymentRule: 'full_salary_if_team_reaches_200_verified_food_distributions_in_calendar_month',
    periodStatus: 'provisional_requires_administration_verification_and_month_end_payroll',
  }
}

export async function getFoodDistributionTeamState(managerUserId:string) {
  await ensureFoodDistributionSchema()
  const pool = getPool()
  const {start,end} = monthRange()
  const {rows:leaders} = await pool.query(`
    SELECT me.user_id, u.name
    FROM manager_employment me JOIN users u ON u.id=me.user_id
    WHERE me.user_id=$1::uuid AND me.status IN ('probation','active')
      AND u.role IN ('agent','bridger') AND u.is_active=true
    LIMIT 1
  `,[managerUserId])
  if (!leaders.length) return null
  const {rows:members} = await pool.query(`
    SELECT u.id AS "userId",u.name,
      CASE WHEN u.id=$1::uuid THEN 'manager' ELSE 'assistant' END AS position
    FROM users u
    WHERE u.id=$1::uuid
    UNION ALL
    SELECT u.id AS "userId",u.name,'assistant'::text AS position
    FROM weave_distribution_assistants a JOIN users u ON u.id=a.user_id
    WHERE a.manager_user_id=$1::uuid AND a.status='approved'
      AND u.is_active=true AND u.role IN ('agent','bridger')
    ORDER BY position, name
  `,[managerUserId])
  const {rows:progressRows} = await pool.query(`
    SELECT COUNT(*) FILTER (WHERE status='verified')::int AS verified,
      COUNT(*) FILTER (WHERE status='pending')::int AS pending,
      COUNT(*) FILTER (WHERE status='rejected')::int AS rejected,
      COUNT(DISTINCT product_type) FILTER (WHERE status='verified')::int AS product_types
    FROM weave_food_distribution_records
    WHERE manager_user_id=$1::uuid AND distribution_date >= $2::date AND distribution_date < $3::date
  `,[managerUserId,start,end])
  const {rows:memberMetrics} = await pool.query(`
    SELECT distributor_user_id AS "userId",
      COUNT(*) FILTER (WHERE status='verified')::int AS verified,
      COUNT(*) FILTER (WHERE status='pending')::int AS pending
    FROM weave_food_distribution_records
    WHERE manager_user_id=$1::uuid AND distribution_date >= $2::date AND distribution_date < $3::date
    GROUP BY distributor_user_id
  `,[managerUserId,start,end])
  const metricsByUser=new Map<string,{verified:number;pending:number}>(memberMetrics.map((m:any)=>[String(m.userId),{verified:Number(m.verified||0),pending:Number(m.pending||0)}] as [string,{verified:number;pending:number}]))
  const {rows:recent} = await pool.query(`
    SELECT r.id,r.distributor_user_id AS "distributorUserId",u.name AS "distributorName",
      r.product_type AS "productType",r.customer_type AS "customerType",
      r.recipient_name AS "recipientName",r.quantity,r.evidence_reference AS "evidenceReference",
      r.distribution_date AS "distributionDate",r.status,r.verification_note AS "verificationNote",
      r.created_at AS "createdAt"
    FROM weave_food_distribution_records r JOIN users u ON u.id=r.distributor_user_id
    WHERE r.manager_user_id=$1::uuid AND r.distribution_date >= $2::date AND r.distribution_date < $3::date
    ORDER BY r.created_at DESC LIMIT 40
  `,[managerUserId,start,end])
  const progress=progressRows[0]||{}
  const verified=Number(progress.verified||0)
  return {
    managerUserId, monthStart:start, monthEnd:end,
    target:FOOD_DISTRIBUTION_MONTHLY_TARGET,
    verified, pending:Number(progress.pending||0), rejected:Number(progress.rejected||0),
    remaining:Math.max(0,FOOD_DISTRIBUTION_MONTHLY_TARGET-verified),
    progressPercent:Math.min(100,Math.round(verified/FOOD_DISTRIBUTION_MONTHLY_TARGET*1000)/10),
    productTypesVerified:Number(progress.product_types||0),
    members:members.map((m:any)=>({userId:String(m.userId),name:String(m.name||'WEAVE colleague'),position:m.position,
      verifiedDistributions:metricsByUser.get(String(m.userId))?.verified||0,
      pendingDistributions:metricsByUser.get(String(m.userId))?.pending||0})),
    recent,
  }
}

export async function submitFoodDistributionRecord(userId:string,input:{
  productType:string;customerType:string;recipientName:string;quantity:number;evidenceReference:string;distributionDate:string
}) {
  await ensureFoodDistributionSchema()
  if (!(FOOD_DISTRIBUTION_PRODUCT_TYPES as readonly string[]).includes(input.productType)) return {success:false as const,reason:'invalid_product'}
  if (!['consumer','business'].includes(input.customerType)) return {success:false as const,reason:'invalid_customer_type'}
  const recipientName=input.recipientName.trim()
  const evidenceReference=input.evidenceReference.trim()
  const quantity=Number(input.quantity)
  if(recipientName.length<2||recipientName.length>120||evidenceReference.length<6||evidenceReference.length>500
    ||!Number.isInteger(quantity)||quantity<1||quantity>10000) return {success:false as const,reason:'invalid_record'}
  if(!/^\d{4}-\d{2}-\d{2}$/.test(input.distributionDate)||input.distributionDate>new Date().toISOString().slice(0,10))
    return {success:false as const,reason:'invalid_date'}
  const pool=getPool()
  const {rows:managerRows}=await pool.query(`
    SELECT me.user_id FROM manager_employment me
    WHERE me.user_id=$1::uuid AND me.status IN ('probation','active')
    UNION
    SELECT a.manager_user_id AS user_id FROM weave_distribution_assistants a
    WHERE a.user_id=$1::uuid AND a.status='approved' AND a.manager_user_id IS NOT NULL
  `,[userId])
  if(!managerRows.length)return {success:false as const,reason:'not_appointed'}
  const managerUserId=String(managerRows[0].user_id)
  let rows:any[]
  try {
    const inserted=await pool.query(`
    INSERT INTO weave_food_distribution_records
      (manager_user_id,distributor_user_id,product_type,customer_type,recipient_name,quantity,evidence_reference,distribution_date,status)
    VALUES ($1::uuid,$2::uuid,$3,$4,$5,$6,$7,$8::date,'pending')
    RETURNING id,status,created_at
  `,[managerUserId,userId,input.productType,input.customerType,recipientName,quantity,evidenceReference,input.distributionDate])
    rows=inserted.rows
  } catch(error:any) {
    if(error?.code==='23505')return {success:false as const,reason:'duplicate_reference' as const}
    throw error
  }
  return {success:true as const,record:rows[0]}
}

export async function reviewFoodDistributionRecord(adminId:string,recordId:string,decision:'verify'|'reject',note:string) {
  await ensureFoodDistributionSchema()
  const pool=getPool()
  const {rows}=await pool.query(`
    UPDATE weave_food_distribution_records
    SET status=$3,verified_by=$2::uuid,verification_note=$4,verified_at=NOW(),updated_at=NOW()
    WHERE id=$1::uuid AND status='pending'
    RETURNING id,status,manager_user_id
  `,[recordId,adminId,decision==='verify'?'verified':'rejected',note.trim()])
  if(!rows.length)return {success:false as const,reason:'not_pending'}
  return {success:true as const,record:rows[0]}
}

export async function listPendingFoodDistributionRecords() {
  await ensureFoodDistributionSchema()
  const {rows}=await getPool().query(`
    SELECT r.id,r.manager_user_id AS "managerUserId",m.name AS "managerName",
      r.distributor_user_id AS "distributorUserId",d.name AS "distributorName",
      r.product_type AS "productType",r.customer_type AS "customerType",
      r.recipient_name AS "recipientName",r.quantity,r.evidence_reference AS "evidenceReference",
      r.distribution_date AS "distributionDate",r.created_at AS "createdAt"
    FROM weave_food_distribution_records r
    JOIN users m ON m.id=r.manager_user_id JOIN users d ON d.id=r.distributor_user_id
    WHERE r.status='pending' ORDER BY r.created_at ASC LIMIT 200
  `)
  return rows
}

export async function resolveFoodDistributionManagerId(userId:string) {
  await ensureFoodDistributionSchema()
  const {rows}=await getPool().query(`
    SELECT me.user_id AS manager_user_id
    FROM manager_employment me
    WHERE me.user_id=$1::uuid AND me.status IN ('probation','active')
    UNION ALL
    SELECT a.manager_user_id
    FROM weave_distribution_assistants a
    JOIN manager_employment me ON me.user_id=a.manager_user_id AND me.status IN ('probation','active')
    WHERE a.user_id=$1::uuid AND a.status='approved' AND a.manager_user_id IS NOT NULL
    LIMIT 1
  `,[userId])
  return rows[0]?.manager_user_id ? String(rows[0].manager_user_id) : null
}
