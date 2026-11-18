import { getPool,sql } from '@/lib/db'
import { WEAVE_ENVIRONMENT_REGISTRY } from '@/lib/weave-environment-registry'
import { WEAVE_NATIVE_DEPARTMENTS,validNativeDepartment } from '@/lib/weave-native-blueprint'
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

/**
 * Published Native Formation systems are first-class operating stations.
 * Only the active publication is exposed; archived versions keep their
 * original history and user records but disappear from the active directory.
 * Existing administrator visibility/order choices are never overwritten.
 */
async function synchronizeNativeOrganizerSurfaces(){
  const pool=getPool()
  const exists=await pool.query("SELECT to_regclass('weave_native_module_releases') AS name")
  if(!exists.rows[0]?.name)return [] as string[]
  const published=await pool.query<{
    department:string;slug:string;title:string|null
  }>(`SELECT department,slug,blueprint->>'title' AS title
      FROM weave_native_module_releases WHERE state='published'
      ORDER BY department,published_at ASC,slug ASC`)
  const keys:string[]=[],labels:string[]=[],routes:string[]=[],areas:string[]=[],scopes:string[]=[]
  const ranks:number[]=[]
  const nextByDepartment=new Map<string,number>()
  for(const row of published.rows){
    if(!validNativeDepartment(row.department))continue
    const department=row.department
    const entry=WEAVE_NATIVE_DEPARTMENTS[department]
    const next=(nextByDepartment.get(department)||0)+1
    nextByDepartment.set(department,next)
    keys.push('native-'+department+'-'+row.slug)
    labels.push(row.title?.trim()||row.slug)
    routes.push('/weave-modules/'+department+'/'+row.slug)
    areas.push(entry.label)
    scopes.push(entry.role)
    ranks.push(400+next*10)
  }
  if(!keys.length)return keys
  // One batch with unchanged-row suppression prevents per-user polling from
  // doing one database write per published module every 15 seconds.
  await pool.query(`
    INSERT INTO weave_environment_surfaces(
      surface_key,label,surface_kind,route,area,scope,
      is_visible,sort_order,is_protected
    )
    SELECT entries.surface_key,entries.label,'station',entries.route,
           entries.area,entries.scope,true,entries.rank,false
    FROM unnest(
      $1::text[],$2::text[],$3::text[],$4::text[],$5::text[],$6::integer[]
    ) AS entries(surface_key,label,route,area,scope,rank)
    ON CONFLICT(surface_key) DO UPDATE SET
      label=EXCLUDED.label,surface_kind='station',route=EXCLUDED.route,
      area=EXCLUDED.area,scope=EXCLUDED.scope,is_protected=false
    WHERE weave_environment_surfaces.label IS DISTINCT FROM EXCLUDED.label
      OR weave_environment_surfaces.surface_kind IS DISTINCT FROM 'station'
      OR weave_environment_surfaces.route IS DISTINCT FROM EXCLUDED.route
      OR weave_environment_surfaces.area IS DISTINCT FROM EXCLUDED.area
      OR weave_environment_surfaces.scope IS DISTINCT FROM EXCLUDED.scope
      OR weave_environment_surfaces.is_protected IS DISTINCT FROM false
  `,[keys,labels,routes,areas,scopes,ranks])
  return keys
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
  const nativeKeys=await synchronizeNativeOrganizerSurfaces()
  const [storedItems,runtime]=await Promise.all([
    sql`
      SELECT surface_key,label,surface_kind,route,area,scope,is_visible,sort_order,is_protected,updated_at
      FROM weave_environment_surfaces
      ORDER BY area ASC,sort_order ASC,label ASC
    `,
    getEnvironmentRuntimeProfile(),
  ])
  const activeKeys=new Set([...WEAVE_ENVIRONMENT_REGISTRY.map(surface=>surface.key),...nativeKeys])
  const items=storedItems.filter((item:any)=>activeKeys.has(String(item.surface_key)))
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

/**
 * Mobile-first one-step movement. The older numeric set_order action remains
 * available for compatibility, but it can create ties when gaps are small.
 * A complete ordered group is locked and normalized atomically instead.
 */
export async function moveEnvironmentSurface(
  surfaceKey:string,direction:'earlier'|'later',userId:string,
){
  if(direction!=='earlier'&&direction!=='later')throw new Error('Invalid movement')
  await ensureEnvironmentOrganizerSchema()
  const client=await getPool().connect()
  try{
    await client.query('BEGIN')
    const result=await client.query<{area:string}>(
      'SELECT area FROM weave_environment_surfaces WHERE surface_key=$1',
      [surfaceKey],
    )
    const area=result.rows[0]?.area
    if(!area)throw new Error('Environment surface not found')
    // Serialize changes within the same workplace; other areas stay independent.
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))',
      ['weave-environment-area:'+area])
    const rows=await client.query<{surface_key:string}>(
      `SELECT surface_key FROM weave_environment_surfaces
       WHERE area=$1 ORDER BY sort_order ASC,label ASC,surface_key ASC FOR UPDATE`,
      [area],
    )
    const keys=rows.rows.map(row=>row.surface_key)
    const index=keys.indexOf(surfaceKey)
    const next=index+(direction==='earlier'?-1:1)
    if(index<0)throw new Error('Environment surface not found')
    if(next>=0&&next<keys.length){
      ;[keys[index],keys[next]]=[keys[next],keys[index]]
      const ranks=keys.map((_,i)=>(i+1)*10)
      await client.query(`
        UPDATE weave_environment_surfaces AS surface
        SET sort_order=movement.rank,updated_by=$3::uuid,updated_at=NOW()
        FROM unnest($1::text[],$2::integer[]) AS movement(surface_key,rank)
        WHERE surface.surface_key=movement.surface_key
      `,[keys,ranks,userId])
    }
    await client.query('COMMIT')
  }catch(error){
    await client.query('ROLLBACK')
    throw error
  }finally{
    client.release()
  }
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
  const nativeKeys=await synchronizeNativeOrganizerSurfaces()
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
  for(const [index,key] of nativeKeys.entries()){
    await sql`
      UPDATE weave_environment_surfaces
      SET is_visible=true,sort_order=${400+(index+1)*10},updated_by=${userId}::uuid,updated_at=NOW()
      WHERE surface_key=${key}
    `
  }
  return getEnvironmentOrganizerState()
}

export type { EnvironmentRuntimeConfig }
