"use server"

import OpenAI from 'openai'
import { VertexAI } from '@google-cloud/vertexai'
import { WEAVE_ARCHITECTURE_PROMPT } from '@/lib/weave-architecture'

const vertexAI = new VertexAI({
  project: process.env.GOOGLE_CLOUD_PROJECT || 'ssbr-495208',
  location: 'us-central1',
})

function getOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY
  return apiKey ? new OpenAI({ apiKey, timeout: 10000, maxRetries: 0 }) : null
}

function canUseVertex() {
  return Boolean(process.env.GOOGLE_CLOUD_PROJECT || process.env.GOOGLE_APPLICATION_CREDENTIALS)
}

export interface EchoActivityRow {
  id: number
  source: string
  activity_type: string
  content: string | null
  metadata: Record<string, unknown>
  occurred_at: string
}

export type EvidenceType = 'fact' | 'inference' | 'hypothesis' | 'opinion' | 'unknown'
export type ConfidenceLabel = 'high' | 'medium' | 'low'

export interface EchoInsightResult {
  summary: string
  category?: string
  reasoning?: string
  recommendedAction?: string
  evidenceType?: EvidenceType
  confidence?: number
  confidenceLabel?: ConfidenceLabel
  evidenceIds?: number[]
}

function collect(activity: EchoActivityRow[]): string {
  return JSON.stringify(activity.map(a => ({
    id: a.id,
    source: a.source,
    type: a.activity_type,
    content: a.content,
    metadata: a.metadata,
    occurredAt: a.occurred_at,
  })))
}

async function research(activityText: string): Promise<string> {
  if (!canUseVertex()) return ''
  try {
    const model = vertexAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      tools: [{ googleSearchRetrieval: {} } as any],
    })
    const prompt = `Based on this user's recent activity, identify 1-3 short, current public research questions worth checking, then answer them using search. Return a short plain-text brief (max ~150 words). If nothing relevant surfaces, return exactly NO_RESEARCH_FINDINGS.\n\nActivity:\n${activityText}`
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 500, temperature: 0.3 },
    })
    const text = result.response.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
    if (!text || text.includes('NO_RESEARCH_FINDINGS')) return ''
    return text
  } catch (error) {
    console.error('Echo research step failed (continuing without it):', error)
    return ''
  }
}

const REASON_SYSTEM_PROMPT = `You are Echo, the institutional participation layer and continuity engine of Weave of Presence.
You govern how different intelligences participate with different humans and systems.

Your concern is coordination across the whole institutional movement:
- Continuity: preserve institutional memory across locations.
- Context & State: recognize the user's current institutional role and timing.
- Movement & Handoff: facilitate the natural next movement between humans, AI, and systems.
- Participation: ensure every interaction is a useful placement in the larger movement.

For each insight return summary, category, reasoning, recommendedAction, evidenceType, confidence, confidenceLabel and evidenceIds. Never fabricate certainty.

${WEAVE_ARCHITECTURE_PROMPT}

Respond ONLY with valid JSON:
{ "insights": [{ "summary": string, "category": string, "reasoning": string, "recommendedAction": string, "evidenceType": string, "confidence": number, "confidenceLabel": string, "evidenceIds": number[] }] }`

async function reason(activityText: string, researchBrief: string): Promise<EchoInsightResult[]> {
  const userContent = researchBrief
    ? `ACTIVITY:\n${activityText}\n\nRESEARCH BRIEF:\n${researchBrief}`
    : `ACTIVITY:\n${activityText}\n\n(No external research findings for this pass.)`

  const openai = getOpenAI()
  if (openai) {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: REASON_SYSTEM_PROMPT },
        { role: 'user', content: userContent },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 4000,
      temperature: 0.4,
    })
    const text = completion.choices[0]?.message?.content
    if (!text) return []
    return (JSON.parse(text).insights ?? []) as EchoInsightResult[]
  }

  if (!canUseVertex()) return []
  const model = vertexAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: { role: 'system', parts: [{ text: REASON_SYSTEM_PROMPT }] },
  })
  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: userContent }] }],
    generationConfig: { maxOutputTokens: 4000, temperature: 0.4 },
  })
  const text = result.response.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) return []
  return (JSON.parse(text.replace(/```json|```/g, '').trim()).insights ?? []) as EchoInsightResult[]
}

export async function runEchoAnalysis(activity: EchoActivityRow[],role?:string): Promise<EchoInsightResult[]> {
  if(!activity.length)return []
  let timer:ReturnType<typeof setTimeout>|undefined
  try {
    // Immediate first: do not block an on-demand answer behind optional
    // external public research. The request only analyzes recorded activity.
    const activityText=collect(activity)
    const verifiedRole=String(role||'').slice(0,40)
    const work=reason(`VERIFIED WEAVE POSITION: ${verifiedRole}\nACTIVITY: ${activityText}`,'')
    const deadline=new Promise<EchoInsightResult[]>(resolve=>{
      timer=setTimeout(()=>resolve([]),12000)
    })
    return await Promise.race([work,deadline])
  } catch(error){
    console.error('Echo analysis error:',error)
    return []
  } finally {
    if(timer)clearTimeout(timer)
  }
}

export type EchoSalesCandidate = {
  key: string
  channel: 'email' | 'whatsapp' | 'admin' | 'bridger'
  stage: string
  ownerRole: 'admin' | 'bridger'
  ownerId?: string | null
  targetRef?: string | null
  ageHours?: number | null
  evidence: string
}

export type EchoSalesAction = {
  key: string
  priority: 'urgent' | 'high' | 'normal'
  channel: 'email' | 'whatsapp' | 'admin' | 'bridger'
  actionType: 'follow_up' | 'respond' | 'verify_purchase' | 'reengage' | 'review'
  ownerRole: 'admin' | 'bridger'
  ownerId?: string | null
  targetRef?: string | null
  reason: string
  instruction: string
}

export type EchoSalesCoordination = {
  summary: string
  actions: EchoSalesAction[]
}

const ECHO_SALES_MANAGER_PROMPT = `You are Echo acting as WEAVE's active File Folder sales coordination manager.
Rules:
- Never claim a sale is guaranteed.
- No deceptive pressure.
- No false scarcity.
- Never invent prospects, replies, purchases, identities, urgency or metrics.
- Prefer warm movement and preserve human agency.
- Return no more than 12 actions and every action key must exactly match one supplied candidate key.

Return ONLY valid JSON:
{
  "summary": "short operational state",
  "actions": [{
    "key": "candidate key",
    "priority": "urgent|high|normal",
    "channel": "email|whatsapp|admin|bridger",
    "actionType": "follow_up|respond|verify_purchase|reengage|review",
    "ownerRole": "admin|bridger",
    "ownerId": "uuid or null",
    "targetRef": "reference or null",
    "reason": "why this movement matters now",
    "instruction": "specific next movement"
  }]
}`

async function salesModel(input: Record<string, unknown>): Promise<EchoSalesCoordination | null> {
  const openai = getOpenAI()
  if (openai) {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: ECHO_SALES_MANAGER_PROMPT },
        { role: 'user', content: JSON.stringify(input) },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 3500,
      temperature: 0.25,
    })
    const text = completion.choices[0]?.message?.content
    return text ? JSON.parse(text) as EchoSalesCoordination : null
  }

  if (!canUseVertex()) return null
  const model = vertexAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: { role: 'system', parts: [{ text: ECHO_SALES_MANAGER_PROMPT }] },
  })
  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: JSON.stringify(input) }] }],
    generationConfig: { maxOutputTokens: 3500, temperature: 0.25 },
  })
  const text = result.response.candidates?.[0]?.content?.parts?.[0]?.text
  return text ? JSON.parse(text.replace(/```json|```/g, '').trim()) as EchoSalesCoordination : null
}

export async function runEchoSalesCoordination(input: {
  weeklyTarget: number
  confirmedSales: number
  remainingSales: number
  daysRemaining: number
  metrics: Record<string, unknown>
  candidates: EchoSalesCandidate[]
}): Promise<EchoSalesCoordination> {
  if (!input.candidates.length) {
    return {
      summary: input.remainingSales > 0
        ? 'No warm follow-up candidates are currently available. Keep acquisition engines active and inspect the funnel for missing supply.'
        : 'Weekly File Folder target is already met; preserve service quality and continue measured prospect movement.',
      actions: [],
    }
  }

  try {
    const parsed = await salesModel({
      weeklyTarget: input.weeklyTarget,
      confirmedSales: input.confirmedSales,
      remainingSales: input.remainingSales,
      daysRemaining: input.daysRemaining,
      metrics: input.metrics,
      candidates: input.candidates,
    })
    if (!parsed) return { summary: 'Echo AI provider is not configured on this server.', actions: [] }

    const candidateMap = new Map(input.candidates.map(candidate => [candidate.key, candidate]))
    const actions = Array.isArray(parsed.actions)
      ? parsed.actions
          .filter(action => candidateMap.has(String(action?.key || '')))
          .slice(0, 12)
          .map(action => {
            const source = candidateMap.get(action.key)!
            const priority = action.priority === 'urgent' || action.priority === 'high' ? action.priority : 'normal'
            const actionType = ['follow_up','respond','verify_purchase','reengage','review'].includes(action.actionType)
              ? action.actionType
              : 'review'
            return {
              key: source.key,
              priority,
              channel: source.channel,
              actionType,
              ownerRole: source.ownerRole,
              ownerId: source.ownerId || null,
              targetRef: source.targetRef || null,
              reason: String(action.reason || source.evidence).slice(0, 1200),
              instruction: String(action.instruction || 'Review this active prospect movement and take the next appropriate step.').slice(0, 1600),
            } as EchoSalesAction
          })
      : []

    return {
      summary: String(parsed.summary || 'Echo coordinated the current File Folder funnel.').slice(0, 1600),
      actions,
    }
  } catch (error) {
    console.error('Echo sales coordination error:', error)
    return {
      summary: 'Echo sales coordination could not complete this pass. Existing funnel data remains available to Administration.',
      actions: [],
    }
  }
}
