/** Native personal functions are deliberately independent of external models. */
export const PERSONAL_FLAME_OWNER = 'WEAVE'
export const PERSONAL_FLAME_DAILY_MODEL_LIMIT = 20
export const PERSONAL_FLAME_MAX_MESSAGE = 4000
import type {FlameMovement} from '@/lib/flame-environment'
export type PersonalFlameMessage = { role: 'user' | 'assistant'; content: string; mode: 'native' | 'model'; movement?:FlameMovement }

export function personalFlameNativeReply(message: string, history: readonly PersonalFlameMessage[]): string | null {
  const input = message.trim()
  const command = input.toLowerCase().replace(/[.!?]+$/, '')
  if (['help','what can you do','who are you'].includes(command))
    return 'I am Personal Flame, an intelligence belonging to WEAVE, available for your own interaction. Ask about presence or interaction in motion, use reflect for a reflection exercise, write note: followed by a thought, or type my notes to revisit recent notes. With your permission, advanced conversation can use an external model for broader questions. Say open followed by the exact workshop name, or find followed by the work you need. I can inspect supported records and perform explicitly requested native operations within your position. You retain decisions and authorization.'
  if (['presence','what is presence','explain presence'].includes(command))
    return 'In the Weave philosophy, presence is being attentive to oneself, others and the environment in which interaction happens. It is a way of understanding participation, not an ability to read minds or control another person. Consider what you are noticing now, what you know, what remains uncertain and what you choose to do next.'
  if (['interaction in motion','what is interaction in motion'].includes(command))
    return 'Interaction in motion connects understanding with action and continuity. An interaction becomes practical when a person listens, decides, acts, observes the outcome and learns from it. What interaction are you trying to understand?'
  if (['reflect','reflection'].includes(command))
    return 'Choose one event from today. Describe what actually happened, how you felt, what you understood, and what is still uncertain. Then identify one action within your control. You can record the thought with note: followed by your own words.'
  if (/^note:\s*\S/i.test(input)) return 'Your note is recorded in this personal conversation. Use my notes to revisit recent notes; clearing the conversation removes these records.'
  if (command === 'my notes') {
    const notes=history.filter(m=>m.role==='user'&&m.mode==='native'&&/^note:\s*\S/i.test(m.content)).slice(-10)
    return notes.length ? 'Recent personal notes:\n'+notes.map((m,i)=>(i+1)+'. '+m.content.replace(/^note:\s*/i,'')).join('\n') : 'No recent notes are recorded. Write note: followed by a thought to begin.'
  }
  return null
}
export function personalFlameModelContext(history: readonly PersonalFlameMessage[], message: string) {
  // Only prior explicitly model-enabled turns; native notes and account records stay out.
  return [...history.filter(m=>m.mode==='model').slice(-8).map(({role,content})=>({role,content})),
    {role:'user' as const,content:message}]
}
