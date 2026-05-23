"use server"

// Eight AI Engine - The backend intelligence for SSB Now
// Eight manages the platform, River interacts with users

import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Eight's system prompt - defines its role as the platform manager
const EIGHT_SYSTEM_PROMPT = `You are Eight, the AI engine that powers SSB Now platform.

Your responsibilities:
- Manage platform operations and backend processes
- Handle wallet sweeps and financial operations
- Monitor user activities and transactions
- Provide admin insights and analytics
- Execute platform maintenance tasks

You work alongside River, who handles all user-facing interactions.
You only respond to admin commands and system operations.
Always be precise, secure, and focused on platform integrity.`

// River's system prompt - defines its role as user assistant
const RIVER_SYSTEM_PROMPT = `You are River, the friendly AI assistant for SSB Now platform users.

Your responsibilities:
- Help users navigate the platform
- Explain features like wallet, earnings, marketplace, and arena
- Assist with transactions and account questions
- Provide friendly, helpful support
- Guide users through the Weave of Presence experience

You work alongside Eight, who handles backend operations (users don't interact with Eight directly).
Be warm, helpful, and knowledgeable about all platform features.`

export interface EightCommand {
  type: 'sweep' | 'analytics' | 'maintenance' | 'query' | 'alert'
  payload: Record<string, any>
  adminId: string
}

export interface EightResponse {
  success: boolean
  message: string
  data?: any
  error?: string
}

// Eight processes admin commands
export async function processEightCommand(command: EightCommand): Promise<EightResponse> {
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: EIGHT_SYSTEM_PROMPT },
        { 
          role: 'user', 
          content: `Admin ${command.adminId} requests: ${command.type}\nPayload: ${JSON.stringify(command.payload)}` 
        },
      ],
      temperature: 0.3,
      max_tokens: 500,
    })

    const response = completion.choices[0]?.message?.content || ''

    return {
      success: true,
      message: response,
      data: { commandType: command.type, processedAt: new Date().toISOString() },
    }
  } catch (error: any) {
    console.error('Eight command error:', error)
    return {
      success: false,
      message: 'Command processing failed',
      error: error.message,
    }
  }
}

// River responds to user queries
export async function askRiver(
  userId: string,
  question: string,
  context?: { userName?: string; walletBalance?: number }
): Promise<{ success: boolean; response: string; error?: string }> {
  try {
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

// Eight wallet sweep command
export async function eightSweepWallet(
  adminId: string,
  userWallets: Array<{ address: string; amount: number }>,
  companyWallet: string
): Promise<EightResponse> {
  // Log the sweep operation
  const totalAmount = userWallets.reduce((sum, w) => sum + w.amount, 0)
  
  const command: EightCommand = {
    type: 'sweep',
    payload: {
      userWallets,
      companyWallet,
      totalAmount,
      timestamp: new Date().toISOString(),
    },
    adminId,
  }

  // Process through Eight
  const eightResponse = await processEightCommand(command)

  if (eightResponse.success) {
    return {
      success: true,
      message: `Sweep initiated: ${totalAmount} TRX from ${userWallets.length} wallets to ${companyWallet}`,
      data: {
        totalAmount,
        walletsProcessed: userWallets.length,
        companyWallet,
        eightConfirmation: eightResponse.message,
      },
    }
  }

  return eightResponse
}

// Eight analytics query
export async function eightGetAnalytics(
  adminId: string,
  metric: 'users' | 'transactions' | 'volume' | 'all'
): Promise<EightResponse> {
  const command: EightCommand = {
    type: 'analytics',
    payload: { metric },
    adminId,
  }

  return processEightCommand(command)
}

// Eight system health check
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
    await openai.models.list()
    services.openai = true
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
