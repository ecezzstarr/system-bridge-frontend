/**
 * Immediate Echo: grounded, useful next movements from verified role identity
 * and signals owned by that account. These are not AI-generated predictions.
 */
export type EchoLiveSignals={
  recentActivityCount:number
  lastActivityType:string|null
  lastActivityAt:string|null
  unreadNotifications:number|null
}
export type EchoNextMovement={title:string;detail:string;href:string}
export type EchoImmediateResult={
  role:string
  headline:string
  explanation:string
  generatedAt:string
  signals:EchoLiveSignals
  nextMovements:EchoNextMovement[]
}

const nextByRole:Record<string,EchoNextMovement[]>={
  agent:[
    {title:'Review Agent work',detail:'Inspect stock, current products and verified orders before promising delivery.',href:'/agent/work'},
    {title:'Check your commissions',detail:'Review confirmed commission records; do not treat pending value as earned.',href:'/agent/commissions'},
  ],
  bridger:[
    {title:'Continue a real relationship',detail:'Open Bridge AI to support a responding Prospect or assigned Client.',href:'/bridger/bridge-ai'},
    {title:'Review your Prospect movement',detail:'Use your available candidates and record actual outreach responses.',href:'/weave/market/prospects'},
  ],
  client:[
    {title:'Continue your File Folder',detail:'Inspect actual build state, requirements and the next available system.',href:'/client/system-switch'},
    {title:'Talk with your Bridger',detail:'Ask for help with an existing crossing or File Folder movement.',href:'/client/chat/bridger'},
  ],
  admin:[
    {title:'Review company operations',detail:'Inspect active queues and evidence before authorizing an outcome.',href:'/admin/control-center'},
    {title:'Review employment applications',detail:'Open submitted applications and decide only from verified records.',href:'/admin/employment-applications'},
  ],
  legion:[
    {title:'Continue the assigned Client position',detail:'Use the Legion operating relationship and your assigned Client instructions.',href:'/enterprise/legions-notebook'},
    {title:'Check company messages',detail:'Review current authorized communication before acting.',href:'/communications'},
  ],
}
const fallbackMoves:EchoNextMovement[]=[
  {title:'Return to your WEAVE world',detail:'Open your position and select one available action.',href:'/dashboard'},
]

export function buildImmediateEchoResult(role:string,signals:EchoLiveSignals,now=new Date()):EchoImmediateResult{
  const normalized=String(role||'').toLowerCase()
  const nextMovements=nextByRole[normalized]||fallbackMoves
  const unread=signals.unreadNotifications
  const pending=unread!==null&&unread>0
  const observed=signals.recentActivityCount>0
  return {
    role:normalized,
    headline:pending
      ? `${unread} unread WEAVE notification${unread===1?'':'s'} need your review.`
      : observed
        ? 'Your recent recorded movement is available now.'
        : 'Echo is ready to guide your next movement now.',
    explanation:pending
      ? 'These are unread notifications on your own account. Open the notification bell to inspect the actual message before taking action.'
      : observed
        ? `Echo found ${signals.recentActivityCount} recorded activities from the past seven days. Open the next relevant system or request a deeper analysis now.`
        : 'No Echo activity has been recorded in the past seven days. You can still start with the verified systems below; no months of history are required.',
    generatedAt:now.toISOString(),
    signals,
    nextMovements,
  }
}
