import { sql } from './db'
import { generateNumberSeries, createProspectPackage } from './market'

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
    // Find available contacts that aren't packaged yet
    const available = await sql`
      SELECT id FROM market_prospect_contacts
      WHERE status = 'available'
      ORDER BY created_at ASC
      LIMIT ${limit}
    `
    
    if (available.length < limit) {
      console.log(`[FulfillmentAgent] Not enough available contacts to package (${available.length}/${limit})`)
      return null
    }
    
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
