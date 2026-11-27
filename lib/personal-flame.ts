/** Native personal functions are deliberately independent of external models. */
export const PERSONAL_FLAME_OWNER = 'WEAVE'
export const PERSONAL_FLAME_DAILY_MODEL_LIMIT = 20
export const PERSONAL_FLAME_MAX_MESSAGE = 4000
import type {FlameMovement} from '@/lib/flame-environment'
import { flameTeachingReply } from './flame-teaching'
export type PersonalFlameMessage = { role: 'user' | 'assistant'; content: string; mode: 'native' | 'model'; movement?:FlameMovement }

export function personalFlameNativeReply(message: string, history: readonly PersonalFlameMessage[], role?:string): string | null {
  const input = message.trim()
  const command = input.toLowerCase().replace(/[.!?]+$/, '')
  const lastNative=history.filter(m=>m.role==='assistant'&&m.mode==='native').slice(-1)[0]
  const lastInstruction=history.filter(m=>m.role==='user'&&m.mode==='native').slice(-1)[0]
  const roles:Record<string,string>={
    bridger:'Hope: find prospects, communicate respectfully and record genuine responses.',
    agent:'Stability: organize physical orders, stock, delivery and customer records.',
    client:'Dream Lovely: direct your enterprise, build and connect your File Folder systems.',
    admin:'A Time: maintain continuity, verify records and authorize company development.',
    legion:'Legion: carry out the work assigned within your Client employment.'
  }
  if(/^(hello|hi|hey|good (morning|afternoon|evening))( flame)?$/.test(command))
    return 'I am here. '+(role&&roles[role]?roles[role]+' ':'')+'Tell me what you want to understand or carry out.'
  if(/^(thank(s| you)|okay|ok|alright|understood)$/.test(command))return 'Understood. What would you like to continue with?'
  if(/^(how are you|are you there|are you online)$/.test(command))return 'I am available in Weave. I can follow supported directions and check the recorded outcome.'
  if(/^(what (did (i|we) (ask|discuss|say)|were we doing)|remind me what we were doing|where did we stop)$/.test(command))
    return lastInstruction?'Your last native instruction was: '+lastInstruction.content.slice(0,1000)+'. Tell me how you want to continue.':'There is no earlier native instruction in this conversation yet.'
  if(/^(what (should i do|do i do|comes) next|what next|next step|continue|go on)$/.test(command)){
    const d=lastNative?.movement?.directions||[]
    if(d.length)return 'Our last movement was '+lastNative!.movement!.summary+' Next: '+d.map(x=>x.title+' — '+x.detail).join('; ')+'. Tell me which environment to open.'
    return lastInstruction?'We were discussing: '+lastInstruction.content.slice(0,1000)+'. Tell me the next specific direction; I will not repeat a previous action automatically.':role?'Tell me which part of your work or life you want to continue.':null
  }
  if(/^(yes|do it|proceed|go ahead|carry on|repeat that)$/.test(command))return 'Specify the operation you want me to perform. I will not repeat or authorize a previous operation from an ambiguous reply.'
  if(/^(what is my (role|position|work)|what (is|are) my (duties|responsibilities)|what should i be doing)$/.test(command))
    return role&&roles[role]?roles[role]+' Say find my work to explore your registered workshops.':'Your position needs to be established by Weave.'
  if (['help','what can you do','who are you'].includes(command))
    return 'I am Personal Flame, an intelligence belonging to WEAVE, available for your own interaction. Ask about presence or interaction in motion, use reflect for a reflection exercise, write note: followed by a thought, or type my notes to revisit recent notes. For current public information, say web search: followed by a public topic; only that topic goes to the configured search index. Do not include confidential details. Native conversation is available without a model. External assistance, if explicitly enabled, is optional. Say open followed by the exact workshop name, or find followed by the work you need. I can inspect supported records and perform explicitly requested native operations within your position. You retain decisions and authorization.'
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
  return flameTeachingReply(input, history)
}
export function personalFlameModelContext(history: readonly PersonalFlameMessage[], message: string) {
  // Only prior explicitly model-enabled turns; native notes and account records stay out.
  return [...history.filter(m=>m.mode==='model').slice(-8).map(({role,content})=>({role,content})),
    {role:'user' as const,content:message}]
}

/** Local clarification is a conversational response, not a provider error or a fabricated answer. */
export function nativeFlameClarification(message:string,role?:string):string{
 const q=message.trim().slice(0,300)
 return 'I received your direction: “'+q+'”. I have not identified a supported operation or a verified answer yet. '+(role==='client'?'Tell me which File Folder system or build you mean.':role==='admin'?'Tell me which company system or workshop you mean.':'Tell me which workshop, record or activity you mean.')+' I can guide you to a registered environment, inspect supported records, or record a note. No action has been taken.'
}
