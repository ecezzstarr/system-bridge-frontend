import type { VideoAdScene } from '@/lib/video-ad-workshop'

/**
 * A book/voice-led production keeps the author's full script verbatim in
 * narration_script. Scene captions are visual excerpts, never the voice source.
 */
export function formOriginalScriptScenes(script: string, durationSeconds: number): VideoAdScene[] {
  if (!script.trim()) throw new Error('Enter the original narration words')
  if (script.length > 3400) throw new Error('For accurate mobile captions, split this text into separate episodes (maximum 3,400 characters each)')
  if (!Number.isInteger(durationSeconds) || durationSeconds < 30 || durationSeconds > 360) {
    throw new Error('Choose a duration from 30 seconds to 6 minutes')
  }

  const words = script.trim().split(/\s+/u)
  const minimumSeconds = Math.ceil(words.length / 2.5)
  if (durationSeconds < minimumSeconds) throw new Error(`The script needs at least ${minimumSeconds} seconds for a measured storyteller voice. Choose a longer duration or split into episodes.`)
  const captionChunks: string[] = []
  let line = ''
  for (const word of words) {
    if (word.length > 110) throw new Error('A word or link is too long for readable video captions')
    if (line && (line + ' ' + word).length > 110) {
      captionChunks.push(line)
      line = word
    } else {
      line = line ? line + ' ' + word : word
    }
  }
  if (line) captionChunks.push(line)
  if (captionChunks.length > 24) throw new Error('Split this script into shorter TikTok episodes (24 caption scenes maximum)')
  if (captionChunks.length > durationSeconds) throw new Error('Narration is too long for the selected video duration')
  const totalWords = captionChunks.map(chunk => chunk.trim().split(/\s+/u).length)
  const count = captionChunks.length
  const available = durationSeconds - count
  const weight = totalWords.reduce((sum, value) => sum + value, 0)
  const durations = totalWords.map(w => 1 + Math.floor(available * w / weight))
  let remainder = durationSeconds - durations.reduce((a, b) => a + b, 0)
  let i = 0
  while (remainder > 0) {
    if (durations[i] < 90) { durations[i]++; remainder-- }
    i = (i + 1) % count
    if (i === 0 && durations.every(d => d >= 90)) throw new Error('Split narration into shorter episodes')
  }
  if (durations.some(d => d > 90)) throw new Error('Split narration into shorter episodes')

  return captionChunks.map((text, index) => ({
    id: `script-scene-${index + 1}`,
    order: index + 1,
    durationSeconds: durations[index],
    beat: index === 0 ? 'OPENING' : index === count - 1 ? 'CONTINUITY' : 'NARRATION',
    text,
    visualDirection: 'Show the scene image or footage while these original words appear. Do not rewrite the author.',
    voiceover: text,
    assetUrl: null,
    assetType: null,
  }))
}
