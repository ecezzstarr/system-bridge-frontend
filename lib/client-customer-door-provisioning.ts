import { ensureClientBusinessStore, ensureClientBusinessStoreSchema } from '@/lib/client-business-store'
import { ensureFileFolderWorldSchema } from '@/lib/client-file-folder-world'
import { effectiveBuildMinutes } from '@/lib/client-build-economy'

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
      'People outside WEAVE can enter the Customer Door after its construction completes.',
      'customer_door',
      'forming',
      NOW(),
      NOW()
    )
    ON CONFLICT (client_id) DO UPDATE SET
      file_number=EXCLUDED.file_number,
      business_name=COALESCE(NULLIF(client_business_formations.business_name,''),EXCLUDED.business_name),
      formation_state='forming',
      updated_at=NOW()
  `

  const [doorBlueprint] = await sql`
    SELECT build_hours
    FROM weave_file_folder_blueprints
    WHERE blueprint_key='customer_door'
    LIMIT 1
  `
  const doorHours = Math.max(1, Number(doorBlueprint?.build_hours || 72))
  const { baseMinutes, effectiveMinutes } = effectiveBuildMinutes(doorHours, 1)

  let [build] = await sql`
    SELECT id,client_id,file_number,blueprint_key,status,completes_at,duration_minutes
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
        'The public entrance supplied with the Client File Folder. Its required parts are present from formation, while the Client may let construction run naturally or apply boosts.',
        'customer_door',
        'building',
        ${doorHours},${baseMinutes},${effectiveMinutes},1,1,
        NOW(),NOW() + make_interval(mins => ${effectiveMinutes}),NULL,NOW(),NOW()
      )
      RETURNING id,client_id,file_number,blueprint_key,status,completes_at,duration_minutes
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

  const store = await ensureClientBusinessStore(sql, clientId, fileNumber, clientName || 'Client Enterprise', false)
  const [formingStore] = await sql`
    UPDATE client_business_stores
    SET
      enabled=true,
      formation_status='forming',
      formation_due_at=${build.completes_at},
      public_opened_at=NULL,
      updated_at=NOW()
    WHERE id=${store.id}::uuid
    RETURNING id,client_id,file_number,public_slug,name,formation_status,formation_due_at,public_opened_at
  `

  return {
    buildId: String(build.id),
    systemId: null,
    parts: [...CUSTOMER_DOOR_PARTS],
    storeId: String(formingStore.id),
    publicSlug: String(formingStore.public_slug),
    publicPath: `/market/${encodeURIComponent(String(formingStore.public_slug))}`,
    status: 'building',
    durationMinutes: Number(build.duration_minutes || effectiveMinutes),
    completesAt: build.completes_at,
    boostOptional: true,
  }
}
