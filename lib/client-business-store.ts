import { neon } from '@/lib/pg-neon'

export const getBusinessDb = () => {
  return neon(process.env.DATABASE_URL)
}

export async function ensureClientBusinessStoreSchema(sql = getBusinessDb()) {
  await sql`
    CREATE TABLE IF NOT EXISTS client_business_stores (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id uuid UNIQUE NOT NULL,
      file_number varchar(120) UNIQUE NOT NULL,
      public_slug varchar(160) UNIQUE NOT NULL,
      name varchar(255),
      description text,
      enabled boolean NOT NULL DEFAULT true,
      formation_status varchar(40) NOT NULL DEFAULT 'forming',
      formation_due_at timestamptz,
      public_opened_at timestamptz,
      first_offer_published_at timestamptz,
      customer_wallet_required boolean NOT NULL DEFAULT false,
      created_at timestamptz NOT NULL DEFAULT NOW(),
      updated_at timestamptz NOT NULL DEFAULT NOW()
    )
  `
  await sql`ALTER TABLE client_business_stores ADD COLUMN IF NOT EXISTS formation_status varchar(40) NOT NULL DEFAULT 'forming'`
  await sql`ALTER TABLE client_business_stores ADD COLUMN IF NOT EXISTS formation_due_at timestamptz`
  await sql`ALTER TABLE client_business_stores ADD COLUMN IF NOT EXISTS public_opened_at timestamptz`
  await sql`ALTER TABLE client_business_stores ADD COLUMN IF NOT EXISTS first_offer_published_at timestamptz`
  await sql`ALTER TABLE client_business_stores ADD COLUMN IF NOT EXISTS customer_wallet_required boolean NOT NULL DEFAULT false`
  await sql`
    UPDATE client_business_stores
    SET formation_due_at = COALESCE(formation_due_at, created_at + INTERVAL '3 days')
    WHERE formation_due_at IS NULL
  `

  await sql`
    CREATE TABLE IF NOT EXISTS client_store_items (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      store_id uuid NOT NULL,
      name varchar(255) NOT NULL,
      description text,
      price numeric(30,8),
      currency varchar(20) NOT NULL DEFAULT 'USDT',
      offer_type varchar(40) NOT NULL DEFAULT 'product',
      enabled boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT NOW(),
      updated_at timestamptz NOT NULL DEFAULT NOW()
    )
  `
  await sql`ALTER TABLE client_store_items ADD COLUMN IF NOT EXISTS offer_type varchar(40) NOT NULL DEFAULT 'product'`

  await sql`
    CREATE TABLE IF NOT EXISTS client_store_orders (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      store_id uuid NOT NULL,
      item_id uuid,
      customer_name varchar(255),
      customer_contact varchar(255),
      customer_wallet varchar(255),
      payment_reference varchar(255),
      customer_note text,
      amount numeric(30,8) NOT NULL DEFAULT 0,
      currency varchar(20) NOT NULL DEFAULT 'USDT',
      status varchar(40) NOT NULL DEFAULT 'requested',
      payment_status varchar(40) NOT NULL DEFAULT 'awaiting_payment',
      created_at timestamptz NOT NULL DEFAULT NOW(),
      updated_at timestamptz NOT NULL DEFAULT NOW()
    )
  `
  await sql`ALTER TABLE client_store_orders ADD COLUMN IF NOT EXISTS customer_wallet varchar(255)`
  await sql`ALTER TABLE client_store_orders ADD COLUMN IF NOT EXISTS payment_reference varchar(255)`
  await sql`ALTER TABLE client_store_orders ADD COLUMN IF NOT EXISTS payment_status varchar(40) NOT NULL DEFAULT 'awaiting_payment'`
  await sql`CREATE INDEX IF NOT EXISTS idx_client_store_orders_store ON client_store_orders(store_id, created_at DESC)`
}

export function publicStoreSlug(fileNumber: string) {
  return fileNumber.toLowerCase().replace(/[^a-z0-9]+/g, '-')
}

export async function ensureClientBusinessStore(
  sql: any,
  clientId: string,
  fileNumber: string,
  businessName: string,
  customerWalletRequired = false,
) {
  await ensureClientBusinessStoreSchema(sql)
  const slug = publicStoreSlug(fileNumber)
  const [store] = await sql`
    INSERT INTO client_business_stores (
      client_id,
      file_number,
      public_slug,
      name,
      formation_status,
      formation_due_at,
      customer_wallet_required
    )
    VALUES (
      ${clientId}::uuid,
      ${fileNumber},
      ${slug},
      ${businessName || 'Business Store'},
      'forming',
      NOW() + INTERVAL '3 days',
      ${customerWalletRequired}
    )
    ON CONFLICT (client_id) DO UPDATE SET
      file_number=EXCLUDED.file_number,
      name=COALESCE(client_business_stores.name,EXCLUDED.name),
      formation_due_at=COALESCE(client_business_stores.formation_due_at,client_business_stores.created_at + INTERVAL '3 days'),
      customer_wallet_required=EXCLUDED.customer_wallet_required,
      updated_at=NOW()
    RETURNING *
  `

  const [offerCount] = await sql`
    SELECT COUNT(*)::int AS count
    FROM client_store_items
    WHERE store_id=${store.id}::uuid
      AND enabled=true
  `

  if (Number(offerCount?.count || 0) > 0 && store.public_opened_at) {
    const [selling] = await sql`
      UPDATE client_business_stores
      SET
        formation_status='selling',
        first_offer_published_at=COALESCE(first_offer_published_at,NOW()),
        updated_at=NOW()
      WHERE id=${store.id}::uuid
      RETURNING *
    `
    return selling || store
  }

  return store
}
