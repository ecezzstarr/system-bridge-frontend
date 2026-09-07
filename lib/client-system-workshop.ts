import { neon } from '@/lib/pg-neon'
import { CJ_DORADO_FILE_NUMBER } from '@/lib/client-file-folder'

export const getClientWorkshopDb = () => {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL not configured')
  return neon(process.env.DATABASE_URL)
}

export async function ensureClientWorkshopSchema(sql = getClientWorkshopDb()) {
  await sql`
    CREATE TABLE IF NOT EXISTS client_system_workshops (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id uuid UNIQUE NOT NULL,
      file_number varchar(120) UNIQUE NOT NULL,
      workshop_type varchar(120) NOT NULL DEFAULT 'formation',
      title varchar(255) NOT NULL DEFAULT 'System Switch Workshop',
      description text,
      created_at timestamptz NOT NULL DEFAULT NOW(),
      updated_at timestamptz NOT NULL DEFAULT NOW()
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS client_workshop_agents (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      workshop_id uuid NOT NULL,
      agent_id uuid NOT NULL,
      approved_by uuid NOT NULL,
      approved_at timestamptz NOT NULL DEFAULT NOW(),
      active boolean NOT NULL DEFAULT true,
      UNIQUE(workshop_id, agent_id)
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS bridge_ai_reports (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id uuid,
      file_number varchar(120),
      bridger_id uuid,
      prospect_id uuid,
      report_type varchar(60) NOT NULL DEFAULT 'interaction_insight',
      summary text NOT NULL,
      insights jsonb NOT NULL DEFAULT '[]'::jsonb,
      recommended_actions jsonb NOT NULL DEFAULT '[]'::jsonb,
      source_message_count integer NOT NULL DEFAULT 0,
      created_at timestamptz NOT NULL DEFAULT NOW()
    )
  `
  await sql`
    CREATE INDEX IF NOT EXISTS idx_bridge_ai_reports_client_time
    ON bridge_ai_reports(client_id, created_at DESC)
  `
  await sql`
    CREATE INDEX IF NOT EXISTS idx_bridge_ai_reports_file_time
    ON bridge_ai_reports(file_number, created_at DESC)
  `
}

export async function ensureCjDoradoWorkshop(sql = getClientWorkshopDb()) {
  await ensureClientWorkshopSchema(sql)
  const [folder] = await sql`
    SELECT client_id, file_number FROM client_file_folders
    WHERE file_number = ${CJ_DORADO_FILE_NUMBER}
    LIMIT 1
  `
  if (!folder?.client_id) return null

  const [workshop] = await sql`
    INSERT INTO client_system_workshops
      (client_id, file_number, workshop_type, title, description)
    VALUES
      (${folder.client_id}::uuid, ${CJ_DORADO_FILE_NUMBER}, 'crypto_exchange', 'CJ Dorado · Crypto Exchange Workshop',
       'A productive System Switch formed around CJ Dorado\'s reviewed interactions concerning funds, vault access, crypto buying and selling, income and system operation.')
    ON CONFLICT (client_id) DO UPDATE SET
      file_number = EXCLUDED.file_number,
      workshop_type = EXCLUDED.workshop_type,
      title = EXCLUDED.title,
      description = EXCLUDED.description,
      updated_at = NOW()
    RETURNING *
  `
  return workshop
}
