import { getSql } from './db'

export type WeaveReceiptKind = 'deposit' | 'withdrawal' | 'purchase' | 'subscription' | 'payment'

export type WeaveReceipt = {
  id: string
  receipt_number: string
  user_id: string
  kind: WeaveReceiptKind
  source: string
  source_id: string | null
  amount: number
  currency: string
  status: string
  description: string | null
  metadata: Record<string, unknown>
  created_at: string
}

export async function ensureWeaveReceiptSchema(sql = getSql()) {
  await sql`
    CREATE TABLE IF NOT EXISTS weave_receipts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      receipt_number VARCHAR(80) NOT NULL UNIQUE,
      user_id UUID NOT NULL REFERENCES users(id),
      kind VARCHAR(30) NOT NULL,
      source VARCHAR(80) NOT NULL,
      source_id TEXT,
      amount NUMERIC(30,8) NOT NULL,
      currency VARCHAR(20) NOT NULL,
      status VARCHAR(30) NOT NULL DEFAULT 'recorded',
      description TEXT,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS idx_weave_receipts_user_created ON weave_receipts(user_id, created_at DESC)`
  await sql`CREATE INDEX IF NOT EXISTS idx_weave_receipts_source ON weave_receipts(source, source_id)`
}

function receiptNumber(kind: WeaveReceiptKind) {
  const prefix = { deposit:'DEP', withdrawal:'WDR', purchase:'PUR', subscription:'SUB', payment:'PAY' }[kind]
  return `WEAVE-${prefix}-${Date.now()}-${crypto.randomUUID().slice(0,8).toUpperCase()}`
}

export async function issueWeaveReceipt(input: {
  userId: string
  kind: WeaveReceiptKind
  source: string
  sourceId?: string | null
  amount: number
  currency: string
  status?: string
  description?: string
  metadata?: Record<string, unknown>
  sql?: ReturnType<typeof getSql>
}) {
  const sql = input.sql || getSql()
  await ensureWeaveReceiptSchema(sql)
  const number = receiptNumber(input.kind)
  const [receipt] = await sql`
    INSERT INTO weave_receipts
      (receipt_number,user_id,kind,source,source_id,amount,currency,status,description,metadata)
    VALUES
      (${number},${input.userId}::uuid,${input.kind},${input.source},${input.sourceId || null},
       ${input.amount},${input.currency},${input.status || 'recorded'},${input.description || null},
       ${JSON.stringify(input.metadata || {})}::jsonb)
    RETURNING *
  `
  return receipt as WeaveReceipt
}
