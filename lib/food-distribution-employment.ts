import { getPool, sql } from '@/lib/db'

export type FoodDistributionPosition = 'manager' | 'assistant'
export async function ensureFoodDistributionEmploymentSchema() {
  await sql`
    CREATE TABLE IF NOT EXISTS weave_food_distribution_employment (
      user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      position VARCHAR(20) NOT NULL CHECK (position IN ('manager','assistant')),
      status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','ended')),
      application_note TEXT NOT NULL,
      manager_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      administration_note TEXT,
      reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
      reviewed_at TIMESTAMPTZ,
      hired_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS weave_food_distribution_employment_status_idx ON weave_food_distribution_employment(status,position,created_at)`
  await sql`ALTER TABLE weave_food_distribution_employment ADD COLUMN IF NOT EXISTS manager_user_id UUID REFERENCES users(id) ON DELETE SET NULL`
  await sql`ALTER TABLE weave_food_distribution_employment ADD COLUMN IF NOT EXISTS administration_note TEXT`
  await sql`ALTER TABLE weave_food_distribution_employment ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL`
  await sql`ALTER TABLE weave_food_distribution_employment ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ`
  await sql`ALTER TABLE weave_food_distribution_employment ADD COLUMN IF NOT EXISTS hired_at TIMESTAMPTZ`
}

export async function getFoodDistributionEmployment(userId:string) {
  await ensureFoodDistributionEmploymentSchema()
  const {rows}=await getPool().query(`
    SELECT e.user_id,e.position,e.status,e.application_note,e.manager_user_id,
      e.administration_note,e.reviewed_at,e.hired_at,e.created_at,u.name AS manager_name
    FROM weave_food_distribution_employment e
    LEFT JOIN users u ON u.id=e.manager_user_id
    WHERE e.user_id=$1::uuid LIMIT 1
  `,[userId])
  return rows[0]||null
}
