import { neon } from '@/lib/pg-neon'

export const getBusinessDb = () => {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL not configured')
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
      created_at timestamptz NOT NULL DEFAULT NOW(),
      updated_at timestamptz NOT NULL DEFAULT NOW()
    )
  `
  await sql`CREATE TABLE IF NOT EXISTS client_store_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id uuid NOT NULL,
    name varchar(255) NOT NULL,
    description text,
    price numeric(30,8),
    currency varchar(20) NOT NULL DEFAULT 'USDT',
    enabled boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT NOW(),
    updated_at timestamptz NOT NULL DEFAULT NOW()
  )`
  await sql`CREATE TABLE IF NOT EXISTS client_store_orders (
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
  )`
  await sql`ALTER TABLE client_store_orders ADD COLUMN IF NOT EXISTS customer_wallet varchar(255)`
  await sql`ALTER TABLE client_store_orders ADD COLUMN IF NOT EXISTS payment_reference varchar(255)`
  await sql`ALTER TABLE client_store_orders ADD COLUMN IF NOT EXISTS payment_status varchar(40) NOT NULL DEFAULT 'awaiting_payment'`
  await sql`CREATE INDEX IF NOT EXISTS idx_client_store_orders_store ON client_store_orders(store_id, created_at DESC)`
}

export function publicStoreSlug(fileNumber: string) {
  return fileNumber.toLowerCase().replace(/[^a-z0-9]+/g, '-')
}

export async function ensureClientBusinessStore(sql: any, clientId: string, fileNumber: string, businessName: string) {
  await ensureClientBusinessStoreSchema(sql)
  const slug = publicStoreSlug(fileNumber)
  const [store] = await sql`
    INSERT INTO client_business_stores (client_id,file_number,public_slug,name)
    VALUES (${clientId}::uuid,${fileNumber},${slug},${businessName || 'Business Store'})
    ON CONFLICT (client_id) DO UPDATE SET
      file_number=EXCLUDED.file_number,
      name=COALESCE(client_business_stores.name,EXCLUDED.name),
      updated_at=NOW()
    RETURNING *
  `
  return store
}
