import 'server-only'
import {getPool} from '@/lib/db'
import {
 WEAVE_NATIVE_DEPARTMENTS,canReadNativeDepartment,validNativeDepartment,validateNativeBlueprint,
 type NativeDepartment,type WeaveNativeBlueprint,
} from '@/lib/weave-native-blueprint'

/** Versioned module publication, independent of a new host image per change. */
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const slug=/^[a-z][a-z0-9-]{1,49}$/
function id(value:unknown){
 if(typeof value!=='string'||!uuid.test(value))throw Error('Valid module identity required')
 return value
}
function target(department:unknown,name:unknown){
 if(!validNativeDepartment(department)||typeof name!=='string'||!slug.test(name))
  throw Error('Invalid company department or module address')
 return {department,name}
}
let ensuring:Promise<void>|null=null
async function ensureNativeRegistry(){
 if(!ensuring)ensuring=(async()=>{
  const db=getPool()
  await db.query("CREATE TABLE IF NOT EXISTS weave_native_module_releases ("+
   "id uuid PRIMARY KEY DEFAULT gen_random_uuid(), version bigint GENERATED ALWAYS AS IDENTITY,"+
   "department varchar(36) NOT NULL,slug varchar(60) NOT NULL,"+
   "state varchar(16) NOT NULL CHECK(state IN ('draft','published','archived')),"+
   "blueprint jsonb NOT NULL,created_by uuid NOT NULL REFERENCES users(id),"+
   "published_by uuid REFERENCES users(id),"+
   "created_at timestamptz NOT NULL DEFAULT now(),published_at timestamptz)")
  await db.query("CREATE UNIQUE INDEX IF NOT EXISTS weave_native_one_live_slot ON "+
   "weave_native_module_releases(department,slug) WHERE state='published'")
  await db.query("CREATE INDEX IF NOT EXISTS weave_native_slot_history ON "+
   "weave_native_module_releases(department,slug,version DESC)")
  await db.query("CREATE TABLE IF NOT EXISTS weave_native_module_events ("+
   "id uuid PRIMARY KEY DEFAULT gen_random_uuid(),actor_id uuid NOT NULL REFERENCES users(id),"+
   "release_id uuid NOT NULL REFERENCES weave_native_module_releases(id),"+
   "event varchar(24) NOT NULL CHECK(event IN ('draft','publish','rollback_draft','unpublish')),"+
   "created_at timestamptz NOT NULL DEFAULT now())")
  await db.query("CREATE TABLE IF NOT EXISTS weave_native_form_submissions ("+
   "id uuid PRIMARY KEY DEFAULT gen_random_uuid(),"+
   "release_id uuid NOT NULL REFERENCES weave_native_module_releases(id),"+
   "user_id uuid NOT NULL REFERENCES users(id),form_id varchar(50) NOT NULL,"+
   "answers jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now())")
  await db.query("CREATE INDEX IF NOT EXISTS weave_native_form_user_history ON "+
   "weave_native_form_submissions(user_id,release_id,created_at DESC)")
  await db.query("CREATE INDEX IF NOT EXISTS weave_native_form_admin_history ON "+
   "weave_native_form_submissions(release_id,created_at DESC)")
  await db.query("CREATE TABLE IF NOT EXISTS weave_native_work_progress ("+
   "release_id uuid NOT NULL REFERENCES weave_native_module_releases(id),"+
   "user_id uuid NOT NULL REFERENCES users(id),step_id varchar(50) NOT NULL,"+
   "completed boolean NOT NULL DEFAULT false,updated_at timestamptz NOT NULL DEFAULT now(),"+
   "PRIMARY KEY(release_id,user_id,step_id))")
 })().catch(e=>{ensuring=null;throw e})
 return ensuring
}

export async function listNativeReleases(department:NativeDepartment,slugValue?:string){
 await ensureNativeRegistry()
 const db=getPool()
 const values=slugValue?[department,slugValue]:[department]
 const result=await db.query(
  "SELECT id,version,department,slug,state,blueprint,created_at,published_at "+
  "FROM weave_native_module_releases WHERE department=$1 "+
  (slugValue?"AND slug=$2 ":"")+"ORDER BY version DESC LIMIT 80",values)
 return result.rows
}
export async function listNativePublished(department:NativeDepartment,role:string){
 if(!canReadNativeDepartment(department,role))throw Error('Department access denied')
 await ensureNativeRegistry()
 const results=await getPool().query(
  "SELECT id,version,department,slug,blueprint,published_at FROM weave_native_module_releases "+
  "WHERE department=$1 AND state='published' ORDER BY published_at DESC LIMIT 60",
  [department])
 return results.rows.map(row=>({...row,blueprint:validateNativeBlueprint(row.blueprint)}))
}
export async function getNativePublished(department:NativeDepartment,slugValue:string,role:string){
 if(!canReadNativeDepartment(department,role))throw Error('Department access denied')
 target(department,slugValue)
 await ensureNativeRegistry()
 const result=await getPool().query(
  "SELECT id,version,department,slug,blueprint,published_at FROM weave_native_module_releases "+
  "WHERE department=$1 AND slug=$2 AND state='published' LIMIT 1",
  [department,slugValue])
 const row=result.rows[0]
 return row?{...row,blueprint:validateNativeBlueprint(row.blueprint)}:null
}
export async function draftNativeModule(input:unknown,actorId:string,origin:'draft'|'rollback_draft'='draft'){
 const blueprint=validateNativeBlueprint(input)
 await ensureNativeRegistry()
 const db=getPool()
 const client=await db.connect()
 try{
  await client.query('BEGIN')
  const created=await client.query(
   "INSERT INTO weave_native_module_releases(department,slug,state,blueprint,created_by) "+
   "VALUES($1,$2,'draft',$3::jsonb,$4::uuid) RETURNING id,version,department,slug,state,blueprint",
   [blueprint.department,blueprint.slug,JSON.stringify(blueprint),id(actorId)])
  await client.query(
   "INSERT INTO weave_native_module_events(actor_id,release_id,event) VALUES($1::uuid,$2::uuid,$3)",
   [actorId,created.rows[0].id,origin])
  await client.query('COMMIT')
  return created.rows[0]
 }catch(error){await client.query('ROLLBACK').catch(()=>{});throw error}
 finally{client.release()}
}
export async function publishNativeModule(input:{
 releaseId:string;actorId:string;expectedPublishedId:string|null
}){
 await ensureNativeRegistry()
 const db=getPool()
 const client=await db.connect()
 try{
  await client.query('BEGIN')
  const requested=await client.query(
   'SELECT id,department,slug,state,blueprint FROM weave_native_module_releases WHERE id=$1::uuid FOR UPDATE',
   [id(input.releaseId)])
  const release=requested.rows[0]
  if(!release||release.state!=='draft')throw Error('Select an unpublished version')
  const blueprint=validateNativeBlueprint(release.blueprint)
  if(blueprint.department!==release.department||blueprint.slug!==release.slug)
   throw Error('Version does not match its registered department')
  // Per-slot PostgreSQL lock serializes simultaneous publication requests.
  await client.query("SELECT pg_advisory_xact_lock(hashtext($1))",
   [release.department+':'+release.slug])
  const current=await client.query(
   "SELECT id FROM weave_native_module_releases WHERE department=$1 AND slug=$2 "+
   "AND state='published' FOR UPDATE",[release.department,release.slug])
  const present=current.rows[0]?.id||null
  if(present!==(input.expectedPublishedId||null))
   throw Error('This department module changed. Refresh before publishing.')
  await client.query(
   "UPDATE weave_native_module_releases SET state='archived' "+
   "WHERE department=$1 AND slug=$2 AND state='published'",
   [release.department,release.slug])
  await client.query(
   "UPDATE weave_native_module_releases SET state='published',published_by=$2::uuid,published_at=now() "+
   "WHERE id=$1::uuid",[release.id,id(input.actorId)])
  await client.query(
   "INSERT INTO weave_native_module_events(actor_id,release_id,event) VALUES($1::uuid,$2::uuid,'publish')",
   [input.actorId,release.id])
  await client.query('COMMIT')
  return {id:release.id,department:release.department,slug:release.slug,state:'published'}
 }catch(error){await client.query('ROLLBACK').catch(()=>{});throw error}
 finally{client.release()}
}
/** Withdraw a live module while retaining every immutable version for restoration. */
export async function unpublishNativeModule(input:{
 department:NativeDepartment;slug:string;actorId:string;expectedPublishedId:string
}){
 target(input.department,input.slug)
 await ensureNativeRegistry()
 const client=await getPool().connect()
 try{
  await client.query('BEGIN')
  await client.query("SELECT pg_advisory_xact_lock(hashtext($1))",
   [input.department+':'+input.slug])
  const current=await client.query(
   "SELECT id FROM weave_native_module_releases "+
   "WHERE department=$1 AND slug=$2 AND state='published' FOR UPDATE",
   [input.department,input.slug])
  if(!current.rows[0]||current.rows[0].id!==id(input.expectedPublishedId))
   throw Error('Live module changed. Refresh before withdrawing.')
  await client.query(
   "UPDATE weave_native_module_releases SET state='archived' WHERE id=$1::uuid",
   [input.expectedPublishedId])
  await client.query(
   "INSERT INTO weave_native_module_events(actor_id,release_id,event) "+
   "VALUES($1::uuid,$2::uuid,'unpublish')",[id(input.actorId),input.expectedPublishedId])
  await client.query('COMMIT')
  return {department:input.department,slug:input.slug,state:'archived'}
 }catch(error){await client.query('ROLLBACK').catch(()=>{});throw error}
 finally{client.release()}
}

export async function prepareNativeRollback(version:number,actorId:string){
 if(!Number.isSafeInteger(version)||version<1)throw Error('Select an actual archived version')
 await ensureNativeRegistry()
 const result=await getPool().query(
  "SELECT blueprint FROM weave_native_module_releases "+
  "WHERE version=$1 AND state='archived' LIMIT 1",[version])
 if(!result.rows[0])throw Error('Only archived published versions may be restored')
 return draftNativeModule(result.rows[0].blueprint,actorId,'rollback_draft')
}
export async function getNativeProgress(releaseId:string,userId:string){
 await ensureNativeRegistry()
 const result=await getPool().query(
  "SELECT step_id,completed FROM weave_native_work_progress "+
  "WHERE release_id=$1::uuid AND user_id=$2::uuid",
  [id(releaseId),id(userId)])
 return result.rows as {step_id:string;completed:boolean}[]
}
export async function setNativeStep(input:{
 releaseId:string;userId:string;role:string;stepId:string;completed:boolean
}){
 if(typeof input.completed!=='boolean')throw Error('Choose a true or false work state')
 await ensureNativeRegistry()
 const record=await getPool().query(
  "SELECT department,blueprint FROM weave_native_module_releases "+
  "WHERE id=$1::uuid AND state='published' LIMIT 1",[id(input.releaseId)])
 const current=record.rows[0]
 if(!current||!canReadNativeDepartment(current.department,input.role)||
  WEAVE_NATIVE_DEPARTMENTS[current.department as NativeDepartment].role!==input.role)
  throw Error('This department system is not available to your account')
 const blueprint:WeaveNativeBlueprint=validateNativeBlueprint(current.blueprint)
 if(blueprint.kind!=='system')throw Error('Only an operating system has work steps')
 const valid=blueprint.blocks.some(block=>block.type==='steps'&&
  block.steps.some(step=>step.id===input.stepId))
 if(!valid)throw Error('Unknown work step in this live system')
 await getPool().query(
  "INSERT INTO weave_native_work_progress(release_id,user_id,step_id,completed) "+
  "VALUES($1::uuid,$2::uuid,$3,$4) "+
  "ON CONFLICT(release_id,user_id,step_id) DO UPDATE "+
  "SET completed=EXCLUDED.completed,updated_at=now()",
  [input.releaseId,id(input.userId),input.stepId,input.completed])
 return {stepId:input.stepId,completed:input.completed}
}


/** Free-form content is not executed. All field keys/types must exist in the published definition. */
export async function submitNativeIntake(input:{
 releaseId:string;userId:string;role:string;formId:string;answers:unknown
}){
 await ensureNativeRegistry()
 const db=getPool()
 const existing=await db.query(
  "SELECT department,blueprint FROM weave_native_module_releases "+
  "WHERE id=$1::uuid AND state='published' LIMIT 1",[id(input.releaseId)])
 const live=existing.rows[0]
 if(!live||WEAVE_NATIVE_DEPARTMENTS[live.department as NativeDepartment]?.role!==input.role)
  throw Error('This work intake is not available to your position')
 const blueprint=validateNativeBlueprint(live.blueprint)
 const form=blueprint.blocks.find(b=>b.type==='intake'&&b.formId===input.formId)
 if(!form||form.type!=='intake')throw Error('This intake is not installed in the live module')
 if(!input.answers||typeof input.answers!=='object'||Array.isArray(input.answers))
  throw Error('Form data must be an object')
 const submitted=input.answers as Record<string,unknown>
 if(Object.keys(submitted).some(key=>!form.fields.some(field=>field.id===key)))
  throw Error('Unknown intake field')
 const answers:Record<string,string>={}
 for(const field of form.fields){
  const raw=submitted[field.id]
  if(raw===undefined||raw===null||raw===''){
   if(field.required)throw Error('Complete '+field.label)
   continue
  }
  if(typeof raw!=='string')throw Error('Invalid '+field.label)
  const trimmed=raw.trim()
  if(!trimmed&&field.required)throw Error('Complete '+field.label)
  if(!trimmed)continue
  if(/[\u0000-\u0008\u000b-\u001f\u007f]/.test(trimmed))throw Error('Invalid field text')
  if(trimmed.length>(field.kind==='long'?1500:240))throw Error('Field exceeds text limit')
  if(field.kind==='choice'&&!field.options.includes(trimmed))
   throw Error('Choose a published option for '+field.label)
  answers[field.id]=trimmed
 }
 const client=await db.connect()
 try{
  await client.query('BEGIN')
  // One submission per module/form/user every 30 seconds; serializes requests
  // for the same user even if several browser tabs submit concurrently.
  await client.query("SELECT pg_advisory_xact_lock(hashtext($1))",
   ['native-intake:'+input.releaseId+':'+input.userId])
  // Lock the release against publication/withdrawal while recording work.
  const stillLive=await client.query(
   "SELECT state FROM weave_native_module_releases WHERE id=$1::uuid FOR SHARE",
   [input.releaseId])
  if(stillLive.rows[0]?.state!=='published')throw Error('This published intake has changed. Refresh before submitting.')
  const recent=await client.query(
   "SELECT id FROM weave_native_form_submissions "+
   "WHERE release_id=$1::uuid AND user_id=$2::uuid AND form_id=$3 "+
   "AND created_at>now()-interval '30 seconds' LIMIT 1",
   [input.releaseId,input.userId,input.formId])
  if(recent.rowCount)throw Error('A recent submission is already recorded')
  const created=await client.query(
   "INSERT INTO weave_native_form_submissions(release_id,user_id,form_id,answers) "+
   "VALUES($1::uuid,$2::uuid,$3,$4::jsonb) RETURNING id,created_at",
   [input.releaseId,id(input.userId),input.formId,JSON.stringify(answers)])
  await client.query('COMMIT')
  return {id:created.rows[0].id,created_at:created.rows[0].created_at}
 }catch(error){await client.query('ROLLBACK').catch(()=>{});throw error}
 finally{client.release()}
}

/** Approved Administrations operators see submission evidence; no public listing. */
export async function listNativeSubmissions(department:NativeDepartment,slugValue:string){
 target(department,slugValue)
 await ensureNativeRegistry()
 const result=await getPool().query(
  "SELECT s.id,s.form_id,s.answers,s.created_at,u.name AS author_name "+
  "FROM weave_native_form_submissions s "+
  "JOIN weave_native_module_releases r ON r.id=s.release_id "+
  "JOIN users u ON u.id=s.user_id "+
  "WHERE r.department=$1 AND r.slug=$2 ORDER BY s.created_at DESC LIMIT 80",
  [department,slugValue])
 return result.rows
}
