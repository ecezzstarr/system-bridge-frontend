import { getPool } from '@/lib/db'
import { getLifestyleAccess } from '@/lib/weave-lifestyle'
import { ensureManagerEmploymentTable } from '@/lib/manager-employment'
import { ensureDistributionAssistantSchema } from '@/lib/distribution-assistants'

export type DistributionTeamUpdateKind='message'|'plan'|'progress'|'handoff'

// The three-person operating unit owns communication and reports. Administration
// receives a read-only record and cannot impersonate a team participant.
export async function ensureDistributionTeamUpdateSchema(){
  await ensureManagerEmploymentTable()
  await ensureDistributionAssistantSchema()
  await getPool().query(`CREATE TABLE IF NOT EXISTS weave_distribution_team_updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    manager_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    author_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    kind VARCHAR(20) NOT NULL CHECK(kind IN ('message','plan','progress','handoff')),
    content TEXT NOT NULL CHECK(char_length(content) BETWEEN 2 AND 2000),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`)
  await getPool().query('CREATE INDEX IF NOT EXISTS weave_distribution_team_updates_feed_idx ON weave_distribution_team_updates(manager_user_id,created_at DESC)')
}

export async function resolveDistributionTeamMember(userId:string){
  await ensureDistributionTeamUpdateSchema()
  const {rows}=await getPool().query(`
    SELECT me.user_id AS manager_id, 'manager'::text AS member_position
      FROM manager_employment me
      WHERE me.user_id=$1::uuid AND me.status IN ('probation','active')
    UNION ALL
    SELECT a.manager_user_id AS manager_id,'assistant'::text AS member_position
      FROM weave_distribution_assistants a
      JOIN manager_employment me ON me.user_id=a.manager_user_id
      WHERE a.user_id=$1::uuid AND a.status='approved'
        AND me.status IN ('probation','active')
    LIMIT 1
  `,[userId])
  return rows[0]||null
}

export async function readDistributionTeam(userId:string){
  const member=await resolveDistributionTeamMember(userId)
  if(!member)return null
  const access=await getLifestyleAccess(userId)
  if(!access.active)return null
  const managerId=String(member.manager_id)
  const pool=getPool()
  const [people,feed]=await Promise.all([
    pool.query(`SELECT u.id,u.name,u.role,'manager'::text AS position
      FROM manager_employment me JOIN users u ON u.id=me.user_id
      WHERE me.user_id=$1::uuid AND me.status IN ('probation','active')
      UNION ALL
      SELECT u.id,u.name,u.role,'assistant'::text AS position
      FROM weave_distribution_assistants a JOIN users u ON u.id=a.user_id
      WHERE a.manager_user_id=$1::uuid AND a.status='approved'
      ORDER BY position DESC,name LIMIT 3`,[managerId]),
    pool.query(`SELECT t.id,t.kind,t.content,t.created_at,u.name AS author_name,
      CASE WHEN t.author_user_id=t.manager_user_id THEN 'manager' ELSE 'assistant' END AS author_position
      FROM weave_distribution_team_updates t JOIN users u ON u.id=t.author_user_id
      WHERE t.manager_user_id=$1::uuid ORDER BY t.created_at DESC,t.id DESC LIMIT 100`,[managerId]),
  ])
  return {managerId,memberPosition:member.member_position,members:people.rows,
    updates:feed.rows.reverse(),canPost:true,adminReadOnly:false}
}

export async function postDistributionTeamUpdate(userId:string,kind:DistributionTeamUpdateKind,raw:string){
  if(!['message','plan','progress','handoff'].includes(kind))return {success:false as const,reason:'kind' as const}
  const content=raw.trim()
  if(content.length<2||content.length>2000)return {success:false as const,reason:'content' as const}
  const member=await resolveDistributionTeamMember(userId)
  if(!member)return {success:false as const,reason:'not_employed' as const}
  const access=await getLifestyleAccess(userId)
  if(!access.active)return {success:false as const,reason:'position_inactive' as const}
  // Revalidate the job inside the insertion; a revoked appointment cannot post.
  const {rows}=await getPool().query(`
    INSERT INTO weave_distribution_team_updates(manager_user_id,author_user_id,kind,content)
    SELECT $2::uuid,$1::uuid,$3,$4 FROM users sender
    WHERE sender.id=$1::uuid AND sender.role IN ('agent','bridger') AND sender.is_active=true
      AND (
        EXISTS(SELECT 1 FROM manager_employment me WHERE me.user_id=$1::uuid
          AND me.user_id=$2::uuid AND me.status IN ('probation','active'))
        OR EXISTS(SELECT 1 FROM weave_distribution_assistants a
          JOIN manager_employment me ON me.user_id=a.manager_user_id
          WHERE a.user_id=$1::uuid AND a.manager_user_id=$2::uuid
            AND a.status='approved' AND me.status IN ('probation','active'))
      )
    RETURNING id,created_at
  `,[userId,String(member.manager_id),kind,content])
  return rows.length?{success:true as const,update:rows[0]}:{success:false as const,reason:'not_employed' as const}
}

export async function readDistributionEmploymentOverview(){
  await ensureDistributionTeamUpdateSchema()
  const pool=getPool()
  const [teams,updates]=await Promise.all([
    pool.query(`SELECT me.user_id AS manager_id,u.name AS manager_name,me.status,
      me.document_accepted_at,me.verified_at,me.probation_started_at,me.probation_ends_at,
      (SELECT COUNT(*)::int FROM weave_distribution_assistants a
        WHERE a.manager_user_id=me.user_id AND a.status='approved') AS assistant_count,
      (SELECT MAX(t.created_at) FROM weave_distribution_team_updates t
        WHERE t.manager_user_id=me.user_id) AS last_update_at
      FROM manager_employment me JOIN users u ON u.id=me.user_id
      ORDER BY CASE WHEN me.status='pending_verification' THEN 0
      WHEN me.status='probation' THEN 1 WHEN me.status='active' THEN 2 ELSE 3 END,
      me.document_accepted_at DESC LIMIT 100`),
    pool.query(`SELECT t.id,t.manager_user_id,t.kind,t.content,t.created_at,
      u.name AS author_name,m.name AS manager_name
      FROM weave_distribution_team_updates t JOIN users u ON u.id=t.author_user_id
      JOIN users m ON m.id=t.manager_user_id
      ORDER BY t.created_at DESC,t.id DESC LIMIT 150`)
  ])
  return {teams:teams.rows,updates:updates.rows}
}
