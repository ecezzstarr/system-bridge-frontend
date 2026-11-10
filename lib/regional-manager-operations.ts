import {getPool} from '@/lib/db'
import {ensureRegionalManagerCommissionSchema} from '@/lib/regional-manager-commission'
import {ensureFoodDistributionEmploymentSchema} from '@/lib/food-distribution-employment'
import {ensureDistributionAssistantSchema} from '@/lib/distribution-assistants'

/** Ordinary Regional Manager workflow: supervision only, no payroll or financial permissions. */
export async function ensureRegionalOperationsSchema(){
  await ensureRegionalManagerCommissionSchema()
  await Promise.all([ensureFoodDistributionEmploymentSchema(),ensureDistributionAssistantSchema()])
  const pool=getPool()
  await pool.query(`CREATE TABLE IF NOT EXISTS weave_regional_manager_food_distribution_leads(
    food_manager_user_id uuid PRIMARY KEY REFERENCES users(id),
    regional_manager_user_id uuid NOT NULL REFERENCES weave_regional_manager_appointments(user_id),
    assigned_by uuid REFERENCES users(id),
    status varchar(16) NOT NULL DEFAULT 'active' CHECK(status IN ('active','ended')),
    assigned_at timestamptz NOT NULL DEFAULT NOW(),
    updated_at timestamptz NOT NULL DEFAULT NOW()
  )`)
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_regional_food_leads_manager
    ON weave_regional_manager_food_distribution_leads(regional_manager_user_id,status)`)
  await pool.query(`CREATE TABLE IF NOT EXISTS weave_regional_daily_tasks(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    regional_manager_user_id uuid NOT NULL REFERENCES weave_regional_manager_appointments(user_id),
    assigned_user_id uuid NOT NULL REFERENCES users(id),
    title varchar(160) NOT NULL,
    instructions text NOT NULL,
    work_date date NOT NULL DEFAULT ((NOW() AT TIME ZONE 'Africa/Lagos')::date),
    status varchar(20) NOT NULL DEFAULT 'assigned'
      CHECK(status IN ('assigned','in_progress','submitted','completed','returned')),
    evidence_note text,
    manager_note text,
    created_at timestamptz NOT NULL DEFAULT NOW(),
    updated_at timestamptz NOT NULL DEFAULT NOW(),
    completed_at timestamptz
  )`)
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_regional_tasks_manager_date
    ON weave_regional_daily_tasks(regional_manager_user_id,work_date DESC,status)`)
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_regional_tasks_assignee
    ON weave_regional_daily_tasks(assigned_user_id,updated_at DESC)`)
  await pool.query(`CREATE TABLE IF NOT EXISTS weave_regional_daily_task_history(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id uuid NOT NULL REFERENCES weave_regional_daily_tasks(id),
    actor_user_id uuid NOT NULL REFERENCES users(id),
    from_status varchar(20),
    to_status varchar(20) NOT NULL,
    note text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT NOW()
  )`)
  await pool.query(`CREATE TABLE IF NOT EXISTS weave_regional_daily_checkins(
    regional_manager_user_id uuid NOT NULL REFERENCES weave_regional_manager_appointments(user_id),
    member_user_id uuid NOT NULL REFERENCES users(id),
    work_date date NOT NULL DEFAULT ((NOW() AT TIME ZONE 'Africa/Lagos')::date),
    work_status varchar(20) NOT NULL CHECK(work_status IN ('working','needs_help','no_assignment')),
    summary text NOT NULL,
    manager_response text,
    support_status varchar(18) NOT NULL DEFAULT 'none'
      CHECK(support_status IN ('none','open','acknowledged','resolved')),
    created_at timestamptz NOT NULL DEFAULT NOW(),
    updated_at timestamptz NOT NULL DEFAULT NOW(),
    responded_at timestamptz,
    PRIMARY KEY (regional_manager_user_id,member_user_id,work_date)
  )`)
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_regional_checkins_needs_help
    ON weave_regional_daily_checkins(regional_manager_user_id,support_status,work_date DESC)`)
}

export type RegionalTeamMember={
  manager_id:string; user_id:string; name:string; role:string
  position:string; level:'direct'|'assistant'; lead_user_id:string|null
}

/** A member is visible only under a live, authorized team chain.
 * The verified lead owns assistant assignments; the Regional Manager can
 * oversee both and assign direct tasks only to Bridgers and lead managers.
 */
export async function regionalTeam(managerId:string|null,memberId:string|null):Promise<RegionalTeamMember[]>{
  const result=await getPool().query(`
    WITH team AS (
      SELECT b.regional_manager_user_id AS manager_id, b.bridger_user_id AS user_id,
        u.name,u.role,'Bridger'::text AS position,'direct'::text AS level,
        NULL::uuid AS lead_user_id
      FROM weave_regional_manager_bridgers b
      JOIN users u ON u.id=b.bridger_user_id AND u.is_active=true AND u.role='bridger'
      WHERE b.status='active'
      UNION ALL
      SELECT a.regional_manager_user_id,a.distribution_manager_user_id,
        u.name,u.role,'Distribution Manager','direct',NULL::uuid
      FROM weave_regional_manager_distribution_managers a
      JOIN manager_employment em ON em.user_id=a.distribution_manager_user_id
        AND em.status IN ('probation','active')
      JOIN users u ON u.id=a.distribution_manager_user_id AND u.is_active=true
        AND u.role IN ('agent','bridger')
      WHERE a.status='active'
      UNION ALL
      SELECT a.regional_manager_user_id,w.user_id,
        u.name,u.role,'Assistant Distribution Manager','assistant',a.distribution_manager_user_id
      FROM weave_regional_manager_distribution_managers a
      JOIN manager_employment em ON em.user_id=a.distribution_manager_user_id
        AND em.status IN ('probation','active')
      JOIN weave_distribution_assistants w
        ON w.manager_user_id=a.distribution_manager_user_id AND w.status='approved'
      JOIN users u ON u.id=w.user_id AND u.is_active=true AND u.role IN ('agent','bridger')
      WHERE a.status='active'
      UNION ALL
      SELECT f.regional_manager_user_id,f.food_manager_user_id,
        u.name,u.role,'Food Distribution Manager','direct',NULL::uuid
      FROM weave_regional_manager_food_distribution_leads f
      JOIN weave_food_distribution_employment e
        ON e.user_id=f.food_manager_user_id AND e.position='manager' AND e.status='approved'
      JOIN users u ON u.id=f.food_manager_user_id AND u.is_active=true AND u.role='agent'
      WHERE f.status='active'
      UNION ALL
      SELECT f.regional_manager_user_id,a.user_id,
        u.name,u.role,'Assistant Food Distribution Manager','assistant',f.food_manager_user_id
      FROM weave_regional_manager_food_distribution_leads f
      JOIN weave_food_distribution_employment e
        ON e.user_id=f.food_manager_user_id AND e.position='manager' AND e.status='approved'
      JOIN weave_food_distribution_employment a
        ON a.manager_user_id=f.food_manager_user_id AND a.position='assistant' AND a.status='approved'
      JOIN users u ON u.id=a.user_id AND u.is_active=true AND u.role='agent'
      WHERE f.status='active'
    )
    SELECT t.* FROM team t
    JOIN weave_regional_manager_appointments rm ON rm.user_id=t.manager_id AND rm.status='active'
    JOIN users regional ON regional.id=rm.user_id AND regional.is_active=true
      AND regional.role IN ('agent','bridger')
    WHERE ($1::uuid IS NULL OR t.manager_id=$1::uuid)
      AND ($2::uuid IS NULL OR t.user_id=$2::uuid)
    ORDER BY t.manager_id,t.level,t.position,t.name
  `,[managerId,memberId])
  return result.rows as RegionalTeamMember[]
}
