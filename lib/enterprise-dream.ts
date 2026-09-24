import { neon } from '@/lib/pg-neon'

export const getEnterpriseDreamDb = () => neon(process.env.DATABASE_URL!)

export async function ensureEnterpriseDreamSchema(sql = getEnterpriseDreamDb()) {
  await sql`ALTER TABLE client_file_folders ADD COLUMN IF NOT EXISTS weave_position varchar(20) NOT NULL DEFAULT 'client'`
  await sql`ALTER TABLE client_file_folders ADD COLUMN IF NOT EXISTS enterprise_status varchar(40) NOT NULL DEFAULT 'none'`
  await sql`ALTER TABLE client_file_folders ADD COLUMN IF NOT EXISTS enterprise_name varchar(255)`
  await sql`ALTER TABLE client_file_folders ADD COLUMN IF NOT EXISTS enterprise_sector varchar(255)`

  await sql`
    CREATE TABLE IF NOT EXISTS enterprise_applications (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id uuid UNIQUE NOT NULL,
      file_number varchar(120) UNIQUE NOT NULL,
      requested_position varchar(20) NOT NULL,
      enterprise_name varchar(255) NOT NULL,
      sector varchar(255) NOT NULL,
      business_plan text NOT NULL,
      profit_model text NOT NULL,
      participant_model text NOT NULL,
      sustainability_plan text NOT NULL,
      projected_monthly_revenue numeric(30,8),
      projected_monthly_costs numeric(30,8),
      status varchar(40) NOT NULL DEFAULT 'submitted',
      admin_note text,
      submitted_at timestamptz NOT NULL DEFAULT NOW(),
      reviewed_at timestamptz,
      reviewed_by uuid,
      updated_at timestamptz NOT NULL DEFAULT NOW()
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS idx_enterprise_applications_status ON enterprise_applications(status, submitted_at DESC)`

  await sql`
    CREATE TABLE IF NOT EXISTS enterprise_legions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      enterprise_application_id uuid NOT NULL,
      client_id uuid NOT NULL,
      file_number varchar(120) NOT NULL,
      name varchar(255) NOT NULL,
      contact varchar(255),
      function_title varchar(255) NOT NULL,
      livelihood_role text,
      profit_participation text,
      active boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT NOW(),
      updated_at timestamptz NOT NULL DEFAULT NOW()
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS idx_enterprise_legions_client ON enterprise_legions(client_id, active, created_at)`
}

export async function getEnterpriseDream(sql: any, clientId: string) {
  await ensureEnterpriseDreamSchema(sql)
  const [application] = await sql`
    SELECT *
    FROM enterprise_applications
    WHERE client_id = ${clientId}::uuid
    LIMIT 1
  `
  if (!application) return { application: null, legions: [] }

  const legions = application.status === 'approved'
    ? await sql`
        SELECT id,name,contact,function_title,livelihood_role,profit_participation,active,created_at
        FROM enterprise_legions
        WHERE client_id = ${clientId}::uuid AND active = true
        ORDER BY created_at ASC
      `
    : []

  return { application, legions }
}
