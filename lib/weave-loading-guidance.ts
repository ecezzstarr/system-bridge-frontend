/**
 * Loading is the first stage of guided operation, not an advertisement.
 * This file is intentionally deterministic: it teaches verified routes and
 * does not infer completed work or financial state from page visits.
 */
export type WeaveLoadingRole = 'agent' | 'bridger' | 'client' | 'admin' | 'visitor'
export type WeaveLoadingBrief = {
  eyebrow: string
  title: string
  body: string
  movement: string
}
/**
 * A loader lyric is an existing lesson broken into short reading beats.
 * Preserve every word in the original message: never invent a new offer,
 * payment status, construction completion, or user-specific achievement.
 */
export function lyricLinesForBrief(brief:WeaveLoadingBrief):readonly string[] {
  const words=brief.body.trim().split(/\s+/).filter(Boolean)
  const bodyLines:string[]=[]
  const bodyLineCount=Math.min(3,words.length)
  let offset=0
  for(let line=0;line<bodyLineCount;line++){
    const remaining=words.length-offset
    const available=bodyLineCount-line
    const size=Math.ceil(remaining/available)
    bodyLines.push(words.slice(offset,offset+size).join(' '))
    offset+=size
  }
  return [brief.title.trim(),...bodyLines,brief.movement.trim()].filter(Boolean)
}

export type WeaveOperatingGuide = {
  title: string
  explanation: string
  steps: readonly string[]
  nextHref: string
  nextLabel: string
}

const PLATFORM_TRAINING: readonly WeaveLoadingBrief[] = [
  {
    eyebrow:'WEAVE · SYSTEM INTRODUCTION',
    title:'What is WEAVE?',
    body:'WEAVE of Presence develops systems, products and practical ways to participate. System Switch connects a person to work they can operate; Bridge Radiance makes that continuation visible.',
    movement:'Notice → Recognize → Solve → Move',
  },
  {
    eyebrow:'WEAVE · FOUR POSITIONS',
    title:'Know who operates each part.',
    body:'Agents maintain Stability. Bridgers connect Prospects with Client opportunities. Clients own their File Folders and businesses. Administration verifies and organizes the institution.',
    movement:'Agent · Bridger · Client · Administration',
  },
  {
    eyebrow:'WEAVE · HOW TO BEGIN',
    title:'Choose one real action.',
    body:'Enter through your correct position. Open its working systems, follow the instructions for an actual activity, and verify the outcome before you continue.',
    movement:'Choose a system → operate → verify → continue',
  },
]

const AGENT_TRAINING: readonly WeaveLoadingBrief[] = [
  {
    eyebrow:'AGENT TRAINING · 1 OF 3',
    title:'Your position is Stability.',
    body:'WEAVE operates product sales, services and systems. As an Agent you can participate in commerce, use your Carrier Door and take creative work from businesses. You do not need to learn everything at once.',
    movement:'Recognize Agent position → choose one working system',
  },
  {
    eyebrow:'AGENT TRAINING · 2 OF 3',
    title:'Learn the work before spending.',
    body:'Agent Work leads to food products, stock and selling. Creative Studio lets you make image layouts free and produce videos at the Agent Studio fee of up to 1.5 Flame Coin. Customer selling prices are separate.',
    movement:'Agent Work → product or creative service → customer',
  },
  {
    eyebrow:'AGENT TRAINING · 3 OF 3',
    title:'Make your first verified movement.',
    body:'Open Agent Work or Creative Studio. Check the details and price, complete one practical task, then confirm the order, delivery or receipt. Use the instructions on the working page for the next step.',
    movement:'Open → learn → act → verify',
  },
]

const BRIDGER_TRAINING: readonly WeaveLoadingBrief[] = [
  {
    eyebrow:'BRIDGER TRAINING · 1 OF 3',
    title:'Your position is Hope.',
    body:'WEAVE builds operating systems. Bridgers approach potential Prospects, listen to what people need, and help interested people understand Client File Folder ownership and use.',
    movement:'Prospect possibility → contact → response',
  },
  {
    eyebrow:'BRIDGER TRAINING · 2 OF 3',
    title:'A contact is not yet a Client.',
    body:'A number or lead is unverified until a real person responds. Use the authorized Prospect tools, respect a person who declines and record the actual response.',
    movement:'Receive candidate → attempt → recognize response',
  },
  {
    eyebrow:'BRIDGER TRAINING · 3 OF 3',
    title:'Carry an informed crossing.',
    body:'When a Prospect asks to continue, explain what the File Folder does, the real charges and the verification process. Give their authorized Bridge AI entrance, not an invented promise.',
    movement:'Explain → consent → System Switch → verified ownership',
  },
]

const CLIENT_TRAINING: readonly WeaveLoadingBrief[] = [
  {
    eyebrow:'CLIENT TRAINING · 1 OF 3',
    title:'Your File Folder is an operating world.',
    body:'A Client owns the business and chooses the systems to build. The File Folder connects previews, construction, activation and actual use in one place.',
    movement:'Recognize → preview → build → activate → operate',
  },
  {
    eyebrow:'CLIENT TRAINING · 2 OF 3',
    title:'A build uses real time.',
    body:'Preview the system before buying materials or starting construction. Check the indicated build time and live status; a started build should not be described as finished.',
    movement:'Inspect requirements → start build → monitor real status',
  },
  {
    eyebrow:'CLIENT TRAINING · 3 OF 3',
    title:'Operate what you have built.',
    body:'Once a system is actually active, configure its Customer Door or work functions. Verified orders, payments and customers are distinct from a preview or plan.',
    movement:'Activate → publish authorized door → operate',
  },
]

const ADMIN_TRAINING: readonly WeaveLoadingBrief[] = [
  {
    eyebrow:'ADMINISTRATION · 1 OF 3',
    title:'WEAVE operates through verified roles.',
    body:'Administration organizes work across Agents, Bridgers and Clients. Review the current position, permissions and pending evidence before taking action.',
    movement:'Identify → review → authorize',
  },
  {
    eyebrow:'ADMINISTRATION · 2 OF 3',
    title:'Separate a request from proof.',
    body:'A pending payment, submitted order or claimed production is not automatically confirmed. Use the authorized verification, approval and receipt systems.',
    movement:'Request → evidence → Forensics → confirmation',
  },
  {
    eyebrow:'ADMINISTRATION · 3 OF 3',
    title:'Keep work continuous.',
    body:'Check exceptions, outstanding orders and support requests. Changes to charges, roles or content must come from the correct workshop and be recorded.',
    movement:'Recognize exception → resolve → record → continue',
  },
]

export function trainingBriefsForRole(role: WeaveLoadingRole): readonly WeaveLoadingBrief[] {
  if(role==='agent') return AGENT_TRAINING
  if(role==='bridger') return BRIDGER_TRAINING
  if(role==='client') return CLIENT_TRAINING
  if(role==='admin') return ADMIN_TRAINING
  return PLATFORM_TRAINING
}

const DEFAULT_AGENT_GUIDE: WeaveOperatingGuide = {
  title:'Start with one working system',
  explanation:'WEAVE Agents support Stability through product commerce, service work and verified customer operations.',
  steps:[
    'Open Agent Work to see products and their actual ordering entrances.',
    'Choose one product to sell or open Creative Studio for business media.',
    'Check the real order status, completed production or receipt before reporting success.',
  ],
  nextHref:'/agent/work',
  nextLabel:'Open Agent Work',
}

const AGENT_GUIDES: ReadonlyArray<{match:(path:string)=>boolean;guide:WeaveOperatingGuide}> = [
  {match:path=>path.startsWith('/agent/creative')||path.startsWith('/video-ad-studio'),guide:{
    title:'Create and deliver business media',
    explanation:'Use Creative Studio for images or the Video Studio for paid video work. Agents control what they quote outside customers.',
    steps:[
      'Choose an image layout or a video package; review the displayed Agent Studio fee.',
      'Use approved customer photos, instructions and properly licensed music.',
      'Preview, produce and deliver the actual output; confirm any payment through the real receipt flow.',
    ],
    nextHref:'/agent/creative',nextLabel:'Open Creative Studio',
  }},
  {match:path=>path.startsWith('/weave/carrier/food'),guide:{
    title:'Operate your Carrier Door',
    explanation:'Your Carrier Door is the customer entrance, while the product order and payment record remain separate verified operations.',
    steps:[
      'Check which products are currently offered on your door.',
      'Share the correct door link with a customer and confirm their selected order.',
      'Wait for actual payment/fulfillment confirmation before describing an order as completed.',
    ],
    nextHref:'/weave/carrier/food',nextLabel:'View Carrier Door',
  }},
  {match:path=>path.startsWith('/agility')||path.startsWith('/electrolyte')||path.startsWith('/ember')||path.startsWith('/agent/cakes')||path.startsWith('/agent/distribution'),guide:{
    title:'Move food stock responsibly',
    explanation:'Agent product work connects real stock, customer orders and permitted distribution.',
    steps:[
      'Check the current product variant, retail price and stock requirements.',
      'Record your order or customer request through the operating page.',
      'Check company verification and fulfillment before telling customers an order is ready.',
    ],
    nextHref:'/agent/work',nextLabel:'View Agent product work',
  }},
  {match:path=>path.startsWith('/agent/commissions')||path.startsWith('/referrals'),guide:{
    title:'Understand what counts as earnings',
    explanation:'A referral or order becomes income only after the required qualifying activity and record.',
    steps:[
      'Use your authorized referral or commission entrance.',
      'Understand the qualifying action and verify the relevant status.',
      'Check the transaction or commission record rather than estimating payment.',
    ],
    nextHref:'/agent/commissions',nextLabel:'View commissions',
  }},
  {match:path=>path.startsWith('/agent/work'),guide:DEFAULT_AGENT_GUIDE},
]

export function agentOperatingGuideForPath(path:string):WeaveOperatingGuide {
  const pathname=path.split('?')[0]
  return AGENT_GUIDES.find(item=>item.match(pathname))?.guide||DEFAULT_AGENT_GUIDE
}

const BRIDGER_GUIDES:ReadonlyArray<{match:(pathname:string)=>boolean;guide:WeaveOperatingGuide}>=[
  {match:path=>/bridge-ai|bridge-radiance/.test(path),guide:{
    title:'Help a Prospect understand the crossing',
    explanation:'Bridge AI introduces WEAVE to a real Prospect. An invitation becomes a Client relationship only through an informed choice and the authorized verification flow.',
    steps:['Open your issued Bridge AI entrance and inspect the offer you are sharing.','Explain Client File Folder ownership, what the prospect can build and the actual quoted price.','Send the correct link, listen for a real response and record the outcome.'],
    nextHref:'/bridger/bridge-ai',nextLabel:'Open Bridge AI'
  }},
  {match:path=>/prospect|number-bay|numbers|whatsapp/.test(path),guide:{
    title:'Work through your current Prospects',
    explanation:'Prospect records are possible contacts, not guaranteed sales. Check their real statuses and observe daily limits.',
    steps:['Open your current Prospect list and recognize the available candidates.','Contact each candidate respectfully through the allowed communication route.','Record the actual response. Mark unavailable candidates accurately before requesting permitted replacements.'],
    nextHref:'/weave/market/prospects',nextLabel:'Open My Prospects'
  }},
  {match:path=>/email-outreach/.test(path),guide:{
    title:'Prepare an authorized email approach',
    explanation:'The outreach system connects opportunities to real people; sending messages is not evidence of a reply or conversion.',
    steps:['Check available candidate inventory, sending limits and the displayed charge.','Review truthful language and use an authorized sender connection.','Check delivery status and responses before updating Prospect progress.'],
    nextHref:'/bridger/email-outreach',nextLabel:'Open Email Outreach'
  }},
  {match:path=>/deposit|withdraw|wallet/.test(path),guide:{
    title:'Verify Flame Coin movement',
    explanation:'A payment request and a verified wallet credit are different states.',
    steps:['Choose the correct deposit or withdrawal route.','Follow the displayed instructions and preserve any required evidence.','Wait for the actual wallet and receipt record before marking funds as confirmed.'],
    nextHref:'/wallet/deposit-withdraw',nextLabel:'Open Wallet Movement'
  }},
]

const DEFAULT_BRIDGER_GUIDE:WeaveOperatingGuide={
  title:'Hope: begin with a real conversation',
  explanation:'Bridgers connect interested people to Client ownership and WEAVE systems. A Prospect becomes real through contact and informed choice.',
  steps:['Open the Prospect tools or Bridge AI to understand your current opportunities.','Contact a candidate and listen for what the person actually needs.','Record the response, then guide interested people through the authorized System Switch process.'],
  nextHref:'/bridger/presence',nextLabel:'Open Bridger Presence',
}

export function bridgerOperatingGuideForPath(path:string):WeaveOperatingGuide {
  const pathname=path.split('?')[0]
  return BRIDGER_GUIDES.find(item=>item.match(pathname))?.guide||DEFAULT_BRIDGER_GUIDE
}

export function roleOperatingGuideForPath(role:'agent'|'bridger',path:string):WeaveOperatingGuide {
  return role==='agent'?agentOperatingGuideForPath(path):bridgerOperatingGuideForPath(path)
}

export function transitDirectionForPath(from:string,to:string):'return'|'forward'{
  const destination=to.split('?')[0]
  if(destination==='/'||destination==='/weave'||/\/(agent|bridger|client|admin)\/dashboard$/.test(destination)||destination==='/client/presence')return 'return'
  return 'forward'
}

export function transitTrainingForPath(role:WeaveLoadingRole,path:string):WeaveLoadingBrief|null {
  if(role==='agent'){
    const guide=agentOperatingGuideForPath(path)
    return {
      eyebrow:'AGENT · OPERATING INTRODUCTION',
      title:guide.title,
      body:guide.explanation+' '+guide.steps[0],
      movement:'Next: '+guide.steps[1],
    }
  }
  if(role==='bridger'){
    const guide=bridgerOperatingGuideForPath(path)
    return {eyebrow:'BRIDGER · OPERATING INTRODUCTION',title:guide.title,body:guide.explanation+' '+guide.steps[0],movement:'Next: '+guide.steps[1]}
  }
  if(role==='client'&&/system-switch|file-folder|workshop/.test(path)){
    return {eyebrow:'CLIENT · OPERATING INTRODUCTION',title:'Builds are not instant.',body:'Preview your chosen system, check the real construction requirements and start only when ready. Return to the live build status before operating it.',movement:'Preview → build → verify live status → activate'}
  }
  if(role==='admin'&&/forensic|deposit|orders/.test(path)){
    return {eyebrow:'ADMINISTRATION · OPERATING INTRODUCTION',title:'Verify before approving.',body:'Review the order or payment evidence, follow your authorized approval process and preserve a receipt before publishing the result.',movement:'Evidence → Forensics → approval → record'}
  }
  return null
}
