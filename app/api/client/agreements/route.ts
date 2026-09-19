import { NextRequest, NextResponse } from 'next/server'
import { getDb as getFileFolderDb } from '@/lib/company-loops'
import { requireApiUser } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'

const DOCUMENTS = [
  { key: 'client-position', title: 'Client Position & Participation Agreement', version: 'client-position-v1-2026-09-16', required: true, body: 'The Client is a participant in Weave. The Client provides the source material, decisions, cooperation, and direction from which the work is formed. The Client may communicate with Administration, the assigned Bridger, Agents, and Bridge AI through the available company channels. The Client remains responsible for the accuracy of information and authorizations they provide.' },
  { key: 'client-loop-one', title: 'Client Loop One Participation Agreement', version: 'client-loop-one-v1-2026-09-16', required: true, body: 'Loop One is the Client’s first company event after the crossing. Its purpose is to move interaction into recognized work: understanding the Client position, forming the Client’s needs into useful systems, and recording progress. Loop One activates when the Client accepts the applicable agreement. Progress is reviewed by Administration before a subsequent Loop is presented.' },
  { key: 'terms-of-service', title: 'Client Terms of Service', version: 'client-tos-v1-2026-09-16', required: true, body: 'These operating terms govern access to the Client environment and company services. The Client agrees to use the platform lawfully, provide truthful information, protect account credentials, and cooperate with reasonable verification and administration procedures. Specific service terms, notices, and policies may apply to particular transactions or services.' },
  { key: 'system-switch', title: 'System Switch Terms', version: 'system-switch-v1-2026-09-16', required: true, body: 'System Switch is the crossing into Weave through Interaction in Motion. Participation is expressed through interaction, choices, work, and responses rather than a conventional lesson or questionnaire. The resulting record may be used to establish the Client position and determine the company events presented to the Client.' },
  { key: 'file-folder', title: 'File Folder Terms', version: 'file-folder-v1-2026-09-16', required: true, body: 'The File Folder is the Client’s persistent company workspace and record. It may contain the File Number, workshop material, agreements, work records, reports, communications, and other authorized documents. Access is limited to authorized participants and company functions according to applicable permissions and policies.' },
  { key: 'client-services', title: 'Client Services & Platform Terms', version: 'client-services-v1-2026-09-16', required: true, body: 'Client services may include formation, technology, productivity, research, communications, and other systems built from the Client’s interaction. Service scope is defined by the relevant company event, agreement, workshop, or Administration instruction. Availability of a feature does not by itself constitute a promise of a particular commercial result.' },
  { key: 'payment-wallet', title: 'Payment & Wallet Terms', version: 'payment-wallet-v1-2026-09-16', required: true, body: 'Payments, deposits, balances, and wallet activity are recorded through the company’s available payment functions. The Client must verify destination details before authorizing a transfer. A transaction record is maintained according to the applicable company process. Blockchain transfers may be irreversible once confirmed on-chain.' },
  { key: 'settlement', title: 'Withdrawal & Settlement Policy', version: 'settlement-v1-2026-09-16', required: true, body: 'Withdrawals and settlements are subject to the applicable company review, transaction records, account status, and available balance. Where Administration review is required, a request is not a completed settlement until the company process records completion. This policy does not create an automatic entitlement to a particular return.' },
  { key: 'privacy', title: 'Privacy Policy', version: 'privacy-current', required: false, body: 'The Client’s information is handled under the company Privacy Policy published on the platform. The Client should review the current policy before accepting this record. This entry is provided as a document acknowledgement point rather than a replacement for the full published policy.' },
  { key: 'bridge-ai', title: 'Communication & Bridge AI Policy', version: 'bridge-ai-v1-2026-09-16', required: true, body: 'Bridge AI is an AI participant inside the Client environment. It may observe and reflect authorized interaction, assist with company functions, and produce records or reports. AI output is not a substitute for a human authorization where company policy requires Administration or another authorized person to act.' },
  { key: 'acceptable-use', title: 'Acceptable Use & Conduct Policy', version: 'acceptable-use-v1-2026-09-16', required: true, body: 'The Client must not use company systems for unlawful activity, fraud, unauthorized access, harassment, impersonation, malicious interference, or conduct that materially compromises another participant or the company. Administration may restrict access where necessary to protect the system, participants, records, or lawful operations.' },
  { key: 'records-authorization', title: 'Client Records & Authorization Policy', version: 'records-authorization-v1-2026-09-16', required: true, body: 'The Client authorizes the company to maintain records required to operate the Client position, agreements, company events, transactions, and authorized communications. The Client is responsible for reviewing important records and promptly reporting inaccuracies or unauthorized activity.' },
  { key: 'technology-development', title: 'Technology & Systems Development Terms', version: 'technology-development-v1-2026-09-16', required: true, body: 'Systems and tools formed for the Client are developed from the Client’s interaction and the company’s available capabilities. Requirements may evolve as work is reviewed. Ownership, licensing, delivery, hosting, maintenance, and third-party dependencies are governed by the specific project or service terms applicable to the work.' },
  { key: 'notices', title: 'Applicable Notices & Disclosures', version: 'notices-v1-2026-09-16', required: false, body: 'The Client must review notices displayed by Administration or attached to a company event before acting where the notice changes, limits, or explains a service, transaction, deadline, or authorization. A notice may supplement rather than replace the governing agreement.' },
]

async function ensureSchema(sql: ReturnType<typeof getFileFolderDb>) {
  await sql`CREATE TABLE IF NOT EXISTS client_agreements (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), client_id uuid NOT NULL, document_key varchar(120) NOT NULL, document_title varchar(255) NOT NULL, document_version varchar(120) NOT NULL, accepted_at timestamptz NOT NULL DEFAULT NOW(), UNIQUE(client_id, document_key, document_version))`
  await sql`CREATE INDEX IF NOT EXISTS client_agreements_client_idx ON client_agreements(client_id)`
}

export async function GET(request: NextRequest) {
  try {
    const sql = getFileFolderDb()
    const user = await requireApiUser(request)
    const clientId = user?.id
    if (!clientId) return NextResponse.json({ error: 'Client login required' }, { status: 401 })
    await ensureSchema(sql)
    const accepted = await sql`SELECT document_key, document_title, document_version, accepted_at FROM client_agreements WHERE client_id=${clientId}::uuid ORDER BY accepted_at DESC`
    return NextResponse.json({ documents: DOCUMENTS, accepted })
  } catch (error) {
    console.error('[client/agreements] GET error:', error)
    return NextResponse.json({ error: 'Unable to load client documents' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const sql = getFileFolderDb()
    const user = await requireApiUser(request)
    const clientId = user?.id
    if (!clientId) return NextResponse.json({ error: 'Client login required' }, { status: 401 })
    await ensureSchema(sql)
    const body = await request.json()
    const documentKey = String(body.documentKey || '')
    const document = DOCUMENTS.find(item => item.key === documentKey)
    if (!document) return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    if (body.accept !== true) return NextResponse.json({ error: 'Acceptance is required' }, { status: 400 })
    const rows = await sql`INSERT INTO client_agreements (client_id, document_key, document_title, document_version) VALUES (${clientId}::uuid, ${document.key}, ${document.title}, ${document.version}) ON CONFLICT (client_id, document_key, document_version) DO NOTHING RETURNING id, accepted_at`
    return NextResponse.json({ success: true, document: { ...document, accepted_at: rows[0]?.accepted_at || null } })
  } catch (error) {
    console.error('[client/agreements] POST error:', error)
    return NextResponse.json({ error: 'Unable to record acceptance' }, { status: 500 })
  }
}
