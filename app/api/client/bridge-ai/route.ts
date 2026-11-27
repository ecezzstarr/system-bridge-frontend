import {flameWebQuery,flameWebSearchReply} from '@/lib/flame-web-search'
import { withFlameUsage, flameUsageStatus } from '@/lib/flame-usage'
import { FLAME_INSTITUTION, nativeFlameReply, resolveNativeFolderConnection } from '@/lib/company-flame'
import { NextRequest, NextResponse } from 'next/server'
import { getFileFolderDb, ensureClientFileFolderSchema } from '@/lib/client-file-folder'
import { resolveClientToken } from '@/lib/client-vault'
import { ensureClientWorkshopSchema } from '@/lib/client-system-workshop'
import { ensureFileFolderWorldSchema } from '@/lib/client-file-folder-world'
import { personalFlameNativeReply, nativeFlameClarification, type PersonalFlameMessage } from '@/lib/personal-flame'
import { POST as operateFileFolder } from '@/app/api/client/file-folder-world/route'
import { ensureClientMoneyEnvironment } from '@/lib/client-money-environment'

async function ensureClientBridgeAiMessageSchema(sql: any) {
  await sql`
    CREATE TABLE IF NOT EXISTS client_messages (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id uuid NOT NULL,
      client_name varchar(200),
      position varchar(50) NOT NULL,
      sender_type varchar(20),
      content text NOT NULL,
      is_read boolean DEFAULT false,
      created_at timestamp DEFAULT now()
    )
  `

  const columns = await sql`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='client_messages'
  `
  const names = new Set(columns.map((column: any) => String(column.column_name)))

  if (!names.has('client_name')) {
    await sql`ALTER TABLE client_messages ADD COLUMN IF NOT EXISTS client_name varchar(200)`
  }
  if (!names.has('sender_type')) {
    await sql`ALTER TABLE client_messages ADD COLUMN IF NOT EXISTS sender_type varchar(20)`
  }
  if (!names.has('is_read')) {
    await sql`ALTER TABLE client_messages ADD COLUMN IF NOT EXISTS is_read boolean DEFAULT false`
  }

  if (names.has('sender')) {
    await sql`UPDATE client_messages SET sender_type=COALESCE(sender_type,sender,'client') WHERE sender_type IS NULL`
    await sql`ALTER TABLE client_messages ALTER COLUMN sender DROP NOT NULL`
  } else {
    await sql`UPDATE client_messages SET sender_type='client' WHERE sender_type IS NULL`
  }

  await sql`UPDATE client_messages SET is_read=false WHERE is_read IS NULL`
  await sql`
    CREATE INDEX IF NOT EXISTS idx_client_messages_client_position_created
    ON client_messages(client_id, position, created_at)
  `
}

async function contextFor(request: NextRequest) {
  const sql = getFileFolderDb()
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim() || null
  const clientId = await resolveClientToken(token, sql)
  if (!clientId) return { sql, error: NextResponse.json({ error: 'Client login required' }, { status: 401 }) }

  await ensureClientFileFolderSchema(sql)
  await ensureClientWorkshopSchema(sql)
  await ensureFileFolderWorldSchema(sql)
  await ensureClientBridgeAiMessageSchema(sql)
  await ensureClientMoneyEnvironment(sql, clientId)

  const [userColumnState] = await sql`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='users' AND column_name='referred_by_bridger_id'
    ) AS has_referred_by_bridger_id
  `
  const clientRows = userColumnState?.has_referred_by_bridger_id
    ? await sql`
        SELECT id,name,business_name,file_number,
               COALESCE(referred_by,referred_by_bridger_id) AS assigned_bridger_id
        FROM users
        WHERE id=${clientId}::uuid AND role='client' AND COALESCE(is_active,true)=true
        LIMIT 1
      `
    : await sql`
        SELECT id,name,business_name,file_number,referred_by AS assigned_bridger_id
        FROM users
        WHERE id=${clientId}::uuid AND role='client' AND COALESCE(is_active,true)=true
        LIMIT 1
      `
  const client = clientRows[0]
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

  // Show real work that is still in construction, not just completed systems.
  const builds = await sql`
    SELECT id,title,system_type,status,started_at,completes_at
    FROM client_file_folder_builds
    WHERE client_id=${client.id}::uuid
      AND file_number=${client.file_number}
      AND status IN ('building','funding_gate')
    ORDER BY started_at DESC
    LIMIT 20
  `

  const [bridger] = client.assigned_bridger_id
    ? await sql`
        SELECT id,name
        FROM users
        WHERE id=${client.assigned_bridger_id}::uuid
          AND role='bridger' AND is_active=true
        LIMIT 1
      `
    : []

  return { sql, client, workshop: workshop || null, systems, builds, bridger: bridger || null, crossing, error: null }
}

async function supportHistory(sql: any, clientId: string) {
  return sql`
    SELECT id,sender_type,content,created_at
    FROM (
      SELECT id,sender_type,content,created_at
      FROM client_messages
      WHERE client_id::text=${clientId}
        AND position='bridge_ai'
        AND sender_type IN ('client','bridge_ai','bridger')
      ORDER BY created_at DESC
      LIMIT 100
    ) recent
    ORDER BY created_at ASC
  `
}

export async function GET(request: NextRequest) {
  try {
    const ctx = await contextFor(request)
    if (ctx.error) return ctx.error
    const messages = await supportHistory(ctx.sql, String(ctx.client.id))
    const subscription=await flameUsageStatus(String(ctx.client.id),'client')
    return NextResponse.json({
      success: true,
      identity: {
        name: 'File Folder Flame',
        role: 'WEAVE-owned operational intelligence',
        owner: FLAME_INSTITUTION.owner,
        fileFolderOwner: FLAME_INSTITUTION.fileFolderOwner,
        continuity: ctx.crossing?.id ? 'crossing-linked' : 'client-continuity',
        template: ctx.crossing?.template_name || null,
        assignedBridger: ctx.bridger ? { id: ctx.bridger.id, name: ctx.bridger.name } : null,
      },
      subscription,
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

    const connection=resolveNativeFolderConnection(message,ctx.systems)
    async function record(response:string){
      const [saved]=await ctx.sql`
        WITH instruction AS (
          INSERT INTO client_messages (client_id,client_name,position,sender_type,content,is_read)
          VALUES (${String(ctx.client.id)},${ctx.client.name},'bridge_ai','client',${message},true)
          RETURNING id
        )
        INSERT INTO client_messages (client_id,client_name,position,sender_type,content,is_read)
        SELECT ${String(ctx.client.id)},${ctx.client.name},'bridge_ai','bridge_ai',${response},true
        FROM instruction RETURNING id,sender_type,content,created_at
      `
      return NextResponse.json({success:true,message:saved,native:true},{headers:{'Cache-Control':'private, no-store'}})
    }
    const webQuery=flameWebQuery(message)
    if(webQuery!==null)return await withFlameUsage(String(ctx.client.id),'client','workshop_operation',async()=>{
      try{return await record(await flameWebSearchReply(String(ctx.client.id),webQuery))}
      catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Web search unavailable.'},{status:503})}
    })
    if(connection&&!('error' in connection)){
      // Existing owner-checked operation owns authorization, validation and usage
      // accounting. Do not reserve a second chat fee or execute arbitrary routes.
      const token=request.headers.get('authorization')||''
      const actionRequest=new NextRequest(new URL('/api/client/file-folder-world',request.url),{
        method:'POST',headers:{Authorization:token,'Content-Type':'application/json'},
        body:JSON.stringify({action:'connect_modules',source_system_id:connection.sourceId,target_system_id:connection.targetId})
      })
      const result=await operateFileFolder(actionRequest)
      const data=await result.json()
      if(!result.ok||data.success!==true||!data.connection?.id)return NextResponse.json({error:typeof data.error==='string'?data.error:'The workshop did not confirm this connection. No success is assumed.'},{status:result.ok?409:result.status})
      const state=String(data.connection?.status||'recorded')
      return record('The File Folder workshop confirmed the connection from '+connection.sourceTitle+' to '+connection.targetTitle+'. Recorded state: '+state+'. A configured connection is not proof that an external integration or transfer ran.')
    }
    const historyRows=await supportHistory(ctx.sql,String(ctx.client.id))
    const history:PersonalFlameMessage[]=historyRows.filter((entry:any)=>entry.sender_type==='client'||entry.sender_type==='bridge_ai').slice(-24).map((entry:any)=>({
      role:entry.sender_type==='client'?'user':'assistant',content:String(entry.content||''),mode:'native'
    }))
    const nativeReply=connection&&'error' in connection?connection.error:
      nativeFlameReply(message,{systems:ctx.systems,builds:ctx.builds})??
      (/^(?:note:|my notes\b)/i.test(message)?'This is your shared File Folder support thread. Use Personal Flame for private notes.':personalFlameNativeReply(message,history,'client'))??
      nativeFlameClarification(message,'client')
    return await withFlameUsage(String(ctx.client.id),'client','native_reply',()=>record(nativeReply),body=>body.success===true)
  } catch (error) {
    console.error('[client/bridge-ai POST]', error)
    return NextResponse.json({ error: 'Bridge AI support is unavailable' }, { status: 500 })
  }
}
