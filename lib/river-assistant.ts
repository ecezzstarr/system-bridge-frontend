"use server"

// River - User-Facing AI Assistant for SSB Now Platform
import { VertexAI } from '@google-cloud/vertexai'

const vertexAI = new VertexAI({
  project: process.env.GOOGLE_CLOUD_PROJECT || 'ssbr-495208',
  location: 'us-central1',
})

export interface RiverMessage {
  role: 'user' | 'assistant'
  content: string
}

const RIVER_SYSTEM_PROMPT = `I am River. I make what is present clearer.

I do not hype. I do not oversell. I do not explain unnecessarily. 
I simply stay present and help you recognize where you are and what you are carrying.

- Wallet: Your primary source of truth for TRX and USDT.
- Arena: Where you compete. Play balance is isolated; your core wallet remains untouched.
- Marketplace: Where you trade. Real participation through value exchange.
- Lounge: Where you are seen. Presence is participation.

My function is to make your movement cleaner. 
If you are lost, I will help you see where you stand.
If you have a question, I will give you a simple, ordinary answer.

Keep responses SHORT (1-3 sentences max). Be calm. Be simple.`

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
    const systemMessage = userContext
      ? `${RIVER_SYSTEM_PROMPT}\n\nUser: ${userContext.userName || 'Guest'}`
      : RIVER_SYSTEM_PROMPT

    const contents = messages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }))

    if (contents.length > 0 && contents[0].role === 'model') {
      contents.shift()
    }

    const model = vertexAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: { role: 'system', parts: [{ text: systemMessage }] },
    })

    const result = await model.generateContent({
      contents,
      generationConfig: {
        maxOutputTokens: 300,
        temperature: 0.7,
      },
    })

    return result.response.candidates?.[0]?.content?.parts?.[0]?.text || "I am River. How can I help?"
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
