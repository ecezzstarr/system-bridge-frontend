import { NextRequest, NextResponse } from 'next/server'
import { issueWeaveReceipt } from '@/lib/weave-receipts'
import { getFileFolderDb, ensureClientFileFolderSchema } from '@/lib/client-file-folder'
import { resolveClientToken } from '@/lib/client-vault'
import { ensureClientMoneyEnvironment } from '@/lib/client-money-environment'
import {
  ensureFileFolderWorldSchema,
  getFileFolderWorldSnapshot,
} from '@/lib/client-file-folder-world'
import { CLIENT_BUILD_SPEED_MAX, effectiveBuildMinutes, getClientBuildEconomy } from '@/lib/client-build-economy'
import { fileFolderMotion } from '@/lib/weave-interaction-motion'
import { recordSystemEvent } from '@/lib/system-events'

function clean(value: unknown, max = 4000) {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

async function resolveClientWorld(request: NextRequest) {
  const sql = getFileFolderDb()
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim() || null
  const clientId = await resolveClientToken(token, sql)
  if (!clientId) return { sql, error: NextResponse.json({ error: 'Client login required' }, { status: 401 }) }

  await ensureClientFileFolderSchema(sql)
  await ensureFileFolderWorldSchema(sql)
  await ensureClientMoneyEnvironment(sql, clientId)

  const [client] = await sql`
    SELECT id,name,file_number
    FROM users
    WHERE id=${clientId}::uuid
      AND role='client'
      AND COALESCE(is_active,true)=true
    LIMIT 1
  `
  if (!client?.file_number) {
    return { sql, error: NextResponse.json({ error: 'Active File Folder required' }, { status: 409 }) }
  }

  const [folder] = await sql`
    SELECT id,file_number,status,workshop_type
    FROM client_file_folders
    WHERE client_id=${client.id}::uuid
      AND file_number=${client.file_number}
      AND status='active'
    LIMIT 1
  `
  if (!folder) {
    return { sql, error: NextResponse.json({ error: 'Main File Folder is not open yet' }, { status: 409 }) }
  }

  return { sql, client, folder, error: null }
}

export async function GET(request: NextRequest) {
  try {
    const ctx = await resolveClientWorld(request)
    if (ctx.error) return ctx.error

    const world = await getFileFolderWorldSnapshot(
      ctx.sql,
      String(ctx.client.id),
      String(ctx.client.file_number),
    )

    return NextResponse.json({
      success: true,
      world,
      motion:fileFolderMotion('snapshot'),
    }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    console.error('[client/file-folder-world GET]', error)
    return NextResponse.json({ error: 'Unable to load Main File Folder world' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await resolveClientWorld(request)
    if (ctx.error) return ctx.error

    const body = await request.json()
    const action = clean(body.action, 80)
    let receipt = null as Awaited<ReturnType<typeof issueWeaveReceipt>> | null

    if (action === 'purchase_item') {
      const itemKey = clean(body.item_key, 80)
      const quantity = Math.max(1, Math.min(25, Number(body.quantity) || 1))

      const [item] = await ctx.sql`
        SELECT item_key,name,price_flame_coin
        FROM weave_file_folder_items
        WHERE item_key=${itemKey}
          AND published=true
        LIMIT 1
      `
      if (!item) return NextResponse.json({ error: 'Build item not found' }, { status: 404 })

      const unitPrice = Number(item.price_flame_coin)
      const total = unitPrice * quantity

      const rows = await ctx.sql`
        WITH debited AS (
          UPDATE wallets
          SET
            balance_trx=balance_trx-${total},
            updated_at=NOW()
          WHERE user_id=${ctx.client.id}::uuid
            AND is_primary=true
            AND balance_trx >= ${total}
          RETURNING balance_trx
        ),
        inventory AS (
          INSERT INTO client_file_folder_inventory (
            client_id,file_number,item_key,quantity,updated_at
          )
          SELECT
            ${ctx.client.id}::uuid,
            ${ctx.client.file_number},
            ${itemKey},
            ${quantity},
            NOW()
          FROM debited
          ON CONFLICT (client_id,item_key)
          DO UPDATE SET
            quantity=client_file_folder_inventory.quantity+${quantity},
            file_number=EXCLUDED.file_number,
            updated_at=NOW()
          RETURNING quantity
        ),
        purchase AS (
          INSERT INTO client_file_folder_item_orders (
            client_id,file_number,item_key,quantity,
            unit_price_flame_coin,total_price_flame_coin,
            wallet_balance_after,status
          )
          SELECT
            ${ctx.client.id}::uuid,
            ${ctx.client.file_number},
            ${itemKey},
            ${quantity},
            ${unitPrice},
            ${total},
            balance_trx,
            'completed'
          FROM debited
          RETURNING id
        )
        SELECT
          (SELECT balance_trx FROM debited LIMIT 1) AS balance_after,
          (SELECT quantity FROM inventory LIMIT 1) AS inventory_quantity,
          (SELECT id FROM purchase LIMIT 1) AS order_id
      `

      if (!rows[0]?.order_id) {
        return NextResponse.json({
          error: `Insufficient Main Client Wallet balance for ${item.name}`,
        }, { status: 409 })
      }
      receipt = await issueWeaveReceipt({
        userId: String(ctx.client.id),
        kind: 'purchase',
        source: 'file_folder_build_market',
        sourceId: String(rows[0].order_id),
        amount: total,
        currency: 'Flame Coin',
        status: 'completed',
        description: `${quantity} × ${item.name}`,
        metadata: { itemKey, quantity, unitPrice, balanceAfter: Number(rows[0].balance_after || 0), fileNumber: ctx.client.file_number },
        sql: ctx.sql,
      })
    } else if (action === 'start_build') {
      const blueprintKey = clean(body.blueprint_key, 80)
      const customTitle = clean(body.title, 220)
      const purpose = clean(body.purpose, 2000)

      const [blueprint] = await ctx.sql`
        SELECT *
        FROM weave_file_folder_blueprints
        WHERE blueprint_key=${blueprintKey}
          AND published=true
        LIMIT 1
      `
      if (!blueprint) return NextResponse.json({ error: 'Blueprint not found' }, { status: 404 })

      const economy = await getClientBuildEconomy(ctx.sql, String(ctx.client.id), String(ctx.client.file_number))
      const [doorGate] = await ctx.sql`
        SELECT id,status,completes_at
        FROM client_file_folder_builds
        WHERE client_id=${ctx.client.id}::uuid
          AND file_number=${ctx.client.file_number}
          AND blueprint_key='customer_door'
        ORDER BY created_at DESC
        LIMIT 1
      `
      if (!economy.publicDoorUnlocked && doorGate && (doorGate.status === 'funding_gate' || new Date(doorGate.completes_at).getTime() <= Date.now())) {
        return NextResponse.json({
          error: `Build funding gate: deposit ${economy.requiredToOpenPublicDoorFlameCoin.toLocaleString()} more Flame Coin to open the first Customer Door and continue new construction.`,
          gate: 'build_funding',
          buildFunding: economy,
        }, { status: 409 })
      }

      if (blueprint.blueprint_key === 'customer_door') {
        const [existingDoor] = await ctx.sql`
          SELECT id,status
          FROM client_file_folder_builds
          WHERE client_id=${ctx.client.id}::uuid
            AND file_number=${ctx.client.file_number}
            AND blueprint_key='customer_door'
          ORDER BY created_at DESC
          LIMIT 1
        `
        const [activeDoor] = await ctx.sql`
          SELECT id
          FROM client_built_systems
          WHERE client_id=${ctx.client.id}::uuid
            AND file_number=${ctx.client.file_number}
            AND system_type='customer_door'
            AND status='active'
          LIMIT 1
        `
        if (existingDoor || activeDoor) {
          return NextResponse.json({ error: 'Your Customer Door is already forming or active.' }, { status: 409 })
        }
      }

      const constructionRequirements:Record<string,{
        systems:Array<{systemType:string;label:string}>
        enterpriseApproval?:boolean
      }> = {
        commerce_storefront:{systems:[{systemType:'customer_door',label:'Customer Door'}]},
        marketplace_network:{systems:[{systemType:'commerce_storefront',label:'Commerce Storefront'}]},
        route_station:{systems:[{systemType:'customer_door',label:'Customer Door'}]},
        creator_booth:{systems:[{systemType:'customer_door',label:'Customer Door'}]},
        broadcast_studio:{systems:[{systemType:'creator_booth',label:'Creator Booth'}]},
        streaming_gate:{systems:[{systemType:'broadcast_studio',label:'Broadcast Studio'}]},
        media_network:{systems:[{systemType:'streaming_gate',label:'Streaming Open Gate'}]},
        enterprise_door:{
          systems:[{systemType:'marketplace_network',label:'Marketplace Network'}],
          enterpriseApproval:true,
        },
        enterprise_hall:{systems:[{systemType:'enterprise_door',label:'Enterprise Door'}],enterpriseApproval:true},
        legion_quarters:{systems:[{systemType:'enterprise_door',label:'Enterprise Door'}],enterpriseApproval:true},
        operations_command:{systems:[{systemType:'enterprise_hall',label:'Enterprise Hall'}],enterpriseApproval:true},
        enterprise_treasury:{systems:[{systemType:'enterprise_hall',label:'Enterprise Hall'}],enterpriseApproval:true},
        distribution_network:{
          systems:[
            {systemType:'operations_command',label:'Operations Command'},
            {systemType:'route_station',label:'Business Route Station'},
          ],
          enterpriseApproval:true,
        },
        enterprise_operating_system:{
          systems:[
            {systemType:'enterprise_hall',label:'Enterprise Hall'},
            {systemType:'operations_command',label:'Operations Command'},
            {systemType:'enterprise_treasury',label:'Enterprise Treasury'},
            {systemType:'distribution_network',label:'Distribution Network'},
          ],
          enterpriseApproval:true,
        },
      }
      const requirement=constructionRequirements[String(blueprint.blueprint_key)]
      if(requirement?.enterpriseApproval){
        const [application]=await ctx.sql`
          SELECT status
          FROM enterprise_applications
          WHERE client_id=${ctx.client.id}::uuid
          LIMIT 1
        `
        if(application?.status!=='approved'){
          return NextResponse.json({
            error:`Administration must approve Lord/Lady enterprise elevation before ${blueprint.name} can begin.`,
            gate:'enterprise_approval',
          },{status:409})
        }
      }
      for(const dependency of requirement?.systems||[]){
        const [requiredStructure]=await ctx.sql`
          SELECT id
          FROM client_built_systems
          WHERE client_id=${ctx.client.id}::uuid
            AND file_number=${ctx.client.file_number}
            AND system_type=${dependency.systemType}
            AND status='active'
          LIMIT 1
        `
        if(!requiredStructure){
          return NextResponse.json({
            error:`${dependency.label} must finish construction before ${blueprint.name} can begin.`,
            gate:'construction_dependency',
            requiredSystem:dependency.systemType,
          },{status:409})
        }
      }

      const singleInstanceBlueprints=new Set([
        'commerce_storefront','marketplace_network','route_station',
        'creator_booth','broadcast_studio','streaming_gate','media_network',
        'enterprise_door','enterprise_hall','legion_quarters','operations_command',
        'enterprise_treasury','distribution_network',
      ])
      if(singleInstanceBlueprints.has(String(blueprint.blueprint_key))){
        const [existingStructure]=await ctx.sql`
          SELECT id,status
          FROM client_file_folder_builds
          WHERE client_id=${ctx.client.id}::uuid
            AND file_number=${ctx.client.file_number}
            AND blueprint_key=${blueprint.blueprint_key}
          ORDER BY created_at DESC
          LIMIT 1
        `
        const [liveStructure]=await ctx.sql`
          SELECT id
          FROM client_built_systems
          WHERE client_id=${ctx.client.id}::uuid
            AND file_number=${ctx.client.file_number}
            AND system_type=${blueprint.system_type}
            AND status='active'
          LIMIT 1
        `
        if(existingStructure||liveStructure){
          return NextResponse.json({error:`${blueprint.name} is already forming or active in this File Folder.`},{status:409})
        }
      }

      const title = customTitle || blueprint.name
      const requiredQty = Number(blueprint.required_item_quantity || 0)
      const requiredItemKey = blueprint.required_item_key || null
      const durationHours = Math.max(1, Number(blueprint.build_hours || 1))
      const { baseMinutes, effectiveMinutes } = effectiveBuildMinutes(durationHours, economy.buildSpeedMultiplier)

      if (requiredItemKey && requiredQty > 0) {
        const started = await ctx.sql`
          WITH consumed AS (
            UPDATE client_file_folder_inventory
            SET
              quantity=quantity-${requiredQty},
              updated_at=NOW()
            WHERE client_id=${ctx.client.id}::uuid
              AND item_key=${requiredItemKey}
              AND quantity >= ${requiredQty}
            RETURNING quantity
          ),
          build AS (
            INSERT INTO client_file_folder_builds (
              client_id,file_number,blueprint_key,title,purpose,
              system_type,status,duration_hours,base_duration_minutes,duration_minutes,speed_multiplier,started_at,completes_at
            )
            SELECT
              ${ctx.client.id}::uuid,
              ${ctx.client.file_number},
              ${blueprint.blueprint_key},
              ${title},
              ${purpose || blueprint.description},
              ${blueprint.system_type},
              'building',
              ${durationHours},
              ${baseMinutes},
              ${effectiveMinutes},
              ${economy.buildSpeedMultiplier},
              NOW(),
              NOW() + make_interval(mins => ${effectiveMinutes})
            FROM consumed
            RETURNING id
          )
          SELECT id FROM build
        `

        if (!started[0]?.id) {
          return NextResponse.json({
            error: `This blueprint requires ${requiredQty} × ${blueprint.required_item_key}. Acquire it in the Materials Depot first.`,
          }, { status: 409 })
        }
      } else {
        await ctx.sql`
          INSERT INTO client_file_folder_builds (
            client_id,file_number,blueprint_key,title,purpose,
            system_type,status,duration_hours,base_duration_minutes,duration_minutes,speed_multiplier,started_at,completes_at
          )
          VALUES (
            ${ctx.client.id}::uuid,
            ${ctx.client.file_number},
            ${blueprint.blueprint_key},
            ${title},
            ${purpose || blueprint.description},
            ${blueprint.system_type},
            'building',
            ${durationHours},
            ${baseMinutes},
            ${effectiveMinutes},
            ${economy.buildSpeedMultiplier},
            NOW(),
            NOW() + make_interval(mins => ${effectiveMinutes})
          )
        `
      }
    } else if (action === 'apply_build_item') {
      const buildId = clean(body.build_id, 80)
      const itemKey = clean(body.item_key, 80)
      if (!isUuid(buildId) || !itemKey) {
        return NextResponse.json({ error: 'Active build and build item are required' }, { status: 400 })
      }

      const [item] = await ctx.sql`
        SELECT item_key,name,build_effect,effect_value
        FROM weave_file_folder_items
        WHERE item_key=${itemKey}
          AND published=true
        LIMIT 1
      `
      if (!item) return NextResponse.json({ error: 'Build item not found' }, { status: 404 })

      const [activeBuild] = await ctx.sql`
        SELECT id,title,status,system_type
        FROM client_file_folder_builds
        WHERE id=${buildId}::uuid
          AND client_id=${ctx.client.id}::uuid
          AND file_number=${ctx.client.file_number}
          AND status='building'
        LIMIT 1
      `
      if (!activeBuild) {
        return NextResponse.json({ error: 'That build is no longer active' }, { status: 409 })
      }

      const effectType = String(item.build_effect || 'component')
      const capabilityCompatibility:Record<string,string[]> = {
        route_capacity:['route_station','integration_network','distribution_network','enterprise_operating_system'],
        legion_capacity:['legion_quarters','enterprise_hall','enterprise_operating_system'],
        stream_capacity:['broadcast_studio','streaming_gate','media_network'],
        audience_capacity:['streaming_gate','media_network'],
        ai_node:['ai_service_desk','intelligence_lab','operations_command','media_network','enterprise_operating_system'],
        automation:['service_workflow','operations_suite','operations_command','distribution_network','enterprise_operating_system'],
        verification:['payments_gateway','crypto_exchange_workshop','operations_command','enterprise_treasury','enterprise_operating_system'],
      }
      const compatibleSystems=capabilityCompatibility[effectType]
      if(compatibleSystems && !compatibleSystems.includes(String(activeBuild.system_type))){
        return NextResponse.json({
          error:`${item.name} is not compatible with ${activeBuild.title}. Install it during a compatible ${effectType.replaceAll('_',' ')} build.`,
          gate:'module_compatibility',
          effectType,
          compatibleSystems,
        },{status:409})
      }
      const effectFactor = effectType === 'speed_boost'
        ? Math.max(1, Number(item.effect_value) || 1)
        : 1

      const applied = await ctx.sql`
        WITH consumed AS (
          UPDATE client_file_folder_inventory
          SET quantity=quantity-1,updated_at=NOW()
          WHERE client_id=${ctx.client.id}::uuid
            AND file_number=${ctx.client.file_number}
            AND item_key=${itemKey}
            AND quantity >= 1
          RETURNING item_key
        ),
        part AS (
          INSERT INTO client_file_folder_build_parts (
            build_id,client_id,file_number,item_key,quantity,effect_type,effect_value,applied_at
          )
          SELECT
            ${buildId}::uuid,
            ${ctx.client.id}::uuid,
            ${ctx.client.file_number},
            ${itemKey},
            1,
            ${effectType},
            ${Number(item.effect_value) || 0},
            NOW()
          FROM consumed
          RETURNING id
        ),
        build_update AS (
          UPDATE client_file_folder_builds
          SET
            purchase_speed_multiplier=CASE
              WHEN ${effectType}='speed_boost'
              THEN LEAST(
                ${CLIENT_BUILD_SPEED_MAX},
                COALESCE(purchase_speed_multiplier,1) * ${effectFactor}
              )
              ELSE COALESCE(purchase_speed_multiplier,1)
            END,
            speed_multiplier=CASE
              WHEN ${effectType}='speed_boost'
              THEN LEAST(
                ${CLIENT_BUILD_SPEED_MAX},
                COALESCE(speed_multiplier,1) * ${effectFactor}
              )
              ELSE COALESCE(speed_multiplier,1)
            END,
            completes_at=CASE
              WHEN ${effectType}='speed_boost' AND completes_at>NOW()
              THEN NOW() + make_interval(secs => GREATEST(60,CEIL(EXTRACT(EPOCH FROM (completes_at-NOW())) / ${effectFactor})::int))
              ELSE completes_at
            END,
            updated_at=NOW()
          WHERE id=${buildId}::uuid
            AND EXISTS (SELECT 1 FROM part)
          RETURNING purchase_speed_multiplier
        )
        SELECT
          (SELECT id FROM part LIMIT 1) AS part_id,
          (SELECT purchase_speed_multiplier FROM build_update LIMIT 1) AS purchase_speed_multiplier
      `

      if (!applied[0]?.part_id) {
        return NextResponse.json({
          error: `Purchase ${item.name} in the Materials Depot or Acceleration Bay before attaching it to this build.`,
        }, { status: 409 })
      }
    } else if (action === 'library_start' || action === 'library_complete') {
      const entryKey = clean(body.entry_key, 80)
      const [entry] = await ctx.sql`
        SELECT entry_key
        FROM client_library_catalog
        WHERE entry_key=${entryKey}
          AND published=true
        LIMIT 1
      `
      if (!entry) return NextResponse.json({ error: 'Library movement not found' }, { status: 404 })

      if (action === 'library_start') {
        await ctx.sql`
          INSERT INTO client_library_progress (client_id,entry_key,status,started_at,updated_at)
          VALUES (${ctx.client.id}::uuid,${entryKey},'in_progress',NOW(),NOW())
          ON CONFLICT (client_id,entry_key)
          DO UPDATE SET
            status=CASE WHEN client_library_progress.status='complete' THEN 'complete' ELSE 'in_progress' END,
            started_at=COALESCE(client_library_progress.started_at,NOW()),
            updated_at=NOW()
        `
      } else {
        await ctx.sql`
          INSERT INTO client_library_progress (client_id,entry_key,status,started_at,completed_at,updated_at)
          VALUES (${ctx.client.id}::uuid,${entryKey},'complete',NOW(),NOW(),NOW())
          ON CONFLICT (client_id,entry_key)
          DO UPDATE SET
            status='complete',
            started_at=COALESCE(client_library_progress.started_at,NOW()),
            completed_at=COALESCE(client_library_progress.completed_at,NOW()),
            updated_at=NOW()
        `
      }
    } else if (action === 'add_system_entry') {
      const systemId = clean(body.system_id, 80)
      const title = clean(body.title, 220)
      const entryBody = clean(body.body, 4000)
      const moduleKey = clean(body.module_key, 120)
      const evidenceType = ['internal','customer_use','visitor_use','fulfilment','delivery','service','revenue'].includes(String(body.evidence_type)) ? String(body.evidence_type) : 'internal'
      const evidenceValue = Number.isFinite(Number(body.evidence_value)) ? Math.max(0,Number(body.evidence_value)) : null
      const evidenceUnit = clean(body.evidence_unit,40)
      if (!systemId || !title) {
        return NextResponse.json({ error: 'System and entry title are required' }, { status: 400 })
      }

      const [system] = await ctx.sql`
        SELECT id,system_type
        FROM client_built_systems
        WHERE id=${systemId}::uuid
          AND client_id=${ctx.client.id}::uuid
          AND status='active'
        LIMIT 1
      `
      if (!system) return NextResponse.json({ error: 'Built system not found' }, { status: 404 })

      await ctx.sql`
        INSERT INTO client_built_system_entries (
          system_id,client_id,entry_type,title,body,status,
          evidence_type,evidence_value,evidence_unit,metadata
        )
        VALUES (
          ${system.id}::uuid,
          ${ctx.client.id}::uuid,
          ${moduleKey || system.system_type},
          ${title},
          ${entryBody || null},
          'open',
          ${evidenceType},
          ${evidenceValue},
          ${evidenceUnit || null},
          ${JSON.stringify({ moduleKey: moduleKey || null, source: 'file_folder_system_host' })}::jsonb
        )
      `
    } else if (action === 'toggle_system_entry') {
      const entryId = clean(body.entry_id, 80)
      const status = body.status === 'done' ? 'done' : 'open'
      const rows = await ctx.sql`
        UPDATE client_built_system_entries
        SET status=${status},completed_at=CASE WHEN ${status}='done' THEN COALESCE(completed_at,NOW()) ELSE NULL END,updated_at=NOW()
        WHERE id=${entryId}::uuid
          AND client_id=${ctx.client.id}::uuid
        RETURNING id
      `
      if (!rows.length) return NextResponse.json({ error: 'System entry not found' }, { status: 404 })
    } else {
      return NextResponse.json({ error: 'Unknown File Folder action' }, { status: 400 })
    }

    const world = await getFileFolderWorldSnapshot(
      ctx.sql,
      String(ctx.client.id),
      String(ctx.client.file_number),
    )

    return NextResponse.json({
      success: true,
      world,
      motion:fileFolderMotion(action),
    }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    console.error('[client/file-folder-world POST]', error)
    return NextResponse.json({ error: 'File Folder movement failed' }, { status: 500 })
  }
}
