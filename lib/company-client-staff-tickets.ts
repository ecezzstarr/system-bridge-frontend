import { randomBytes } from 'node:crypto'
import { getPool } from '@/lib/db'
import { createRandomFileNumberCandidate, ensureFneTables } from '@/lib/fne'
import { ensureClientFileFolderSchema } from '@/lib/client-file-folder'
import { ensureWeaveReceiptSchema } from '@/lib/weave-receipts'

/**
 * Company-issued Client employment entry ticket.
 * The USDT entry ticket is NOT a File Folder purchase. The File Folder is
 * allocated by WEAVE as an employment benefit after independent verification.
 * Normal File Folder purchases and their Flame Coin ledger remain unchanged.
 */
export type CompanyStaffFolderTier = 'standard' | 'pro' | 'premium'

export function companyStaffTierForTicket(amount: number): CompanyStaffFolderTier | null {
  if (!Number.isFinite(amount) || amount <= 0 || Math.round(amount * 100) !== amount * 100) return null
  if (amount < 150) return 'standard'
  if (amount <= 5000) return 'pro'
  return 'premium'
}

export function companyStaffTicketAmountValid(amount: number) {
  return companyStaffTierForTicket(amount) !== null && amount <= 100000000
}

let schemaPending: Promise<void> | null = null
export async function ensureCompanyStaffTicketSchema() {
  if (!schemaPending) schemaPending = (async () => {
    const db = getPool()
    await db.query(
      "CREATE TABLE IF NOT EXISTS company_client_staff_offers (" +
      "id uuid PRIMARY KEY DEFAULT gen_random_uuid()," +
      "access_code varchar(100) NOT NULL UNIQUE," +
      "recipient_name varchar(255) NOT NULL, recipient_email varchar(255) NOT NULL," +
      "recipient_phone varchar(80) NOT NULL, position_title varchar(160) NOT NULL," +
      "region varchar(160), salary_usdt numeric(18,2) NOT NULL DEFAULT 0," +
      "ticket_amount_usdt numeric(18,2) NOT NULL CHECK(ticket_amount_usdt > 0)," +
      "file_folder_tier varchar(20) NOT NULL CHECK(file_folder_tier IN ('standard','pro','premium'))," +
      "status varchar(40) NOT NULL DEFAULT 'offered'," +
      "payment_reference varchar(255) UNIQUE, payment_network varchar(40) DEFAULT 'USDT'," +
      "offered_by uuid REFERENCES users(id), verified_by uuid REFERENCES users(id)," +
      "client_id uuid REFERENCES users(id), file_number varchar(120) UNIQUE," +
      "accepted_at timestamptz, submitted_at timestamptz, verified_at timestamptz," +
      "created_at timestamptz NOT NULL DEFAULT NOW(), updated_at timestamptz NOT NULL DEFAULT NOW())"
    )
    await db.query("CREATE INDEX IF NOT EXISTS company_client_staff_offers_client_idx ON company_client_staff_offers(client_id, file_number)")
    await db.query("CREATE TABLE IF NOT EXISTS company_client_staff_ticket_events (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),offer_id uuid NOT NULL REFERENCES company_client_staff_offers(id),action varchar(60) NOT NULL,actor_id uuid REFERENCES users(id),details jsonb NOT NULL DEFAULT '{}'::jsonb,created_at timestamptz NOT NULL DEFAULT NOW())")
    await db.query("CREATE TABLE IF NOT EXISTS company_client_staff_messages (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),offer_id uuid NOT NULL REFERENCES company_client_staff_offers(id),sender_id uuid NOT NULL REFERENCES users(id),sender_role varchar(20) NOT NULL CHECK(sender_role IN ('admin','client')),message text NOT NULL,created_at timestamptz NOT NULL DEFAULT NOW())")
    await db.query("CREATE INDEX IF NOT EXISTS company_client_staff_messages_offer_idx ON company_client_staff_messages(offer_id,created_at)")
  })().catch(error => { schemaPending = null; throw error })
  return schemaPending
}

export async function createCompanyStaffOffer(input: {
  adminId: string; name: string; email: string; phone: string
  positionTitle: string; region: string; salaryUsdt: number; ticketAmountUsdt: number
}) {
  if (!companyStaffTicketAmountValid(input.ticketAmountUsdt) || !Number.isFinite(input.salaryUsdt) || input.salaryUsdt < 0) {
    throw new Error('Invalid salary or ticket amount')
  }
  const tier = companyStaffTierForTicket(input.ticketAmountUsdt)!
  await ensureCompanyStaffTicketSchema()
  const accessCode = randomBytes(32).toString('base64url')
  const db = getPool()
  const result = await db.query(
    "INSERT INTO company_client_staff_offers(access_code,recipient_name,recipient_email,recipient_phone,position_title,region,salary_usdt,ticket_amount_usdt,file_folder_tier,offered_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::uuid) RETURNING id,access_code,recipient_name,recipient_email,position_title,salary_usdt,ticket_amount_usdt,file_folder_tier,status",
    [accessCode,input.name,input.email.toLowerCase(),input.phone,input.positionTitle,input.region,input.salaryUsdt,input.ticketAmountUsdt,tier,input.adminId]
  )
  return result.rows[0]
}

export async function readCompanyStaffOffer(accessCode: string) {
  await ensureCompanyStaffTicketSchema()
  const result = await getPool().query(
    "SELECT id,recipient_name,recipient_email,position_title,region,salary_usdt,ticket_amount_usdt,file_folder_tier,status,file_number,accepted_at,submitted_at,verified_at FROM company_client_staff_offers WHERE access_code=$1 LIMIT 1",
    [accessCode]
  )
  return result.rows[0] || null
}

export async function acceptCompanyStaffOffer(accessCode: string) {
  await ensureCompanyStaffTicketSchema()
  const db = getPool()
  const result = await db.query(
    "UPDATE company_client_staff_offers SET status='accepted',accepted_at=NOW(),updated_at=NOW() WHERE access_code=$1 AND status='offered' RETURNING id",
    [accessCode]
  )
  if (result.rowCount) await db.query("INSERT INTO company_client_staff_ticket_events(offer_id,action) VALUES ($1::uuid,'offer_accepted')", [result.rows[0].id])
  return result.rowCount > 0
}

export async function submitCompanyStaffTicket(accessCode: string, reference: string) {
  await ensureCompanyStaffTicketSchema()
  const db = getPool()
  const result = await db.query(
    "UPDATE company_client_staff_offers SET payment_reference=$2,status='verification_pending',submitted_at=NOW(),updated_at=NOW() WHERE access_code=$1 AND status IN ('accepted','payment_rejected') RETURNING id",
    [accessCode,reference]
  )
  if (result.rowCount) await db.query(
    "INSERT INTO company_client_staff_ticket_events(offer_id,action,details) VALUES ($1::uuid,'ticket_submitted',jsonb_build_object('reference',$2::text))",
    [result.rows[0].id,reference]
  )
  return result.rowCount > 0
}

/**
 * Serializes approvals on the offer row and inserts the File Number in the
 * same transaction. Payment verification here is a recorded Administration
 * decision, not automatic on-chain verification.
 */
export async function decideCompanyStaffTicket(offerId: string, adminId: string, approve: boolean) {
  await ensureCompanyStaffTicketSchema()
  if (approve) {
    if (!(await ensureFneTables())) throw new Error('File Number Engine unavailable')
    await ensureClientFileFolderSchema()
  }
  const db = await getPool().connect()
  try {
    await db.query('BEGIN')
    const found = await db.query('SELECT * FROM company_client_staff_offers WHERE id=$1::uuid FOR UPDATE', [offerId])
    const offer = found.rows[0]
    if (!offer) throw new Error('Company staff offer not found')
    if (offer.status === 'active' && approve) {
      await db.query('COMMIT')
      return {status:'active',fileNumber:offer.file_number,tier:offer.file_folder_tier,replayed:true}
    }
    if (offer.status !== 'verification_pending') throw new Error('No pending ticket payment to verify')
    if (!approve) {
      await db.query("UPDATE company_client_staff_offers SET status='payment_rejected',verified_by=$2::uuid,updated_at=NOW() WHERE id=$1::uuid", [offerId,adminId])
      await db.query("INSERT INTO company_client_staff_ticket_events(offer_id,action,actor_id) VALUES($1::uuid,'payment_rejected',$2::uuid)",[offerId,adminId])
      await db.query('COMMIT')
      return {status:'payment_rejected',fileNumber:null,tier:offer.file_folder_tier}
    }

    let fileNumber: string | null = null
    const identity = JSON.stringify({
      name: offer.recipient_name,
      phone: offer.recipient_phone,
      email: offer.recipient_email,
      companyStaffOfferId: offer.id,
      entryType: 'company_client_staff_ticket'
    })
    for (let i=0;i<12;i++) {
      const candidate = createRandomFileNumberCandidate()
      const created = await db.query(
        "INSERT INTO file_folders(file_number,bridger_id,identity_data,status) VALUES($1,NULL,$2::jsonb,'pending') ON CONFLICT(file_number) DO NOTHING RETURNING file_number",
        [candidate, identity]
      )
      if (created.rowCount) {fileNumber=candidate;break}
    }
    if (!fileNumber) throw new Error('Unable to issue a unique staff Client File Number')
    await db.query(
      "INSERT INTO client_file_folders(file_number,client_name,workshop_type,status) VALUES($1,$2,'pending_personalization','waiting_for_login')",
      [fileNumber,offer.recipient_name]
    )
    await db.query(
      "UPDATE company_client_staff_offers SET file_number=$2,status='active',verified_by=$3::uuid,verified_at=NOW(),updated_at=NOW() WHERE id=$1::uuid",
      [offer.id,fileNumber,adminId]
    )
    await db.query(
      "INSERT INTO company_client_staff_ticket_events(offer_id,action,actor_id,details) VALUES($1::uuid,'ticket_verified',$2::uuid,jsonb_build_object('fileNumber',$3::text,'tier',$4::text))",
      [offer.id,adminId,fileNumber,offer.file_folder_tier]
    )
    await db.query('COMMIT')
    return {status:'active',fileNumber,tier:offer.file_folder_tier,replayed:false}
  } catch(error) {
    await db.query('ROLLBACK').catch(()=>{})
    throw error
  } finally { db.release() }
}

export async function validateCompanyStaffRegistration(fileNumber: string, email: string) {
  await ensureCompanyStaffTicketSchema()
  const result = await getPool().query(
    "SELECT recipient_email FROM company_client_staff_offers WHERE file_number=$1 AND status='active' LIMIT 1",
    [fileNumber]
  )
  if (!result.rowCount) return true // Regular File Folder registration, unchanged.
  return String(result.rows[0].recipient_email).toLowerCase() === email.trim().toLowerCase()
}

export async function attachCompanyStaffClient(fileNumber: string, clientId: string) {
  await ensureCompanyStaffTicketSchema()
  const db = getPool()
  const result = await db.query(
    "UPDATE company_client_staff_offers SET client_id=$2::uuid,updated_at=NOW() WHERE file_number=$1 AND status='active' AND (client_id IS NULL OR client_id=$2::uuid) RETURNING id,ticket_amount_usdt",
    [fileNumber,clientId]
  )
  const offer = result.rows[0]
  if (!offer) return null
  await ensureWeaveReceiptSchema()
  await db.query(
    "INSERT INTO weave_receipts(receipt_number,user_id,kind,source,source_id,amount,currency,status,description,metadata) SELECT 'WEAVE-TKT-'||replace($1::text,'-',''),$2::uuid,'payment','company_staff_ticket',$1::text,$3,'USDT','verified','Company employee Entry Ticket',jsonb_build_object('companyBenefit',true) WHERE NOT EXISTS(SELECT 1 FROM weave_receipts WHERE source='company_staff_ticket' AND source_id=$1::text)",
    [offer.id,clientId,offer.ticket_amount_usdt]
  )
  return offer
}
