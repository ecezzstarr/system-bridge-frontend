import { NextRequest, NextResponse } from 'next/server'
import { requireWorkshopAuthorization } from '@/lib/workshop-auth'
import { neon } from '@/lib/pg-neon'
import { GoogleGenerativeAI } from '@google/generative-ai'

const EIGHT_COST_TRX = 0.05
const SYSTEM = `You are EIGHT, the system builder AI for Weave/System Switch. Build useful code and system designs from the Administrator's request. You may propose files and SQL migrations, but never claim that code was written, deployed, a transaction occurred, or a balance changed unless the server confirms it. Do not request or emit secrets. Do not propose arbitrary shell execution, filesystem mutation, unrestricted SQL execution, or credential extraction.`

function db() {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL
  if (!url) throw new Error('Database not configured')
  return neon(url)
}

async function chargeAdmin(adminId: string) {
  const sql = db()
  const [wallet] = await sql`SELECT id, balance_trx FROM wallets WHERE user_id=${adminId}::uuid FOR UPDATE`
  if (!wallet) return { success: false, error: 'Administrator wallet not found' }
  const balance = Number(wallet.balance_trx || 0)
  if (balance < EIGHT_COST_TRX) return { success: false, error: `Insufficient TRX. Need ${EIGHT_COST_TRX} TRX.` }
  const next = balance - EIGHT_COST_TRX
  await sql`UPDATE wallets SET balance_trx=${next}, updated_at=NOW() WHERE id=${wallet.id}`
  try {
    await sql`INSERT INTO ledger_entries (id,user_id,entry_type,amount,currency,description,balance_after,created_at) VALUES (gen_random_uuid(),${adminId}::uuid,'eight_usage',${EIGHT_COST_TRX},'TRX','EIGHT developer request',${next},NOW())`
  } catch { /* legacy databases may not yet have ledger_entries */ }
  return { success: true, newBalance: next }
}

function parseBlocks(text: string) {
  const blocks: Array<{ id: string; type: string; filename: string; language: string; code: string; description: string }> = []
  let cleaned = text
  const meta = /```(\w+)::([^:]+)::(\w+)\n([\s\S]*?)```/g
  let match
  while ((match = meta.exec(text)) !== null) {
    const [, language, filename, type, code] = match
    blocks.push({ id: `block-${blocks.length}`, type, filename, language, code: code.trim(), description: `Generated ${type}` })
    cleaned = cleaned.replace(match[0], `[Code: ${filename}]`)
  }
  return { cleaned, blocks }
}

export async function POST(request: NextRequest) {
  const auth = await requireWorkshopAuthorization(request)
  if (!auth.authorized) return auth.response
  try {
    const { command, conversationHistory = [] } = await request.json()
    if (!command || typeof command !== 'string') return NextResponse.json({ success: false, error: 'Command required' }, { status: 400 })
    const adminId = auth.session?.user?.id
    if (!adminId) return NextResponse.json({ success: false, error: 'Administrator identity unavailable' }, { status: 401 })

    const charge = await chargeAdmin(adminId)
    if (!charge.success) return NextResponse.json({ success: false, paid: false, cost: EIGHT_COST_TRX, error: charge.error }, { status: 402 })

    const key = process.env.GOOGLE_AI_KEY || process.env.GEMINI_API_KEY
    if (!key) return NextResponse.json({ success: false, paid: true, cost: EIGHT_COST_TRX, newBalance: charge.newBalance, error: 'Google AI is not configured' }, { status: 503 })

    const ai = new GoogleGenerativeAI(key)
    const model = ai.getGenerativeModel({ model: process.env.EIGHT_MODEL || 'gemini-1.5-flash' })
    const history = Array.isArray(conversationHistory) ? conversationHistory.slice(-8).filter((m: any) => m?.content).map((m: any) => ({ role: m.role === 'eight' || m.role === 'assistant' ? 'model' : 'user', parts: [{ text: String(m.content) }] })) : []
    const chat = model.startChat({ history })
    const result = await chat.sendMessage(`${SYSTEM}\n\nAdministrator request:\n${command}`)
    const parsed = parseBlocks(result.response.text())

    return NextResponse.json({ success: true, message: parsed.cleaned, codeBlocks: parsed.blocks, cost: EIGHT_COST_TRX, paid: true, newBalance: charge.newBalance })
  } catch (error) {
    console.error('EIGHT developer error', error)
    return NextResponse.json({ success: false, paid: false, error: 'EIGHT developer request failed' }, { status: 500 })
  }
}
