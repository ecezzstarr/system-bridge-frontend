import { sql } from '../lib/db'

async function migrate() {
  console.log('Adding subscription columns to users table...')
  try {
    // Continuance status: 'active', 'due', 'suspended'
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(20) DEFAULT 'active'`
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_expiry TIMESTAMPTZ`
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_subscription_exempt BOOLEAN DEFAULT false`
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_last_paid_at TIMESTAMPTZ`
    
    // Also create a table for subscription payments/history
    await sql`
      CREATE TABLE IF NOT EXISTS subscription_payments (
        id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID REFERENCES users(id),
        amount NUMERIC(20,2) NOT NULL,
        currency VARCHAR(10) DEFAULT 'NGN',
        payment_method VARCHAR(50),
        transaction_reference TEXT,
        status VARCHAR(20) DEFAULT 'success',
        period_start TIMESTAMPTZ,
        period_end TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT now()
      )
    `
    
    console.log('Successfully added subscription tracking.')
  } catch (error) {
    console.error('Migration failed:', error)
  }
}

migrate().then(() => process.exit(0))
