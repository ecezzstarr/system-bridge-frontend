import { getPool,sql } from '@/lib/db'
import { FILE_FOLDER_TIERS, type FileFolderTier } from '@/lib/file-folder-pricing'

export type FileFolderWorldReleaseConfig = {
  headline:string
  description:string
  tierMessages:Record<FileFolderTier,string>
}
export const DEFAULT_FILE_FOLDER_WORLD_CONFIG:FileFolderWorldReleaseConfig = {
  headline:'Weave File Folder World',
  description:'Build, participate and operate your File Folder systems through System Switch.',
  tierMessages:{
    standard:'Standard File Folder · System Formation Workshop',
    pro:'Pro File Folder · Business systems in formation and operation',
    premium:'Premium File Folder · Extended operating environment',
    plus:'Plus File Folder · Complete systems for immediate uses',
  }
}
function clean(value:unknown,limit:number):string{
  return typeof value==='string'?value.trim().slice(0,limit):''
}
export function validateFileFolderWorldConfig(value:unknown):FileFolderWorldReleaseConfig{
  if(!value||typeof value!=='object')throw new Error('A File Folder configuration is required')
  const body=value as Record<string,unknown>
  const raw=body.tierMessages
  if(!raw||typeof raw!=='object')throw new Error('Four tier messages are required')
  const messages=raw as Record<string,unknown>
  const tierMessages={} as Record<FileFolderTier,string>
  for(const tier of FILE_FOLDER_TIERS){
    const msg=clean(messages[tier],900)
    if(!msg||msg.length<5)throw new Error('Provide a meaningful '+tier+' File Folder description')
    tierMessages[tier]=msg
  }
  const headline=clean(body.headline,160)
  const description=clean(body.description,1500)
  if(headline.length<4||description.length<12)throw new Error('A meaningful title and explanation are required')
  return {headline,description,tierMessages}
}

export async function ensureFileFolderGlobalReleases(){
  await sql`CREATE TABLE IF NOT EXISTS file_folder_global_releases(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    version bigint GENERATED ALWAYS AS IDENTITY,
    state varchar(20) NOT NULL CHECK(state IN ('draft','published','archived')),
    config jsonb NOT NULL,
    created_by uuid,
    created_at timestamptz NOT NULL DEFAULT now(),
    published_by uuid,
    published_at timestamptz
  )`
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS file_folder_single_published_release
    ON file_folder_global_releases(state) WHERE state='published'`
  await sql`CREATE INDEX IF NOT EXISTS file_folder_release_history ON file_folder_global_releases(version DESC)`
  await sql`
    INSERT INTO file_folder_global_releases(state,config)
    SELECT 'published',${JSON.stringify(DEFAULT_FILE_FOLDER_WORLD_CONFIG)}::jsonb
    WHERE NOT EXISTS(SELECT 1 FROM file_folder_global_releases)
    ON CONFLICT DO NOTHING
  `
}
export async function getPublishedFileFolderRelease(){
  await ensureFileFolderGlobalReleases()
  const [row]=await sql`SELECT id,version,config,published_at FROM file_folder_global_releases
    WHERE state='published' ORDER BY version DESC LIMIT 1`
  return row||{version:0,config:DEFAULT_FILE_FOLDER_WORLD_CONFIG,published_at:null}
}
export async function listFileFolderReleases(){
  await ensureFileFolderGlobalReleases()
  return sql`SELECT id,version,state,config,created_at,published_at
    FROM file_folder_global_releases ORDER BY version DESC LIMIT 30`
}
export async function draftFileFolderWorldRelease(input:unknown,adminId:string){
  const config=validateFileFolderWorldConfig(input)
  await ensureFileFolderGlobalReleases()
  const [draft]=await sql`INSERT INTO file_folder_global_releases(state,config,created_by)
    VALUES('draft',${JSON.stringify(config)}::jsonb,${adminId}::uuid)
    RETURNING id,version,state,config,created_at`
  return draft
}
export async function publishFileFolderWorldRelease(id:string,adminId:string,expectedCurrentVersion:number){
  if(!/^[0-9a-f-]{36}$/i.test(id)||!Number.isSafeInteger(expectedCurrentVersion))
    throw new Error('Select a valid release and expected published version')
  await ensureFileFolderGlobalReleases()
  const connection=await getPool().connect()
  try{
    await connection.query('BEGIN')
    await connection.query("SELECT pg_advisory_xact_lock(hashtext('weave_file_folder_world_publication'))")
    const current=await connection.query(
      "SELECT id,version FROM file_folder_global_releases WHERE state='published' FOR UPDATE")
    if(Number(current.rows[0]?.version||0)!==expectedCurrentVersion)
      throw new Error('A newer release is already published. Refresh before continuing.')
    const selected=await connection.query('SELECT id,version,config,state FROM file_folder_global_releases WHERE id=$1::uuid FOR UPDATE',[id])
    if(!selected.rows[0]||selected.rows[0].state!=='draft')
      throw new Error('Only an unpublished draft can be published. Duplicate a previous version to restore it.')
    validateFileFolderWorldConfig(selected.rows[0].config)
    await connection.query("UPDATE file_folder_global_releases SET state='archived' WHERE state='published'")
    await connection.query(
      "UPDATE file_folder_global_releases SET state='published',published_by=$2::uuid,published_at=now() WHERE id=$1::uuid",
      [id,adminId])
    await connection.query('COMMIT')
    return {id,version:Number(selected.rows[0].version),state:'published'}
  }catch(error){await connection.query('ROLLBACK').catch(()=>{});throw error}
  finally{connection.release()}
}
export async function draftRollbackFileFolderWorldRelease(version:number,adminId:string){
  if(!Number.isSafeInteger(version)||version<1)throw new Error('Select an actual previous release')
  await ensureFileFolderGlobalReleases()
  const [prior]=await sql`SELECT config FROM file_folder_global_releases
    WHERE version=${version} AND state='archived' LIMIT 1`
  if(!prior)throw new Error('Only a previous published version can be restored')
  return draftFileFolderWorldRelease(prior.config,adminId)
}
