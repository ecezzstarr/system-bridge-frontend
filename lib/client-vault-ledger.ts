import { getFileFolderDb, ensureClientFileFolderSchema } from '@/lib/client-file-folder'
import { ensureClientVaultSchema } from '@/lib/client-vault'

export async function ensureClientVaultLedgerSchema(sql = getFileFolderDb()) {
  await ensureClientFileFolderSchema(sql)
  await ensureClientVaultSchema(sql)
  await sql`ALTER TABLE client_vault_withdrawals ADD COLUMN IF NOT EXISTS approved_by uuid`
  await sql`ALTER TABLE client_vault_withdrawals ADD COLUMN IF NOT EXISTS approved_at timestamptz`
  await sql`ALTER TABLE client_vault_withdrawals ADD COLUMN IF NOT EXISTS sent_by uuid`
  await sql`ALTER TABLE client_vault_withdrawals ADD COLUMN IF NOT EXISTS sent_at timestamptz`
  await sql`ALTER TABLE client_vault_withdrawals ADD COLUMN IF NOT EXISTS settlement_reference varchar(255)`
  await sql`ALTER TABLE client_vault_withdrawals ADD COLUMN IF NOT EXISTS settlement_note text`
  await sql`ALTER TABLE client_vault_withdrawals ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT NOW()`
}
