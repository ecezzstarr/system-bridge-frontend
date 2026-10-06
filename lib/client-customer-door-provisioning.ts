import { ensureClientBusinessStore, ensureClientBusinessStoreSchema } from '@/lib/client-business-store'
import { ensureFileFolderWorldSchema } from '@/lib/client-file-folder-world'

const CUSTOMER_DOOR_PARTS = [
  'door_foundation_frame',
  'door_identity_facade',
  'door_customer_intake',
  'door_service_interface',
  'door_fulfilment_interface',
  'door_public_commissioning',
] as const

export async function provisionPurchasedFileFolderCustomerDoor(params: {
  sql: any
  clientId: string
  fileNumber: string
  clientName: string
}) {
  const { sql, clientId, fileNumber, clientName } = params
  await ensureFileFolderWorldSchema(sql)
  await ensureClientBusinessStoreSchema(sql)

  await sql`
    INSERT INTO client_business_formations (
      client_id,file_number,business_name,purpose,customer_description,operating_model,formation_state,created_at,updated_at
    )
    VALUES (
      ${clientId}::uuid,
      ${fileNumber},
      ${clientName || 'Client Enterprise'},
      'Operate a Client-owned business through a public Customer Door.',
      'People outside WEAVE can enter the Customer Door and interact with the Client business.',
      'customer_door',
      'active',
      NOW(),
      NOW()
    )
    ON CONFLICT (client_id) DO UPDATE SET
      file_number=EXCLUDED.file_number,
      business_name=COALESCE(NULLIF(client_business_formations.business_name,''),EXCLUDED.business_name),
      formation_state='active',
      updated_at=NOW()
  `

  let [build] = await sql`
    SELECT id,client_id,file_number,blueprint_key,status
    FROM client_file_folder_builds
    WHERE client_id=${clientId}::uuid
      AND file_number=${fileNumber}
      AND blueprint_key='customer_door'
    ORDER BY created_at ASC
    LIMIT 1
  `

  if (!build) {
    ;[build] = await sql`
      INSERT INTO client_file_folder_builds (
        client_id,file_number,blueprint_key,title,purpose,system_type,status,
        duration_hours,base_duration_minutes,duration_minutes,speed_multiplier,purchase_speed_multiplier,
        started_at,completes_at,completed_at,created_at,updated_at
      )
      VALUES (
        ${clientId}::uuid,
        ${fileNumber},
        'customer_door',
        'Customer Door',
        'The public entrance commissioned with the Client File Folder purchase.',
        'customer_door',
        'completed',
        0,0,0,1,1,
        NOW(),NOW(),NOW(),NOW(),NOW()
      )
      RETURNING id,client_id,file_number,blueprint_key,status
    `
  } else if (build.status !== 'completed') {
    ;[build] = await sql`
      UPDATE client_file_folder_builds
      SET
        status='completed',
        duration_hours=0,
        base_duration_minutes=0,
        duration_minutes=0,
        completes_at=NOW(),
        completed_at=COALESCE(completed_at,NOW()),
        updated_at=NOW()
      WHERE id=${build.id}::uuid
      RETURNING id,client_id,file_number,blueprint_key,status
    `
  }

  for (const itemKey of CUSTOMER_DOOR_PARTS) {
    await sql`
      INSERT INTO client_file_folder_build_parts (
        build_id,client_id,file_number,item_key,quantity,effect_type,effect_value,applied_at
      )
      SELECT
        ${build.id}::uuid,
        ${clientId}::uuid,
        ${fileNumber},
        ${itemKey},
        1,
        COALESCE(i.build_effect,'component'),
        COALESCE(i.effect_value,0),
        NOW()
      FROM weave_file_folder_items i
      WHERE i.item_key=${itemKey}
        AND NOT EXISTS (
          SELECT 1
          FROM client_file_folder_build_parts p
          WHERE p.build_id=${build.id}::uuid
            AND p.item_key=${itemKey}
        )
    `
  }

  let [system] = await sql`
    SELECT id,build_id,system_type,status
    FROM client_built_systems
    WHERE client_id=${clientId}::uuid
      AND file_number=${fileNumber}
      AND system_type='customer_door'
    ORDER BY activated_at ASC
    LIMIT 1
  `

  if (!system) {
    ;[system] = await sql`
      INSERT INTO client_built_systems (
        build_id,client_id,file_number,system_type,title,configuration,status,activated_at,updated_at
      )
      VALUES (
        ${build.id}::uuid,
        ${clientId}::uuid,
        ${fileNumber},
        'customer_door',
        'Customer Door',
        ${JSON.stringify({
          commissionedWithFileFolder: true,
          parts: CUSTOMER_DOOR_PARTS,
          publicBoundary: 'customer_door',
        })}::jsonb,
        'active',
        NOW(),
        NOW()
      )
      RETURNING id,build_id,system_type,status
    `
  } else if (system.status !== 'active') {
    ;[system] = await sql`
      UPDATE client_built_systems
      SET status='active',updated_at=NOW()
      WHERE id=${system.id}::uuid
      RETURNING id,build_id,system_type,status
    `
  }

  const store = await ensureClientBusinessStore(sql, clientId, fileNumber, clientName || 'Client Enterprise', false)
  const [openStore] = await sql`
    UPDATE client_business_stores
    SET
      enabled=true,
      formation_status='selling',
      formation_due_at=NOW(),
      public_opened_at=COALESCE(public_opened_at,NOW()),
      updated_at=NOW()
    WHERE id=${store.id}::uuid
    RETURNING id,client_id,file_number,public_slug,name,formation_status,public_opened_at
  `

  return {
    buildId: String(build.id),
    systemId: String(system.id),
    parts: [...CUSTOMER_DOOR_PARTS],
    storeId: String(openStore.id),
    publicSlug: String(openStore.public_slug),
    publicPath: `/market/${encodeURIComponent(String(openStore.public_slug))}`,
    status: 'working',
  }
}
