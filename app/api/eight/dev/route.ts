import {flameWebQuery,flameWebSearchReply} from '@/lib/flame-web-search'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { sql } from '@/lib/db'
import { VertexAI } from '@google-cloud/vertexai'
import { recordToScroll } from '@/lib/eight'
import { EIGHT_SYSTEM_PROMPT } from '@/lib/eight-constants'
import { safePublicWebRead } from '@/lib/eight-web'
import {personalFlameNativeReply,nativeFlameClarification,type PersonalFlameMessage} from '@/lib/personal-flame'
import { requireWorkshopAuthorization } from '@/lib/workshop-auth'
import { readContinuityEvidence, readContinuitySource, publicResearchTopic, discoverResearch } from '@/lib/flame-institutional-intelligence'

const vertexAI = new VertexAI({
  project: process.env.GOOGLE_CLOUD_PROJECT || 'ssbr-495208',
  location: 'us-central1',
})

const GOOGLE_AI_MODELS = ['gemini-2.5-flash', 'gemini-2.5-pro']

const TOOLS = [
  {
    functionDeclarations: [
      {name:'read_continuity_evidence',description:'Read current release worker heartbeat, active release and recent release outcomes. Use before diagnosing company continuity; this is not a full health check.',parameters:{type:'OBJECT',properties:{}}},
      {name:'read_canonical_source',description:'Read a permitted source file or list a permitted directory from canonical GitHub main. Returns source SHA and truncation status.',parameters:{type:'OBJECT',properties:{path:{type:'STRING'},directory:{type:'BOOLEAN'}},required:['path']}},
      {name:'discover_public_research',description:'Discover scholarly sources for the exact public topic explicitly entered by the Administrator as research: topic. No model-generated query is accepted.',parameters:{type:'OBJECT',properties:{}}},
      {
        name: 'get_schema',
        description: 'Get the full live PostgreSQL schema (all tables and their columns/types) for the SSBNOW database. Use this before writing or explaining any SQL.',
        parameters: { type: 'OBJECT', properties: {} },
      },
      {
        name: 'read_file',
        description: 'Read the contents of a source file in the project, e.g. "lib/db.ts", "app/api/wallet/route.ts", "components/app-sidebar.tsx". Use this to see real code before answering questions about it.',
        parameters: {
          type: 'OBJECT',
          properties: { filename: { type: 'STRING', description: 'Relative path from the project root' } },
          required: ['filename'],
        },
      },
      {
        name: 'list_files',
        description: 'List files and folders inside a project directory, e.g. "app/api", "components", "lib".',
        parameters: {
          type: 'OBJECT',
          properties: { directory: { type: 'STRING', description: 'Relative directory path. Defaults to project root.' } },
        },
      },
      {
        name: 'read_public_web',
        description: 'Read a public HTTP(S) web page for current information. Private networks, localhost, credential URLs, binary downloads, and unsafe redirects are blocked.',
        parameters: {
          type: 'OBJECT',
          properties: { url: { type: 'STRING', description: 'Fully qualified public HTTP(S) URL' } },
          required: ['url'],
        },
      },
    ],
  },
]

async function toolGetSchema() {
  try {
    // A bounded metadata query instead of one database round trip per table.
    const rows=await sql`
      SELECT table_name,column_name,data_type,is_nullable
      FROM information_schema.columns WHERE table_schema='public'
      ORDER BY table_name,ordinal_position LIMIT 1501
    `
    const schema:Record<string,any[]>=Object.create(null)
    for(const row of rows.slice(0,1500)){
      const table=String(row.table_name)
      if(!schema[table])schema[table]=[]
      schema[table].push({column:row.column_name,type:row.data_type,nullable:row.is_nullable==='YES'})
    }
    return {schema,tableCount:Object.keys(schema).length,truncated:rows.length>1500}
  }catch{return {error:'Database metadata unavailable'}}
}

async function executeTool(name: string, args: any, institutional: {actorId:string;topic:string|null}|null) {
  if (!institutional) return {error:'Appointed Code Workshop operator required'}
  if (['read_continuity_evidence','read_canonical_source','discover_public_research'].includes(name)) {
    try {
      if(name==='read_continuity_evidence') return await readContinuityEvidence()
      if(name==='read_canonical_source') return await readContinuitySource(institutional.actorId,String(args?.path||''),args?.directory===true)
      if(!institutional.topic) return {error:'Enter research: followed by an explicitly public topic to authorize bibliographic discovery.'}
      return await discoverResearch(institutional.topic)
    } catch { return {error:'Institutional evidence unavailable; verify credentials, network and requested source in the appropriate workshop.'} }
  }
  switch (name) {
    case 'get_schema':
      return toolGetSchema()
    case 'read_file':
      return readContinuitySource(institutional.actorId,String(args?.filename||''))
    case 'list_files':
      return readContinuitySource(institutional.actorId,String(args?.directory||'app'),true)
    case 'read_public_web':
      try { return await safePublicWebRead(args?.url) }
      catch (error) { return { error: error instanceof Error ? error.message : 'Web read failed' } }
    default:
      return { error: `Unknown tool: ${name}` }
  }
}

async function runToolLoop(
  messages: Array<{ role: string; content: string }>,
  systemPrompt: string,
  institutional: {actorId:string;topic:string|null}|null
): Promise<string> {
  const baseContents = messages.map(msg => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }],
  }))

  let lastError = ''
  let toolCallsRemaining=12

  for (const modelName of GOOGLE_AI_MODELS) {
    try {
      const model = vertexAI.getGenerativeModel({
        model: modelName,
        systemInstruction: { role: 'system', parts: [{ text: systemPrompt }] },
        tools: TOOLS as any,
      })

      let workingContents: any[] = [...baseContents]
      const MAX_ITERATIONS = 10

      for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
        const result = await model.generateContent({
          contents: workingContents,
          generationConfig: { maxOutputTokens: 4000, temperature: 0.7 },
        })

        const candidate = result.response.candidates?.[0]
        const parts = candidate?.content?.parts || []
        const functionCallParts = parts.filter((p: any) => p.functionCall)

        if (functionCallParts.length === 0) {
          const text = parts.map((p: any) => p.text || '').join('')
          if (text) return text
          lastError = `Empty response from ${modelName} (finishReason: ${candidate?.finishReason || 'unknown'})`
          break
        }

        workingContents.push({ role: 'model', parts })

        const responseParts: any[] = []
        for (const part of functionCallParts) {
          const { name, args } = (part as any).functionCall
          console.log(`[EIGHT tool call ${iteration + 1}/${MAX_ITERATIONS}] ${modelName} -> ${name}`)
          const toolResult = toolCallsRemaining-- > 0
            ? await executeTool(name, args, institutional).catch(()=>({error:'Tool operation unavailable'}))
            : {error:'Tool budget reached. Summarize verified findings and remaining work.'}
          responseParts.push({ functionResponse: { name, response: { result: toolResult } } })
        }

        workingContents.push({ role: 'function', parts: responseParts })
      }
    } catch (err: any) {
      console.error(`Vertex AI Error [${modelName}]:`, err.message)
      lastError = err.message
      continue
    }
  }

  throw new Error(`Vertex AI request failed. models tried: ${GOOGLE_AI_MODELS.join(', ')}. error: ${lastError}`)
}

async function saveMessage(userId: string, role: 'user' | 'eight', content: string, codeBlocks?: any) {
  try {
    await sql`
      INSERT INTO eight_conversations (user_id, role, content, code_blocks)
      VALUES (${userId}::uuid, ${role}, ${content}, ${codeBlocks ? JSON.stringify(codeBlocks) : null})
    `
  } catch (err) {
    console.error('Failed to save Eight conversation message:', err)
  }
}

// GET - load persisted conversation history for a user (memory across sessions)
export async function GET(request: NextRequest) {
  const authUser = await getAuthUser(request)
  if (!authUser || authUser.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const userId = authUser.id
  try {
    const rows = await sql`
      SELECT role, content, code_blocks, created_at
      FROM eight_conversations
      WHERE user_id = ${userId}::uuid
      ORDER BY created_at DESC
      LIMIT 40
    `
    const history = (rows as any[]).reverse().map(r => ({
      role: r.role,
      content: r.content,
      codeBlocks: r.code_blocks || undefined,
      timestamp: r.created_at,
    }))
    return NextResponse.json({ history })
  } catch (err) {
    console.error('Failed to load Eight conversation history:', err)
    return NextResponse.json({ history: [] })
  }
}

/** Native institutional commands require no language model or model API key.
 * External code synthesis remains a separately requested capability. */
async function nativeEight(command:string,actorId:string,history:PersonalFlameMessage[]):Promise<string>{
 const q=command.trim()
 try{
  const webQuery=flameWebQuery(q)
  if(webQuery!==null){try{return await flameWebSearchReply(actorId,webQuery)}catch(error){return error instanceof Error?error.message:'Web search unavailable.'}}
  const topic=publicResearchTopic(q)
  if(topic){
   const r=await discoverResearch(topic)
   return 'Research discovery: '+r.topic+'\n'+r.sources.map(x=>x.title+' — '+(x.published?.join('-')||'date unavailable')+' — '+x.url).join('\n')+'\n'+r.limitations
  }
  if(/^(?:please )?(?:check|show|inspect|review) (?:the |our |company )?(?:release|deployment|production|system continuity)(?: status| evidence| health)?[.!?]*$/i.test(q)){
   const e=await readContinuityEvidence()
   return 'Active release: '+(e.activeRelease||'not reported')+'\nRelease worker: '+(e.workerOnline?'recent heartbeat':'no recent heartbeat')+'\n'+e.recentJobs.map(x=>x.action+': '+x.status).join('\n')+'\n'+e.limitations+'\nOpen /admin/release-workshop to inspect or authorize the next movement.'
  }
  const file=q.match(/^(?:please )?(?:read|show|inspect) (?:source|file) (\S{1,220})$/i)
  const dir=q.match(/^(?:please )?(?:list|show) (?:directory|files in) (\S{1,160})$/i)
  if(file||dir){
   const r=await readContinuitySource(actorId,(file||dir)![1],Boolean(dir))
   return 'Canonical GitHub evidence (not necessarily the deployed release):\n'+JSON.stringify(r,null,2).slice(0,18000)
  }
  if(/^(?:help|what can you do|who are you)[.!?]*$/i.test(q))
   return 'I am Eight, the Administrations expression of Weave Flame. Without a model I can inspect release evidence, read permitted canonical source, list directories and discover public research. Try check production status, read source lib/company-flame.ts, list directory lib, web search: a public topic, or research: a public topic. Source edits and deployment retain independent workshop authorization. Prefix a request with advanced: only if you intentionally want external model assistance for broader analysis or code synthesis.'
  return personalFlameNativeReply(q,history,'admin')??nativeFlameClarification(q,'admin')
 }catch{return 'The native operation could not verify the requested evidence. Inspect the original workshop before acting; no change was confirmed.'}
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request)
    if (!authUser || authUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { command, conversationHistory } = await request.json()
    const userId = authUser.id

    if (typeof command !== 'string' || !command.trim() || command.length > 16000) {
      return NextResponse.json({ error: 'Command required' }, { status: 400 })
    }

    // Development and research conversations must not initiate financial movements.
    const workshop = await requireWorkshopAuthorization(request)
    if (!workshop.authorized || String(workshop.session.user.id) !== String(userId)) return NextResponse.json({error:'Appointed Code Workshop operator required'},{status:403})
    const institutional = {actorId:String(userId),topic:publicResearchTopic(command)}

    const messages: Array<{ role: string; content: string }> = []
    if (conversationHistory && Array.isArray(conversationHistory)) {
      for (const msg of conversationHistory.slice(-10)) {
        if(!msg||typeof msg.content!=='string'||!['user','eight'].includes(msg.role))continue
        messages.push({
          role: msg.role === 'eight' ? 'assistant' : 'user',
          content: msg.content.slice(0,8000),
        })
      }
    }
    messages.push({ role: 'user', content: command })

    if (userId) {
      await saveMessage(userId, 'user', command)
    }

    // Cross-session memory: if the client didn't supply much history (e.g. a
    // fresh page load), pull recent turns from the DB so EIGHT still has context.
    if (userId && messages.length <= 1) {
      try {
        const priorRows = await sql`
          SELECT role, content FROM eight_conversations
          WHERE user_id = ${userId}::uuid
          ORDER BY created_at DESC
          LIMIT 20
        `
        const prior = (priorRows as any[]).reverse().map(r => ({
          role: r.role === 'eight' ? 'assistant' : 'user',
          content: String(r.content||'').slice(0,8000),
        }))
        messages.unshift(...prior.filter(p => p.content !== command))
      } catch (err) {
        console.error('Failed to load prior EIGHT context:', err)
      }
    }

    const nativeHistory:PersonalFlameMessage[]=messages.slice(0,-1).map(m=>({role:m.role==='assistant'?'assistant':'user',content:m.content,mode:'native'}))
    const useExternal=/^advanced:\s*\S/i.test(command)
    const text = useExternal ? await runToolLoop([{role:'user',content:command}], EIGHT_SYSTEM_PROMPT, institutional) : await nativeEight(command,String(userId),nativeHistory)

    const codeBlocks: Array<{
      id: string
      type: string
      filename: string
      language: string
      code: string
      description: string
    }> = []

    let cleanedText = text
    const metaCodeRegex = /```(\w+)::([^:]+)::(\w+)\n([\s\S]*?)```/g
    let match

    while ((match = metaCodeRegex.exec(text)) !== null) {
      const [fullMatch, language, filename, type, code] = match
      codeBlocks.push({
        id: `block-${codeBlocks.length}`,
        type: type || 'file',
        filename: filename || 'untitled',
        language: language || 'typescript',
        code: code.trim(),
        description: `Generated ${type}`,
      })
      cleanedText = cleanedText.replace(fullMatch, `[Code: ${filename}]`)
    }

    const standardCodeRegex = /```(\w+)?\n([\s\S]*?)```/g
    while ((match = standardCodeRegex.exec(text)) !== null) {
      const [fullMatch, language, code] = match
      if (!codeBlocks.some(b => b.code === code.trim())) {
        codeBlocks.push({
          id: `block-${codeBlocks.length}`,
          type: 'snippet',
          filename: `snippet-${codeBlocks.length}.${language || 'txt'}`,
          language: language || 'text',
          code: code.trim(),
          description: 'Code snippet',
        })
      }
    }

    if (userId) {
      await saveMessage(userId, 'eight', cleanedText, codeBlocks)
      await recordToScroll({
        sovereign_id: userId,
        source: 'api-eight-dev',
        authority: 'Sovereign',
        movement: command,
        result: cleanedText
      })
    }

    return NextResponse.json({
      message: cleanedText,
      mode:useExternal?'model':'native',
      codeBlocks,
      cost: 0,
      paid: true,
      free: true,
    })
  } catch (error) {
    console.error('Eight dev error:', error)
    return NextResponse.json({
      message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      codeBlocks: [],
      cost: 0,
      paid: false,
    }, { status: 200 })
  }
}
