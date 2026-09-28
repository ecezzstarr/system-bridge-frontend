import { sql } from '@/lib/db'
import { WEAVE_ENVIRONMENT_REGISTRY } from '@/lib/weave-environment-registry'
import {
  DEFAULT_ENVIRONMENT_RUNTIME_CONFIG,
  normalizeEnvironmentRuntimeConfig,
  type EnvironmentRuntimeConfig,
} from '@/lib/weave-environment-runtime-profile'

let environmentSchemaPromise:Promise<void>|null=null

export async function ensureEnvironmentOrganizerSchema(){
  if(environmentSchemaPromise)return environmentSchemaPromise
  environmentSchemaPromise=(async()=>{
    await sql`
      CREATE TABLE IF NOT EXISTS weave_environment_surfaces (
        surface_key varchar(180) PRIMARY KEY,
        label varchar(180) NOT NULL,
        surface_kind varchar(24) NOT NULL,
        route varchar(320) NOT NULL,
        area varchar(160) NOT NULL,
        scope varchar(40) NOT NULL,
        is_visible boolean NOT NULL DEFAULT true,
        sort_order integer NOT NULL DEFAULT 100,
        is_protected boolean NOT NULL DEFAULT false,
        updated_by uuid,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW()
      )
    `
    await sql`
      ALTER TABLE weave_environment_surfaces DROP CONSTRAINT IF EXISTS weave_environment_surfaces_surface_kind_check
    `
    await sql`
      UPDATE weave_environment_surfaces SET surface_kind=CASE surface_kind WHEN 'page' THEN 'district' WHEN 'card' THEN 'station' ELSE surface_kind END
      WHERE surface_kind IN ('page','card')
    `
    await sql`
      ALTER TABLE weave_environment_surfaces ADD CONSTRAINT weave_environment_surfaces_surface_kind_check
      CHECK (surface_kind IN ('district','station')) NOT VALID
    `
    await sql`CREATE INDEX IF NOT EXISTS weave_environment_surfaces_area_idx ON weave_environment_surfaces(area,sort_order,label)`

    await sql`
      CREATE TABLE IF NOT EXISTS weave_environment_runtime_profiles (
        profile_key varchar(120) PRIMARY KEY,
        config jsonb NOT NULL,
        version integer NOT NULL DEFAULT 1 CHECK (version >= 1),
        updated_by uuid,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW()
      )
    `

    await sql`
      INSERT INTO weave_environment_runtime_profiles(profile_key,config,version)
      VALUES(
        'default',
        ${JSON.stringify(DEFAULT_ENVIRONMENT_RUNTIME_CONFIG)}::jsonb,
        1
      )
      ON CONFLICT(profile_key) DO NOTHING
    `

    for(const surface of WEAVE_ENVIRONMENT_REGISTRY){
      await sql`
        INSERT INTO weave_environment_surfaces(
          surface_key,label,surface_kind,route,area,scope,is_visible,sort_order,is_protected
        )
        VALUES(
          ${surface.key},${surface.label},${surface.kind},${surface.route},${surface.area},${surface.scope},
          true,${surface.defaultOrder},${Boolean(surface.protected)}
        )
        ON CONFLICT(surface_key)
        DO UPDATE SET
          label=EXCLUDED.label,
          surface_kind=EXCLUDED.surface_kind,
          route=EXCLUDED.route,
          area=EXCLUDED.area,
          scope=EXCLUDED.scope,
          is_protected=EXCLUDED.is_protected,
          is_visible=CASE WHEN EXCLUDED.is_protected THEN true ELSE weave_environment_surfaces.is_visible END
      `
    }
  })().catch(error=>{
    environmentSchemaPromise=null
    throw error
  })
  return environmentSchemaPromise
}

export async function getEnvironmentRuntimeProfile(){
  await ensureEnvironmentOrganizerSchema()
  const [row]=await sql`
    SELECT config,version,updated_at
    FROM weave_environment_runtime_profiles
    WHERE profile_key='default'
    LIMIT 1
  `
  return {
    config:normalizeEnvironmentRuntimeConfig(row?.config),
    version:Number(row?.version||1),
    updatedAt:row?.updated_at||null,
  }
}

export async function getEnvironmentOrganizerState(){
  await ensureEnvironmentOrganizerSchema()
  const [items,runtime]=await Promise.all([
    sql`
      SELECT surface_key,label,surface_kind,route,area,scope,is_visible,sort_order,is_protected,updated_at
      FROM weave_environment_surfaces
      ORDER BY area ASC,sort_order ASC,label ASC
    `,
    getEnvironmentRuntimeProfile(),
  ])
  return {items,runtime}
}

export async function setEnvironmentSurfaceVisibility(surfaceKey:string,visible:boolean,userId:string){
  await ensureEnvironmentOrganizerSchema()
  const [surface]=await sql`
    SELECT surface_key,is_protected
    FROM weave_environment_surfaces
    WHERE surface_key=${surfaceKey}
    LIMIT 1
  `
  if(!surface)throw new Error('Environment surface not found')
  if(surface.is_protected&&!visible)throw new Error('This control surface is protected and cannot be removed.')

  await sql`
    UPDATE weave_environment_surfaces
    SET is_visible=${visible},updated_by=${userId}::uuid,updated_at=NOW()
    WHERE surface_key=${surfaceKey}
  `
  return getEnvironmentOrganizerState()
}

export async function setEnvironmentSurfaceOrder(surfaceKey:string,sortOrder:number,userId:string){
  await ensureEnvironmentOrganizerSchema()
  const order=Math.max(-10000,Math.min(10000,Math.trunc(sortOrder)))
  const result=await sql`
    UPDATE weave_environment_surfaces
    SET sort_order=${order},updated_by=${userId}::uuid,updated_at=NOW()
    WHERE surface_key=${surfaceKey}
    RETURNING surface_key
  `
  if(!result[0])throw new Error('Environment surface not found')
  return getEnvironmentOrganizerState()
}

export async function setEnvironmentRuntimeConfig(input:unknown,userId:string){
  await ensureEnvironmentOrganizerSchema()
  const config=normalizeEnvironmentRuntimeConfig(input)
  await sql`
    UPDATE weave_environment_runtime_profiles
    SET
      config=${JSON.stringify(config)}::jsonb,
      version=version+1,
      updated_by=${userId}::uuid,
      updated_at=NOW()
    WHERE profile_key='default'
  `
  return getEnvironmentOrganizerState()
}

export async function restoreEnvironmentRuntimeDefaults(userId:string){
  return setEnvironmentRuntimeConfig(DEFAULT_ENVIRONMENT_RUNTIME_CONFIG,userId)
}

export async function restoreEnvironmentDefaults(userId:string){
  await ensureEnvironmentOrganizerSchema()
  for(const surface of WEAVE_ENVIRONMENT_REGISTRY){
    await sql`
      UPDATE weave_environment_surfaces
      SET
        is_visible=true,
        sort_order=${surface.defaultOrder},
        updated_by=${userId}::uuid,
        updated_at=NOW()
      WHERE surface_key=${surface.key}
    `
  }
  return getEnvironmentOrganizerState()
}

export type { EnvironmentRuntimeConfig }
