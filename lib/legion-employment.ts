import { ensureClientBusinessStoreSchema } from '@/lib/client-business-store'
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
