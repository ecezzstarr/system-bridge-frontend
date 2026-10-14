export async function ensureLegionCommerceSchema(sql: any) {
  await sql`ALTER TABLE enterprise_legions ADD COLUMN IF NOT EXISTS sales_code varchar(80)`
  await sql`ALTER TABLE enterprise_legions ADD COLUMN IF NOT EXISTS sales_enabled boolean NOT NULL DEFAULT true`
  await sql`
    UPDATE enterprise_legions
    SET sales_code='LG-' || UPPER(SUBSTRING(REPLACE(id::text,'-','') FROM 1 FOR 10))
    WHERE sales_code IS NULL OR sales_code=''
  `
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_enterprise_legions_sales_code ON enterprise_legions(sales_code) WHERE sales_code IS NOT NULL`

  await sql`ALTER TABLE client_store_orders ADD COLUMN IF NOT EXISTS legion_id uuid`
  await sql`ALTER TABLE client_store_orders ADD COLUMN IF NOT EXISTS legion_sales_code varchar(80)`
  await sql`ALTER TABLE client_store_orders ADD COLUMN IF NOT EXISTS legion_attributed_at timestamptz`
  await sql`CREATE INDEX IF NOT EXISTS idx_client_store_orders_legion ON client_store_orders(legion_id, created_at DESC)`
}

export function legionCarrierPath(storeSlug: string, salesCode: string) {
  return `/market/${encodeURIComponent(storeSlug)}?legion=${encodeURIComponent(salesCode)}`
}
