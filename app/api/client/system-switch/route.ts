import { NextRequest, NextResponse } from 'next/server'
import { getFileFolderDb, ensureClientFileFolderSchema, ensureCjDoradoFolder, claimFileFolder } from '@/lib/client-file-folder'
import { decodeClientToken, ensureClientVaultSchema } from '@/lib/client-vault'
import { ensureClientWorkshopSchema } from '@/lib/client-system-workshop'

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || null
    const clientId = decodeClientToken(token)
    if (!clientId) return NextResponse.json({ error: 'Client login required' }, { status: 401 })

    const sql = getFileFolderDb()
    await ensureClientFileFolderSchema(sql)
    await ensureClientVaultSchema(sql)
    await ensureClientWorkshopSchema(sql)
    await ensureCjDoradoFolder(sql)

    const [client] = await sql`
      SELECT id,name,email,phone,business_name,file_number,assigned_bridger_id
      FROM clients WHERE id=${clientId}::uuid LIMIT 1
    `
    if (!client) return NextResponse.json({ error: 'Client record not found' }, { status: 404 })

    const folder = client.file_number ? await claimFileFolder(sql, client.id, client.file_number, client.name) : null
    if (!folder) return NextResponse.json({ success:true, verified:false, client, file_folder:null }, { status:200 })

    const [vault] = await sql`SELECT balance,currency FROM client_vaults WHERE client_id=${client.id}::uuid`
    const [workshop] = await sql`SELECT * FROM client_system_workshops WHERE client_id=${client.id}::uuid LIMIT 1`

    const [bridge] = await sql`
      SELECT u.id,u.name,u.username,u.email,u.phone,u.whatsapp_number
      FROM users u WHERE u.id=${client.assigned_bridger_id || '00000000-0000-0000-0000-000000000000'}::uuid AND u.role='bridger' LIMIT 1
    `

    const agents = workshop ? await sql`
      SELECT u.id,u.name,u.username,u.email,u.departmental_code
      FROM client_workshop_agents a JOIN users u ON u.id=a.agent_id
      WHERE a.workshop_id=${workshop.id}::uuid AND a.active=true AND u.role='agent'
      ORDER BY u.name
    ` : []

    const [report] = await sql`
      SELECT id,summary,insights,recommended_actions,source_message_count,created_at
      FROM bridge_ai_reports WHERE client_id=${client.id}::uuid ORDER BY created_at DESC LIMIT 1
    `

    const isCrypto = (workshop?.workshop_type || folder.workshop_type) === 'crypto_exchange'
    return NextResponse.json({
      success:true, verified:true, client, file_folder:folder,
      vault:{ balance:Number(vault?.balance || 0), currency:vault?.currency || 'USDT' },
      workshop:{
        type:workshop?.workshop_type || folder.workshop_type || 'formation',
        title:workshop?.title || (isCrypto ? 'Crypto Exchange Workshop' : 'System Formation Workshop'),
        status:folder.status,
        purpose:workshop?.description || 'Build and form the productive systems and businesses recognized through the Client’s Interaction in Motion.',
        modules:isCrypto ? ['Market','Buy','Sell','Holdings','Orders','Activity','Business Formation','Technology'] : ['Interaction','Formation','Business','Technology','Productivity'],
      },
      bridge:bridge || null,
      approved_agents:agents,
      bridge_ai:{
        available:true,
        name:'Bridge AI',
        purpose:'The AI participant inside the File Folder and System Switch. It works with the Client and Bridge and reports useful insights from prospect and Client interactions back to Administration.',
        last_report:report || null,
      }
    })
  } catch (error:any) {
    console.error('[client/system-switch] error:',error)
    return NextResponse.json({error:error?.message || 'Unable to open System Switch'}, {status:500})
  }
}
