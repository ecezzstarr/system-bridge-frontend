import { neon } from '@/lib/pg-neon'
import { CJ_DORADO_FILE_NUMBER } from '@/lib/client-file-folder'

export const getClientWorkshopDb = () => {

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
  const [folder]=await sql`SELECT f.client_id,f.file_number,f.workshop_type,u.name AS owner_name
    FROM client_file_folders f JOIN users u ON u.id=f.client_id
    WHERE f.file_number=${CJ_DORADO_FILE_NUMBER} AND f.status='active'
      AND u.file_number=f.file_number AND u.role='client' AND u.is_active=true LIMIT 1`
  if (!folder?.client_id || !/\bcj\s+dorado\b/i.test(String(folder.owner_name||''))) return null
  const originalTypes=['formation','pending_personalization','system_formation','crypto_exchange']
  if(!originalTypes.includes(String(folder.workshop_type)))return null
  const [existing]=await sql`SELECT workshop_type FROM client_system_workshops
    WHERE client_id=${folder.client_id}::uuid LIMIT 1`
  // Keep bespoke workshops, records, offers and all employee position work untouched.
  if(existing && !originalTypes.includes(String(existing.workshop_type)))return null
  const description="A functioning Client-owned operations desk for CJ Dorado: crypto market tracking, buy and sell intent, order journal, reported holdings, reconciliation, business store and support. Orders are not live exchange executions until an authorized provider is connected."
  const [workshop]=await sql`INSERT INTO client_system_workshops
    (client_id,file_number,workshop_type,title,description)
    VALUES(${folder.client_id}::uuid,${CJ_DORADO_FILE_NUMBER},'crypto_exchange',
      'CJ Dorado · Crypto Exchange Workshop',${description})
    ON CONFLICT(client_id) DO UPDATE SET
      file_number=EXCLUDED.file_number,workshop_type=EXCLUDED.workshop_type,
      title=EXCLUDED.title,description=EXCLUDED.description,updated_at=now()
    WHERE client_system_workshops.workshop_type IN
      ('formation','pending_personalization','system_formation','crypto_exchange')
    RETURNING *`
  if (!workshop)return null
  await sql`UPDATE client_file_folders SET workshop_type='crypto_exchange',updated_at=now()
    WHERE client_id=${folder.client_id}::uuid AND file_number=${CJ_DORADO_FILE_NUMBER}
      AND status='active'
      AND workshop_type IN ('formation','pending_personalization','system_formation','crypto_exchange')`
  return workshop
}
