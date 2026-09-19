import { sql } from '../lib/db'

async function migrate() {
  console.log('Adding outreach_id to bridge_sessions and bridge_deposits...')
  try {
    await sql`
      ALTER TABLE bridge_sessions ADD COLUMN IF NOT EXISTS outreach_id UUID;
    `
    await sql`
      ALTER TABLE bridge_deposits ADD COLUMN IF NOT EXISTS outreach_id UUID;
    `
    console.log('Successfully updated bridge schemas.')
  } catch (error) {
    console.error('Migration failed:', error)
    process.exit(1)
  }
  process.exit(0)
}

migrate()
