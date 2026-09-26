import { neon } from '@/lib/pg-neon'
import { ensureEnterpriseDreamSchema } from '@/lib/enterprise-dream'

export const getClientGrowthDb=()=>neon(process.env.DATABASE_URL!)

export type ClientGrowthSnapshot={
  vitality:{
    score:number
    orders30d:number
    completedOperations30d:number
    routeMovements30d:number
    streamPrograms30d:number
    activeLegions:number
    explanation:string
  }
  capabilities:{
    routeCapacity:number
    legionCapacity:number
    streamProgramCapacity:number
    aiFlameNodes:number
    automationNodes:number
    verificationLabs:number
    audienceCapacity:number
  }
  streaming:{
    channel:any|null
    programs:any[]
    gateOpen:boolean
    studioOpen:boolean
    mediaNetworkOpen:boolean
    publicUrl:string|null
  }
  enterprise:{
    approved:boolean
    doorOpen:boolean
    hallOpen:boolean
    operationsOpen:boolean
    treasuryOpen:boolean
    distributionOpen:boolean
    publicSlug:string|null
    publicUrl:string|null
    application:any|null
  }
  routes:any[]
}

export function publicGrowthSlug(fileNumber:string){
  return fileNumber.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'')
}

export async function ensureClientGrowthWorldSchema(sql:any=getClientGrowthDb()){
  await sql`
    CREATE TABLE IF NOT EXISTS client_stream_channels (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id uuid UNIQUE NOT NULL,
      file_number varchar(120) UNIQUE NOT NULL,
      public_slug varchar(160) UNIQUE NOT NULL,
      name varchar(255) NOT NULL,
      description text,
      tagline varchar(255),
      enabled boolean NOT NULL DEFAULT true,
      is_live boolean NOT NULL DEFAULT false,
      live_title varchar(255),
      live_source_url text,
      live_started_at timestamptz,
      environment_config jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_at timestamptz NOT NULL DEFAULT NOW(),
      updated_at timestamptz NOT NULL DEFAULT NOW()
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS client_stream_programs (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      channel_id uuid NOT NULL,
      client_id uuid NOT NULL,
      title varchar(255) NOT NULL,
      description text,
      program_type varchar(40) NOT NULL DEFAULT 'program',
      media_url text,
      scheduled_at timestamptz,
      status varchar(32) NOT NULL DEFAULT 'scheduled',
      duration_minutes integer,
      created_at timestamptz NOT NULL DEFAULT NOW(),
      updated_at timestamptz NOT NULL DEFAULT NOW()
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS idx_client_stream_programs_channel ON client_stream_programs(channel_id,created_at DESC)`

  await sql`
    CREATE TABLE IF NOT EXISTS client_business_routes (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id uuid NOT NULL,
      file_number varchar(120) NOT NULL,
      name varchar(255) NOT NULL,
      source_system_id uuid NOT NULL,
      target_system_id uuid NOT NULL,
      route_type varchar(60) NOT NULL DEFAULT 'business',
      status varchar(32) NOT NULL DEFAULT 'active',
      created_at timestamptz NOT NULL DEFAULT NOW(),
      updated_at timestamptz NOT NULL DEFAULT NOW(),
      CONSTRAINT client_business_routes_distinct_systems CHECK (source_system_id <> target_system_id)
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS idx_client_business_routes_client ON client_business_routes(client_id,status,created_at DESC)`
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_client_business_routes_unique_pair
    ON client_business_routes(client_id,source_system_id,target_system_id)
    WHERE status='active'
  `

  await sql`
    CREATE TABLE IF NOT EXISTS client_business_route_movements (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      route_id uuid NOT NULL,
      client_id uuid NOT NULL,
      title varchar(255) NOT NULL,
      movement_value numeric(30,8),
      movement_unit varchar(40),
      note text,
      created_at timestamptz NOT NULL DEFAULT NOW()
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS idx_client_business_route_movements_route ON client_business_route_movements(route_id,created_at DESC)`
}

export async function ensureClientStreamChannel(
  sql:any,
  clientId:string,
  fileNumber:string,
  name:string,
){
  await ensureClientGrowthWorldSchema(sql)
  const slug=publicGrowthSlug(fileNumber)
  const [channel]=await sql`
    INSERT INTO client_stream_channels (client_id,file_number,public_slug,name,tagline)
    VALUES (
      ${clientId}::uuid,
      ${fileNumber},
      ${slug},
      ${name||'Client Broadcast'},
      'A Client-built broadcast environment in the WEAVE Stream Network.'
    )
    ON CONFLICT (client_id) DO UPDATE SET
      file_number=EXCLUDED.file_number,
      public_slug=EXCLUDED.public_slug,
      name=CASE
        WHEN client_stream_channels.name IS NULL OR client_stream_channels.name='' THEN EXCLUDED.name
        ELSE client_stream_channels.name
      END,
      updated_at=NOW()
    RETURNING *
  `
  return channel
}

export async function getInstalledCapabilityTotals(sql:any,clientId:string){
  const [row]=await sql`
    SELECT
      COALESCE(SUM(CASE WHEN p.effect_type='route_capacity' THEN p.effect_value ELSE 0 END),0)::float AS route_capacity,
      COALESCE(SUM(CASE WHEN p.effect_type='legion_capacity' THEN p.effect_value ELSE 0 END),0)::float AS legion_capacity,
      COALESCE(SUM(CASE WHEN p.effect_type='stream_capacity' THEN p.effect_value ELSE 0 END),0)::float AS stream_capacity,
      COALESCE(SUM(CASE WHEN p.effect_type='audience_capacity' THEN p.effect_value ELSE 0 END),0)::float AS audience_capacity,
      COALESCE(SUM(CASE WHEN p.effect_type='ai_node' THEN p.quantity ELSE 0 END),0)::int AS ai_nodes,
      COALESCE(SUM(CASE WHEN p.effect_type='automation' THEN p.quantity ELSE 0 END),0)::int AS automation_nodes,
      COALESCE(SUM(CASE WHEN p.effect_type='verification' THEN p.quantity ELSE 0 END),0)::int AS verification_labs
    FROM client_file_folder_build_parts p
    JOIN client_file_folder_builds b ON b.id=p.build_id
    WHERE p.client_id=${clientId}::uuid
      AND b.status='complete'
  `
  return {
    routeCapacityBonus:Math.max(0,Number(row?.route_capacity||0)),
    legionCapacityBonus:Math.max(0,Number(row?.legion_capacity||0)),
    streamCapacityBonus:Math.max(0,Number(row?.stream_capacity||0)),
    audienceCapacity:Math.max(0,Number(row?.audience_capacity||0)),
    aiFlameNodes:Math.max(0,Number(row?.ai_nodes||0)),
    automationNodes:Math.max(0,Number(row?.automation_nodes||0)),
    verificationLabs:Math.max(0,Number(row?.verification_labs||0)),
  }
}

async function hasSystem(sql:any,clientId:string,type:string){
  const [row]=await sql`
    SELECT id FROM client_built_systems
    WHERE client_id=${clientId}::uuid
      AND system_type=${type}
      AND status='active'
    LIMIT 1
  `
  return Boolean(row)
}

export async function getClientGrowthSnapshot(
  sql:any,
  clientId:string,
  fileNumber:string,
  clientName='Client',
):Promise<ClientGrowthSnapshot>{
  await ensureClientGrowthWorldSchema(sql)
  await ensureEnterpriseDreamSchema(sql)
  const channel=await ensureClientStreamChannel(sql,clientId,fileNumber,`${clientName} Stream`)

  const [
    creatorBooth,
    broadcastStudio,
    streamingGate,
    mediaNetwork,
    routeStation,
    legionQuarters,
    enterpriseDoor,
    enterpriseHall,
    operationsCommand,
    enterpriseTreasury,
    distributionNetwork,
  ]=await Promise.all([
    hasSystem(sql,clientId,'creator_booth'),
    hasSystem(sql,clientId,'broadcast_studio'),
    hasSystem(sql,clientId,'streaming_gate'),
    hasSystem(sql,clientId,'media_network'),
    hasSystem(sql,clientId,'route_station'),
    hasSystem(sql,clientId,'legion_quarters'),
    hasSystem(sql,clientId,'enterprise_door'),
    hasSystem(sql,clientId,'enterprise_hall'),
    hasSystem(sql,clientId,'operations_command'),
    hasSystem(sql,clientId,'enterprise_treasury'),
    hasSystem(sql,clientId,'distribution_network'),
  ])

  const capabilitiesRaw=await getInstalledCapabilityTotals(sql,clientId)
  const capabilities={
    routeCapacity:routeStation?Math.max(1,1+Math.floor(capabilitiesRaw.routeCapacityBonus)):0,
    legionCapacity:legionQuarters?Math.max(3,3+Math.floor(capabilitiesRaw.legionCapacityBonus)):0,
    streamProgramCapacity:broadcastStudio?Math.max(3,3+Math.floor(capabilitiesRaw.streamCapacityBonus)):0,
    aiFlameNodes:capabilitiesRaw.aiFlameNodes,
    automationNodes:capabilitiesRaw.automationNodes,
    verificationLabs:capabilitiesRaw.verificationLabs,
    audienceCapacity:streamingGate?Math.max(100,100+Math.floor(capabilitiesRaw.audienceCapacity)):0,
  }

  const programs=await sql`
    SELECT id,title,description,program_type,media_url,scheduled_at,status,duration_minutes,created_at
    FROM client_stream_programs
    WHERE channel_id=${channel.id}::uuid
    ORDER BY COALESCE(scheduled_at,created_at) DESC
    LIMIT 60
  `

  const routes=await sql`
    SELECT
      r.id,r.name,r.route_type,r.status,r.created_at,
      source.id AS source_system_id,source.title AS source_title,source.system_type AS source_type,
      target.id AS target_system_id,target.title AS target_title,target.system_type AS target_type,
      COALESCE(m.movement_count,0)::int AS movement_count,
      m.last_movement_at
    FROM client_business_routes r
    JOIN client_built_systems source ON source.id=r.source_system_id
    JOIN client_built_systems target ON target.id=r.target_system_id
    LEFT JOIN LATERAL (
      SELECT COUNT(*)::int AS movement_count,MAX(created_at) AS last_movement_at
      FROM client_business_route_movements movement
      WHERE movement.route_id=r.id
    ) m ON true
    WHERE r.client_id=${clientId}::uuid
      AND r.status='active'
    ORDER BY r.created_at DESC
  `

  const [enterpriseApplication]=await sql`
    SELECT id,requested_position,enterprise_name,sector,status,public_slug
    FROM enterprise_applications
    WHERE client_id=${clientId}::uuid
    LIMIT 1
  `
  const enterpriseApproved=enterpriseApplication?.status==='approved'
  const enterpriseSlug=enterpriseApproved
    ? String(enterpriseApplication.public_slug||publicGrowthSlug(fileNumber))
    : null

  const [activity]=await sql`
    SELECT
      COALESCE((
        SELECT COUNT(*) FROM client_store_orders o
        JOIN client_business_stores s ON s.id=o.store_id
        WHERE s.client_id=${clientId}::uuid
          AND o.created_at>=NOW()-INTERVAL '30 days'
      ),0)::int AS orders_30d,
      COALESCE((
        SELECT COUNT(*) FROM client_built_system_entries e
        WHERE e.client_id=${clientId}::uuid
          AND e.status='done'
          AND e.updated_at>=NOW()-INTERVAL '30 days'
      ),0)::int AS completed_operations_30d,
      COALESCE((
        SELECT COUNT(*) FROM client_business_route_movements m
        WHERE m.client_id=${clientId}::uuid
          AND m.created_at>=NOW()-INTERVAL '30 days'
      ),0)::int AS route_movements_30d,
      COALESCE((
        SELECT COUNT(*) FROM client_stream_programs p
        WHERE p.client_id=${clientId}::uuid
          AND p.created_at>=NOW()-INTERVAL '30 days'
          AND p.status IN ('scheduled','live','replay')
      ),0)::int AS stream_programs_30d,
      COALESCE((
        SELECT COUNT(*) FROM enterprise_legions l
        WHERE l.client_id=${clientId}::uuid
          AND l.active=true
      ),0)::int AS active_legions
  `

  const orders30d=Number(activity?.orders_30d||0)
  const completedOperations30d=Number(activity?.completed_operations_30d||0)
  const routeMovements30d=Number(activity?.route_movements_30d||0)
  const streamPrograms30d=Number(activity?.stream_programs_30d||0)
  const activeLegions=Number(activity?.active_legions||0)
  const score=Math.min(100,
    orders30d*8+
    completedOperations30d*2+
    routeMovements30d*3+
    streamPrograms30d*4+
    activeLegions*2
  )

  return {
    vitality:{
      score,
      orders30d,
      completedOperations30d,
      routeMovements30d,
      streamPrograms30d,
      activeLegions,
      explanation:'30-day operational index: customer orders ×8, completed system movements ×2, business-route movements ×3, stream programs ×4 and active Legion participation ×2. Flame Coin purchases do not directly increase this score.',
    },
    capabilities,
    streaming:{
      channel,
      programs,
      gateOpen:streamingGate,
      studioOpen:creatorBooth&&broadcastStudio,
      mediaNetworkOpen:mediaNetwork,
      publicUrl:streamingGate?`/stream/${channel.public_slug}`:null,
    },
    enterprise:{
      approved:enterpriseApproved,
      doorOpen:enterpriseApproved&&enterpriseDoor,
      hallOpen:enterpriseApproved&&enterpriseHall,
      operationsOpen:enterpriseApproved&&operationsCommand,
      treasuryOpen:enterpriseApproved&&enterpriseTreasury,
      distributionOpen:enterpriseApproved&&distributionNetwork,
      publicSlug:enterpriseSlug,
      publicUrl:enterpriseApproved&&enterpriseDoor&&enterpriseSlug?`/enterprise/${enterpriseSlug}`:null,
      application:enterpriseApplication||null,
    },
    routes:routeStation?routes:[],
  }
}
