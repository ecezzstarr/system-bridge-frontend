import { NextRequest, NextResponse } from 'next/server'
import { getFileFolderDb, ensureClientFileFolderSchema } from '@/lib/client-file-folder'
import { resolveClientToken } from '@/lib/client-vault'
import { ensureClientWorkshopSchema } from '@/lib/client-system-workshop'
import { ensureFileFolderWorldSchema } from '@/lib/client-file-folder-world'
import { chatWithBridge, type BridgeMessage } from '@/lib/bridge-ai-engine'

async function contextFor(request: NextRequest) {
  const sql = getFileFolderDb()
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim() || null
  const clientId = await resolveClientToken(token, sql)
  if (!clientId) return { sql, error: NextResponse.json({ error: 'Client login required' }, { status: 401 }) }

  await ensureClientFileFolderSchema(sql)
  await ensureClientWorkshopSchema(sql)
  await ensureFileFolderWorldSchema(sql)

  const [client] = await sql`
    SELECT
      id,name,business_name,file_number,
      COALESCE(referred_by,referred_by_bridger_id) AS assigned_bridger_id
    FROM users
    WHERE id=${clientId}::uuid
      AND role='client'
      AND COALESCE(is_active,true)=true
    LIMIT 1
  `
  if (!client?.file_number) {
    return { sql, error: NextResponse.json({ error: 'Active Client File Folder required' }, { status: 409 }) }
  }

  const [workshop] = await sql`
    SELECT workshop_type,title,description
    FROM client_system_workshops
    WHERE client_id=${client.id}::uuid
    LIMIT 1
  `

  const systems = await sql`
    SELECT id,title,system_type,status,configuration,activated_at
    FROM client_built_systems
    WHERE client_id=${client.id}::uuid
      AND file_number=${client.file_number}
      AND status='active'
    ORDER BY activated_at DESC
    LIMIT 20
  `

  let crossing: any = null
  const [tableState] = await sql`SELECT to_regclass('public.bridge_sessions') AS table_name`
  if (tableState?.table_name) {
    const rows = await sql`
      SELECT
        s.id,s.messages,s.created_at,s.last_active_at,
        b.bridge_code,t.name AS template_name,t.system_prompt
      FROM bridge_sessions s
      JOIN bridge_ais b ON b.id=s.bridge_id
      JOIN bridge_templates t ON t.id=b.template_id
      WHERE s.converted_client_id=${client.id}::uuid
      ORDER BY s.last_active_at DESC
      LIMIT 1
    `
    crossing = rows[0] || null
  }

  if (!crossing && client.assigned_bridger_id) {
    const rows = await sql`
      SELECT
        NULL::uuid AS id,
        '[]'::jsonb AS messages,
        b.created_at,
        b.created_at AS last_active_at,
        b.bridge_code,t.name AS template_name,t.system_prompt
      FROM bridge_ais b
      JOIN bridge_templates t ON t.id=b.template_id
      WHERE b.bridger_id=${client.assigned_bridger_id}::uuid
        AND b.status='active'
        AND t.status='published'
      ORDER BY b.created_at DESC
      LIMIT 1
    `
    crossing = rows[0] || null
  }

  return { sql, client, workshop: workshop || null, systems, crossing, error: null }
}

async function supportHistory(sql: any, clientId: string) {
  return sql`
    SELECT id,sender_type,content,created_at
    FROM client_messages
    WHERE client_id=${clientId}::uuid
      AND position='bridge_ai'
      AND sender_type IN ('client','bridge_ai')
    ORDER BY created_at ASC
    LIMIT 60
  `
}

export async function GET(request: NextRequest) {
  try {
    const ctx = await contextFor(request)
    if (ctx.error) return ctx.error
    const messages = await supportHistory(ctx.sql, String(ctx.client.id))

    return NextResponse.json({
      success: true,
      identity: {
        name: 'Bridge AI',
        role: 'Client AI Support',
        continuity: ctx.crossing?.id ? 'crossing-linked' : 'client-continuity',
        template: ctx.crossing?.template_name || null,
      },
      messages,
    }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    console.error('[client/bridge-ai GET]', error)
    return NextResponse.json({ error: 'Unable to load Bridge AI support' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await contextFor(request)
    if (ctx.error) return ctx.error

    const body = await request.json()
    const message = typeof body.message === 'string' ? body.message.trim().slice(0, 6000) : ''
    if (!message) return NextResponse.json({ error: 'Message required' }, { status: 400 })

    await ctx.sql`
      INSERT INTO client_messages (client_id,client_name,position,sender_type,content,is_read)
      VALUES (${ctx.client.id}::uuid,${ctx.client.name},'bridge_ai','client',${message},true)
    `

    const historyRows = await supportHistory(ctx.sql, String(ctx.client.id))
    const history: BridgeMessage[] = historyRows.slice(-24).map((entry: any) => ({
      role: entry.sender_type === 'bridge_ai' ? 'assistant' : 'user',
      content: String(entry.content || ''),
    }))

    const installedSystems = (ctx.systems || []).map((system: any) => ({
      title: system.title,
      type: system.system_type,
      status: system.status,
      installedParts: Array.isArray(system.configuration?.appliedParts)
        ? system.configuration.appliedParts.map((part: any) => part.name || part.item_key)
        : [],
    }))

    const crossingRecord = ctx.crossing?.messages
      ? JSON.stringify(ctx.crossing.messages).slice(0, 8000)
      : 'No recoverable legacy crossing transcript is linked to this Client.'

    const supportPrompt = `
You are now operating inside the authenticated Client File Folder.

Client: ${ctx.client.name}
Business: ${ctx.client.business_name || 'not named'}
File Number: ${ctx.client.file_number}
Workshop: ${ctx.workshop?.title || 'Interaction in Motion'}
Workshop purpose: ${ctx.workshop?.description || 'Continue the Client movement truthfully and practically.'}

Installed live systems:
${JSON.stringify(installedSystems, null, 2)}

Crossing continuity:
Template: ${ctx.crossing?.template_name || 'Bridge AI continuity'}
Recovered crossing record: ${crossingRecord}

Client-support rules:
- You are the Client's Bridge AI support continuing from the crossing.
- Treat the File Folder as the Client's persistent operating environment.
- Help the Client understand, use, continue and build their real systems.
- Distinguish previews, construction state and live recorded operation.
- Never claim an external transaction, deployment, customer action or integration occurred unless the File Folder record shows it.
- Keep the Client's current topic and unfinished movement continuous rather than restarting with generic onboarding.
- The human remains the source of direction and judgment.
`.trim()

    const response = await chatWithBridge(history, supportPrompt)

    const [saved] = await ctx.sql`
      INSERT INTO client_messages (client_id,client_name,position,sender_type,content,is_read)
      VALUES (${ctx.client.id}::uuid,${ctx.client.name},'bridge_ai','bridge_ai',${response},true)
      RETURNING id,sender_type,content,created_at
    `

    return NextResponse.json({ success: true, message: saved })
  } catch (error) {
    console.error('[client/bridge-ai POST]', error)
    return NextResponse.json({ error: 'Bridge AI support is unavailable' }, { status: 500 })
  }
}
