import { sql } from './db'

export async function ensureMarketTables() {
  try {
    // 1. Prospect Packages table
    await sql`
      CREATE TABLE IF NOT EXISTS market_prospect_packages (
        id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
        created_by UUID NOT NULL REFERENCES users(id),
        title VARCHAR(255) NOT NULL DEFAULT 'Prospect Package',
        description TEXT,
        price_trx NUMERIC(20,6) NOT NULL DEFAULT 1.1,
        status VARCHAR(20) NOT NULL DEFAULT 'draft', -- draft, published, sold, archived
        purchased_by UUID REFERENCES users(id),
        purchased_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      )
    `

    // 2. Prospect Contacts table
    await sql`
      CREATE TABLE IF NOT EXISTS market_prospect_contacts (
        id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
        package_id UUID REFERENCES market_prospect_packages(id) ON DELETE CASCADE,
        name VARCHAR(255),
        phone VARCHAR(50) NOT NULL,
        whatsapp_number VARCHAR(20),
        source_platform VARCHAR(50) DEFAULT 'engine',
        status VARCHAR(20) NOT NULL DEFAULT 'available', -- available, packaged, contacted, converted
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT now()
      )
    `

    // 3. Prospect Audit table
    await sql`
      CREATE TABLE IF NOT EXISTS market_prospect_audit (
        id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
        package_id UUID REFERENCES market_prospect_packages(id),
        actor_id UUID REFERENCES users(id),
        action VARCHAR(50) NOT NULL,
        details JSONB,
        created_at TIMESTAMPTZ DEFAULT now()
      )
    `

    // 4. Prospect Number Series (for the Number Engine)
    await sql`
      CREATE TABLE IF NOT EXISTS prospect_number_series (
        id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
        source_number VARCHAR(20) NOT NULL,
        series_start VARCHAR(20) NOT NULL,
        series_end VARCHAR(20) NOT NULL,
        count INTEGER NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'processing', -- processing, completed, failed
        created_by UUID REFERENCES users(id),
        created_at TIMESTAMPTZ DEFAULT now()
      )
    `

    // 5. Prospect Outreach (tracking the contact flow)
    await sql`
      CREATE TABLE IF NOT EXISTS market_prospect_outreach (
        id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
        contact_id UUID NOT NULL REFERENCES market_prospect_contacts(id),
        bridger_id UUID NOT NULL REFERENCES users(id),
        bridge_ai_id UUID REFERENCES bridge_ais(id),
        status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, sent, opened, responded, converted
        message_sent TEXT,
        sent_at TIMESTAMPTZ,
        last_activity_at TIMESTAMPTZ DEFAULT now(),
        created_at TIMESTAMPTZ DEFAULT now()
      )
    `

    return true
  } catch (error) {
    console.error('Failed to ensure market tables:', error)
    return false
  }
}

export async function createProspectPackage(adminId: string, contactIds: string[], priceTrx?: number) {
  await ensureMarketTables()
  
  // Calculate price: 1.1 Flame Coin per prospect if no specific price is provided
  const finalPrice = priceTrx || (contactIds.length * 1.1)
  const title = `Prospect Package #${Math.floor(Math.random() * 9000) + 1000}`
  const description = `${contactIds.length} qualified prospects generated via Weave Engine.`

  const pkg = await sql`
    INSERT INTO market_prospect_packages (created_by, title, description, price_trx, status)
    VALUES (${adminId}::uuid, ${title}, ${description}, ${finalPrice}, 'published')
    RETURNING *
  `
  
  const packageId = pkg[0].id

  for (const contactId of contactIds) {
    await sql`
      UPDATE market_prospect_contacts
      SET package_id = ${packageId}::uuid, status = 'packaged'
      WHERE id = ${contactId}::uuid
    `
  }

  return pkg[0]
}

export async function generateNumberSeries(adminId: string, sourceNumber: string, count: number) {
  await ensureMarketTables()

  // Basic numeric increment logic for the series
  const baseNum = sourceNumber.replace(/\D/g, '')
  if (baseNum.length < 5) throw new Error('Invalid source number')

  const prefix = baseNum.slice(0, -3)
  const startSuffix = parseInt(baseNum.slice(-3))
  
  const contacts = []
  for (let i = 0; i < count; i++) {
    const currentSuffix = (startSuffix + i).toString().padStart(3, '0')
    const phoneNumber = `+${prefix}${currentSuffix}`
    
    // Simulate reachability check (80% reachable for demo)
    const isReachable = Math.random() > 0.2
    
    if (isReachable) {
      const contact = await sql`
        INSERT INTO market_prospect_contacts (phone, whatsapp_number, source_platform, status)
        VALUES (${phoneNumber}, ${phoneNumber}, 'number_engine', 'available')
        RETURNING *
      `
      contacts.push(contact[0])
    }
  }

  const series = await sql`
    INSERT INTO prospect_number_series (source_number, series_start, series_end, count, status, created_by)
    VALUES (${sourceNumber}, ${contacts[0]?.phone || sourceNumber}, ${contacts[contacts.length-1]?.phone || sourceNumber}, ${count}, 'completed', ${adminId}::uuid)
    RETURNING *
  `
  
  return {
    series: series[0],
    contactsGenerated: contacts.length
  }
}

export async function linkOutreachToSession(outreachId: string, sessionId: string) {
  await sql`
    UPDATE bridge_sessions
    SET outreach_id = ${outreachId}::uuid
    WHERE id = ${sessionId}::uuid
  `
  
  await sql`
    UPDATE market_prospect_outreach
    SET status = 'opened', last_activity_at = NOW()
    WHERE id = ${outreachId}::uuid AND status = 'sent'
  `
}

export async function markProspectConverted(outreachId: string) {
  await sql`
    UPDATE market_prospect_outreach
    SET status = 'converted', last_activity_at = NOW()
    WHERE id = ${outreachId}::uuid
  `
  
  // Also update the contact status
  await sql`
    UPDATE market_prospect_contacts
    SET status = 'converted'
    WHERE id = (SELECT contact_id FROM market_prospect_outreach WHERE id = ${outreachId}::uuid)
  `
}
