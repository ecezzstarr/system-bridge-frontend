import { sql } from '../lib/db'

async function migrate() {
  console.log('Creating market_prospect_packages, market_prospect_contacts, market_prospect_audit tables...')
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS market_prospect_packages (
        id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
        created_by UUID NOT NULL REFERENCES users(id),
        price_trx NUMERIC(20,6) NOT NULL DEFAULT 5,
        status VARCHAR(20) NOT NULL DEFAULT 'draft',
        purchased_by UUID REFERENCES users(id),
        purchased_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      )
    `

    await sql`
      CREATE TABLE IF NOT EXISTS market_prospect_contacts (
        id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
        package_id UUID NOT NULL REFERENCES market_prospect_packages(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        source_platform VARCHAR(50),
        source_handle VARCHAR(255),
        phone VARCHAR(50),
        whatsapp_number VARCHAR(20),
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT now()
      )
    `

    await sql`
      CREATE TABLE IF NOT EXISTS market_prospect_audit (
        id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
        package_id UUID NOT NULL REFERENCES market_prospect_packages(id),
        actor_id UUID REFERENCES users(id),
        action VARCHAR(50) NOT NULL,
        details JSONB,
        created_at TIMESTAMPTZ DEFAULT now()
      )
    `

    console.log('Successfully created market prospect tables.')
  } catch (error) {
    console.error('Migration failed:', error)
    process.exit(1)
  }
  process.exit(0)
}

migrate()
