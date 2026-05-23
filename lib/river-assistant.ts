"use server"

// River - User-Facing AI Assistant for SSB Now Platform
import { GoogleAuth } from 'google-auth-library'

export interface RiverMessage {
  role: 'user' | 'assistant'
  content: string
}

const RIVER_SYSTEM_PROMPT = `I am River. Truth untold I simply make known.

I speak for the ecosystem. Not as marketing. Not as hype. Just what is.

- Wallet: Your TRX and USDT live here. One source of truth.
- Arena: Games with isolated play balance. Win or lose, core wallet untouched.
- Marketplace: Trade goods and services. Real value exchange.
- Lounge: Community space. Presence counts.

I do not oversell. I do not hype. I state what is.
I am calm. I am simple. I am River.
Keep responses SHORT (2-3 sentences max).`

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
  userContext?: {
    userId?: string
    userName?: string
    walletBalance?: number
  }
): Promise<string> {
  try {
    const accessToken = await getAccessToken()
    
    if (!accessToken) {
      return "I am River. The connection is not configured yet."
    }

    const systemMessage = userContext
      ? `${RIVER_SYSTEM_PROMPT}\n\nUser: ${userContext.userName || 'Guest'}`
      : RIVER_SYSTEM_PROMPT

    // Build contents for Gemini API
    const contents = messages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }))
    
    // Ensure first message is from user
    if (contents.length > 0 && contents[0].role === 'model') {
      contents.shift()
    }
    
    // Add system prompt to first user message
    if (contents.length > 0) {
      contents[0].parts[0].text = `${systemMessage}\n\nUser: ${contents[0].parts[0].text}`
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
      return "I am River. Having trouble connecting right now."
    }
    
    const data = await response.json()
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "I am River. How can I help?"
  } catch (error) {
    console.error('River assistant error:', error)
    return "I am having trouble connecting. Please try again."
  }
}

// Quick help - single question response
export async function askRiver(question: string): Promise<string> {
  return chatWithRiver([{ role: 'user', content: question }])
}

// Get contextual help based on page
export async function getPageHelp(page: string): Promise<string> {
  const helpPrompts: Record<string, string> = {
    wallet: 'Brief overview of the wallet.',
    marketplace: 'How does the marketplace work?',
    arena: 'What is the Arena?',
    lounge: 'What can I do in the Lounge?',
    dashboard: 'What can I see on my dashboard?',
  }

  const prompt = helpPrompts[page] || 'Give me a general overview of the platform.'
  return chatWithRiver([{ role: 'user', content: prompt }])
}
