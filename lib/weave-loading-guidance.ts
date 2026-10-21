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
    body:'Open Agent Work or Creative Studio. Check the details and price, complete one practical task, then confirm the order, delivery or receipt. The in-app Guide explains your next step.',
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

export function transitTrainingForPath(role:WeaveLoadingRole,path:string):WeaveLoadingBrief|null {
  if(role==='agent'){
    const guide=agentOperatingGuideForPath(path)
    return {
      eyebrow:'AGENT · SMART OPERATING GUIDE',
      title:guide.title,
      body:guide.explanation+' '+guide.steps[0],
      movement:'Next: '+guide.steps[1],
    }
  }
  if(role==='bridger'&&(/prospect|number|bridge-ai|email-outreach/.test(path))){
    return {eyebrow:'BRIDGER · SMART OPERATING GUIDE',title:'Begin with a verified response.',body:'Identify which Prospect action this page permits. Contact an actual candidate respectfully; do not record a conversation or conversion before it occurs.',movement:'Open tool → attempt → actual response → record'}
  }
  if(role==='client'&&/system-switch|file-folder|workshop/.test(path)){
    return {eyebrow:'CLIENT · SMART OPERATING GUIDE',title:'Builds are not instant.',body:'Preview your chosen system, check the real construction requirements and start only when ready. Return to the live build status before operating it.',movement:'Preview → build → verify live status → activate'}
  }
  if(role==='admin'&&/forensic|deposit|orders/.test(path)){
    return {eyebrow:'ADMINISTRATION · SMART OPERATING GUIDE',title:'Verify before approving.',body:'Review the order or payment evidence, follow your authorized approval process and preserve a receipt before publishing the result.',movement:'Evidence → Forensics → approval → record'}
  }
  return null
}
