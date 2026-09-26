import { sql } from '@/lib/db'
import {
  DEFAULT_FLAME_ARTIFACT_CONFIG,
  FLAME_ARTIFACT_PROFILE_KEY,
  normalizeFlameArtifactConfig,
  type FlameArtifactVisualConfig,
} from '@/lib/weave-visual-profile'

export async function ensureVisualSystemsSchema(){
  await sql`
    CREATE TABLE IF NOT EXISTS weave_visual_profiles (
      profile_key varchar(120) PRIMARY KEY,
      draft_config jsonb NOT NULL,
      published_config jsonb NOT NULL,
      version integer NOT NULL DEFAULT 1 CHECK (version >= 1),
      updated_by uuid,
      published_by uuid,
      created_at timestamptz NOT NULL DEFAULT NOW(),
      updated_at timestamptz NOT NULL DEFAULT NOW(),
      published_at timestamptz NOT NULL DEFAULT NOW()
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS weave_visual_profile_history (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      profile_key varchar(120) NOT NULL,
      version integer NOT NULL CHECK (version >= 1),
      config jsonb NOT NULL,
      action varchar(32) NOT NULL DEFAULT 'publish',
      published_by uuid,
      created_at timestamptz NOT NULL DEFAULT NOW(),
      UNIQUE(profile_key, version)
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS weave_visual_history_profile_idx ON weave_visual_profile_history(profile_key, version DESC)`

  const defaults=JSON.stringify(DEFAULT_FLAME_ARTIFACT_CONFIG)
  await sql`
    INSERT INTO weave_visual_profiles(profile_key,draft_config,published_config,version)
    VALUES(${FLAME_ARTIFACT_PROFILE_KEY},${defaults}::jsonb,${defaults}::jsonb,1)
    ON CONFLICT(profile_key) DO NOTHING
  `
  await sql`
    INSERT INTO weave_visual_profile_history(profile_key,version,config,action)
    SELECT profile_key,version,published_config,'seed'
    FROM weave_visual_profiles
    WHERE profile_key=${FLAME_ARTIFACT_PROFILE_KEY}
      AND NOT EXISTS(
        SELECT 1 FROM weave_visual_profile_history
        WHERE profile_key=${FLAME_ARTIFACT_PROFILE_KEY} AND version=1
      )
    ON CONFLICT(profile_key,version) DO NOTHING
  `
}

export async function getVisualProfile(){
  await ensureVisualSystemsSchema()
  const rows=await sql`
    SELECT profile_key,draft_config,published_config,version,updated_at,published_at
    FROM weave_visual_profiles
    WHERE profile_key=${FLAME_ARTIFACT_PROFILE_KEY}
    LIMIT 1
  `
  const row=rows[0]
  return {
    profileKey:FLAME_ARTIFACT_PROFILE_KEY,
    draft:normalizeFlameArtifactConfig(row?.draft_config),
    published:normalizeFlameArtifactConfig(row?.published_config),
    version:Number(row?.version||1),
    updatedAt:row?.updated_at||null,
    publishedAt:row?.published_at||null,
  }
}

export async function getVisualHistory(limit=20){
  await ensureVisualSystemsSchema()
  const safe=Math.max(1,Math.min(50,Math.trunc(limit)))
  return sql`
    SELECT id,profile_key,version,config,action,published_by,created_at
    FROM weave_visual_profile_history
    WHERE profile_key=${FLAME_ARTIFACT_PROFILE_KEY}
    ORDER BY version DESC
    LIMIT ${safe}
  `
}

export async function saveVisualDraft(config:unknown,userId:string){
  await ensureVisualSystemsSchema()
  const normalized=normalizeFlameArtifactConfig(config)
  const payload=JSON.stringify(normalized)
  await sql`
    UPDATE weave_visual_profiles
    SET draft_config=${payload}::jsonb,updated_by=${userId}::uuid,updated_at=NOW()
    WHERE profile_key=${FLAME_ARTIFACT_PROFILE_KEY}
  `
  return getVisualProfile()
}

export async function restoreDraftFromPublished(userId:string){
  await ensureVisualSystemsSchema()
  await sql`
    UPDATE weave_visual_profiles
    SET draft_config=published_config,updated_by=${userId}::uuid,updated_at=NOW()
    WHERE profile_key=${FLAME_ARTIFACT_PROFILE_KEY}
  `
  return getVisualProfile()
}

export async function resetVisualDraft(userId:string){
  return saveVisualDraft(DEFAULT_FLAME_ARTIFACT_CONFIG,userId)
}

export async function publishVisualProfile(config:unknown,userId:string,action='publish'){
  await ensureVisualSystemsSchema()
  const normalized=normalizeFlameArtifactConfig(config)
  const payload=JSON.stringify(normalized)
  const rows=await sql`
    UPDATE weave_visual_profiles
    SET
      draft_config=${payload}::jsonb,
      published_config=${payload}::jsonb,
      version=version+1,
      updated_by=${userId}::uuid,
      published_by=${userId}::uuid,
      updated_at=NOW(),
      published_at=NOW()
    WHERE profile_key=${FLAME_ARTIFACT_PROFILE_KEY}
    RETURNING version
  `
  const version=Number(rows[0]?.version||1)
  await sql`
    INSERT INTO weave_visual_profile_history(profile_key,version,config,action,published_by)
    VALUES(${FLAME_ARTIFACT_PROFILE_KEY},${version},${payload}::jsonb,${action},${userId}::uuid)
    ON CONFLICT(profile_key,version) DO NOTHING
  `
  return getVisualProfile()
}

export async function rollbackVisualProfile(historyId:string,userId:string){
  await ensureVisualSystemsSchema()
  const rows=await sql`
    SELECT config,version
    FROM weave_visual_profile_history
    WHERE id=${historyId}::uuid AND profile_key=${FLAME_ARTIFACT_PROFILE_KEY}
    LIMIT 1
  `
  if(!rows[0]) throw new Error('Visual revision not found')
  return publishVisualProfile(rows[0].config,userId,'rollback')
}

export async function getPublishedVisualProfile():Promise<{config:FlameArtifactVisualConfig;version:number;publishedAt:string|null}>{
  const profile=await getVisualProfile()
  return {config:profile.published,version:profile.version,publishedAt:profile.publishedAt}
}
