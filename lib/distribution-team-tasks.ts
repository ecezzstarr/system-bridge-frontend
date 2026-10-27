import {getPool,sql} from '@/lib/db'
import {getActiveLegionEmployment} from '@/lib/legion-employment'
import {getLifestyleAccess} from '@/lib/weave-lifestyle'
import {ensureDistributionTeamUpdateSchema,resolveDistributionTeamMember} from '@/lib/distribution-team-updates'

export type TeamTaskStatus='assigned'|'in_progress'|'submitted'|'completed'
const STATUSES:TeamTaskStatus[]=['assigned','in_progress','submitted','completed']
let schemaPromise:Promise<void>|null=null
export async function ensureDistributionTeamTasksSchema(){
  if(schemaPromise)return schemaPromise
  schemaPromise=(async()=>{
    await ensureDistributionTeamUpdateSchema()
    await getPool().query(`
      CREATE TABLE IF NOT EXISTS weave_distribution_team_tasks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        manager_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        assigned_user_id UUID NOT NULL REFERENCES users(id),
        title VARCHAR(140) NOT NULL,
        instructions TEXT NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'assigned'
          CHECK (status IN ('assigned','in_progress','submitted','completed')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        completed_at TIMESTAMPTZ
      );
      CREATE INDEX IF NOT EXISTS weave_distribution_team_tasks_team_idx
        ON weave_distribution_team_tasks(manager_user_id,updated_at DESC);
      CREATE TABLE IF NOT EXISTS weave_distribution_team_task_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        task_id UUID NOT NULL REFERENCES weave_distribution_team_tasks(id),
        actor_user_id UUID NOT NULL REFERENCES users(id),
        from_status VARCHAR(20),
        to_status VARCHAR(20) NOT NULL,
        note TEXT NOT NULL,
        recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `)
  })().catch(err=>{schemaPromise=null;throw err})
  return schemaPromise
}
export async function readDistributionTeamTasks(userId:string){
  await ensureDistributionTeamTasksSchema()
  const member=await resolveDistributionTeamMember(userId)
  const access=await getLifestyleAccess(userId)
  if(!member||!access.active||(await getActiveLegionEmployment(sql,userId)).active)return null
  const pool=getPool()
  const [tasks,history]=await Promise.all([
    pool.query(`SELECT t.id,t.manager_user_id,t.assigned_user_id,t.title,t.instructions,t.status,
      t.created_at,t.updated_at,t.completed_at,u.name AS assignee_name
      FROM weave_distribution_team_tasks t JOIN users u ON u.id=t.assigned_user_id
      WHERE t.manager_user_id=$1::uuid ORDER BY CASE WHEN t.status='completed' THEN 1 ELSE 0 END,
      t.updated_at DESC LIMIT 120`,[member.manager_id]),
    pool.query(`SELECT h.task_id,h.actor_user_id,h.from_status,h.to_status,h.note,h.recorded_at,
      u.name AS actor_name FROM weave_distribution_team_task_history h
      JOIN weave_distribution_team_tasks t ON t.id=h.task_id
      JOIN users u ON u.id=h.actor_user_id
      WHERE t.manager_user_id=$1::uuid ORDER BY h.recorded_at DESC LIMIT 120`,[member.manager_id]),
  ])
  return {managerId:String(member.manager_id),memberPosition:member.member_position,
    tasks:tasks.rows,history:history.rows}
}
export async function createDistributionTeamTask(userId:string,targetId:string,rawTitle:string,rawInstructions:string){
  const title=rawTitle.trim(),instructions=rawInstructions.trim()
  if(title.length<6||title.length>140||instructions.length<15||instructions.length>2000)
    return {success:false as const,reason:'invalid_task' as const}
  await ensureDistributionTeamTasksSchema()
  const member=await resolveDistributionTeamMember(userId)
  const access=await getLifestyleAccess(userId)
  if(member?.member_position!=='manager'||!access.active||(await getActiveLegionEmployment(sql,userId)).active)
    return {success:false as const,reason:'not_manager' as const}
  const client=await getPool().connect()
  try{
    await client.query('BEGIN')
    const {rows:lead}=await client.query(`SELECT me.user_id FROM manager_employment me
      JOIN users u ON u.id=me.user_id WHERE me.user_id=$1::uuid
      AND me.status IN ('probation','active') AND u.is_active=true FOR UPDATE OF me`,[userId])
    if(!lead.length){await client.query('ROLLBACK');return {success:false as const,reason:'not_manager' as const}}
    const {rows:targets}=await client.query(`SELECT u.id FROM users u WHERE u.id=$2::uuid AND u.is_active=true
      AND (u.id=$1::uuid OR EXISTS (SELECT 1 FROM weave_distribution_assistants a
        WHERE a.user_id=u.id AND a.manager_user_id=$1::uuid AND a.status='approved'))`,[userId,targetId])
    if(!targets.length){await client.query('ROLLBACK');return {success:false as const,reason:'invalid_assignee' as const}}
    const {rows}=await client.query(`INSERT INTO weave_distribution_team_tasks
      (manager_user_id,assigned_user_id,title,instructions)
      VALUES($1::uuid,$2::uuid,$3,$4) RETURNING id`,[userId,targetId,title,instructions])
    await client.query(`INSERT INTO weave_distribution_team_task_history(task_id,actor_user_id,from_status,to_status,note)
      VALUES($1::uuid,$2::uuid,NULL,'assigned','Assigned by the verified lead Food Distribution Manager')`,[rows[0].id,userId])
    await client.query('COMMIT')
    try{
      await getPool().query(`INSERT INTO notifications(user_id,type,title,content,from_user_name,link)
        VALUES($1::uuid,'distribution_team_task',$2,$3,'WEAVE Distribution',
          '/weave/lifestyles/work')`,[targetId,'Food distribution task · '+title,
          'Your lead Food Distribution Manager assigned food-distribution work. Open your approved workspace to read the instructions and record actual progress.'])
    }catch(e){console.error('[distribution tasks] alert failed',e)}
    return {success:true as const,id:rows[0].id}
  }catch(e){try{await client.query('ROLLBACK')}catch{};console.error('[distribution tasks] assign',e)
    return {success:false as const,reason:'error' as const}
  }finally{client.release()}
}
export async function moveDistributionTeamTask(
  userId:string,taskId:string,next:TeamTaskStatus,rawNote:string
){
  const note=rawNote.trim()
  if(!STATUSES.includes(next)||note.length<8||note.length>1200)
    return {success:false as const,reason:'invalid_update' as const}
  await ensureDistributionTeamTasksSchema()
  const member=await resolveDistributionTeamMember(userId)
  const access=await getLifestyleAccess(userId)
  if(!member||!access.active||(await getActiveLegionEmployment(sql,userId)).active)return {success:false as const,reason:'not_employee' as const}
  const client=await getPool().connect()
  try{
    await client.query('BEGIN')
    const {rows}=await client.query(`SELECT t.id,t.status,t.assigned_user_id,t.manager_user_id
      FROM weave_distribution_team_tasks t
      JOIN manager_employment me ON me.user_id=t.manager_user_id
      WHERE t.id=$1::uuid AND t.manager_user_id=$2::uuid
        AND me.status IN ('probation','active') FOR UPDATE OF t`,[taskId,member.manager_id])
    const task=rows[0]
    if(!task){await client.query('ROLLBACK');return {success:false as const,reason:'not_found' as const}}
    const isLead=userId===task.manager_user_id
    const isAssignee=userId===task.assigned_user_id
    const permitted=(
      (task.status==='assigned'&&next==='in_progress'&&(isAssignee||isLead))||
      (task.status==='in_progress'&&next==='submitted'&&isAssignee)||
      (task.status==='submitted'&&next==='completed'&&isLead)||
      (task.status==='submitted'&&next==='in_progress'&&isLead)
    )
    if(!permitted){await client.query('ROLLBACK');return {success:false as const,reason:'invalid_transition' as const}}
    await client.query(`UPDATE weave_distribution_team_tasks SET status=$2::varchar,
      updated_at=NOW(),completed_at=CASE WHEN $2::varchar='completed' THEN NOW() ELSE NULL END
      WHERE id=$1::uuid`,[taskId,next])
    await client.query(`INSERT INTO weave_distribution_team_task_history
      (task_id,actor_user_id,from_status,to_status,note) VALUES($1::uuid,$2::uuid,$3,$4,$5)`,
      [taskId,userId,task.status,next,note])
    await client.query('COMMIT')
    try{
      const recipient=isLead?task.assigned_user_id:task.manager_user_id
      if(recipient!==userId)
        await getPool().query(`INSERT INTO notifications(user_id,type,title,content,from_user_name,link)
          VALUES($1::uuid,'distribution_task_progress',$2,$3,'WEAVE Distribution','/weave/lifestyles/work')`,
          [recipient,'Food distribution task · '+next.replaceAll('_',' '),note.slice(0,350)])
    }catch(e){console.error('[distribution tasks] progress notification failed',e)}
    return {success:true as const,status:next}
  }catch(e){try{await client.query('ROLLBACK')}catch{};console.error('[distribution tasks] transition',e)
    return {success:false as const,reason:'error' as const}
  }finally{client.release()}
}
// Reassignment is a lead Manager action, never an Administration override.
export async function reassignDistributionTeamTask(
  userId:string,taskId:string,nextAssigneeId:string,rawReason:string
){
  const reason=rawReason.trim()
  if(reason.length<8||reason.length>1200)return {success:false as const,reason:'invalid_update' as const}
  await ensureDistributionTeamTasksSchema()
  const member=await resolveDistributionTeamMember(userId)
  const access=await getLifestyleAccess(userId)
  if(member?.member_position!=='manager'||!access.active||(await getActiveLegionEmployment(sql,userId)).active)
    return {success:false as const,reason:'not_manager' as const}
  const client=await getPool().connect()
  let previousAssignee=''
  try{
    await client.query('BEGIN')
    const {rows:tasks}=await client.query(`SELECT t.id,t.status,t.assigned_user_id
      FROM weave_distribution_team_tasks t
      JOIN manager_employment me ON me.user_id=t.manager_user_id
      WHERE t.id=$1::uuid AND t.manager_user_id=$2::uuid
        AND t.status<>'completed' AND me.status IN ('probation','active')
      FOR UPDATE OF t`,[taskId,userId])
    const task=tasks[0]
    if(!task){await client.query('ROLLBACK');return {success:false as const,reason:'not_found' as const}}
    const {rows:targets}=await client.query(`SELECT u.id FROM users u
      WHERE u.id=$2::uuid AND u.is_active=true
      AND (u.id=$1::uuid OR EXISTS(
        SELECT 1 FROM weave_distribution_assistants a WHERE a.user_id=u.id
        AND a.manager_user_id=$1::uuid AND a.status='approved'))`,[userId,nextAssigneeId])
    if(!targets.length){await client.query('ROLLBACK');return {success:false as const,reason:'invalid_assignee' as const}}
    previousAssignee=String(task.assigned_user_id)
    await client.query(`UPDATE weave_distribution_team_tasks
      SET assigned_user_id=$2::uuid,status='assigned',completed_at=NULL,updated_at=NOW()
      WHERE id=$1::uuid`,[taskId,nextAssigneeId])
    await client.query(`INSERT INTO weave_distribution_team_task_history
      (task_id,actor_user_id,from_status,to_status,note) VALUES($1::uuid,$2::uuid,$3,'assigned',$4)`,
      [taskId,userId,task.status,'Reassigned: '+reason])
    await client.query('COMMIT')
  }catch(e){try{await client.query('ROLLBACK')}catch{};console.error('[distribution tasks] reassignment',e)
    return {success:false as const,reason:'error' as const}
  }finally{client.release()}
  try{
    await getPool().query(`INSERT INTO notifications(user_id,type,title,content,from_user_name,link)
      VALUES($1::uuid,'distribution_team_task','Distribution task reassigned',$2,
        'WEAVE Distribution','/weave/lifestyles/work')`,
      [nextAssigneeId,reason.slice(0,350)])
    if(previousAssignee&&previousAssignee!==nextAssigneeId)
      await getPool().query(`INSERT INTO notifications(user_id,type,title,content,from_user_name,link)
        VALUES($1::uuid,'distribution_team_task','Distribution task moved to another team member',
          $2,'WEAVE Distribution','/weave/lifestyles/work')`,[previousAssignee,reason.slice(0,350)])
  }catch(e){console.error('[distribution tasks] reassignment alert failed',e)}
  return {success:true as const}
}

export async function readDistributionTasksForAdministration(){
  await ensureDistributionTeamTasksSchema()
  const {rows}=await getPool().query(`SELECT t.id,t.manager_user_id,t.title,t.instructions,
    t.status,t.created_at,t.updated_at,t.completed_at,
    lead.name AS manager_name,worker.name AS assignee_name
    FROM weave_distribution_team_tasks t JOIN users lead ON lead.id=t.manager_user_id
    JOIN users worker ON worker.id=t.assigned_user_id
    ORDER BY CASE WHEN t.status='completed' THEN 1 ELSE 0 END,t.updated_at DESC LIMIT 120`)
  return rows
}
