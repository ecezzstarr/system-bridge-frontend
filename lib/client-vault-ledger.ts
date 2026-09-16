import { getFileFolderDb, ensureClientFileFolderSchema } from '@/lib/client-file-folder'

export async function ensureClientVaultLedgerSchema(sql = getFileFolderDb()) {
  await ensureClientFileFolderSchema(sql)
  await sql`
    CREATE TABLE IF NOT EXISTS client_vault_ledger (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id uuid NOT NULL,
      type varchar(40) NOT NULL,
      amount numeric(30,8) NOT NULL,
      currency varchar(20) NOT NULL DEFAULT 'TRX',
      status varchar(40) NOT NULL DEFAULT 'posted',
      reference varchar(255),
      note text,
      created_by uuid,
      created_at timestamptz NOT NULL DEFAULT NOW()
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS idx_client_vault_ledger_client ON client_vault_ledger(client_id,created_at DESC)`
  await sql`
    CREATE TABLE IF NOT EXISTS client_vault_withdrawals (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id uuid NOT NULL,
      amount numeric(30,8) NOT NULL,
      currency varchar(20) NOT NULL DEFAULT 'TRX',
      destination varchar(255) NOT NULL,
      status varchar(40) NOT NULL DEFAULT 'pending_approval',
      approved_by uuid,
      approved_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT NOW()
    )
  `
}
