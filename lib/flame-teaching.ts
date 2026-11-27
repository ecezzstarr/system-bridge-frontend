/** Native, curated company teaching. Conversation context is not authority. */
import type { PersonalFlameMessage } from './personal-flame'

const lessons = {
  weave: {
    introduction: 'Weave of Presence is a company that connects people, work and enterprise within one environment. You can participate in different ways depending on what you want to develop. Would you like to understand the departments, earning through work, or building your own enterprise?',
    simple: 'Think of Weave as a company with different places to work and build. Some people introduce opportunities, others handle sales and physical delivery, Clients build enterprises, and Administrations maintains the company. Which part would you like to explore?',
    deeper: 'The departments are connected through participation. Hope introduces opportunities, Stability handles physical commerce, Dream Lovely is where Clients develop enterprises, and A Time maintains the systems and records that support them. Would you like an example of how they work together?',
    example: 'Consider a Client developing a business in a File Folder. A Bridger may introduce the opportunity to a prospect, an Agent may distribute eligible physical products, and Administrations maintains the supporting systems. Each person has a different responsibility. Which position interests you?'
  },
  departments: {
    introduction: 'Weave has four departments. Hope is the department of Bridgers; Stability is the department of Agents; Dream Lovely is the department of Clients; A Time is the department of Administrations. Which one would you like to understand?',
    simple: 'Hope introduces opportunities. Stability handles physical commerce. Dream Lovely develops Client enterprises. A Time maintains the company. Where would you like to participate?',
    deeper: 'Each department has its own responsibilities, workshops and permissions. They cooperate without sharing unrestricted authority. Would you like to understand the work of a Bridger, Agent, Client or Administrations?',
    example: 'A Bridger can introduce a File Folder opportunity. The Client can then develop an enterprise, while Administrations maintains the operating systems. Agents handle eligible physical commerce and delivery. Which role should we explore?'
  },
  hope: {
    introduction: 'Hope is the department of Bridgers. A Bridger introduces Weave and its opportunities to people, develops prospects and follows up responsibly. Would you like to understand the daily work or how earnings are determined?',
    simple: 'A Bridger helps a person discover and understand an opportunity. The work involves research, outreach and follow-up, not simply collecting contacts. Would you like an example?',
    deeper: 'Hope connects awareness to informed participation. Bridgers use authorized prospect and outreach workshops, explain opportunities accurately and record progress. Earnings depend on qualifying work and current company rules, not on a promise that every prospect will respond. Would you like to discuss earning or finding your work?',
    example: 'A Bridger can research a prospect, prepare an appropriate introduction and follow up if the person is interested. If the prospect wants to learn more, the Bridger explains the next official step. A response or sale is not guaranteed. Would you like to understand earnings?'
  },
  stability: {
    introduction: 'Stability is the department of Agents. Agents participate in physical sales, product distribution and delivery. Their work connects company products with customers in the physical environment. Would you like to understand the work or earnings?',
    simple: 'An Agent helps products reach customers. That means understanding stock, orders, delivery and customer needs. Would you like an example?',
    deeper: 'Stability requires accurate stock and order records, realistic delivery arrangements and compliance with product and settlement rules. Would you like to explore distribution or earning?',
    example: 'An Agent receives an eligible order, checks stock and delivery requirements, and records the completed transaction through the correct workshop. Actual earnings depend on the applicable product and company rules. Would you like to understand distribution?'
  },
  dream: {
    introduction: 'Dream Lovely is the department of Clients. A Client uses a File Folder as an environment to develop and operate an enterprise. What would you like to build or understand about a File Folder?',
    simple: 'A File Folder is a digital environment for a Client to develop an enterprise using available Weave systems. It is more than a document folder. Would you like an example?',
    deeper: 'A File Folder provides access to the systems and workshops available to its tier and construction state. Flame can help explain and inspect supported operations, while the Client directs the enterprise. Costs, readiness and business results depend on actual conditions. Would you like an example?',
    example: 'A Client developing a store can work toward the required store and customer-facing systems in their File Folder. Flame can guide the Client to supported workshops and explain what remains unfinished. Would you like to understand File Folder development?'
  },
  time: {
    introduction: 'A Time is the department of Administrations. It maintains the company systems, official records and authorized operational oversight. Would you like to understand its responsibility in Weave?',
    simple: 'Administrations keeps the company functioning through authorized maintenance, verification and oversight. It does not mean unrestricted access to private personal memories. Would you like an example?',
    deeper: 'Administrative responsibilities include infrastructure, verification and release management according to assigned permissions. A verified change is different from a proposal. Would you like an example?',
    example: 'When a workshop has a technical problem, authorized Administrations can inspect records, review a correction and manage a release using the proper tools. Flame may assist only through supported, authorized capabilities.'
  },
  flame: {
    introduction: 'I am Flame, Weave-owned intelligence. I can explain the company, help you locate authorized workshops and assist with supported operations. My native abilities have limits. Would you like to understand Flame Words or how I help you work?',
    simple: 'Flame helps you understand and operate Weave through conversation. Flame Words is the memory behind that interaction. Would you like to understand memory or the departments?',
    deeper: 'Flame connects relevant knowledge with current company state and authorized functions. Device-first personal memory is the intended architecture, but the current release still uses account history. Would you like to understand Flame Words?',
    example: 'You can ask me to explain a Bridger, then ask how that work relates to your interests. For supported operations, I can direct you to the correct workshop and distinguish a confirmed outcome from a suggestion.'
  },
  presence: {
    introduction: 'Presence in Weave means being attentive to yourself, others and the environment in which you participate. Interaction in Motion connects that understanding with action and continuity. Would you like a practical example?',
    simple: 'Notice what is happening, understand what it means, decide what you can do, and learn from the result. That is a practical way to understand presence. Would you like an example?',
    deeper: 'Presence does not mean controlling another person or knowing their thoughts. It means taking responsibility for the interaction you can actually observe and influence. Would you like an example?',
    example: 'A Bridger listens to a prospect, understands their question, explains the appropriate opportunity, and observes the response before deciding what to do next. That is interaction in motion.'
  },
  earnings: {
    introduction: 'Earnings in Weave depend on your position and qualifying activities. Bridgers and Agents have different work and compensation mechanisms, and Clients develop their own enterprise. Which position are you asking about?',
    simple: 'There is no single earning promise for everyone. Your role, actual work and current terms determine the applicable compensation. Are you asking about a Bridger, Agent or Client?',
    deeper: 'Use the current official terms and workshop records for fees, commissions, targets and settlement. Historical examples may no longer apply. Which position or activity should we discuss?',
    example: 'A Bridger may receive a qualifying sales commission under current rules; an Agent may receive applicable compensation for eligible product sales. Neither example guarantees income. Which role interests you?'
  },
  words: {
    introduction: 'Flame Words is the memory architecture of Flame: approved company knowledge and each individual’s separate personal continuity. It is intended to help Flame retrieve relevant understanding before replying. Would you like to understand personal memory or company knowledge?',
    simple: 'Company knowledge explains Weave. Your personal memories explain your own previous interactions. They must stay separate and protected. Would you like to understand the storage design?',
    deeper: 'The intended design stores individual conversation memories primarily on their device. Official company transactions and permissions remain on the company system. The current implementation is not yet device-first. Would you like an example?',
    example: 'A Client may recall a prior business decision from personal memory while Flame checks current construction records on Weave. The memory helps explain the intention; the official records confirm what actually exists.'
  },
} as const

type Topic = keyof typeof lessons
type Stage = keyof typeof lessons.weave
const entries = Object.entries(lessons) as [Topic, (typeof lessons)[Topic]][]
const normalize = (value:string) => value.toLowerCase().replace(/[’]/g,"'").trim().replace(/[.!?]+$/,'').replace(/\s+/g,' ')
const aliases: Record<string,Topic> = {
  weave:'weave','weave of presence':'weave',departments:'departments','the departments':'departments',
  hope:'hope',bridger:'hope',bridgers:'hope','a bridger':'hope',
  stability:'stability',agent:'stability',agents:'stability','an agent':'stability',distribution:'stability',
  'dream lovely':'dream',client:'dream',clients:'dream','a client':'dream','file folder':'dream','a file folder':'dream','file folders':'dream','enterprise':'dream','my own enterprise':'dream','building my own enterprise':'dream',
  'a time':'time',administrations:'time',administration:'time',
  flame:'flame','flame intelligence':'flame',presence:'presence','interaction in motion':'presence',
  earnings:'earnings',earning:'earnings','earning through work':'earnings','how to earn':'earnings','making money':'earnings',
  'flame words':'words','personal memory':'words','company knowledge':'words','storage design':'words',
}
function priorLesson(history:readonly PersonalFlameMessage[]):{topic:Topic;stage:Stage}|null {
  const last=history[history.length-1]
  if(last?.role!=='assistant'||last.mode!=='native')return null
  for(const [topic,lesson] of entries){
    for(const stage of ['introduction','simple','deeper','example'] as const)
      if(last.content===lesson[stage])return {topic,stage}
  }
  return null
}
export function flameTeachingReply(message:string,history:readonly PersonalFlameMessage[]):string|null {
  const q=normalize(message)
  const prior=priorLesson(history)
  const subject=q.replace(/^(?:please )?(?:tell me about|teach me about|explain|what is|what are|who is|who are|i want to understand|i want to learn about|i would like to understand|help me understand|how does)\s+/,'').replace(/\s+work$/,'').replace(/^the /,'')
  let topic=aliases[subject]
  if(!topic&&/^(?:how (?:can|do) i (?:earn|make money)(?: (?:in|with|through) weave)?|how do earnings work)$/.test(q))topic='earnings'
  if(!topic&&/^(?:teach me weave|introduce me to weave|i don't understand weave|i am new to weave|i'm new to weave)$/.test(q))topic='weave'
  // Bare topic names are safe to explain; arbitrary requests remain outside this engine.
  if(topic&&Object.prototype.hasOwnProperty.call(lessons,topic))return lessons[topic].introduction
  if(!prior)return null
  if(/^(?:i (?:still )?(?:don't|do not) understand|i am confused|i'm confused|not clear|make it simple|simpler|explain it again|what do you mean|i don't get it)$/.test(q))return lessons[prior.topic].simple
  if(/^(?:example|an example|give me an example|show me an example|a practical example|for example)$/.test(q))return lessons[prior.topic].example
  if(/^(?:yes|yes please|go on|continue|tell me more|more|go deeper|explain further|why|how)$/.test(q)){
    if(prior.stage==='deeper')return lessons[prior.topic].example
    if(prior.stage==='example')return lessons.departments.introduction
    return lessons[prior.topic].deeper
  }
  if(/^(?:daily work|the work|my work|how does the work happen|responsibility|its responsibility|development|file folder development)$/.test(q))return lessons[prior.topic].deeper
  if(/^(?:i understand|i understand now|got it|that makes sense|thank you|thanks|okay|ok)$/.test(q))return 'Understood. We can continue with another part of Weave whenever you are ready. Tell me what you would like to understand or work on next.'
  return null
}
