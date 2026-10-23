/**
 * Plus File Folder has three explicit, Administration-defined values.
 * 60,000 Flame Coin is the product entitlement, payable as either
 * 59,602 TRX or 20,000 USDT. These are a fixed product quotation, NOT
 * a live exchange rate. Never silently apply this price ratio elsewhere.
 */
export const PLUS_FILE_FOLDER = {
  tier: 'plus',
  title: 'Plus File Folder',
  flameCoin: 60_000,
  trx: 59_602,
  usdt: 20_000,
  currency: 'Flame Coin',
  delivery: 'completed_systems',
} as const

/**
 * Only include blueprints backed by an existing Client-owned record/workflow.
 * External banking, automated settlement, third-party social networks and
 * regulatory permissions are NOT supplied by merely activating a blueprint.
 */
export const PLUS_READY_BLUEPRINTS = [
  'operations_board',
  'service_workflow',
  'data_room',
  'research_room',
  'commerce_storefront',
  'campaign_system',
] as const

export type PlusReadyBlueprint = typeof PLUS_READY_BLUEPRINTS[number]

export function validPlusFileFolderPrice(amount: unknown, currency: unknown) {
  return typeof amount === 'number' &&
    Number.isFinite(amount) &&
    ((currency === 'TRX' && amount === PLUS_FILE_FOLDER.trx) ||
      (currency === 'USDT' && amount === PLUS_FILE_FOLDER.usdt))
}

/**
 * Called only for an Administration-verified Plus TRX or USDT purchase.
 * Replays reuse existing Plus-tagged builds and never debit a Client wallet.
 * The Customer Door opens to customers immediately; the Lord still publishes
 * their own offers and must configure any external payment integration.
 */
export async function provisionPlusFileFolderSystems(input: {
  sql: any
  clientId: string
  fileNumber: string
  purchaseId: string
}) {
  const { sql, clientId, fileNumber, purchaseId } = input
  const { ensureFileFolderWorldSchema } = await import('@/lib/client-file-folder-world')
  await ensureFileFolderWorldSchema(sql)
  // Two concurrent Client sessions may attempt fulfillment at the same time.
  // Guarantee one purchased build per blueprint and file number.
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_client_plus_purchase_build_unique
    ON client_file_folder_builds(client_id,file_number,blueprint_key,purpose)
    WHERE purpose LIKE 'Plus File Folder ready system (%)'
  `

  // Verify the ledger again at the point of fulfillment. Client input or
  // a claim of payment cannot grant a completed operating world.
  const [purchase] = await sql`
    SELECT id FROM file_folder_purchases
    WHERE id=${purchaseId}::uuid
      AND status='confirmed'
      AND file_folder_tier='plus'
      AND (
        (payment_method='trx' AND amount_trx=${PLUS_FILE_FOLDER.trx})
        OR (payment_method='usdt' AND amount_usdt=${PLUS_FILE_FOLDER.usdt})
      )
      AND client_id=${clientId}::uuid
      AND file_number=${fileNumber}
    LIMIT 1
  `
  if (!purchase) throw new Error('Plus File Folder needs a verified 59,602 TRX or 20,000 USDT payment owned by this Client')

  const commissioned: Array<{ blueprintKey: string; systemId: string }> = []
  for (const key of PLUS_READY_BLUEPRINTS) {
    const [blueprint] = await sql`
      SELECT blueprint_key,name,system_type,build_hours
      FROM weave_file_folder_blueprints
      WHERE blueprint_key=${key} AND published=true
      LIMIT 1
    `
    if (!blueprint) throw new Error(`Plus File Folder blueprint is missing: ${key}`)

    const [already] = await sql`
      SELECT id FROM client_built_systems
      WHERE client_id=${clientId}::uuid
        AND file_number=${fileNumber}
        AND status='active'
        AND configuration->>'plusPurchaseId'=${purchaseId}
        AND configuration->>'blueprintKey'=${key}
      LIMIT 1
    `
    if (already) {
      commissioned.push({ blueprintKey: key, systemId: String(already.id) })
      continue
    }

    // A partial provisioning retry resumes an existing completed build.
    const [previousBuild] = await sql`
      SELECT id FROM client_file_folder_builds
      WHERE client_id=${clientId}::uuid
        AND file_number=${fileNumber}
        AND blueprint_key=${key}
        AND purpose=${`Plus File Folder ready system (${purchaseId})`}
        AND status='complete'
      ORDER BY created_at DESC
      LIMIT 1
    `
    let buildId = previousBuild?.id
    if (!buildId) {
      const [build] = await sql`
        INSERT INTO client_file_folder_builds (
          client_id,file_number,blueprint_key,title,purpose,system_type,
          status,duration_hours,base_duration_minutes,duration_minutes,
          speed_multiplier,purchase_speed_multiplier,
          started_at,completes_at,completed_at
        ) VALUES (
          ${clientId}::uuid,${fileNumber},${key},${blueprint.name},
          ${`Plus File Folder ready system (${purchaseId})`},${blueprint.system_type},
          'complete',${Math.max(1,Number(blueprint.build_hours))},
          ${Math.max(1,Number(blueprint.build_hours))*60},0,1,1,
          NOW(),NOW(),NOW()
        )
        ON CONFLICT DO NOTHING
        RETURNING id
      `
      buildId = build?.id
      if (!buildId) {
        const [createdByOtherSession] = await sql`
          SELECT id FROM client_file_folder_builds
          WHERE client_id=${clientId}::uuid AND file_number=${fileNumber}
            AND blueprint_key=${key}
            AND purpose=${`Plus File Folder ready system (${purchaseId})`}
            AND status='complete'
          LIMIT 1
        `
        buildId = createdByOtherSession?.id
      }
      if (!buildId) throw new Error('Plus system commissioning is not yet consistent')
    }
    const [system] = await sql`
      INSERT INTO client_built_systems (
        build_id,client_id,file_number,system_type,title,configuration,status
      ) VALUES (
        ${buildId}::uuid,${clientId}::uuid,${fileNumber},
        ${blueprint.system_type},${blueprint.name},
        ${JSON.stringify({
          blueprintKey:key,ownership:'client',hostedBy:'WEAVE',
          plusPurchaseId:purchaseId,delivery:'completed_at_activation',
          publicBoundary:'customer_door',
        })}::jsonb,'active'
      )
      ON CONFLICT (build_id) DO UPDATE SET updated_at=NOW()
      RETURNING id
    `
    commissioned.push({ blueprintKey: key, systemId: String(system.id) })
  }

  // Included Customer Door was previously created as a timed build by the
  // ordinary File Folder purchase activation. Plus commissions it immediately.
  const [doorBuild] = await sql`
    SELECT id FROM client_file_folder_builds
    WHERE client_id=${clientId}::uuid
      AND file_number=${fileNumber}
      AND blueprint_key='customer_door'
    ORDER BY created_at ASC LIMIT 1
  `
  if (!doorBuild) throw new Error('Plus File Folder requires its included Customer Door')

  await sql`
    UPDATE client_file_folder_builds
    SET status='complete',completes_at=NOW(),
        completed_at=COALESCE(completed_at,NOW()),updated_at=NOW()
    WHERE id=${doorBuild.id}::uuid AND status IN ('building','funding_gate')
  `
  await sql`
    INSERT INTO client_built_systems (
      build_id,client_id,file_number,system_type,title,configuration,status
    ) VALUES (
      ${doorBuild.id}::uuid,${clientId}::uuid,${fileNumber},'customer_door',
      'Customer Door',
      ${JSON.stringify({
        blueprintKey:'customer_door',ownership:'client',hostedBy:'WEAVE',
        plusPurchaseId:purchaseId,delivery:'completed_at_activation',
        publicBoundary:'customer_door',
      })}::jsonb,'active'
    )
    ON CONFLICT (build_id) DO NOTHING
  `
  await sql`
    UPDATE client_business_stores
    SET formation_status=CASE WHEN formation_status='selling' THEN 'selling' ELSE 'ready_for_offer' END,
        public_opened_at=COALESCE(public_opened_at,NOW()),
        updated_at=NOW()
    WHERE client_id=${clientId}::uuid AND file_number=${fileNumber}
  `

  return {
    tier: PLUS_FILE_FOLDER.tier,
    flameCoinValue: PLUS_FILE_FOLDER.flameCoin,
    trxPrice: PLUS_FILE_FOLDER.trx,
    usdtPrice: PLUS_FILE_FOLDER.usdt,
    readySystemCount: commissioned.length + 1,
    systems: commissioned,
    customerDoor: 'ready_for_offer',
  }
}
