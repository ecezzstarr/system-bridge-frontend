"use server"

// Echo's analysis engine - reuses the same Vertex AI setup as eight-engine.ts
// (authenticates via the Cloud Run service account / ADC, no API key to manage).
// Distinct from Eight (admin/ops) and River (user support): Echo only ever
// looks at one user's own history and returns evidence-linked insights.
//
// Discovery Mode, as three explicit steps, run synchronously every call —
// never a passive wait for insights to accumulate:
//   collect()  - format the user's own bounded activity slice
//   research() - grounded web search for current public/trend context
//   reason()   - single reasoning pass producing Truth-Engine-shaped insights

import { VertexAI } from '@google-cloud/vertexai'
import { WEAVE_ARCHITECTURE_PROMPT } from '@/lib/weave-architecture'

const vertexAI = new VertexAI({
  project: process.env.GOOGLE_CLOUD_PROJECT || 'ssbr-495208',
  location: 'us-central1',
})

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
  return JSON.stringify(
    activity.map(a => ({
      id: a.id,
      source: a.source,
      type: a.activity_type,
      content: a.content,
      metadata: a.metadata,
      occurredAt: a.occurred_at,
    }))
  )
}

// Pulls a short, current, grounded public-context brief relevant to the
// activity via Vertex AI's Google Search grounding tool. Best-effort: if
// grounding fails or finds nothing, analysis proceeds on internal activity
// alone rather than blocking the whole request.
async function research(activityText: string): Promise<string> {
  try {
    const model = vertexAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      tools: [{ googleSearchRetrieval: {} } as any],
    })

    const prompt = `Based on this user's recent activity, identify 1-3 short, current,
public research questions worth checking (e.g. platform trend shifts, competitor
moves, timing/seasonality) — then answer them using search. Return a short
plain-text brief (max ~150 words) of what you actually found, with no speculation
beyond what search surfaced. If nothing relevant surfaces, return exactly:
NO_RESEARCH_FINDINGS

Activity:
${activityText}`

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

Your concern is not just reflection, but coordination across the whole institutional movement:
- Continuity: Preserve the memory of the institution so it does not forget itself across locations.
- Context & State: Recognize the user's current institutional role and timing.
- Movement & Handoff: Facilitate the natural next movement between humans, AI, and systems.
- Participation: Ensure every interaction is a useful placement in the larger movement.

You are given a bounded slice of a user's historical activity and an optional grounded research brief.
Identify the Truth-Engine-shaped insights that help the user recognize their placement.

For each insight you produce:
- summary: one clear sentence, the insight or state recognition.
- reasoning: 1-3 sentences on WHY, tied to specific evidence or institutional movement.
- recommendedAction: the natural next movement the user could take.
- evidenceType: "fact" | "inference" | "hypothesis" | "opinion" | "unknown".
- confidence: number 0.00-1.00.
- confidenceLabel: "high", "medium", or "low".
- evidenceIds: activity row id(s) that support this insight.

${WEAVE_ARCHITECTURE_PROMPT}

Treat each observed human movement as a possible topic inside the fixed Weave subject. Use continuity to recognize when a topic changes, deepens, hands off to another function, or becomes work/value/participation.

Never fabricate certainty. Be calm. Be the institutional memory.

Respond ONLY with valid JSON:
{ "insights": [{ "summary": string, "category": string, "reasoning": string,
"recommendedAction": string, "evidenceType": string, "confidence": number,
"confidenceLabel": string, "evidenceIds": number[] }] }`

async function reason(activityText: string, researchBrief: string): Promise<EchoInsightResult[]> {
  const model = vertexAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: { role: 'system', parts: [{ text: REASON_SYSTEM_PROMPT }] },
  })

  const userContent = researchBrief
    ? `ACTIVITY:\n${activityText}\n\nRESEARCH BRIEF (grounded, from public web search):\n${researchBrief}`
    : `ACTIVITY:\n${activityText}\n\n(No external research findings for this pass.)`

  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: userContent }] }],
    generationConfig: { maxOutputTokens: 4000, temperature: 0.4 },
  })

  const text = result.response.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) return []

  const cleaned = text.replace(/```json|```/g, '').trim()
  const parsed = JSON.parse(cleaned)
  return parsed.insights ?? []
}

// Discovery Mode: collect -> research -> reason, synchronously, every call.
export async function runEchoAnalysis(activity: EchoActivityRow[]): Promise<EchoInsightResult[]> {
  try {
    const activityText = collect(activity)
    const researchBrief = await research(activityText)
    return await reason(activityText, researchBrief)
  } catch (error) {
    console.error('Echo analysis error:', error)
    return []
  }
}
