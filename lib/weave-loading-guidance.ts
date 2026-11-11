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
 * Three complete reading passages, never five rapidly disappearing fragments.
 * Titles, practical explanation and next movement retain their actual meaning.
 * The shared readiness gate advances each complete lesson at the configured pace.
 */
export function lyricLinesForBrief(brief:WeaveLoadingBrief):readonly string[] {
  return [brief.title.trim(),brief.body.trim(),brief.movement.trim()]
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
    eyebrow: "THE COMPANY OF TIME · PRESENCE",
    title: "The Weave of Presence.",
    body: "Bring the work you know and the dreams you carry. Weave gives participation a working form through people, business systems and practical services. System Switch is the crossing from the website into the 3D File Folder Open World.",
    movement: "Recognize your purpose → find your place → begin",
  },
  {
    eyebrow: "THE COMPANY OF TIME · PEOPLE",
    title: "One company. Four departments.",
    body: "Stability carries the work of Agents. Hope connects people through Bridgers. Dream Lovely gives Clients a place to build their businesses. A Time brings direction, care and a lasting record through Administrations.",
    movement: "Stability · Hope · Dream Lovely · A Time",
  },
  {
    eyebrow: "THE COMPANY OF TIME · PARTICIPATION",
    title: "Let your work speak through time.",
    body: "Company Loop 1 — Flame Event: Burning River runs October 1 to December 31, 2026. Enter through your position, find a useful service or system and take your next step. Your orders, work and payments become part of the company record when confirmed.",
    movement: "Enter → participate → confirm → continue",
  },
]

const AGENT_TRAINING: readonly WeaveLoadingBrief[] = [
  {
    eyebrow: "STABILITY · YOUR POSITION",
    title: "Stability. Work that reaches people.",
    body: "Bring Weave into everyday life through Agility, Electrolyte, Ember and Daisy Pastries. Serve customers, supply outlets and support your assigned Bridgers. Check each product’s delivery area before ordering.",
    movement: "Know your product → serve your customer → record the work",
  },
  {
    eyebrow: "STABILITY · YOUR INSTRUMENTS",
    title: "From useful work to a business of your own.",
    body: "Order stock, follow payments and supply your outlets. Creative Studio supports image layouts and paid video work, with an Agent Studio fee of up to 1.5 System Switch. Review the displayed fee before production; attached Bridger commissions have their own records.",
    movement: "Choose a product or creative service → agree the work → deliver",
  },
  {
    eyebrow: "STABILITY · YOUR NEXT STEP",
    title: "Carry today’s work forward.",
    body: "Your participation contributes to Company Loop 1 — Flame Event: Burning River, October 1 to December 31, 2026. Open Agent Work, follow an order or stock delivery and confirm the result. Your manager and Guide are there when you need direction.",
    movement: "Open Agent Work → complete a task → confirm its record",
  },
]

const BRIDGER_TRAINING: readonly WeaveLoadingBrief[] = [
  {
    eyebrow: "HOPE · YOUR POSITION",
    title: "Hope. A relationship begins here.",
    body: "Your work is digital outreach: introduce Weave and File Folders to interested people worldwide. Begin with what the person already knows, makes or hopes to build. Listen for the need before offering the crossing.",
    movement: "Find a prospect → make contact → listen",
  },
  {
    eyebrow: "HOPE · YOUR PRACTICE",
    title: "Make room for a useful conversation.",
    body: "Each Prospect begins as an unverified contact. Use your authorized outreach tools, introduce yourself clearly and record the response. Respect a person who declines; continue when someone chooses to explore what Weave can offer.",
    movement: "Introduce → listen → record → follow through",
  },
  {
    eyebrow: "HOPE · YOUR NEXT STEP",
    title: "Guide an informed beginning.",
    body: "During Company Loop 1 — Flame Event: Burning River, explain File Folder ownership, the current price and payment verification. Share the approved Bridge AI entrance with an interested person. Earnings follow qualifying, confirmed activity.",
    movement: "Explain the offer → invite a choice → verify the crossing",
  },
]

const CLIENT_TRAINING: readonly WeaveLoadingBrief[] = [
  {
    eyebrow: "DREAM LOVELY · YOUR PLACE",
    title: "Your business has a home.",
    body: "Your File Folder is your private operating world inside Weave. System Switch connects it to the shared 3D File Folder Open World, where people can discover published Customer Doors. Your business, private systems and decisions remain yours.",
    movement: "Enter your File Folder → recognize your work → choose what comes next",
  },
  {
    eyebrow: "DREAM LOVELY · YOUR BUILD",
    title: "Give your plans real time to take form.",
    body: "Preview the system you want to build. Review its materials, cost and construction time, then follow progress from its recorded start to completion. Completed systems become available after the required activation.",
    movement: "Preview → acquire materials → build in real time → activate",
  },
  {
    eyebrow: "DREAM LOVELY · YOUR BUSINESS",
    title: "Open the door to the work you do.",
    body: "Shape an offer, direct your authorized team and welcome customers through your Customer Door. Keep orders, payments and delivery in view. Confirmed work and the people it serves give your business its living record.",
    movement: "Publish an offer → serve customers → confirm the result",
  },
]

const ADMIN_TRAINING: readonly WeaveLoadingBrief[] = [
  {
    eyebrow: "A TIME · THE COMPANY",
    title: "The company, in your care.",
    body: "Administrations gives Weave direction through its people and departments. Review responsibilities, support the work of Stability and Hope, and help Clients build with clarity. Each decision belongs with the company record it affects.",
    movement: "Recognize → support → direct → preserve",
  },
  {
    eyebrow: "A TIME · EVIDENCE AND DECISIONS",
    title: "Let evidence carry the decision.",
    body: "Forensics verifies the relevant payment, order or delivery evidence. Use the appropriate workshop to approve, request correction or decline. Preserve the reason and result so the person and department can continue with a clear record.",
    movement: "Review evidence → decide → record → inform",
  },
  {
    eyebrow: "A TIME · CONTINUITY",
    title: "Keep the company moving together.",
    body: "Read outstanding notices, orders, team reports and support requests. Resolve what holds a participant back, verify the outcome and return responsibility to the right department. Prices, permissions and employment terms remain governed by their approved controls.",
    movement: "Notice what needs care → resolve → confirm → continue",
  },
]

export function trainingBriefsForRole(role: WeaveLoadingRole): readonly WeaveLoadingBrief[] {
  if(role==='agent') return AGENT_TRAINING
  if(role==='bridger') return BRIDGER_TRAINING
  if(role==='client') return CLIENT_TRAINING
  if(role==='admin') return ADMIN_TRAINING
  return PLATFORM_TRAINING
}

export function loaderAudienceName(role:WeaveLoadingRole|'flame-event'):string {
  return {
    visitor:'The Company of Time',agent:'Stability · Agent',bridger:'Hope · Bridger',
    client:'Dream Lovely · Client',admin:'A Time · Administrations','flame-event':'Flame Event · Burning River',
  }[role]
}

// Guidance explains the live forms and who decides the result; it never
// treats an application or activity as verified before the system records it.
const EMPLOYMENT_GUIDES:ReadonlyArray<{match:(path:string)=>boolean;guide:WeaveOperatingGuide}>=[
  {match:path=>path.startsWith('/manager/dashboard'),guide:{
    title:'Distribution Manager · sign and begin',
    explanation:'Three lead Distribution Manager positions are available through active Agent or Bridger identities. Your signature sends the application to Administrations. One-month probation starts only after Administrations verifies the appointment.',
    steps:[
      'Read the employment conditions and confirm an active Agent position or permanent Agentic-Bridger purchase.',
      'Accept the terms and type your registered full account name into the signature field. Submit for Administrations verification and check its actual status before treating probation as started.',
      'An appointed lead may review assistant applications. The lead and up to two assistants share 300 verified referrals in probation, then 500 per later month; salary is subject to verification.',
    ],
    nextHref:'/manager/dashboard',nextLabel:'View Distribution Manager employment',
  }},
  {match:path=>path.startsWith('/weave/lifestyles/distribution-assistant'),guide:{
    title:'Assistant Distribution Manager · apply',
    explanation:'Six assistant positions exist, with two positions under each lead Distribution Manager. Applying does not create an appointment.',
    steps:[
      'Read the published employment conditions and check your Agent or Bridger position is active.',
      'Enter your real distribution experience and plan, then submit the application.',
      'A lead Distribution Manager reviews applications. Return here to see whether an appointment is actually approved.',
    ],
    nextHref:'/weave/lifestyles/distribution-assistant',nextLabel:'View assistant employment',
  }},
]
const FOOD_PREPARATION_GUIDE:WeaveOperatingGuide={
  title:'Food Preparation · Agent employment',
  explanation:'One lead Food Preparation Manager works with two Assistant Managers. Only Agents apply; Administrations decides appointments, and work follows verified paid orders.',
  steps:[
    'Select an available position and enter your actual food preparation, handling and delivery experience.',
    'Submit the application and check Administrations approval before treating the position as active.',
    'The approved lead assigns preparation work to approved assistants. Record actual packaging and dispatch handoffs.',
  ],
  nextHref:'/weave/lifestyles/food-preparation',nextLabel:'View food preparation',
}
const LIFESTYLE_HUB_GUIDE:WeaveOperatingGuide={
  title:'WEAVE Lifestyle · choose a working place',
  explanation:'Lifestyles connect extra employment applications and operating environments to your existing Agent or Bridger identity.',
  steps:[
    'Review the visible requirements and select the relevant Lifestyle entrance.',
    'Use that working page to apply, operate or inspect real information.',
    'Confirm an application, approval, receipt or completion from its recorded status.',
  ],
  nextHref:'/weave/lifestyles',nextLabel:'Open Lifestyle',
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
  ...EMPLOYMENT_GUIDES,
  {match:path=>path.startsWith('/weave/lifestyles/food-preparation'),guide:FOOD_PREPARATION_GUIDE},
  {match:path=>path==='/weave/lifestyles',guide:LIFESTYLE_HUB_GUIDE},
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
  ...EMPLOYMENT_GUIDES,
  {match:path=>path==='/weave/lifestyles',guide:LIFESTYLE_HUB_GUIDE},
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
    title:'Verify System Switch movement',
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

const DEFAULT_CLIENT_GUIDE:WeaveOperatingGuide={
  title:'Dream Lovely · Your business comes first',
  explanation:'Give your business a clear next step. Build the systems it needs, serve customers through your Customer Door and follow confirmed work through its records.',
  steps:[
    'Open your File Folder and recognize your current business and unfinished construction.',
    'Choose one useful system. Read materials, cost, permissions and the confirmed build state.',
    'Offer a real product or service through Customer Door, and check verified payment and fulfilment before calling it income.',
  ],
  nextHref:'/client/system-switch',nextLabel:'Open My File Folder',
}
const CLIENT_GUIDES:ReadonlyArray<{match:(path:string)=>boolean;guide:WeaveOperatingGuide}>=[
  {match:p=>p.startsWith('/client/staff-workspace'),guide:{
    title:'Your Client company appointment',
    explanation:'An approved staff appointment and its salary are separate from income generated by your owned File Folder.',
    steps:['Read the signed position and agreed salary terms.','Check assigned Client business expansion work and company requirements.','Continue business operation through your separate File Folder; do not treat reported receipts as verified income.'],
    nextHref:'/client/staff-workspace',nextLabel:'Review My Position',
  }},
  {match:p=>p.startsWith('/client/pro-activation')||p.startsWith('/client/pro-verification'),guide:{
    title:'Verify a Pro File Folder appointment',
    explanation:'A Pro appointment is independently approved. A report of payment, file number or agreement is not activation until verified.',
    steps:['Review the official job offer and signed business agreement.','Submit the required evidence through the correct verification process.','Open the work environment only after Administrations confirms activation.'],
    nextHref:'/client/pro-activation',nextLabel:'Review Activation',
  }},
  {match:p=>p.startsWith('/client/system-store'),guide:{
    title:'Publish only real built systems',
    explanation:'Bring a completed system to publication through the required release package, review and authorization.',
    steps:['Inspect your active File Folder systems and required authorization.','Prepare a complete release package and verify actual functions.','Submit it through the original system publication and Administrations review process.'],
    nextHref:'/client/system-store',nextLabel:'Review System Publishing',
  }},
  {match:p=>p.startsWith('/client/system-switch'),guide:{
    title:'Turn your File Folder into an operating business',
    explanation:'Your business, built systems and public Customer Door meet in your File Folder. Follow construction, customer work and settlement through their records.',
    steps:['Identify your business and the next system it needs.','Check the blueprint, materials and build status before activating a Customer Door.','Publish a real offer; confirm actual customer payment, fulfilment and business costs in the Owner Earnings area.'],
    nextHref:'/client/system-switch',nextLabel:'Operate File Folder',
  }},
  {match:p=>p.startsWith('/client/deposit')||p.startsWith('/client/withdraw'),guide:{
    title:'Move Client funds with evidence',
    explanation:'A pending payment or withdrawal request does not change the verified account balance.',
    steps:['Check the actual wallet and available verified balance.','Follow the exact deposit or withdrawal process for this Client.','Check the final receipt and account record before counting or spending money.'],
    nextHref:'/wallet',nextLabel:'Inspect Wallet',
  }},
]
export function clientOperatingGuideForPath(path:string):WeaveOperatingGuide{
  const name=path.split(/[?#]/)[0]
  return CLIENT_GUIDES.find(x=>x.match(name))?.guide||DEFAULT_CLIENT_GUIDE
}

const DEFAULT_ADMIN_GUIDE:WeaveOperatingGuide={
  title:'A Time · Continue verified company work',
  explanation:'Administrations organizes one company. Review evidence, issue decisions through the correct workshop, and preserve the resulting record.',
  steps:['Identify the person, department or system requiring action.','Open the exact company workshop and check its current state.','Authorize only with the required evidence and verify the recorded outcome.'],
  nextHref:'/admin/control-center',nextLabel:'Open Control Center',
}
const ADMIN_GUIDES:ReadonlyArray<{match:(path:string)=>boolean;guide:WeaveOperatingGuide}>=[
  {match:p=>p.startsWith('/admin/customer-door-settlements')||p.startsWith('/admin/client-deposits'),guide:{
    title:'Confirm funds before crediting',
    explanation:'Money submitted to a payment provider is not automatically verified cash in company reserves.',
    steps:['Match the person, order, reference and transaction amount.','Independently confirm payment and the correct source account.','Settle only through funded and recorded company controls; check the receipt.'],
    nextHref:'/admin/customer-door-settlements',nextLabel:'Review Customer Door Settlements',
  }},
  {match:p=>p.startsWith('/admin/employment-applications')||p.startsWith('/admin/pro-regional-manager'),guide:{
    title:'Review a company appointment',
    explanation:'A job application, an approved appointment and an activated staff workspace are different company states.',
    steps:['Check the applicant and intended department.','Review the exact agreement, eligibility and independently verified payments where applicable.','Record the authorized approval or decline; do not grant access without verification.'],
    nextHref:'/admin/employment-applications',nextLabel:'View Employment Applications',
  }},
  {match:p=>p.startsWith('/admin/release-workshop')||p.startsWith('/admin/infrastructure'),guide:{
    title:'Change the live company safely',
    explanation:'A GitHub change is not proof of a successful deployment. Confirm checks, runner, release and rollback readiness.',
    steps:['Inspect the repository status and release checks.','Confirm the target server, dependencies and backup/rollback path.','Apply authorized changes and verify the production application afterwards.'],
    nextHref:'/admin/release-workshop',nextLabel:'Open Release Workshop',
  }},
]
export function adminOperatingGuideForPath(path:string):WeaveOperatingGuide{
  const name=path.split(/[?#]/)[0]
  return ADMIN_GUIDES.find(x=>x.match(name))?.guide||DEFAULT_ADMIN_GUIDE
}

export function roleOperatingGuideForPath(role:'agent'|'bridger'|'client'|'admin',path:string):WeaveOperatingGuide {
  if(role==='agent')return agentOperatingGuideForPath(path)
  if(role==='bridger')return bridgerOperatingGuideForPath(path)
  if(role==='client')return clientOperatingGuideForPath(path)
  return adminOperatingGuideForPath(path)
}

export function transitDirectionForPath(from:string,to:string):'return'|'forward'{
  const destination=to.split('?')[0]
  if(destination==='/'||destination==='/weave'||/\/(agent|bridger|client|admin)\/dashboard$/.test(destination)||destination==='/client/presence')return 'return'
  return 'forward'
}

export function transitTrainingForPath(role:WeaveLoadingRole,path:string):WeaveLoadingBrief|null {
  const pathname=path.split('?')[0]
  if(pathname==='/system-switch'||pathname==='/system-switch/world'){
    return {
      eyebrow:'SYSTEM SWITCH · BEFORE CROSSING',
      title:pathname==='/system-switch'?'From website pages to the 3D open world':'Recognize the File Folder Open World',
      body:'System Switch is the gate into WEAVE’s 3D File Folder Open World. Beyond it, Client buildings, people and published Customer Doors become places to explore. Your position and the Client owner’s permissions determine which private systems you can use.',
      movement:'Recognize the gate → understand the world → respect access → cross',
    }
  }
  if(role==='client'&&pathname==='/client/system-switch'){
    return {
      eyebrow:'CLIENT · SYSTEM SWITCH CROSSING',
      title:'Your File Folder is inside the 3D world',
      body:'The website gives way to the shared File Folder Open World. Your verified File Folder is your own private operating environment, separate from the public spaces other people may visit.',
      movement:'Recognize the shared world → enter your own File Folder → operate actual systems',
    }
  }
  if(role==='agent'){
    // An unrelated Agent introduction must never replace the real destination.
    if(!AGENT_GUIDES.some(entry=>entry.match(pathname)))return null
    const guide=agentOperatingGuideForPath(path)
    return {
      eyebrow:'AGENT · OPERATING INTRODUCTION',
      title:guide.title,
      body:guide.explanation+' '+guide.steps[0],
      movement:'Next: '+guide.steps[1],
    }
  }
  if(role==='bridger'){
    if(!BRIDGER_GUIDES.some(entry=>entry.match(pathname)))return null
    const guide=bridgerOperatingGuideForPath(path)
    return {eyebrow:'BRIDGER · OPERATING INTRODUCTION',title:guide.title,body:guide.explanation+' '+guide.steps[0],movement:'Next: '+guide.steps[1]}
  }
  if(role==='client'&&/system-switch|file-folder|workshop/.test(path)){
    return {eyebrow:'CLIENT · OPERATING INTRODUCTION',title:'Give the build time to take form.',body:'Preview your chosen system, check the real construction requirements and start only when ready. Return to the live build status before operating it.',movement:'Preview → build → verify live status → activate'}
  }
  if(role==='admin'&&/forensic|deposit|orders/.test(path)){
    return {eyebrow:'ADMINISTRATIONS · OPERATING INTRODUCTION',title:'Verify before approving.',body:'Review the order or payment evidence, follow your authorized approval process and preserve a receipt before publishing the result.',movement:'Evidence → Forensics → approval → record'}
  }
  return null
}
