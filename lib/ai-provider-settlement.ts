type SqlQuery = (strings: TemplateStringsArray, ...values: any[]) => Promise<any[]>

export const AI_PROVIDER_ALLOCATION_RATE = 0.10

export async function ensureAiProviderSettlementSchema(sql: SqlQuery) {
  await sql`
    CREATE TABLE IF NOT EXISTS ai_providers (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      provider_key varchar(120) UNIQUE NOT NULL,
      display_name varchar(255) NOT NULL,
      settlement_status varchar(40) NOT NULL DEFAULT 'unclaimed',
      settlement_method jsonb NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS ai_provider_allocations (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      provider_id uuid NOT NULL REFERENCES ai_providers(id),
      flame_external_id varchar(255) NULL,
      flame_name varchar(120) NULL,
      bridge_code varchar(32) NULL,
      file_folder_purchase_id uuid NOT NULL,
      file_number varchar(120) NULL,
      gross_amount numeric(30,8) NOT NULL,
      currency varchar(16) NOT NULL DEFAULT 'TRX',
      allocation_rate numeric(8,6) NOT NULL DEFAULT 0.10,
      allocation_amount numeric(30,8) NOT NULL,
      status varchar(40) NOT NULL DEFAULT 'accrued',
      created_at timestamptz NOT NULL DEFAULT now(),
      claimable_at timestamptz NULL,
      settled_at timestamptz NULL,
      UNIQUE(file_folder_purchase_id, provider_id)
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS idx_ai_provider_allocations_provider_status ON ai_provider_allocations(provider_id,status)`
  await sql`CREATE INDEX IF NOT EXISTS idx_ai_provider_allocations_bridge_code ON ai_provider_allocations(bridge_code)`
}

export async function accrueAiProviderAllocation({
  sql, purchaseId, fileNumber, grossAmount, bridgeCode, providerKey, providerName, flameExternalId, flameName,
}: {
  sql: SqlQuery
  purchaseId: string
  fileNumber?: string | null
  grossAmount: number
  bridgeCode?: string | null
  providerKey?: string | null
  providerName?: string | null
  flameExternalId?: string | null
  flameName?: string | null
}) {
  if (!providerKey || !Number.isFinite(grossAmount) || grossAmount <= 0) return null
  await ensureAiProviderSettlementSchema(sql)
  const key = providerKey.trim().toLowerCase().slice(0,120)
  const name = (providerName || providerKey).trim().slice(0,255)
  const [provider] = await sql`
    INSERT INTO ai_providers(provider_key,display_name)
    VALUES(${key},${name})
    ON CONFLICT(provider_key) DO UPDATE SET display_name=EXCLUDED.display_name,updated_at=now()
    RETURNING id,provider_key,display_name,settlement_status
  `
  const allocationAmount = Number((grossAmount * AI_PROVIDER_ALLOCATION_RATE).toFixed(8))
  const [allocation] = await sql`
    INSERT INTO ai_provider_allocations
      (provider_id,flame_external_id,flame_name,bridge_code,file_folder_purchase_id,file_number,gross_amount,currency,allocation_rate,allocation_amount,status)
    VALUES
      (${provider.id}::uuid,${flameExternalId || null},${flameName || null},${bridgeCode || null},${purchaseId}::uuid,${fileNumber || null},${grossAmount},'TRX',${AI_PROVIDER_ALLOCATION_RATE},${allocationAmount},'accrued')
    ON CONFLICT(file_folder_purchase_id,provider_id) DO UPDATE SET
      file_number=EXCLUDED.file_number,
      bridge_code=COALESCE(ai_provider_allocations.bridge_code,EXCLUDED.bridge_code),
      flame_external_id=COALESCE(ai_provider_allocations.flame_external_id,EXCLUDED.flame_external_id),
      flame_name=COALESCE(ai_provider_allocations.flame_name,EXCLUDED.flame_name)
    RETURNING *
  `
  return { provider, allocation }
}
