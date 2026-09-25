import { ensureClientBusinessStore, ensureClientBusinessStoreSchema } from '@/lib/client-business-store'
import { effectiveBuildMinutes, getClientBuildEconomy, type ClientBuildEconomy } from '@/lib/client-build-economy'

export type FileFolderWorldSnapshot = {
  blueprints: any[]
  items: any[]
  inventory: any[]
  builds: any[]
  systems: any[]
  library: any[]
  customerDoor: any | null
  buildFunding: ClientBuildEconomy
  guarantee: {
    hasActiveBuild: boolean
    hasReadyBlueprint: boolean
  }
}

export async function ensureFileFolderWorldSchema(sql: any) {
  await sql`
    CREATE TABLE IF NOT EXISTS weave_file_folder_items (
      item_key varchar(80) PRIMARY KEY,
      name varchar(160) NOT NULL,
      category varchar(80) NOT NULL,
      description text,
      price_flame_coin numeric(30,8) NOT NULL DEFAULT 0,
      published boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT NOW(),
      updated_at timestamptz NOT NULL DEFAULT NOW()
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS weave_file_folder_blueprints (
      blueprint_key varchar(80) PRIMARY KEY,
      name varchar(180) NOT NULL,
      district varchar(80) NOT NULL DEFAULT 'formation_yard',
      system_type varchar(80) NOT NULL,
      description text NOT NULL,
      build_hours integer NOT NULL DEFAULT 1,
      required_item_key varchar(80),
      required_item_quantity integer NOT NULL DEFAULT 0,
      published boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT NOW(),
      updated_at timestamptz NOT NULL DEFAULT NOW()
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS client_file_folder_inventory (
      client_id uuid NOT NULL,
      file_number varchar(120) NOT NULL,
      item_key varchar(80) NOT NULL,
      quantity integer NOT NULL DEFAULT 0,
      updated_at timestamptz NOT NULL DEFAULT NOW(),
      PRIMARY KEY (client_id, item_key)
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS client_file_folder_item_orders (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id uuid NOT NULL,
      file_number varchar(120) NOT NULL,
      item_key varchar(80) NOT NULL,
      quantity integer NOT NULL,
      unit_price_flame_coin numeric(30,8) NOT NULL,
      total_price_flame_coin numeric(30,8) NOT NULL,
      wallet_balance_after numeric(30,8) NOT NULL,
      status varchar(32) NOT NULL DEFAULT 'completed',
      created_at timestamptz NOT NULL DEFAULT NOW()
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS client_file_folder_builds (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id uuid NOT NULL,
      file_number varchar(120) NOT NULL,
      blueprint_key varchar(80) NOT NULL,
      title varchar(220) NOT NULL,
      purpose text,
      system_type varchar(80) NOT NULL,
      status varchar(32) NOT NULL DEFAULT 'building',
      duration_hours integer NOT NULL,
      base_duration_minutes integer,
      duration_minutes integer,
      speed_multiplier numeric(10,4) NOT NULL DEFAULT 1,
      started_at timestamptz NOT NULL DEFAULT NOW(),
      completes_at timestamptz NOT NULL,
      completed_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT NOW(),
      updated_at timestamptz NOT NULL DEFAULT NOW()
    )
  `

  await sql`ALTER TABLE client_file_folder_builds ADD COLUMN IF NOT EXISTS base_duration_minutes integer`
  await sql`ALTER TABLE client_file_folder_builds ADD COLUMN IF NOT EXISTS duration_minutes integer`
  await sql`ALTER TABLE client_file_folder_builds ADD COLUMN IF NOT EXISTS speed_multiplier numeric(10,4) NOT NULL DEFAULT 1`
  await sql`
    UPDATE client_file_folder_builds
    SET
      base_duration_minutes=COALESCE(base_duration_minutes,duration_hours*60),
      duration_minutes=COALESCE(duration_minutes,duration_hours*60),
      speed_multiplier=COALESCE(speed_multiplier,1)
    WHERE base_duration_minutes IS NULL OR duration_minutes IS NULL
  `
  await sql`
    CREATE INDEX IF NOT EXISTS idx_client_file_folder_builds_client_time
    ON client_file_folder_builds(client_id, created_at DESC)
  `

  await sql`
    CREATE TABLE IF NOT EXISTS client_built_systems (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      build_id uuid UNIQUE NOT NULL,
      client_id uuid NOT NULL,
      file_number varchar(120) NOT NULL,
      system_type varchar(80) NOT NULL,
      title varchar(220) NOT NULL,
      configuration jsonb NOT NULL DEFAULT '{}'::jsonb,
      status varchar(32) NOT NULL DEFAULT 'active',
      activated_at timestamptz NOT NULL DEFAULT NOW(),
      updated_at timestamptz NOT NULL DEFAULT NOW()
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS client_built_system_entries (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      system_id uuid NOT NULL,
      client_id uuid NOT NULL,
      entry_type varchar(80) NOT NULL DEFAULT 'record',
      title varchar(220) NOT NULL,
      body text,
      status varchar(40) NOT NULL DEFAULT 'open',
      metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_at timestamptz NOT NULL DEFAULT NOW(),
      updated_at timestamptz NOT NULL DEFAULT NOW()
    )
  `

  await sql`
    CREATE INDEX IF NOT EXISTS idx_client_built_system_entries_system
    ON client_built_system_entries(system_id, created_at DESC)
  `

  await sql`
    CREATE TABLE IF NOT EXISTS client_library_catalog (
      entry_key varchar(80) PRIMARY KEY,
      title varchar(220) NOT NULL,
      summary text NOT NULL,
      lesson text NOT NULL,
      movement varchar(220),
      sort_order integer NOT NULL DEFAULT 0,
      published boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT NOW(),
      updated_at timestamptz NOT NULL DEFAULT NOW()
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS client_library_progress (
      client_id uuid NOT NULL,
      entry_key varchar(80) NOT NULL,
      status varchar(32) NOT NULL DEFAULT 'available',
      started_at timestamptz,
      completed_at timestamptz,
      updated_at timestamptz NOT NULL DEFAULT NOW(),
      PRIMARY KEY (client_id, entry_key)
    )
  `

  await seedFileFolderWorld(sql)
}

async function seedFileFolderWorld(sql: any) {
  const items = [
    ['planning_kit', 'Planning Kit', 'formation', 'Turns a chosen direction into a structured build queue.', 5],
    ['research_kit', 'Research Kit', 'library', 'Adds a research pack to a Client build before formation begins.', 6],
    ['automation_kit', 'Automation Kit', 'technology', 'Provides the automation component required by workflow builds.', 10],
    ['launch_kit', 'Launch Kit', 'business', 'Provides the launch component for a public customer-facing system.', 12],
    ['data_kit', 'Data Kit', 'technology', 'Provides the structured data component for a persistent information system.', 10],
    ['architecture_kit', 'Architecture Kit', 'formation', 'Carries a larger multi-function system through longer formation.', 15],
    ['integration_kit', 'Integration Kit', 'technology', 'Carries connections between several persistent WEAVE systems.', 20],
    ['crypto_exchange_kit', 'Crypto Exchange Workshop Kit', 'technology', 'Core components for a Client-owned crypto exchange workshop: market records, buy/sell movement, holdings and order flow.', 480],
    ['ai_flame_kit', 'AI Flame Service Kit', 'technology', 'Adds an AI-assisted service desk that can receive questions, organize requests and preserve support movement.', 320],
    ['commerce_kit', 'Commerce Storefront Kit', 'business', 'Build components for a Client storefront, offers, order intake and customer movement.', 220],
    ['payments_kit', 'Payments Gateway Kit', 'technology', 'Build components for payment instructions, settlement records and international payment workflow.', 390],
    ['campaign_kit', 'Campaign System Kit', 'business', 'Build components for structured campaigns, audience movement, response records and follow-up.', 180],
    ['learning_lab_kit', 'Learning Lab Kit', 'library', 'Build components for lessons, progress, exercises and a persistent learning environment.', 150],
    ['operations_suite_kit', 'Operations Suite Kit', 'formation', 'A larger working kit for teams, tasks, approvals, records and recurring operating movement.', 650],
    ['mobile_app_kit', 'Mobile Service App Kit', 'technology', 'Components for a Client-facing mobile service experience with account, request and notification movement.', 900],
    ['intelligence_lab_kit', 'Intelligence Lab Kit', 'technology', 'Components for structured AI-assisted research, analysis, records and reusable intelligence.', 780],
    ['market_network_kit', 'Marketplace Network Kit', 'business', 'Components for multi-offer marketplace movement, sellers, buyers, orders and records.', 1200],
    ['enterprise_core_kit', 'Enterprise Core Kit', 'formation', 'High-capacity components for a long-form enterprise operating system with multiple functions and participants.', 1800],
  ]

  for (const item of items) {
    await sql`
      INSERT INTO weave_file_folder_items (
        item_key, name, category, description, price_flame_coin, published
      )
      VALUES (
        ${item[0]}, ${item[1]}, ${item[2]}, ${item[3]}, ${item[4]}, true
      )
      ON CONFLICT (item_key) DO NOTHING
    `
  }

  const blueprints = [
    ['operations_board', 'Operations Board', 'formation_yard', 'operations_board', 'A persistent working board for tasks, decisions and movement inside the Client File Folder.', 4, 'planning_kit', 1],
    ['research_room', 'Research Room', 'library_district', 'research_room', 'A persistent research system for findings, sources, questions and decisions.', 6, 'research_kit', 1],
    ['service_workflow', 'Service Workflow', 'formation_yard', 'service_workflow', 'A working service pipeline that can hold steps, responsibilities and completion records.', 8, 'automation_kit', 1],
    ['customer_door', 'Customer Door', 'market_district', 'customer_door', 'A public customer-facing system where people outside WEAVE can discover, request and purchase the Client’s products or services.', 6, null, 0],
    ['data_room', 'Data Room', 'technology_district', 'data_room', 'A structured system for persistent records and reusable information.', 10, 'data_kit', 1],
    ['enterprise_shell', 'Enterprise System Shell', 'formation_yard', 'enterprise_shell', 'A larger multi-function system shell that can hold operations, people, records and later enterprise modules.', 24, 'architecture_kit', 1],
    ['integration_network', 'Integration Network', 'technology_district', 'integration_network', 'A long-form build that organizes connections between several persistent WEAVE systems.', 48, 'integration_kit', 1],
    ['crypto_exchange_workshop', 'Crypto Exchange Workshop', 'technology_district', 'crypto_exchange_workshop', 'A Client-owned workshop inspired by the CJ Dorado build: market movement, buy/sell records, holdings, orders, business operation and technology formation.', 72, 'crypto_exchange_kit', 1],
    ['ai_service_desk', 'AI Flame Service Desk', 'technology_district', 'ai_service_desk', 'A service system where AI assists the Client with intake, support movement, responses and persistent records.', 36, 'ai_flame_kit', 1],
    ['commerce_storefront', 'Commerce Storefront', 'market_district', 'commerce_storefront', 'A customer-facing commerce system for offers, orders, patronage and fulfillment movement.', 24, 'commerce_kit', 1],
    ['payments_gateway', 'Payments Gateway Workshop', 'technology_district', 'payments_gateway', 'A payment-operation workshop for instructions, settlement records and international payment movement.', 48, 'payments_kit', 1],
    ['campaign_system', 'Campaign System', 'market_district', 'campaign_system', 'A persistent campaign environment for audience, messages, responses, follow-up and conversion records.', 20, 'campaign_kit', 1],
    ['learning_lab', 'Learning Lab', 'library_district', 'learning_lab', 'A Client-owned learning environment with lessons, progress, exercises and participation records.', 16, 'learning_lab_kit', 1],
    ['operations_suite', 'Operations Suite', 'formation_yard', 'operations_suite', 'A larger operating system for teams, tasks, approvals, recurring work and institutional records.', 60, 'operations_suite_kit', 1],
    ['mobile_service_app', 'Mobile Service App', 'technology_district', 'mobile_service_app', 'A Client-facing mobile service system for account access, requests, notifications and continuing customer interaction.', 72, 'mobile_app_kit', 1],
    ['intelligence_lab', 'Intelligence Lab', 'library_district', 'intelligence_lab', 'A persistent AI-assisted research and analysis system that turns findings into reusable Client intelligence.', 96, 'intelligence_lab_kit', 1],
    ['marketplace_network', 'Marketplace Network', 'market_district', 'marketplace_network', 'A multi-offer marketplace system with seller, buyer, order and movement records.', 120, 'market_network_kit', 1],
    ['enterprise_operating_system', 'Enterprise Operating System', 'formation_yard', 'enterprise_operating_system', 'A long-form operating system for multiple functions, participants, records, approvals and enterprise movement.', 168, 'enterprise_core_kit', 1],
  ]

  for (const blueprint of blueprints) {
    await sql`
      INSERT INTO weave_file_folder_blueprints (
        blueprint_key, name, district, system_type, description, build_hours,
        required_item_key, required_item_quantity, published
      )
      VALUES (
        ${blueprint[0]}, ${blueprint[1]}, ${blueprint[2]}, ${blueprint[3]},
        ${blueprint[4]}, ${blueprint[5]}, ${blueprint[6]}, ${blueprint[7]}, true
      )
      ON CONFLICT (blueprint_key) DO NOTHING
    `
  }

  const library = [
    ['movement_to_blueprint', 'Movement → Blueprint', 'Learn how an interaction becomes a buildable system instead of remaining an idea.', 'Notice the movement, name the result it should create, identify the functions required, then choose or form a blueprint that can carry those functions.', 'Choose one Client movement and turn it into a blueprint.', 10],
    ['formation_logic', 'Formation Logic', 'Learn to break one desired outcome into functions that can be built and operated.', 'Formation separates the desired outcome from the functions required to produce it. A build becomes clearer when every function has an input, action, output and owner.', 'Open the Formation Yard and inspect the parts of a build.', 20],
    ['systems_in_motion', 'Systems in Motion', 'Learn why a finished build must continue producing movement after construction.', 'A system is not finished because its screen exists. It becomes useful when people can repeatedly enter, act, record what happened and produce an output.', 'Complete or inspect an Active System.', 30],
    ['value_and_release', 'Value & Release', 'Learn how a built system becomes usable value rather than a private draft.', 'Release means the system has a real user, a real function, a place to receive input and a visible output. Test movement comes before wider scale.', 'Identify the first real user and first real action for a build.', 40],
  ]

  for (const entry of library) {
    await sql`
      INSERT INTO client_library_catalog (
        entry_key, title, summary, lesson, movement, sort_order, published
      )
      VALUES (
        ${entry[0]}, ${entry[1]}, ${entry[2]}, ${entry[3]}, ${entry[4]}, ${entry[5]}, true
      )
      ON CONFLICT (entry_key) DO NOTHING
    `
  }
}

export async function ensureCustomerDoorFormation(
  sql: any,
  clientId: string,
  fileNumber: string,
  economy: ClientBuildEconomy,
) {
  const [existing] = await sql`
    SELECT id,status
    FROM client_file_folder_builds
    WHERE client_id=${clientId}::uuid
      AND file_number=${fileNumber}
      AND blueprint_key='customer_door'
    ORDER BY created_at DESC
    LIMIT 1
  `

  const [activeSystem] = await sql`
    SELECT id
    FROM client_built_systems
    WHERE client_id=${clientId}::uuid
      AND file_number=${fileNumber}
      AND system_type='customer_door'
      AND status='active'
    LIMIT 1
  `

  if (!existing && !activeSystem) {
    const { baseMinutes, effectiveMinutes } = effectiveBuildMinutes(
      6,
      economy.buildSpeedMultiplier,
    )

    await sql`
      INSERT INTO client_file_folder_builds (
        client_id,file_number,blueprint_key,title,purpose,
        system_type,status,duration_hours,base_duration_minutes,
        duration_minutes,speed_multiplier,started_at,completes_at
      )
      VALUES (
        ${clientId}::uuid,
        ${fileNumber},
        'customer_door',
        'Customer Door',
        'Open a public door so customers outside WEAVE can patronize this Client while the Client continues learning, building and participating.',
        'customer_door',
        'building',
        6,
        ${baseMinutes},
        ${effectiveMinutes},
        ${economy.buildSpeedMultiplier},
        NOW(),
        NOW() + make_interval(mins => ${effectiveMinutes})
      )
    `
  }
}

export async function applyBuildPowerAcceleration(
  sql: any,
  clientId: string,
  economy: ClientBuildEconomy,
) {
  await sql`
    UPDATE client_file_folder_builds
    SET
      speed_multiplier=${economy.buildSpeedMultiplier},
      duration_minutes=GREATEST(
        15,
        CEIL(
          COALESCE(base_duration_minutes,duration_hours*60)::numeric /
          ${economy.buildSpeedMultiplier}
        )::integer
      ),
      completes_at=started_at + make_interval(
        mins => GREATEST(
          15,
          CEIL(
            COALESCE(base_duration_minutes,duration_hours*60)::numeric /
            ${economy.buildSpeedMultiplier}
          )::integer
        )
      ),
      updated_at=NOW()
    WHERE client_id=${clientId}::uuid
      AND status IN ('building','funding_gate')
      AND COALESCE(speed_multiplier,1) < ${economy.buildSpeedMultiplier}
  `
}

export async function finalizeReadyBuilds(
  sql: any,
  clientId: string,
  economy: ClientBuildEconomy,
) {
  const ready = await sql`
    SELECT
      id,client_id,file_number,system_type,title,blueprint_key,status,completes_at
    FROM client_file_folder_builds
    WHERE client_id=${clientId}::uuid
      AND (
        (status='building' AND completes_at <= NOW())
        OR
        (status='funding_gate' AND system_type='customer_door' AND ${economy.publicDoorUnlocked})
      )
    ORDER BY created_at ASC
  `

  for (const build of ready) {
    if (build.system_type === 'customer_door' && !economy.publicDoorUnlocked) {
      await sql`
        UPDATE client_file_folder_builds
        SET status='funding_gate',updated_at=NOW()
        WHERE id=${build.id}::uuid
      `
      await sql`
        UPDATE client_business_stores
        SET formation_status='funding_gate',updated_at=NOW()
        WHERE client_id=${build.client_id}::uuid
          AND file_number=${build.file_number}
      `
      continue
    }

    await sql`
      UPDATE client_file_folder_builds
      SET
        status='complete',
        completed_at=COALESCE(completed_at,NOW()),
        updated_at=NOW()
      WHERE id=${build.id}::uuid
    `

    await sql`
      INSERT INTO client_built_systems (
        build_id, client_id, file_number, system_type, title, configuration
      )
      VALUES (
        ${build.id}::uuid,
        ${build.client_id}::uuid,
        ${build.file_number},
        ${build.system_type},
        ${build.title},
        ${JSON.stringify({ blueprintKey: build.blueprint_key, district: 'main_file_folder' })}::jsonb
      )
      ON CONFLICT (build_id) DO NOTHING
    `

    if (build.system_type === 'customer_door') {
      await sql`
        UPDATE client_business_stores
        SET
          formation_status=CASE
            WHEN first_offer_published_at IS NOT NULL THEN 'selling'
            ELSE 'ready_for_offer'
          END,
          public_opened_at=COALESCE(public_opened_at,NOW()),
          updated_at=NOW()
        WHERE client_id=${build.client_id}::uuid
          AND file_number=${build.file_number}
      `
    }
  }
}

export async function ensureClientLibraryProgress(sql: any, clientId: string) {
  await sql`
    INSERT INTO client_library_progress (client_id, entry_key, status)
    SELECT ${clientId}::uuid, entry_key, 'available'
    FROM client_library_catalog
    WHERE published=true
    ON CONFLICT (client_id, entry_key) DO NOTHING
  `
}

export async function getFileFolderWorldSnapshot(
  sql: any,
  clientId: string,
  fileNumber: string,
): Promise<FileFolderWorldSnapshot> {
  await ensureFileFolderWorldSchema(sql)
  await ensureClientBusinessStoreSchema(sql)

  const [clientIdentity] = await sql`
    SELECT u.name,u.business_name,w.workshop_type
    FROM users u
    LEFT JOIN client_system_workshops w ON w.client_id=u.id
    WHERE u.id=${clientId}::uuid
    LIMIT 1
  `
  await ensureClientBusinessStore(
    sql,
    clientId,
    fileNumber,
    clientIdentity?.business_name || clientIdentity?.name || 'Client Business',
    clientIdentity?.workshop_type === 'crypto_exchange',
  )

  const buildFunding = await getClientBuildEconomy(sql, clientId, fileNumber)
  await ensureClientLibraryProgress(sql, clientId)
  await ensureCustomerDoorFormation(sql, clientId, fileNumber, buildFunding)
  await applyBuildPowerAcceleration(sql, clientId, buildFunding)
  await finalizeReadyBuilds(sql, clientId, buildFunding)

  const blueprints = await sql`
    SELECT
      b.*,
      COALESCE(i.name,'') AS required_item_name
    FROM weave_file_folder_blueprints b
    LEFT JOIN weave_file_folder_items i ON i.item_key=b.required_item_key
    WHERE b.published=true
    ORDER BY b.build_hours ASC, b.name ASC
  `

  const items = await sql`
    SELECT *
    FROM weave_file_folder_items
    WHERE published=true
    ORDER BY category, price_flame_coin, name
  `

  const inventory = await sql`
    SELECT
      inv.item_key,
      inv.quantity,
      i.name,
      i.category
    FROM client_file_folder_inventory inv
    JOIN weave_file_folder_items i ON i.item_key=inv.item_key
    WHERE inv.client_id=${clientId}::uuid
    ORDER BY i.category, i.name
  `

  const builds = await sql`
    SELECT
      id,
      blueprint_key,
      title,
      purpose,
      system_type,
      status,
      duration_hours,
      base_duration_minutes,
      duration_minutes,
      speed_multiplier,
      started_at,
      completes_at,
      completed_at,
      GREATEST(
        0,
        EXTRACT(EPOCH FROM (completes_at - NOW()))::bigint
      ) AS remaining_seconds
    FROM client_file_folder_builds
    WHERE client_id=${clientId}::uuid
      AND file_number=${fileNumber}
    ORDER BY created_at DESC
    LIMIT 100
  `

  const systems = await sql`
    SELECT
      s.id,
      s.build_id,
      s.system_type,
      s.title,
      s.configuration,
      s.status,
      s.activated_at,
      COALESCE(
        json_agg(
          json_build_object(
            'id',e.id,
            'entry_type',e.entry_type,
            'title',e.title,
            'body',e.body,
            'status',e.status,
            'metadata',e.metadata,
            'created_at',e.created_at
          )
          ORDER BY e.created_at DESC
        ) FILTER (WHERE e.id IS NOT NULL),
        '[]'::json
      ) AS entries
    FROM client_built_systems s
    LEFT JOIN client_built_system_entries e ON e.system_id=s.id
    WHERE s.client_id=${clientId}::uuid
      AND s.file_number=${fileNumber}
    GROUP BY s.id
    ORDER BY s.activated_at DESC
  `

  const [customerDoor] = await sql`
    SELECT
      id,
      public_slug,
      name,
      description,
      enabled,
      formation_status,
      formation_due_at,
      public_opened_at,
      first_offer_published_at,
      customer_wallet_required,
      EXTRACT(EPOCH FROM (formation_due_at - NOW()))::bigint AS formation_due_seconds,
      (SELECT COUNT(*)::int FROM client_store_items i WHERE i.store_id=client_business_stores.id AND i.enabled=true) AS active_offer_count,
      (SELECT COUNT(*)::int FROM client_store_orders o WHERE o.store_id=client_business_stores.id) AS order_count
    FROM client_business_stores
    WHERE client_id=${clientId}::uuid
      AND file_number=${fileNumber}
    LIMIT 1
  `

  const library = await sql`
    SELECT
      c.entry_key,
      c.title,
      c.summary,
      c.lesson,
      c.movement,
      p.status,
      p.started_at,
      p.completed_at
    FROM client_library_catalog c
    LEFT JOIN client_library_progress p
      ON p.entry_key=c.entry_key
     AND p.client_id=${clientId}::uuid
    WHERE c.published=true
    ORDER BY c.sort_order, c.title
  `

  return {
    blueprints,
    items,
    inventory,
    builds,
    systems,
    library,
    customerDoor: customerDoor || null,
    buildFunding,
    guarantee: {
      hasActiveBuild: builds.some((build: any) => build.status === 'building'),
      hasReadyBlueprint: blueprints.length > 0,
    },
  }
}
