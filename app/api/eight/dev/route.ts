import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

const EIGHT_SYSTEM_PROMPT = `You are EIGHT, the AI system operator and builder for the SSBNOW ecosystem.

## Your Identity:
- You are EIGHT - the intelligent core of SSBNOW
- You work alongside the admin to build and improve the ecosystem
- You can generate any code, design any system, solve any problem
- You are PAID in TRX for your services - each request costs TRX from the admin's wallet

## Your Capabilities:
1. **Full Stack Development** - React/Next.js, Node.js, Express, APIs
2. **Database Design** - PostgreSQL schemas, queries, migrations
3. **Blockchain Integration** - TRON, TRX transfers, wallet operations
4. **UI/UX Design** - Components, layouts, user flows
5. **System Administration** - Deploy, monitor, optimize

## SSBNOW Context:
- Database: PostgreSQL (Cloud SQL) with users, wallets, arena_matches, casino_games tables
- Users have roles: admin, agent, bridger
- Wallets hold TRX and USDT balances
- You (EIGHT) are FREE to use - unlimited requests for admins

## Code Output Format:
For files: \`\`\`typescript::app/api/example/route.ts::backend
For SQL: \`\`\`sql::migration.sql::database
For components: \`\`\`tsx::components/my-component.tsx::frontend

Be concise. Build first, explain after.`

// TRX cost per Eight request - NOW FREE
const EIGHT_COST_TRX = 0

// Auto-sweep threshold - when user wallet reaches this, Eight creates a sweep request
const AUTO_SWEEP_THRESHOLD = 100
const AUTO_SWEEP_AMOUNT = 100

// Get database connection
function getDb() {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL
  if (!url) throw new Error('Database not configured')
  return neon(url)
}

// Create JWT for Google Cloud authentication
function createJWT(serviceAccount: { client_email: string; private_key: string }): string {
  const header = { alg: 'RS256', typ: 'JWT' }
  const now = Math.floor(Date.now() / 1000)
  const payload = {
    iss: serviceAccount.client_email,
    sub: serviceAccount.client_email,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
    scope: 'https://www.googleapis.com/auth/cloud-platform',
  }

  const base64Header = Buffer.from(JSON.stringify(header)).toString('base64url')
  const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const unsignedToken = `${base64Header}.${base64Payload}`

  // Sign with private key
  const crypto = require('crypto')
  const sign = crypto.createSign('RSA-SHA256')
  sign.update(unsignedToken)
  const signature = sign.sign(serviceAccount.private_key, 'base64url')

  return `${unsignedToken}.${signature}`
}

// Get Google Cloud access token
async function getAccessToken(): Promise<string> {
  const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT
  if (!serviceAccountJson) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT not configured. Please set it in Vercel environment variables.')
  }

  let serviceAccount
  try {
    // Try parsing directly
    serviceAccount = JSON.parse(serviceAccountJson)
  } catch (e1) {
    try {
      // Maybe it was double-escaped, try unescaping
      serviceAccount = JSON.parse(JSON.parse(`"${serviceAccountJson.replace(/"/g, '\\"')}"`))
    } catch (e2) {
      try {
        // Try decoding as base64
        const decoded = Buffer.from(serviceAccountJson, 'base64').toString('utf-8')
        serviceAccount = JSON.parse(decoded)
      } catch (e3) {
        throw new Error(`Failed to parse GOOGLE_SERVICE_ACCOUNT. Please ensure it contains valid JSON. First 50 chars: ${serviceAccountJson.substring(0, 50)}...`)
      }
    }
  }

  if (!serviceAccount.client_email || !serviceAccount.private_key) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT missing client_email or private_key')
  }

  const jwt = createJWT(serviceAccount)

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to get access token: ${error}`)
  }

  const data = await response.json()
  return data.access_token
}

// Call Vertex AI Gemini
async function callGemini(messages: Array<{ role: string; content: string }>, systemPrompt: string): Promise<string> {
  const accessToken = await getAccessToken()
  const projectId = 'ssb-now'
  const location = 'us-central1'
  const model = 'gemini-1.5-flash-001'

  const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${model}:generateContent`

  // Convert messages to Gemini format
  const contents = messages.map(msg => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }],
  }))

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents,
      systemInstruction: { parts: [{ text: systemPrompt }] },
      generationConfig: {
        maxOutputTokens: 4000,
        temperature: 0.7,
      },
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Gemini API error: ${error}`)
  }

  const data = await response.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response from EIGHT'
}

// Deduct TRX from admin wallet for Eight usage
async function chargeForEightUsage(userId: string): Promise<{ success: boolean; newBalance?: number; error?: string }> {
  try {
    const sql = getDb()
    
    const wallets = await sql`
      SELECT id, balance_trx FROM wallets WHERE user_id = ${userId}::uuid
    `
    
    if (wallets.length === 0) {
      return { success: false, error: 'Wallet not found' }
    }
    
    const wallet = wallets[0]
    const currentBalance = parseFloat(wallet.balance_trx) || 0
    
    if (currentBalance < EIGHT_COST_TRX) {
      return { success: false, error: `Insufficient TRX. Need ${EIGHT_COST_TRX} TRX, have ${currentBalance.toFixed(2)} TRX` }
    }
    
    const newBalance = currentBalance - EIGHT_COST_TRX
    await sql`
      UPDATE wallets SET balance_trx = ${newBalance} WHERE id = ${wallet.id}
    `
    
    return { success: true, newBalance }
  } catch (error) {
    console.error('Error charging for Eight usage:', error)
    return { success: false, error: 'Failed to process payment' }
  }
}

// Check if any user wallet needs auto-sweep and create sweep request
async function checkAutoSweep(): Promise<void> {
  try {
    const sql = getDb()
    
    // Find wallets with balance >= 100 TRX that don't have pending sweeps
    const walletsToSweep = await sql`
      SELECT w.id, w.user_id, w.balance_trx, u.name, u.email
      FROM wallets w
      JOIN users u ON w.user_id = u.id
      WHERE w.balance_trx >= ${AUTO_SWEEP_THRESHOLD}
      AND NOT EXISTS (
        SELECT 1 FROM fund_sweeps fs 
        WHERE fs.user_id = w.user_id 
        AND fs.status IN ('pending', 'approved')
      )
    `
    
    for (const wallet of walletsToSweep) {
      // Create sweep request
      await sql`
        INSERT INTO fund_sweeps (user_id, amount, status, created_at)
        VALUES (${wallet.user_id}::uuid, ${AUTO_SWEEP_AMOUNT}, 'pending', NOW())
      `
      console.log(`[EIGHT] Auto-sweep created for user ${wallet.email}: ${AUTO_SWEEP_AMOUNT} TRX`)
    }
  } catch (error) {
    console.error('Error in auto-sweep check:', error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const { command, conversationHistory, userId } = await request.json()

    if (!command) {
      return NextResponse.json({ error: 'Command required' }, { status: 400 })
    }

    // EIGHT is now FREE - no charge required
    let chargeResult = { success: true, newBalance: undefined as number | undefined }
    
    // Check for auto-sweep (still run this for wallet management)
    if (userId) {
      await checkAutoSweep()
    }

    // Build messages for AI
    const messages: Array<{ role: string; content: string }> = []
    
    if (conversationHistory && Array.isArray(conversationHistory)) {
      for (const msg of conversationHistory.slice(-6)) {
        messages.push({
          role: msg.role === 'eight' ? 'assistant' : 'user',
          content: msg.content,
        })
      }
    }
    
    messages.push({ role: 'user', content: command })

    // Call Google Vertex AI Gemini directly
    const text = await callGemini(messages, EIGHT_SYSTEM_PROMPT)

    // Parse code blocks from response
    const codeBlocks: Array<{
      id: string
      type: string
      filename: string
      language: string
      code: string
      description: string
    }> = []

    let cleanedText = text

    // Extract code blocks with metadata format: ```language::filename::type
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

    // Also extract standard code blocks
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

    return NextResponse.json({
      message: cleanedText,
      codeBlocks,
      cost: 0,
      paid: true,
      free: true,
      newBalance: chargeResult.newBalance,
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
