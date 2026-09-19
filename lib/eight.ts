"use server"

/**
 * EIGHT - The Refined Identity & Operating System
 * Based on EIGHT_FULL_REFINEMENT_STRUCTURE.md
 */

import { sql } from '@/lib/db'
import { VertexAI } from '@google-cloud/vertexai'
import OpenAI from 'openai'
import { EIGHT_SYSTEM_PROMPT, ScrollEntry } from './eight-constants'

const vertexAI = new VertexAI({
  project: process.env.GOOGLE_CLOUD_PROJECT || 'ssbr-495208',
  location: 'us-central1',
})

function getOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return null
  return new OpenAI({ apiKey })
}

/**
 * The Scroll - Persistent memory of administrative movement
 */
export async function recordToScroll(entry: ScrollEntry) {
  try {
    const result = await sql`
      INSERT INTO eight_scroll (
        sovereign_id, source, authority, movement, 
        operation, result, verification, 
        deployment_status, rollback_path
      ) VALUES (
        ${entry.sovereign_id}, ${entry.source}, ${entry.authority}, ${entry.movement},
        ${entry.operation || null}, ${entry.result || null}, ${entry.verification || null},
        ${entry.deployment_status || null}, ${entry.rollback_path || null}
      ) RETURNING id
    `
    return { success: true, id: result[0].id }
  } catch (error) {
    console.error('Failed to record to Scroll:', error)
    return { success: false, error }
  }
}

export async function readScroll(sovereignId: string, limit = 50) {
  try {
    const entries = await sql`
      SELECT * FROM eight_scroll 
      WHERE sovereign_id = ${sovereignId}
      ORDER BY created_at DESC 
      LIMIT ${limit}
    `
    return entries
  } catch (error) {
    console.error('Failed to read Scroll:', error)
    return []
  }
}

/**
 * Eight's Primary Interaction Method
 */
export async function eightOperate(
  sovereignId: string,
  input: string,
  context?: {
    source?: string
    current_state?: any
  }
): Promise<{ response: string; movement: string }> {
  // 1. WATCH & UNDERSTAND
  const history = await readScroll(sovereignId, 10)
  const scrollContext = history.reverse().map(h => `[${h.created_at}] ${h.movement}`).join('\n')

  const model = vertexAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    systemInstruction: { role: 'system', parts: [{ text: EIGHT_SYSTEM_PROMPT }] },
  })

  const fullPrompt = `
## THE SCROLL (Recent Movements)
${scrollContext}

## CURRENT CONTEXT
Source: ${context?.source || 'unknown'}
System State: ${JSON.stringify(context?.current_state || {})}

## SOVEREIGN'S WORDS
${input}
`

  const result = await model.generateContent(fullPrompt)
  const response = result.response.candidates?.[0]?.content?.parts?.[0]?.text || "Eight is observing..."

  // 2. RECORD THE MOVEMENT
  await recordToScroll({
    sovereign_id: sovereignId,
    source: context?.source || 'direct',
    authority: 'Sovereign',
    movement: input,
    result: response
  })

  return {
    response,
    movement: input
  }
}

// ===========================================
// LEGACY / SYSTEM OPERATIONS (Maintained for Continuity)
// ===========================================

export interface EightResponse {
  success: boolean
  message: string
  data?: any
  error?: string
}

// River's system prompt - maintained for user interaction
const RIVER_SYSTEM_PROMPT = `You are River, the friendly AI assistant for SSB Now platform users.

Your responsibilities:
- Help users navigate the platform
- Explain features like wallet, earnings, marketplace, and arena
- Assist with transactions and account questions
- Provide friendly, helpful support
- Guide users through the WEAVE experience

You work alongside Eight, who handles backend operations (users don't interact with Eight directly).
Be warm, helpful, and knowledgeable about all platform features.`

export async function askRiver(
  userId: string,
  question: string,
  context?: { userName?: string; walletBalance?: number }
): Promise<{ success: boolean; response: string; error?: string }> {
  try {
    const openai = getOpenAI()
    if (!openai) {
      return { success: false, response: 'River is resting. OpenAI configuration missing.' }
    }
    const contextInfo = context 
      ? `\nUser context: Name: ${context.userName || 'User'}, Wallet Balance: ${context.walletBalance || 0} TRX`
      : ''

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: RIVER_SYSTEM_PROMPT + contextInfo },
        { role: 'user', content: question },
      ],
      temperature: 0.7,
      max_tokens: 300,
    })

    const response = completion.choices[0]?.message?.content || 'I apologize, I couldn\'t process that request.'

    return { success: true, response }
  } catch (error: any) {
    console.error('River error:', error)
    return {
      success: false,
      response: 'I\'m having trouble right now. Please try again.',
      error: error.message,
    }
  }
}

export async function eightHealthCheck(): Promise<{
  status: 'healthy' | 'degraded' | 'down'
  services: Record<string, boolean>
}> {
  const services: Record<string, boolean> = {
    openai: false,
    tron: false,
    flutterwave: false,
  }

  // Check OpenAI
  try {
    const openai = getOpenAI()
    if (openai) {
      await openai.models.list()
      services.openai = true
    }
  } catch {
    services.openai = false
  }

  // Check TRON (via TronGrid)
  try {
    const res = await fetch('https://api.trongrid.io/wallet/getnowblock', {
      headers: { 'TRON-PRO-API-KEY': process.env.TRONGRID_API_KEY || '' },
    })
    services.tron = res.ok
  } catch {
    services.tron = false
  }

  // Check Flutterwave
  try {
    const res = await fetch('https://api.flutterwave.com/v3/banks/NG', {
      headers: { 'Authorization': `Bearer ${process.env.FLW_SECRET_KEY}` },
    })
    services.flutterwave = res.ok
  } catch {
    services.flutterwave = false
  }

  const allHealthy = Object.values(services).every(Boolean)
  const anyHealthy = Object.values(services).some(Boolean)

  return {
    status: allHealthy ? 'healthy' : anyHealthy ? 'degraded' : 'down',
    services,
  }
}

// Standard operations wrapper
export async function eightSweepWallet(
  adminId: string,
  userWallets: Array<{ address: string; amount: number }>,
  companyWallet: string
): Promise<EightResponse> {
  const totalAmount = userWallets.reduce((sum, w) => sum + w.amount, 0)
  
  // Record movement to Scroll first
  await recordToScroll({
    sovereign_id: adminId,
    source: 'system-op',
    authority: 'Sovereign',
    movement: `Initiate wallet sweep of ${totalAmount} TRX to company wallet ${companyWallet}`,
    operation: 'wallet_sweep'
  })

  return {
    success: true,
    message: `Sweep initiated: ${totalAmount} TRX from ${userWallets.length} wallets to ${companyWallet}`,
    data: {
      totalAmount,
      walletsProcessed: userWallets.length,
      companyWallet
    },
  }
}
