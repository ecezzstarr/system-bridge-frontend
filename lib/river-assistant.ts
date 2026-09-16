"use server"

// River - voice to a system-making platform
import { GoogleGenerativeAI } from '@google/generative-ai'

export interface RiverMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface RiverContext {
  systemName?: string
  systemArea?: string
  userId?: string
  userName?: string
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
  ].filter(Boolean)

  return contextLines.length > 0
    ? `${RIVER_SYSTEM_PROMPT}\n\nCurrent system context:\n${contextLines.join('\n')}`
    : RIVER_SYSTEM_PROMPT
}

function getAI(): GoogleGenerativeAI | null {
  const key = process.env.GOOGLE_AI_KEY || process.env.GEMINI_API_KEY
  return key ? new GoogleGenerativeAI(key) : null
}

export async function chatWithRiver(messages: RiverMessage[], userContext?: RiverContext): Promise<string> {
  try {
    const ai = getAI()
    if (!ai) return 'I am River. The connection is not configured yet.'

    const model = ai.getGenerativeModel({
      model: process.env.RIVER_MODEL || process.env.EIGHT_MODEL || 'gemini-1.5-flash',
      systemInstruction: buildSystemMessage(userContext),
    })
    const history = messages
      .slice(-12, -1)
      .filter(message => message?.content)
      .map(message => ({
        role: message.role === 'assistant' ? 'model' as const : 'user' as const,
        parts: [{ text: String(message.content).slice(0, 12000) }],
      }))

    const chat = model.startChat({
      history,
      generationConfig: { maxOutputTokens: 300, temperature: 0.7 },
    })

    const latest = messages[messages.length - 1]
    if (!latest?.content) return 'I am River. How can I help?'

    const result = await chat.sendMessage(String(latest.content).slice(0, 12000))
    return result.response.text() || 'I am River. How can I help?'
  } catch (error) {
    console.error('River assistant error:', error)
    return 'I am having trouble connecting. Please try again.'
  }
}

export async function askRiver(question: string, context?: RiverContext): Promise<string> {
  return chatWithRiver([{ role: 'user', content: question }], context)
}

export async function getPageHelp(page: string, context?: Omit<RiverContext, 'systemArea'>): Promise<string> {
  const helpPrompts: Record<string, string> = {
    wallet: 'Explain what I can understand and do in the wallet from the current system context.',
    marketplace: 'Explain how the marketplace works from the current system context.',
    arena: 'Explain what the Arena is and what I can do there from the current system context.',
    lounge: 'Explain what I can do in the Lounge from the current system context.',
    dashboard: 'Explain what I can understand and do from this dashboard.',
  }
  const prompt = helpPrompts[page] || 'Explain the part of the system I am currently looking at.'
  return chatWithRiver([{ role: 'user', content: prompt }], { ...context, systemArea: page })
}
