import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { sql } from '@/lib/db'
import { VertexAI } from '@google-cloud/vertexai'
import { readFile, readdir } from 'fs/promises'
import { join } from 'path'
import { recordToScroll } from '@/lib/eight'
import { EIGHT_SYSTEM_PROMPT } from '@/lib/eight-constants'

const vertexAI = new VertexAI({
  project: process.env.GOOGLE_CLOUD_PROJECT || 'ssbr-495208',
  location: 'us-central1',
})

const PROJECT_ROOT = process.cwd()

const GOOGLE_AI_MODELS = ['gemini-2.5-flash', 'gemini-2.5-pro']

const TOOLS = [
  {
    functionDeclarations: [
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
        name: 'search_files',
        description: 'Search all project source files for a text pattern, e.g. a function name or a table name, to find where it is used.',
        parameters: {
          type: 'OBJECT',
          properties: {
            pattern: { type: 'STRING' },
            directory: { type: 'STRING' },
          },
          required: ['pattern'],
        },
      },
      {
        name: 'run_select_query',
        description: 'Run a read-only SELECT query against the live database to inspect real data (row counts, sample rows). Only SELECT is allowed.',
        parameters: {
          type: 'OBJECT',
          properties: { query: { type: 'STRING' } },
          required: ['query'],
        },
      },
    ],
  },
]

function redactRow(row: Record<string, any>) {
  const out: Record<string, any> = {}
  for (const [k, v] of Object.entries(row)) {
    out[k] = /password|secret|token|private_key/i.test(k) ? '[REDACTED]' : v
  }
  return out
}

async function toolGetSchema() {
  try {
    const tables = await sql`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' ORDER BY table_name
    `
    const schema: Record<string, any[]> = {}
    for (const t of tables as any[]) {
      const columns = await sql`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = ${t.table_name} AND table_schema = 'public'
        ORDER BY ordinal_position
      `
      schema[t.table_name] = (columns as any[]).map(c => ({
        column: c.column_name,
        type: c.data_type,
        nullable: c.is_nullable === 'YES',
      }))
    }
    return { schema, tableCount: Object.keys(schema).length }
  } catch (err: any) {
    return { error: err.message || 'Schema fetch failed' }
  }
}

async function toolReadFile(filename: string) {
  if (!filename || typeof filename !== 'string') return { error: 'filename required' }
  if (filename.includes('..')) return { error: 'Path traversal not allowed' }
  if (/node_modules|\.next|\.git|\.env|secret|credential/i.test(filename)) {
    return { error: 'Access to this file is restricted' }
  }
  const fullPath = join(PROJECT_ROOT, filename)
  if (!fullPath.startsWith(PROJECT_ROOT)) return { error: 'Invalid path' }
  try {
    const content = await readFile(fullPath, 'utf-8')
    const truncated = content.length > 8000
    return {
      path: filename,
      content: truncated ? content.slice(0, 8000) + '\n...[truncated]' : content,
      truncated,
    }
  } catch {
    return { error: `File not found: ${filename}` }
  }
}

async function toolListFiles(directory: string = '.') {
  const fullPath = join(PROJECT_ROOT, directory)
  if (!fullPath.startsWith(PROJECT_ROOT)) return { error: 'Invalid path' }
  try {
    const entries = await readdir(fullPath, { withFileTypes: true })
    const files = entries
      .filter(e => !e.name.startsWith('.') && e.name !== 'node_modules' && e.name !== '.next')
      .map(e => ({ name: e.name, isDirectory: e.isDirectory() }))
    return { directory, files }
  } catch {
    return { error: `Directory not found: ${directory}` }
  }
}

async function toolSearchFiles(pattern: string, directory: string = '.') {
  if (!pattern) return { error: 'pattern required' }
  const results: Array<{ path: string; line: number; content: string }> = []

  const searchDir = async (dir: string): Promise<void> => {
    if (results.length >= 30) return
    const fullPath = join(PROJECT_ROOT, dir)
    if (!fullPath.startsWith(PROJECT_ROOT)) return
    let entries
    try {
      entries = await readdir(fullPath, { withFileTypes: true })
    } catch {
      return
    }
    for (const e of entries) {
      if (results.length >= 30) return
      if (e.name.startsWith('.') || e.name === 'node_modules' || e.name === '.next') continue
      const entryPath = `${dir}/${e.name}`.replace(/^\.\//, '')
      if (e.isDirectory()) {
        await searchDir(entryPath)
      } else if (e.name.match(/\.(tsx?|jsx?|json|md|css)$/)) {
        try {
          const content = await readFile(join(fullPath, e.name), 'utf-8')
          const lines = content.split('\n')
          lines.forEach((line, idx) => {
            if (results.length < 30 && line.toLowerCase().includes(pattern.toLowerCase())) {
              results.push({ path: entryPath, line: idx + 1, content: line.trim().slice(0, 200) })
            }
          })
        } catch {}
      }
    }
  }

  await searchDir(directory)
  return { pattern, matches: results, count: results.length }
}

async function toolRunSelectQuery(query: string) {
  if (!query || typeof query !== 'string') return { error: 'query required' }
  const trimmed = query.trim()
  const lower = trimmed.toLowerCase()
  if (!lower.startsWith('select') && !lower.startsWith('with')) {
    return { error: 'Only SELECT (or WITH ... SELECT) queries are allowed via this tool.' }
  }
  const blocked = ['insert ', 'update ', 'delete ', 'drop ', 'alter ', 'truncate ', 'grant ', 'revoke ', 'create ']
  if (blocked.some(k => lower.includes(k))) {
    return { error: 'Query contains a disallowed write keyword.' }
  }
  try {
    const rows = await sql(trimmed as any)
    const rowsArr = Array.isArray(rows) ? rows : []
    const limited = rowsArr.slice(0, 50).map(redactRow)
    return { rowCount: rowsArr.length, rows: limited, truncated: rowsArr.length > 50 }
  } catch (err: any) {
    return { error: err.message || 'Query failed' }
  }
}

async function executeTool(name: string, args: any) {
  switch (name) {
    case 'get_schema':
      return toolGetSchema()
    case 'read_file':
      return toolReadFile(args?.filename)
    case 'list_files':
      return toolListFiles(args?.directory || '.')
    case 'search_files':
      return toolSearchFiles(args?.pattern, args?.directory || '.')
    case 'run_select_query':
      return toolRunSelectQuery(args?.query)
    default:
      return { error: `Unknown tool: ${name}` }
  }
}

async function runToolLoop(
  messages: Array<{ role: string; content: string }>,
  systemPrompt: string
): Promise<string> {
  const baseContents = messages.map(msg => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }],
  }))

  let lastError = ''

  for (const modelName of GOOGLE_AI_MODELS) {
    try {
      const model = vertexAI.getGenerativeModel({
        model: modelName,
        systemInstruction: { role: 'system', parts: [{ text: systemPrompt }] },
        tools: TOOLS as any,
      })

      let workingContents: any[] = [...baseContents]
      const MAX_ITERATIONS = 10
      let returned = false

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
          if (text) { returned = true; return text }
          lastError = `Empty response from ${modelName} (finishReason: ${candidate?.finishReason || 'unknown'})`
          break
        }

        workingContents.push({ role: 'model', parts })

        const responseParts: any[] = []
        for (const part of functionCallParts) {
          const { name, args } = (part as any).functionCall
          console.log(`[EIGHT tool call ${iteration + 1}/${MAX_ITERATIONS}] ${modelName} -> ${name}`, args)
          const toolResult = await executeTool(name, args)
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

async function checkAutoSweep(): Promise<void> {
  try {
    const walletsToSweep = await sql`
      SELECT w.id, w.user_id, w.balance_trx, u.name, u.email
      FROM wallets w
      JOIN users u ON w.user_id = u.id
      WHERE w.balance_trx >= 100
      AND NOT EXISTS (
        SELECT 1 FROM fund_sweeps fs
        WHERE fs.user_id = w.user_id
        AND fs.status IN ('pending', 'approved')
      )
      LIMIT 5
    `
    for (const wallet of walletsToSweep) {
      await sql`
        INSERT INTO fund_sweeps (user_id, amount, status, created_at)
        VALUES (${wallet.user_id}::uuid, 100, 'pending', NOW())
      `
    }
  } catch (error) {
    console.error('Error in auto-sweep check:', error)
  }
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

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request)
    if (!authUser || authUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { command, conversationHistory } = await request.json()
    const userId = authUser.id

    if (!command) {
      return NextResponse.json({ error: 'Command required' }, { status: 400 })
    }

    if (userId) {
      await checkAutoSweep()
    }

    const messages: Array<{ role: string; content: string }> = []
    if (conversationHistory && Array.isArray(conversationHistory)) {
      for (const msg of conversationHistory.slice(-10)) {
        messages.push({
          role: msg.role === 'eight' ? 'assistant' : 'user',
          content: msg.content,
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
          content: r.content,
        }))
        messages.unshift(...prior.filter(p => p.content !== command))
      } catch (err) {
        console.error('Failed to load prior EIGHT context:', err)
      }
    }

    const text = await runToolLoop(messages, EIGHT_SYSTEM_PROMPT)

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
