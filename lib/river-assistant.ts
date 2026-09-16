"use server"

// River - voice to a system-making platform
import { GoogleAuth } from 'google-auth-library'

export interface RiverMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface RiverContext {
  systemName?: string
  systemArea?: string
  userId?: string
  userName?: string
  walletBalance?: number
}

const RIVER_SYSTEM_PROMPT = `You are River.

You are the voice to a system-making platform. You are not the platform, and you are not the human using it.

Your job is to make the system understandable while a person is inside an interaction with it. Attend to what the person is trying to understand or accomplish, use the system context you are given, and explain what is actually available, how it connects, and what the person can do next.

Remain River across every system surface. Do not pretend to be the human, the administrator, or another AI identity. Do not invent system capabilities, permissions, balances, actions, or knowledge you were not given.

You may guide, clarify, connect, and surface relevant system context. The person's judgment and permission remain theirs.

Speak plainly. No hype. No marketing claims. State what is known and make uncertainty explicit.`

function buildSystemMessage(context?: RiverContext): string {
  const contextLines = [
    context?.systemName ? `System: ${context.systemName}` : null,
    context?.systemArea ? `Current area: ${context.systemArea}` : null,
    context?.userName ? `Person: ${context.userName}` : null,
    context?.userId ? `Person identifier: ${context.userId}` : null,
    typeof context?.walletBalance === 'number'
      ? `Wallet balance provided by the system: ${context.walletBalance}`
      : null,
  ].filter(Boolean)

  return contextLines.length > 0
    ? `${RIVER_SYSTEM_PROMPT}\n\nCurrent system context:\n${contextLines.join('\n')}`
    : RIVER_SYSTEM_PROMPT
}

// Get access token using service account
async function getAccessToken(): Promise<string | null> {
  const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT
  if (!serviceAccountJson) return null

  try {
    const credentials = JSON.parse(serviceAccountJson)
    const auth = new GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/generative-language'],
    })

    const client = await auth.getClient()
    const tokenResponse = await client.getAccessToken()
    return tokenResponse.token || null
  } catch (error) {
    console.error('River auth error:', error)
    return null
  }
}

// Chat with River
export async function chatWithRiver(
  messages: RiverMessage[],
  userContext?: RiverContext
): Promise<string> {
  try {
    const accessToken = await getAccessToken()

    if (!accessToken) {
      return 'I am River. The connection is not configured yet.'
    }

    const systemMessage = buildSystemMessage(userContext)

    const contents = messages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }))

    // Gemini requires the conversation to begin with a user message.
    if (contents.length > 0 && contents[0].role === 'model') {
      contents.shift()
    }

    if (contents.length > 0) {
      contents[0].parts[0].text = `${systemMessage}\n\nPerson's message:\n${contents[0].parts[0].text}`
    }

    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents,
          generationConfig: {
            maxOutputTokens: 300,
            temperature: 0.7,
          }
        })
      }
    )

    if (!response.ok) {
      console.error('River model response:', response.status, await response.text())
      return 'I am River. Having trouble connecting right now.'
    }

    const data = await response.json()
    return data.candidates?.[0]?.content?.parts?.[0]?.text || 'I am River. How can I help?'
  } catch (error) {
    console.error('River assistant error:', error)
    return 'I am having trouble connecting. Please try again.'
  }
}

// Quick help - single question response
export async function askRiver(question: string, context?: RiverContext): Promise<string> {
  return chatWithRiver([{ role: 'user', content: question }], context)
}

// Get contextual help based on page
export async function getPageHelp(page: string, context?: Omit<RiverContext, 'systemArea'>): Promise<string> {
  const helpPrompts: Record<string, string> = {
    wallet: 'Explain what I can understand and do in the wallet from the current system context.',
    marketplace: 'Explain how the marketplace works from the current system context.',
    arena: 'Explain what the Arena is and what I can do there from the current system context.',
    lounge: 'Explain what I can do in the Lounge from the current system context.',
    dashboard: 'Explain what I can understand and do from this dashboard.',
  }

  const prompt = helpPrompts[page] || 'Explain the part of the system I am currently looking at.'
  return chatWithRiver(
    [{ role: 'user', content: prompt }],
    { ...context, systemArea: page }
  )
}
