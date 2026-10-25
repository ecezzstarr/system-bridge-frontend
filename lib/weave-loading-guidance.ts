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
 * The reader decides when to advance to the next lesson.
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
    eyebrow:'WEAVE · SYSTEM INTRODUCTION',
    title:'What is WEAVE?',
    body:'WEAVE of Presence develops systems, products and practical ways to participate. System Switch connects a person to work they can operate; Bridge Radiance makes that continuation visible.',
    movement:'Notice → Recognize → Solve → Move',
  },
  {
    eyebrow:'WEAVE · FOUR POSITIONS',
    title:'Know who operates each part.',
    body:'Agents work in Stability by selling and distributing WEAVE products in Nigeria and supporting Bridger programs. Bridgers work in Hope, introducing digital File Folders to interested people worldwide. Clients own their businesses. Administration organizes the company.',
    movement:'Agent · Bridger · Client · Administration',
  },
  {
    eyebrow:'WEAVE · HOW TO BEGIN',
    title:'Choose one real action.',
    body:'Company Loop 1 — Flame Event: Burning River runs October 1 to December 31, 2026. Every department continues its own real business activities within this shared three-month event. Later loops will reflect verified results and new needs.',
    movement:'Choose a system → operate → verify → continue',
  },
]

const AGENT_TRAINING: readonly WeaveLoadingBrief[] = [
  {
    eyebrow:'AGENT TRAINING · 1 OF 3',
    title:'Your position is Stability.',
    body:'Stability is WEAVE product commerce in Nigeria. Agents offer Agility, Electrolyte, Ember and Daisy Pastries to customers, manage orders and supply shops, while also supporting attached Bridger programs. Choose one real function first.',
    movement:'Recognize Agent position → choose one working system',
  },
  {
    eyebrow:'AGENT TRAINING · 2 OF 3',
    title:'Learn the work before spending.',
    body:'Agent Work opens real food and customer sales. Order stock, supply outlets and follow verified payments. Creative Studio makes image layouts free and videos at an Agent Studio fee of up to 1.5 Flame Coin. Attached Bridger commissions are separate.',
    movement:'Agent Work → product or creative service → customer',
  },
  {
    eyebrow:'AGENT TRAINING · 3 OF 3',
    title:'Make your first verified movement.',
    body:'Your activity contributes to Company Loop 1 — Flame Event: Burning River, October 1 to December 31, 2026. Open Agent Work, follow one real customer order or stock movement, verify it and continue. The Guide bubble can explain each page.',
    movement:'Open → learn → act → verify',
  },
]

const BRIDGER_TRAINING: readonly WeaveLoadingBrief[] = [
  {
    eyebrow:'BRIDGER TRAINING · 1 OF 3',
    title:'Your position is Hope.',
    body:'Hope is WEAVE digital outreach. Bridgers introduce File Folders and cloud-based systems to interested people worldwide, including Europe. Listen first: only a real response can lead to an informed Client crossing.',
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
    body:'During Company Loop 1 — Flame Event: Burning River, October 1 to December 31, 2026, explain File Folder ownership, the actual price and verification process. Share an authorized Bridge AI entrance only with an interested Prospect. No guaranteed income or conversion.',
    movement:'Explain → consent → System Switch → verified ownership',
  },
]

const CLIENT_TRAINING: readonly WeaveLoadingBrief[] = [
  {
    eyebrow:'CLIENT TRAINING · 1 OF 3',
    title:'Your File Folder is an operating world.',
    body:'Your File Folder belongs to you as a Client. Select the systems your business needs and inspect their real functions before construction. The File Folder is an operating environment, not a picture or a promise of instant income. WEAVE connects your choices, builds and working systems in one place.',
    movement:'Recognize → preview → build → activate → operate',
  },
  {
    eyebrow:'CLIENT TRAINING · 2 OF 3',
    title:'A build uses real time.',
    body:'Before starting a build, preview its result, materials, requirements and stated construction time. Once a build starts, watch the real status of the site rather than treating a preview as finished work. Only the confirmed completion and activation of a system make it ready for actual operation.',
    movement:'Inspect requirements → start build → monitor real status',
  },
  {
    eyebrow:'CLIENT TRAINING · 3 OF 3',
    title:'Operate what you have built.',
    body:'When your system becomes active, set up the functions you actually own and choose what customers may see through your Customer Door. Staff and visitors discover only published offerings. Real orders, payments and delivery require their own recorded confirmation. Return to the Weave Open World whenever you need to recognize your next working place.',
    movement:'Activate → publish authorized door → operate',
  },
]

const ADMIN_TRAINING: readonly WeaveLoadingBrief[] = [
  {
    eyebrow:'ADMINISTRATION · 1 OF 3',
    title:'WEAVE operates through verified roles.',
    body:'Administration coordinates the operating institution without replacing the work of its departments. Agents carry Stability, Bridgers carry Hope and Clients own their enterprises. Use the authorized workshops to review positions, applications, permissions and pending work; keep decisions tied to actual company records.',
    movement:'Identify → review → authorize',
  },
  {
    eyebrow:'ADMINISTRATION · 2 OF 3',
    title:'Separate a request from proof.',
    body:'A request for approval is not approval. Forensics verifies the relevant order, receipt, payment or delivery evidence before a status changes. Administration can approve, reject or request correction through its designated systems. Preserve the resulting record so the worker, department and Client can see what actually happened.',
    movement:'Request → evidence → Forensics → confirmation',
  },
  {
    eyebrow:'ADMINISTRATION · 3 OF 3',
    title:'Keep work continuous.',
    body:'Review real notifications, outstanding orders, employed teams and support cases. Keep each department responsible for its authorized activities while Administration observes outcomes and resolves exceptions. Changes to prices, permissions, employment terms or public content must be made from the correct workshop and reflected in the recorded state.',
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

// Guidance explains the live forms and who decides the result; it never
// treats an application or activity as verified before the system records it.
const EMPLOYMENT_GUIDES:ReadonlyArray<{match:(path:string)=>boolean;guide:WeaveOperatingGuide}>=[
  {match:path=>path.startsWith('/manager/dashboard'),guide:{
    title:'Food Distribution Manager · sign and begin',
    explanation:'Three lead Food Distribution Manager positions are available through active Agent or Bridger identities. The job distributes WEAVE food products to consumers and businesses. Your signature sends the application to Administration; probation starts only after verification.',
    steps:[
      'Read the employment conditions and confirm an active Agent position or permanent Agentic-Bridger purchase.',
      'Accept the terms and type your registered full account name into the signature field. Submit for Administration verification and check its actual status before treating probation as started.',
      'An appointed lead may review assistant applications. The lead and up to two assistants share a target of 200 Administration-verified food distributions per calendar month across all WEAVE food product types; salary is subject to verification.',
    ],
    nextHref:'/manager/dashboard',nextLabel:'View Food Distribution Manager employment',
  }},
  {match:path=>path.startsWith('/weave/lifestyles/distribution-assistant'),guide:{
    title:'Assistant Food Distribution Manager · apply',
    explanation:'Six Assistant Food Distribution Manager positions exist, with two under each lead. The work focuses on WEAVE food-product handoffs to consumers and businesses, with a shared target of 200 verified distributions per calendar month. Applying does not create an appointment.',
    steps:[
      'Read the published employment conditions and check your Agent or Bridger position is active.',
      'Enter your food distribution experience and monthly plan, then submit the application.',
      'A lead Food Distribution Manager reviews applications. Return here to see whether an appointment is actually approved.',
    ],
    nextHref:'/weave/lifestyles/distribution-assistant',nextLabel:'View assistant employment',
  }},
]
const FOOD_PREPARATION_GUIDE:WeaveOperatingGuide={
  title:'Food Preparation · Agent employment',
  explanation:'One lead Food Preparation Manager works with two Assistant Managers. Only Agents apply; Administration decides appointments, and work follows verified paid orders.',
  steps:[
    'Select an available position and enter your actual food preparation, handling and delivery experience.',
    'Submit the application and check Administration approval before treating the position as active.',
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
  const pathname=path.split('?')[0]
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
    return {eyebrow:'CLIENT · OPERATING INTRODUCTION',title:'Builds are not instant.',body:'Preview your chosen system, check the real construction requirements and start only when ready. Return to the live build status before operating it.',movement:'Preview → build → verify live status → activate'}
  }
  if(role==='admin'&&/forensic|deposit|orders/.test(path)){
    return {eyebrow:'ADMINISTRATION · OPERATING INTRODUCTION',title:'Verify before approving.',body:'Review the order or payment evidence, follow your authorized approval process and preserve a receipt before publishing the result.',movement:'Evidence → Forensics → approval → record'}
  }
  return null
}
