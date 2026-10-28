import { getPool, sql } from '@/lib/db'

// The Regional Manager receives 2% of WEAVE's company share, not 2% of the
// full File Folder price. WEAVE's existing crossing economics define the
// company share as 40% of gross purchase value.
export const REGIONAL_MANAGER_COMPANY_SHARE_RATE = 0.40
export const REGIONAL_MANAGER_COMPANY_SHARE_COMMISSION_RATE = 0.02

export async function ensureRegionalManagerCommissionSchema() {
  await sql`
    CREATE TABLE IF NOT EXISTS weave_regional_manager_appointments (
      user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      source_role VARCHAR(20) NOT NULL CHECK (source_role IN ('client','bridger','agent')),
      status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('pending','active','ended')),
      appointed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS weave_regional_manager_bridgers (
      bridger_user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      regional_manager_user_id UUID NOT NULL REFERENCES weave_regional_manager_appointments(user_id) ON DELETE CASCADE,
      assigned_by UUID REFERENCES users(id),
      status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active','ended')),
      assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS weave_regional_manager_bridgers_manager_idx ON weave_regional_manager_bridgers(regional_manager_user_id,status)`
  await sql`
    CREATE TABLE IF NOT EXISTS weave_regional_manager_distribution_managers (
      distribution_manager_user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      regional_manager_user_id UUID NOT NULL REFERENCES weave_regional_manager_appointments(user_id) ON DELETE CASCADE,
      assigned_by UUID REFERENCES users(id),
      status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active','ended')),
      assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS weave_regional_manager_distribution_managers_manager_idx ON weave_regional_manager_distribution_managers(regional_manager_user_id,status)`
}

export async function creditRegionalManagerFileFolderCommission(params: {
  bridgerId: string
  purchaseId: string
  grossPurchaseValue: number
  description: string
}): Promise<{
  regionalManagerId: string
  commissionAmount: number
  credited: boolean
  companyShareAmount: number
} | null> {
  const { bridgerId, purchaseId, grossPurchaseValue, description } = params
  if (!bridgerId || !purchaseId || !Number.isFinite(grossPurchaseValue) || grossPurchaseValue <= 0) return null

  await ensureRegionalManagerCommissionSchema()
  // Direct Administration attribution takes precedence. If none exists, derive the
  // Regional Manager from the lead team's active appointment, including its assistants.
  let [assignment] = await sql`
    SELECT rm.user_id AS regional_manager_id
    FROM weave_regional_manager_bridgers member
    JOIN weave_regional_manager_appointments rm
      ON rm.user_id=member.regional_manager_user_id AND rm.status='active'
    JOIN users bridger ON bridger.id=member.bridger_user_id
    WHERE member.bridger_user_id=${bridgerId}::uuid
      AND member.status='active'
      AND bridger.role='bridger'
      AND bridger.is_active=true
    LIMIT 1
  `
  if (!assignment?.regional_manager_id) {
    [assignment] = await sql`
      SELECT rm.user_id AS regional_manager_id
      FROM weave_regional_manager_appointments rm
      JOIN weave_regional_manager_distribution_managers lead_assignment
        ON lead_assignment.regional_manager_user_id=rm.user_id AND lead_assignment.status='active'
      JOIN manager_employment lead
        ON lead.user_id=lead_assignment.distribution_manager_user_id
        AND lead.status IN ('probation','active')
      JOIN users bridger ON bridger.id=${bridgerId}::uuid
      WHERE rm.status='active'
        AND bridger.role='bridger' AND bridger.is_active=true
        AND lead.user_id=bridger.id
      LIMIT 1
    `
  }
  if (!assignment?.regional_manager_id) {
    const [assistantRelation] = await sql`SELECT to_regclass('weave_distribution_assistants') AS relation`
    if (assistantRelation?.relation) {
      [assignment] = await sql`
        SELECT rm.user_id AS regional_manager_id
        FROM weave_regional_manager_appointments rm
        JOIN weave_regional_manager_distribution_managers lead_assignment
          ON lead_assignment.regional_manager_user_id=rm.user_id AND lead_assignment.status='active'
        JOIN manager_employment lead
          ON lead.user_id=lead_assignment.distribution_manager_user_id
          AND lead.status IN ('probation','active')
        JOIN weave_distribution_assistants assistant
          ON assistant.manager_user_id=lead.user_id AND assistant.status='approved'
        JOIN users bridger ON bridger.id=assistant.user_id
        WHERE rm.status='active'
          AND bridger.id=${bridgerId}::uuid
          AND bridger.role='bridger' AND bridger.is_active=true
        LIMIT 1
      `
    }
  }
  if (!assignment?.regional_manager_id) return null

  const regionalManagerId = String(assignment.regional_manager_id)
  const companyShareAmount = Math.round(grossPurchaseValue * REGIONAL_MANAGER_COMPANY_SHARE_RATE * 1e6) / 1e6
  const commissionAmount = Math.round(companyShareAmount * REGIONAL_MANAGER_COMPANY_SHARE_COMMISSION_RATE * 1e6) / 1e6
  if (commissionAmount <= 0) return null

  const sourceKey = `regional_manager:file_folder:${purchaseId}:${regionalManagerId}`
  const client = await getPool().connect()
  try {
    await client.query('BEGIN')
    const walletResult = await client.query(
      `SELECT id,balance_trx FROM wallets
       WHERE user_id=$1::uuid AND is_primary=true
       ORDER BY created_at ASC LIMIT 1 FOR UPDATE`,
      [regionalManagerId],
    )
    const wallet = walletResult.rows[0]
    if (!wallet) {
      await client.query('ROLLBACK')
      throw new Error(`Regional Manager ${regionalManagerId} has no primary wallet`)
    }

    const existing = await client.query(
      `SELECT id FROM ledger_entries
       WHERE user_id=$1::uuid
         AND metadata->>'commerce_type'='regional_manager_file_folder_commission'
         AND metadata->>'source_key'=$2
       LIMIT 1`,
      [regionalManagerId, sourceKey],
    )
    if (existing.rows.length) {
      await client.query('COMMIT')
      return { regionalManagerId, commissionAmount, credited: false, companyShareAmount }
    }

    const before = Number(wallet.balance_trx || 0)
    const updated = await client.query(
      `UPDATE wallets SET balance_trx=balance_trx+$1,updated_at=NOW()
       WHERE id=$2::uuid RETURNING balance_trx`,
      [commissionAmount, wallet.id],
    )
    const after = Number(updated.rows[0]?.balance_trx || before + commissionAmount)
    await client.query(
      `INSERT INTO ledger_entries
       (id,user_id,entry_type,amount,currency,description,balance_before,balance_after,metadata,created_at)
       VALUES (gen_random_uuid(),$1::uuid,'earning',$2,'Flame Coin',$3,$4,$5,
         ($6::jsonb)||jsonb_build_object('commerce_type','regional_manager_file_folder_commission'),NOW())`,
      [
        regionalManagerId, commissionAmount, description, before, after,
        JSON.stringify({
          source_key: sourceKey,
          source_id: purchaseId,
          bridger_id: bridgerId,
          gross_purchase_value: grossPurchaseValue,
          company_share_rate: REGIONAL_MANAGER_COMPANY_SHARE_RATE,
          company_share_amount: companyShareAmount,
          commission_rate_of_company_share: REGIONAL_MANAGER_COMPANY_SHARE_COMMISSION_RATE,
          commission_amount: commissionAmount,
        }),
      ],
    )
    await client.query('COMMIT')
  } catch (error) {
    try { await client.query('ROLLBACK') } catch {}
    console.error('[regional-manager-commission] Failed to credit File Folder commission:', error)
    throw error
  } finally {
    client.release()
  }

  try {
    await sql`
      INSERT INTO notifications (user_id,type,title,content,from_user_name,link)
      VALUES (
        ${regionalManagerId}::uuid,
        'commission',
        'Regional File Folder commission credited',
        ${`Your Regional Manager commission is ${commissionAmount.toFixed(2)} Flame Coin (2% of WEAVE's company share) from a verified File Folder purchase referred by your team Bridger.`},
        'WEAVE',
        '/wallet'
      )
    `
  } catch (error) {
    console.error('[regional-manager-commission] Notification failed:', error)
  }

  return { regionalManagerId, commissionAmount, credited: true, companyShareAmount }
}
