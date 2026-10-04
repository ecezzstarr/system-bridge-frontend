import { GoogleGenerativeAI } from '@google/generative-ai'
import { getPool } from '@/lib/db'

export const VIDEO_AD_MIN_SECONDS = 30
export const VIDEO_AD_MAX_SECONDS = 360
export const VIDEO_AD_ASPECT_RATIO = '9:16'

export type VideoAdScene = {
  id: string
  order: number
  durationSeconds: number
  beat: string
  text: string
  visualDirection: string
  voiceover: string
  assetUrl: string | null
  assetType: 'image' | 'video' | null
}

export type VideoAdProject = {
  id: string
  orderId: string | null
  title: string
  subject: string
  objective: string
  audience: string
  durationSeconds: number
  aspectRatio: string
  status: 'draft' | 'planned' | 'rendering' | 'ready' | 'failed'
  storyboard: VideoAdScene[]
  soundtrackUrl: string | null
  outputUrl: string | null
  errorMessage: string | null
  createdAt: string
  updatedAt: string
}

export function clampVideoAdDuration(value: unknown) {
  const seconds = Math.round(Number(value || VIDEO_AD_MIN_SECONDS))
  if (!Number.isFinite(seconds)) return VIDEO_AD_MIN_SECONDS
  return Math.min(VIDEO_AD_MAX_SECONDS, Math.max(VIDEO_AD_MIN_SECONDS, seconds))
}

function sceneCountForDuration(seconds: number) {
  if (seconds <= 45) return 6
  if (seconds <= 60) return 8
  if (seconds <= 90) return 10
  if (seconds <= 120) return 12
  if (seconds <= 180) return 15
  if (seconds <= 240) return 18
  if (seconds <= 300) return 21
  return 24
}

function short(value: unknown, max: number) {
  return String(value || '').trim().slice(0, max)
}

function normalizeScenes(input: any[], durationSeconds: number): VideoAdScene[] {
  const expected = sceneCountForDuration(durationSeconds)
  const source = input.slice(0, expected)
  while (source.length < expected) source.push({})
  const base = Math.floor(durationSeconds / expected)
  const remainder = durationSeconds - base * expected
  const defaultBeats = ['HOOK', 'HUMAN SITUATION', 'TENSION', 'TURN', 'WEAVE REVEAL', 'PROOF', 'CONSEQUENCE', 'FINAL LINE']

  return source.map((scene, index) => ({
    id: short(scene?.id, 48) || `scene-${index + 1}`,
    order: index + 1,
    durationSeconds: base + (index < remainder ? 1 : 0),
    beat: short(scene?.beat, 64) || defaultBeats[Math.min(index, defaultBeats.length - 1)],
    text: short(scene?.text, 160),
    visualDirection: short(scene?.visualDirection, 700),
    voiceover: short(scene?.voiceover, 700),
    assetUrl: null,
    assetType: null,
  }))
}

function fallbackStoryboard(title: string, subject: string, objective: string, durationSeconds: number) {
  const count = sceneCountForDuration(durationSeconds)
  const beats = [
    { beat: 'HOOK', text: 'What changes when the usual way is no longer enough?', visualDirection: `Open on a real human moment connected to ${subject}. No logo. Immediate motion.`, voiceover: '' },
    { beat: 'HUMAN SITUATION', text: '', visualDirection: `Show the person inside the ordinary friction around ${subject}. Keep it observational, not promotional.`, voiceover: `There is a point where the old way starts taking more than it gives.` },
    { beat: 'TENSION', text: 'Too many steps.', visualDirection: 'Cut faster. Show fragmentation, delay or missed movement. One short line only.', voiceover: '' },
    { beat: 'TURN', text: 'What if it had one place?', visualDirection: 'Slow the pace for one beat. Create contrast before the reveal.', voiceover: '' },
    { beat: 'WEAVE REVEAL', text: 'WEAVE', visualDirection: `Reveal the actual environment connected to ${subject}. Show the product functioning, not a poster.`, voiceover: '' },
    { beat: 'PROOF', text: '', visualDirection: `Demonstrate the real movement that proves ${objective}. Use interface, environment, people or operation.`, voiceover: '' },
    { beat: 'CONSEQUENCE', text: '', visualDirection: 'Return to a human consequence. Show what is now possible because the system is working.', voiceover: '' },
    { beat: 'FINAL LINE', text: title.toUpperCase(), visualDirection: 'End with one memorable line. No paragraph and no crowded call-to-action.', voiceover: '' },
  ]
  const expanded = Array.from({ length: count }, (_, index) => beats[Math.min(Math.floor(index * beats.length / count), beats.length - 1)])
  return normalizeScenes(expanded, durationSeconds)
}

export async function ensureVideoAdWorkshopSchema() {
  const pool = getPool()
  await pool.query(`
    CREATE TABLE IF NOT EXISTS admin_video_ad_projects (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      created_by uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      order_id uuid,
      title varchar(160) NOT NULL,
      subject text NOT NULL,
      objective text NOT NULL,
      audience text NOT NULL,
      duration_seconds integer NOT NULL CHECK (duration_seconds BETWEEN 30 AND 360),
      aspect_ratio varchar(10) NOT NULL DEFAULT '9:16',
      status varchar(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','planned','rendering','ready','failed')),
      storyboard jsonb NOT NULL DEFAULT '[]'::jsonb,
      soundtrack_url text,
      output_url text,
      error_message text,
      created_at timestamptz NOT NULL DEFAULT NOW(),
      updated_at timestamptz NOT NULL DEFAULT NOW()
    )
  `)
  await pool.query('ALTER TABLE admin_video_ad_projects ADD COLUMN IF NOT EXISTS order_id uuid')
  await pool.query('CREATE UNIQUE INDEX IF NOT EXISTS admin_video_ad_projects_order_idx ON admin_video_ad_projects(order_id) WHERE order_id IS NOT NULL')
  await pool.query('CREATE INDEX IF NOT EXISTS admin_video_ad_projects_created_idx ON admin_video_ad_projects(created_at DESC)')
}

export async function generateVideoAdStoryboard(input: {
  title: string
  subject: string
  objective: string
  audience: string
  durationSeconds: number
}) {
  const durationSeconds = clampVideoAdDuration(input.durationSeconds)
  const title = short(input.title, 160)
  const subject = short(input.subject, 1200)
  const objective = short(input.objective, 1200)
  const audience = short(input.audience, 700)
  const fallback = fallbackStoryboard(title, subject, objective, durationSeconds)
  const key = process.env.GOOGLE_AI_KEY || process.env.GEMINI_API_KEY
  if (!key) return { scenes: fallback, provider: 'fallback' as const }

  try {
    const ai = new GoogleGenerativeAI(key)
    const model = ai.getGenerativeModel({
      model: process.env.VIDEO_AD_MODEL || process.env.EIGHT_MODEL || 'gemini-1.5-flash',
      generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 7000, temperature: 0.7 },
    })
    const count = sceneCountForDuration(durationSeconds)
    const prompt = `You are forming a WEAVE Video Ad Studio storyboard. Return JSON only in this shape: {"scenes":[{"beat":"HOOK","text":"","visualDirection":"","voiceover":""}]}.

WEAVE VIDEO GRAMMAR:
- It must not feel like an advertisement at the beginning.
- Open immediately with a human problem, question, tension, curiosity or visual contradiction. Do not open with a logo.
- Use one short sentence at a time. Avoid explanatory paragraphs on screen.
- Visuals should keep changing and should feel like real content: human moments, movement, close-ups, environments, demonstrations and cinematic product detail.
- Let the viewer understand the problem before the product appears.
- Treat the product reveal as an event.
- Prove the function visually instead of explaining it with marketing copy.
- Return to human consequence after the proof.
- End with one simple memorable line and the correct business identity.
- Do not invent guarantees, statistics, customers or outcomes.
- Each scene must be materially different from the previous scene.

PROJECT:
Title: ${title}
Subject/product/environment: ${subject}
What the video must achieve: ${objective}
Audience: ${audience}
Duration: ${durationSeconds} seconds
Aspect ratio: ${VIDEO_AD_ASPECT_RATIO}
Scene count: exactly ${count}

Keep on-screen text short enough for mobile viewing. visualDirection must describe what should actually be seen. voiceover may be empty when silence or sound design is stronger.`
    const result = await model.generateContent(prompt)
    const resultText = result.response.text().replace(/^```json\s*/i, '').replace(/```$/i, '').trim()
    const parsed = JSON.parse(resultText)
    const scenes = Array.isArray(parsed?.scenes) ? parsed.scenes : []
    if (!scenes.length) return { scenes: fallback, provider: 'fallback' as const }
    return { scenes: normalizeScenes(scenes, durationSeconds), provider: 'gemini' as const }
  } catch (error) {
    console.error('[Video Ad Studio] storyboard generation failed:', error)
    return { scenes: fallback, provider: 'fallback' as const }
  }
}

export function mapVideoAdProject(row: any): VideoAdProject {
  return {
    id: String(row.id),
    orderId: row.order_id ? String(row.order_id) : null,
    title: String(row.title || ''),
    subject: String(row.subject || ''),
    objective: String(row.objective || ''),
    audience: String(row.audience || ''),
    durationSeconds: Number(row.duration_seconds || VIDEO_AD_MIN_SECONDS),
    aspectRatio: String(row.aspect_ratio || VIDEO_AD_ASPECT_RATIO),
    status: row.status,
    storyboard: Array.isArray(row.storyboard) ? row.storyboard : [],
    soundtrackUrl: row.soundtrack_url || null,
    outputUrl: row.output_url || null,
    errorMessage: row.error_message || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}
