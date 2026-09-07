import { neon } from '@/lib/pg-neon'

export const getFileFolderDb = () => {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL not configured')
  return neon(process.env.DATABASE_URL)
}

export async function ensureClientFileFolderSchema(sql = getFileFolderDb()) {
  await sql`
    CREATE TABLE IF NOT EXISTS client_file_folders (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id uuid UNIQUE,
      file_number varchar(120) UNIQUE NOT NULL,
      client_name varchar(255),
      workshop_type varchar(120) NOT NULL DEFAULT 'formation',
      status varchar(40) NOT NULL DEFAULT 'waiting_for_login',
      created_at timestamptz NOT NULL DEFAULT NOW(),
      updated_at timestamptz NOT NULL DEFAULT NOW(),
      claimed_at timestamptz
    )
  `
  await sql`
    CREATE INDEX IF NOT EXISTS idx_client_file_folders_file_number
    ON client_file_folders(file_number)
  `
}

export const CJ_DORADO_FILE_NUMBER = 'WEAVE-2026-0907-0001'

export async function ensureCjDoradoFolder(sql = getFileFolderDb()) {
  await ensureClientFileFolderSchema(sql)
  const [folder] = await sql`
    INSERT INTO client_file_folders
      (file_number, client_name, workshop_type, status)
    VALUES
      (${CJ_DORADO_FILE_NUMBER}, 'Cj Dorado', 'crypto_exchange', 'waiting_for_login')
    ON CONFLICT (file_number) DO UPDATE SET
      client_name = COALESCE(client_file_folders.client_name, EXCLUDED.client_name),
      workshop_type = COALESCE(client_file_folders.workshop_type, EXCLUDED.workshop_type),
      updated_at = NOW()
    RETURNING *
  `
  return folder
}

export async function claimFileFolder(
  sql: ReturnType<typeof neon>,
  clientId: string,
  fileNumber: string,
  clientName: string,
) {
  await ensureClientFileFolderSchema(sql)
  const [folder] = await sql`
    UPDATE client_file_folders
    SET client_id = ${clientId}::uuid,
        client_name = ${clientName},
        status = 'active',
        claimed_at = COALESCE(claimed_at, NOW()),
        updated_at = NOW()
    WHERE file_number = ${fileNumber}
      AND (client_id IS NULL OR client_id = ${clientId}::uuid)
    RETURNING *
  `
  return folder || null
}
