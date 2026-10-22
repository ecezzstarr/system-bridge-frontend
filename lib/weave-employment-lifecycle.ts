import { getPool } from '@/lib/db'
import { ensureManagerEmploymentTable } from '@/lib/manager-employment'
import { ensureDistributionAssistantSchema } from '@/lib/distribution-assistants'
import { ensureFoodPreparationManagerSchema } from '@/lib/food-preparation-manager'

export type WeaveEmploymentPosition='distribution_manager'|'distribution_assistant'|'food_preparation'
export const WEAVE_EMPLOYMENT_POSITIONS:WeaveEmploymentPosition[]=['distribution_manager','distribution_assistant','food_preparation']
export const isWeaveEmploymentPosition=(value:unknown):value is WeaveEmploymentPosition=>
  typeof value==='string'&&WEAVE_EMPLOYMENT_POSITIONS.some(position=>position===value)
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export const validEmploymentUserId=(id:unknown):id is string=>typeof id==='string'&&UUID.test(id)
type EmployeeIdentity={id:string;role:string}

let schemaSetup:Promise<void>|null=null
export async function ensureWeaveEmploymentLifecycleSchema(){
  if(!schemaSetup)schemaSetup=(async()=>{
    await ensureManagerEmploymentTable()
    await ensureDistributionAssistantSchema()
    await ensureFoodPreparationManagerSchema()
    const db=getPool()
    await db.query(`
      CREATE TABLE IF NOT EXISTS weave_employment_correspondence (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        position VARCHAR(36) NOT NULL CHECK (position IN ('distribution_manager','distribution_assistant','food_preparation')),
        employee_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        author_user_id UUID NOT NULL REFERENCES users(id),
        author_role VARCHAR(16) NOT NULL CHECK (author_role IN ('employee','administration','system')),
        message TEXT NOT NULL CHECK (char_length(message) BETWEEN 2 AND 2000),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS weave_employment_correspondence_thread_idx
        ON weave_employment_correspondence(position,employee_user_id,created_at DESC);
      CREATE TABLE IF NOT EXISTS weave_employment_exit_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        position VARCHAR(36) NOT NULL CHECK (position IN ('distribution_manager','distribution_assistant','food_preparation')),
        employee_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        actor_user_id UUID NOT NULL REFERENCES users(id),
        exit_kind VARCHAR(20) NOT NULL CHECK (exit_kind IN ('resigned','withdrawn','fired','lead_departed')),
        reason TEXT NOT NULL,
        recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      ALTER TABLE manager_employment ADD COLUMN IF NOT EXISTS exit_kind VARCHAR(20);
      ALTER TABLE manager_employment ADD COLUMN IF NOT EXISTS exit_reason TEXT;
      ALTER TABLE manager_employment ADD COLUMN IF NOT EXISTS exited_at TIMESTAMPTZ;
      ALTER TABLE manager_employment ADD COLUMN IF NOT EXISTS exited_by UUID REFERENCES users(id);
      ALTER TABLE weave_distribution_assistants ADD COLUMN IF NOT EXISTS exit_kind VARCHAR(20);
      ALTER TABLE weave_distribution_assistants ADD COLUMN IF NOT EXISTS exit_reason TEXT;
      ALTER TABLE weave_distribution_assistants ADD COLUMN IF NOT EXISTS exited_at TIMESTAMPTZ;
      ALTER TABLE weave_distribution_assistants ADD COLUMN IF NOT EXISTS exited_by UUID REFERENCES users(id);
      ALTER TABLE weave_food_preparation_managers ADD COLUMN IF NOT EXISTS exit_kind VARCHAR(20);
      ALTER TABLE weave_food_preparation_managers ADD COLUMN IF NOT EXISTS exit_reason TEXT;
      ALTER TABLE weave_food_preparation_managers ADD COLUMN IF NOT EXISTS exited_at TIMESTAMPTZ;
      ALTER TABLE weave_food_preparation_managers ADD COLUMN IF NOT EXISTS exited_by UUID REFERENCES users(id);
    `)
  })().catch(error=>{schemaSetup=null;throw error})
  return schemaSetup
}

const existenceSql:Record<WeaveEmploymentPosition,string>={
  distribution_manager:"SELECT user_id,status,exit_kind,exit_reason,exited_at FROM manager_employment WHERE user_id=$1::uuid",
  distribution_assistant:"SELECT user_id,status,exit_kind,exit_reason,exited_at FROM weave_distribution_assistants WHERE user_id=$1::uuid",
  food_preparation:"SELECT agent_id AS user_id,status,exit_kind,exit_reason,exited_at FROM weave_food_preparation_managers WHERE agent_id=$1::uuid",
}
export async function getEmploymentRecord(position:WeaveEmploymentPosition,employeeId:string){
  await ensureWeaveEmploymentLifecycleSchema()
  const {rows}=await getPool().query(existenceSql[position],[employeeId])
  return rows[0]||null
}

export async function getEmploymentCorrespondence(position:WeaveEmploymentPosition,employeeId:string){
  const record=await getEmploymentRecord(position,employeeId)
  if(!record)return null
  const pool=getPool()
  const [messages,exits]=await Promise.all([
    pool.query(`SELECT c.id,c.message,c.author_role,c.created_at,u.name AS author_name
      FROM weave_employment_correspondence c JOIN users u ON u.id=c.author_user_id
      WHERE c.position=$1 AND c.employee_user_id=$2::uuid
      ORDER BY c.created_at DESC,c.id DESC LIMIT 100`,[position,employeeId]),
    pool.query(`SELECT exit_kind,reason,recorded_at FROM weave_employment_exit_events
      WHERE position=$1 AND employee_user_id=$2::uuid ORDER BY recorded_at DESC LIMIT 30`,[position,employeeId]),
  ])
  return {record,messages:messages.rows.reverse(),exits:exits.rows}
}

// Replies are always separate from a team's autonomous internal conversation.
export async function replyToEmployment(position:WeaveEmploymentPosition,employeeId:string,author:EmployeeIdentity,raw:string){
  const content=raw.trim()
  if(content.length<2||content.length>2000)return {success:false as const,reason:'invalid_message' as const}
  const isAdmin=author.role==='admin'
  if(!isAdmin&&author.id!==employeeId)return {success:false as const,reason:'forbidden' as const}
  if(!isAdmin&&!['agent','bridger'].includes(author.role))return {success:false as const,reason:'forbidden' as const}
  if(!await getEmploymentRecord(position,employeeId))return {success:false as const,reason:'not_found' as const}
  const pool=getPool()
  const {rows}=await pool.query(`INSERT INTO weave_employment_correspondence
    (position,employee_user_id,author_user_id,author_role,message)
    VALUES($1,$2::uuid,$3::uuid,$4,$5) RETURNING id,created_at`,
    [position,employeeId,author.id,isAdmin?'administration':'employee',content])
  try{
    if(isAdmin){
      await pool.query(`INSERT INTO notifications(user_id,type,title,content,from_user_name)
        VALUES($1::uuid,'employment_reply','Administration replied to your employment message',$2,'WEAVE Administration')`,
        [employeeId,content.slice(0,380)])
    }else{
      await pool.query(`INSERT INTO notifications(user_id,type,title,content,from_user_name)
        SELECT id,'employment_reply','Employment reply received',$1,'WEAVE Employment'
        FROM users WHERE role='admin' AND is_active=true`,[content.slice(0,380)])
    }
  }catch(error){console.error('[weave employment] correspondence notification failed',error)}
  return {success:true as const,message:rows[0]}
}

export async function exitWeaveEmployment(
  position:WeaveEmploymentPosition,employeeId:string,actor:EmployeeIdentity,
  action:'resign'|'fire',rawReason:string
){
  const reason=rawReason.trim()
  if(reason.length<10||reason.length>2000)return {success:false as const,reason:'invalid_reason' as const}
  if(action==='fire'&&actor.role!=='admin')return {success:false as const,reason:'forbidden' as const}
  if(action==='resign'&&(actor.id!==employeeId||!['agent','bridger'].includes(actor.role)))
    return {success:false as const,reason:'forbidden' as const}
  await ensureWeaveEmploymentLifecycleSchema()
  const client=await getPool().connect()
  let affectedAssistants:{user_id:string}[]=[]
  let openFoodTasks=0
  let exitKind:'resigned'|'withdrawn'|'fired'='fired'
  try{
    await client.query('BEGIN')
    if(position==='food_preparation'){
      await client.query('SELECT pg_advisory_xact_lock(20261021,51)')
    }else{
      await client.query("SELECT pg_advisory_xact_lock(hashtext('weave_manager_employment_capacity'))")
      await client.query("SELECT pg_advisory_xact_lock(hashtext('weave_distribution_assistant_capacity'))")
    }
    let current:any
    if(position==='distribution_manager'){
      const {rows}=await client.query("SELECT user_id,status FROM manager_employment WHERE user_id=$1::uuid FOR UPDATE",[employeeId])
      current=rows[0]
    }else if(position==='distribution_assistant'){
      const {rows}=await client.query("SELECT user_id,status FROM weave_distribution_assistants WHERE user_id=$1::uuid FOR UPDATE",[employeeId])
      current=rows[0]
    }else{
      const {rows}=await client.query("SELECT id,agent_id,status FROM weave_food_preparation_managers WHERE agent_id=$1::uuid FOR UPDATE",[employeeId])
      current=rows[0]
    }
    if(!current||!['pending_verification','pending','probation','active','approved'].includes(current.status)){
      await client.query('ROLLBACK');return {success:false as const,reason:'not_active' as const}
    }
    if(action==='fire'&&!['probation','active','approved'].includes(current.status)){
      await client.query('ROLLBACK');return {success:false as const,reason:'not_appointed' as const}
    }
    exitKind=action==='resign'&&['pending','pending_verification'].includes(current.status)?'withdrawn':
      action==='resign'?'resigned':'fired'
    if(position==='distribution_manager'){
      await client.query(`UPDATE manager_employment SET status='ended',ended_at=NOW(),exit_kind=$2,
        exit_reason=$3,exited_at=NOW(),exited_by=$4::uuid,updated_at=NOW()
        WHERE user_id=$1::uuid`,[employeeId,exitKind,reason,actor.id])
      const {rows}=await client.query(`UPDATE weave_distribution_assistants
        SET status='ended',exit_kind='lead_departed',exit_reason=$2,
          exited_at=NOW(),exited_by=$3::uuid,updated_at=NOW()
        WHERE manager_user_id=$1::uuid AND status='approved' RETURNING user_id`,
        [employeeId,'The verified lead Distribution Manager position ended. Await a new appointment before working as an assistant.',actor.id])
      affectedAssistants=rows
      for(const assistant of affectedAssistants){
        await client.query(`INSERT INTO weave_employment_exit_events(position,employee_user_id,actor_user_id,exit_kind,reason)
          VALUES('distribution_assistant',$1::uuid,$2::uuid,'lead_departed',$3)`,
          [assistant.user_id,actor.id,'Lead Distribution Manager departed; assistant appointment ended pending fresh recruitment.'])
      }
    }else if(position==='distribution_assistant'){
      await client.query(`UPDATE weave_distribution_assistants SET status='ended',exit_kind=$2,
        exit_reason=$3,exited_at=NOW(),exited_by=$4::uuid,updated_at=NOW()
        WHERE user_id=$1::uuid`,[employeeId,exitKind,reason,actor.id])
    }else{
      await client.query(`UPDATE weave_food_preparation_managers SET status='revoked',exit_kind=$2,
        exit_reason=$3,exited_at=NOW(),exited_by=$4::uuid,updated_at=NOW()
        WHERE agent_id=$1::uuid`,[employeeId,exitKind,reason,actor.id])
      // Do not delete customer jobs. Notify Administration about any uncompleted
      // assigned food orders, which must be reassigned before further work.
      const {rows}=await client.query(`SELECT COUNT(*)::int AS count
        FROM weave_food_preparation_tasks t
        WHERE t.manager_id=$1::uuid`,[current.id])
      openFoodTasks=Number(rows[0]?.count||0)
    }
    await client.query(`INSERT INTO weave_employment_exit_events
      (position,employee_user_id,actor_user_id,exit_kind,reason)
      VALUES($1,$2::uuid,$3::uuid,$4,$5)`,[position,employeeId,actor.id,exitKind,reason])
    await client.query('COMMIT')
  }catch(error){
    try{await client.query('ROLLBACK')}catch{}
    console.error('[weave employment] exit failed',error)
    return {success:false as const,reason:'error' as const}
  }finally{client.release()}
  const pool=getPool()
  try{
    await pool.query(`INSERT INTO notifications(user_id,type,title,content,from_user_name)
      VALUES($1::uuid,'employment_exit',$2,$3,'WEAVE Administration')`,[
        employeeId,action==='fire'?'WEAVE employment terminated':exitKind==='withdrawn'?'WEAVE application withdrawn':'WEAVE resignation recorded',
        reason.slice(0,550)])
    if(action==='resign'){
      await pool.query(`INSERT INTO notifications(user_id,type,title,content,from_user_name)
        SELECT id,'employment_exit','Employment resignation / withdrawal',$1,'WEAVE Employment'
        FROM users WHERE role='admin' AND is_active=true`,
        [`${position}: ${reason}`.slice(0,550)])
    }
    if(affectedAssistants.length){
      for(const assistant of affectedAssistants){
        await pool.query(`INSERT INTO notifications(user_id,type,title,content,from_user_name)
          VALUES($1::uuid,'employment_exit','Distribution Assistant employment ended',
            'Your lead Distribution Manager departed. Your assistant appointment has ended; work access is closed. Existing records remain available.', 'WEAVE Employment')`,
          [assistant.user_id])
      }
    }
    if(position==='food_preparation'&&openFoodTasks>0){
      await pool.query(`INSERT INTO notifications(user_id,type,title,content,from_user_name)
        SELECT id,'employment_handoff','Food preparation handoff requires review',$1,'WEAVE Employment'
        FROM users WHERE role='admin' AND is_active=true`,
        [`Food Preparation employee ${employeeId} left with ${openFoodTasks} historically assigned orders. Review which remain unfinished and reassign them to approved staff before resuming.`])
    }
  }catch(error){console.error('[weave employment] exit notification failed',error)}
  return {success:true as const,exitKind,affectedAssistants:affectedAssistants.length,assignedFoodOrdersToReview:openFoodTasks}
}
