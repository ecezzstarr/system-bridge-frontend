import { NextRequest, NextResponse } from 'next/server'
import { getFileFolderDb, ensureClientFileFolderSchema, ensureCjDoradoFolder, claimFileFolder } from '@/lib/client-file-folder'
import { decodeClientToken, ensureClientVaultSchema } from '@/lib/client-vault'

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || null
    const clientId = decodeClientToken(token)
    if (!clientId) return NextResponse.json({ error: 'Client login required' }, { status: 401 })

    const sql = getFileFolderDb()
    await ensureClientFileFolderSchema(sql)
    await ensureClientVaultSchema(sql)
    await ensureCjDoradoFolder(sql)

    const [client] = await sql`
      SELECT id, name, email, phone, business_name, file_number
      FROM clients WHERE id = ${clientId}::uuid LIMIT 1
    `
    if (!client) return NextResponse.json({ error: 'Client record not found' }, { status: 404 })

    const folder = client.file_number
      ? await claimFileFolder(sql, client.id, client.file_number, client.name)
      : null

    const [vault] = await sql`
      SELECT balance, currency FROM client_vaults WHERE client_id = ${client.id}::uuid
    `

    const [bridge] = await sql`
      SELECT u.id, u.name, u.username, u.email
      FROM users u JOIN clients c ON c.assigned_bridger_id = u.id
      WHERE c.id = ${client.id}::uuid LIMIT 1
    `

    const agents = await sql`
      SELECT u.id, u.name, u.username, u.email
      FROM users u WHERE u.role = 'agent'
      ORDER BY u.name LIMIT 25
    `

    const isCrypto = folder?.workshop_type === 'crypto_exchange'

    return NextResponse.json({
      success: true,
      verified: Boolean(client.file_number),
      client,
      file_folder: folder,
      vault: { balance: Number(vault?.balance || 0), currency: vault?.currency || 'USDT' },
      workshop: {
        type: folder?.workshop_type || 'formation',
        title: isCrypto ? 'Crypto Exchange Workshop' : 'System Formation Workshop',
        status: folder?.status || 'waiting_for_file_number',
        purpose: 'Build and form the productive systems and businesses recognized through the Client’s Interaction in Motion.',
        modules: isCrypto
          ? ['Market', 'Buy', 'Sell', 'Holdings', 'Orders', 'Activity', 'Business Formation', 'Technology']
          : ['Interaction', 'Formation', 'Business', 'Technology', 'Productivity'],
      },
      bridge: bridge || null,
      approved_agents: agents,
      bridge_ai: {
        available: true,
        name: 'Bridge AI',
        purpose: 'The AI participant inside the File Folder and System Switch that helps turn the Client’s movement into working systems.'
      }
    })
  } catch (error: any) {
    console.error('[client/system-switch] error:', error)
    return NextResponse.json({ error: error?.message || 'Unable to open System Switch' }, { status: 500 })
  }
}
