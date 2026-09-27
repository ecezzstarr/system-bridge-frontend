import { sql } from './db'
import { generateNumberSeries, createProspectPackage } from './market'
import { DAILY_PROSPECT_RESERVE } from './bridger-daily-prospect-engine'

export class FulfillmentAgent {
  private adminId: string

  constructor(adminId: string = '00000000-0000-0000-0000-000000000000') {
    this.adminId = adminId
  }

  /**
   * 1. PROSPECT: Discover and create prospect number series
   */
  async discoverAndVerify(sourceNumber: string, count: number) {
    console.log(`[FulfillmentAgent] Discovering ${count} prospects from ${sourceNumber}`)
    
    // This generates series AND performs simulated verification (inside market.ts)
    const result = await generateNumberSeries(this.adminId, sourceNumber, count)
    
    return result
  }

  /**
   * 2. PACKAGE & PUBLISH: Bundle available prospects into marketplace packages
   */
  async packageAvailable(limit: number = 3, priceTrx: number = 5) {
    // Paid marketplace packaging must never consume the entire free Daily
    // Prospect reserve. The reserve remains unowned/unpackaged for Bridgers.
    const reserveCount = await sql`
      SELECT COUNT(*)::int AS count
      FROM market_prospect_contacts m
      WHERE m.status='available'
        AND m.package_id IS NULL
        AND COALESCE(NULLIF(TRIM(m.whatsapp_number),''),NULLIF(TRIM(m.phone),'')) IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM market_prospect_outreach o WHERE o.contact_id=m.id)
    `
    const availableCount=Number((reserveCount as any[])[0]?.count||0)

    if (availableCount < limit + DAILY_PROSPECT_RESERVE) {
      console.log(`[FulfillmentAgent] Preserving Daily Prospect reserve (${availableCount} available; need ${limit} package + ${DAILY_PROSPECT_RESERVE} reserve)`)
      return null
    }

    const available = await sql`
      SELECT m.id
      FROM market_prospect_contacts m
      WHERE m.status='available'
        AND m.package_id IS NULL
        AND COALESCE(NULLIF(TRIM(m.whatsapp_number),''),NULLIF(TRIM(m.phone),'')) IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM market_prospect_outreach o WHERE o.contact_id=m.id)
      ORDER BY m.created_at ASC
      LIMIT ${limit}
    `
    
    if (available.length < limit) return null
    
    const contactIds = available.map(c => c.id)
    const pkg = await createProspectPackage(this.adminId, contactIds, priceTrx)
    
    console.log(`[FulfillmentAgent] Published Package: ${pkg.title} with ${contactIds.length} prospects`)
    return pkg
  }

  /**
   * 3. PURCHASE & RESERVE: Handled by the Purchase API
   * Logic: Purchase -> Create market_prospect_outreach records in 'pending' status
   */

  /**
   * 4. APPROVAL & SEND: Trigger outreach after admin approval
   */
  async approveAndSend(outreachId: string) {
    console.log(`[FulfillmentAgent] Approving outreach: ${outreachId}`)
    
    // 1. Mark as sent (simulating WhatsApp API call)
    const result = await sql`
      UPDATE market_prospect_outreach
      SET status = 'sent', sent_at = NOW(), last_activity_at = NOW()
      WHERE id = ${outreachId}::uuid
      RETURNING *
    `
    
    if (result.length === 0) throw new Error('Outreach record not found')
    
    // 2. Audit trail
    await sql`
      INSERT INTO market_prospect_audit (package_id, actor_id, action, details)
      SELECT c.package_id, ${this.adminId}::uuid, 'outreach_approved', 
             jsonb_build_object('outreach_id', ${outreachId}::uuid, 'phone', c.phone)
      FROM market_prospect_outreach o
      JOIN market_prospect_contacts c ON o.contact_id = c.id
      WHERE o.id = ${outreachId}::uuid
    `
    
    return result[0]
  }

  /**
   * 5. TRACK & CONVERT: Logic inside chat route and verify route
   * Logic: Chat opens -> linkOutreachToSession -> status='opened'
   * First message -> status='responded'
   * File Folder purchase -> markProspectConverted -> status='converted'
   */

  /**
   * RECONCILE: Generate the next available package if needed
   */
  async reconcile() {
    const availableCount = await sql`
      SELECT COUNT(*) FROM market_prospect_contacts WHERE status = 'available'
    `
    const count = parseInt(availableCount[0].count)
    
    if (count >= 3) {
      await this.packageAvailable(3, 5)
    }
  }
}

export const fulfillmentAgent = new FulfillmentAgent()
