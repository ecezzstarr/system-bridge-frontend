import { sql } from '../lib/db'

async function migrate() {
  console.log('Adding password reset columns to users table...')
  try {
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255)`
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMPTZ`
    console.log('Successfully added columns.')
  } catch (error) {
    console.error('Migration failed:', error)
  }
}

migrate().then(() => process.exit(0))
