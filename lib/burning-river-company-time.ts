/**
 * Company of Time: shared action from distinct human positions.
 *
 * Human source -> Presence -> Interaction -> Work -> Value ->
 * Participation -> Livelihood. Company Loop 1 is a living work period,
 * not an ad, leaderboard or a promise of financial returns.
 *
 * A Time recognizes and routes actual interruptions in the work of
 * Hope, Stability and Dream Lovely. Each authorized department remains
 * the owner of its work; this read-only projection never approves money.
 */
import {WEAVE_ARCHITECTURE} from '@/lib/weave-architecture'
import {WEAVE_SYSTEM_MAP} from '@/lib/weave-system-map'

export const BURNING_RIVER_MANIFESTO = {
  loop:'flame-event-01',
  event:'Burning River',
  beginsAt:'2026-11-01T00:00:00+01:00',
  endsAt:'2026-12-31T23:59:59+01:00',
  targetCompanyEarningsNgn:200_000_000,
  goalKind:'company_earnings' as const,
  subject:WEAVE_ARCHITECTURE.subject.name,
  topicRule:WEAVE_ARCHITECTURE.topic.description,
  humanSource:WEAVE_SYSTEM_MAP.principle.source,
  principle:'Human source → Presence → Interaction → Work → Value → Participation → Livelihood',
  responsibilities:{
    administrations:'See the whole movement, authorize work, resolve failures and preserve financial and operational records.',
    hope:'Bring meaningful human responses into the Bridge and accompany willing Clients after crossing.',
    stability:'Keep real supply, customer service, orders, fulfilment and worker support moving.',
    dreamLovely:'Operate each owner’s independent business, systems, Customer Door and employees.',
  },
} as const

export type CompanyMovementSection={
  available:boolean
  rows:Record<string,unknown>[]
  note?:string
}
export type CompanyMovementAction={
  id:string
  position:'administrations'|'bridger'|'agent'|'client'
  priority:'immediate'|'today'|'monitor'
  title:string
  why:string
  href:string
  count:number|null
}
function numberAt(s:Record<string,CompanyMovementSection>,section:string,key:string):number|null {
  const found=s[section]
  if(!found?.available||!found.rows?.[0])return null
  const n=Number(found.rows[0][key])
  return Number.isFinite(n)?n:null
}

/** "Next authorized movement" is derived entirely from source evidence.
 * Missing records do not create a false zero or an invented business order.
 */
export function companyTimeNextMovements(sections:Record<string,CompanyMovementSection>):
  CompanyMovementAction[]{
  const actions:CompanyMovementAction[]=[]
  const append=(action:CompanyMovementAction)=>actions.push(action)
  const awaitingFolder=numberAt(sections,'folderQueue','awaiting_administration')
  if(awaitingFolder!==null&&awaitingFolder>0)append({
    id:'verify-folder',position:'administrations',priority:'immediate',count:awaitingFolder,
    title:'Complete the Client crossing',
    why:awaitingFolder+' File Folder purchase(s) await Administration confirmation. Check independent payment evidence and activate the rightful Client owner.',
    href:'/admin/file-folder-sales-manager'
  })
  const approvedWithoutOwner=numberAt(sections,'folderActivation','confirmed_without_client')
  if(approvedWithoutOwner!==null&&approvedWithoutOwner>0)append({
    id:'activate-client',position:'client',priority:'immediate',count:approvedWithoutOwner,
    title:'Give confirmed Clients their working place',
    why:approvedWithoutOwner+' confirmed File Folder purchase(s) lack a linked Client account. Verify owner registration, File Number and Customer Door readiness.',
    href:'/admin/file-folder-health'
  })
  const pendingDeposit=numberAt(sections,'wallet','pending_deposits')
  if(pendingDeposit!==null&&pendingDeposit>0)append({
    id:'deposit-evidence',position:'administrations',priority:'immediate',count:pendingDeposit,
    title:'Reconcile pending deposits with evidence',
    why:pendingDeposit+' wallet deposit(s) remain pending. Forensics must inspect provider confirmation before any credit; do not use a dashboard count as payment proof.',
    href:'/admin/control-center'
  })
  const paidUnfulfilled=numberAt(sections,'foodQueue','paid_unfulfilled')
  if(paidUnfulfilled!==null&&paidUnfulfilled>0)append({
    id:'food-fulfilment',position:'agent',priority:'immediate',count:paidUnfulfilled,
    title:'Keep Stability moving after payment',
    why:paidUnfulfilled+' food order(s) are marked paid but not fulfilled. Coordinate real stock, approved delivery staff and customer handoff.',
    href:'/admin/regional-operations'
  })
  const cakeUnfulfilled=numberAt(sections,'cakeQueue','paid_unfulfilled')
  if(cakeUnfulfilled!==null&&cakeUnfulfilled>0)append({
    id:'cake-fulfilment',position:'agent',priority:'today',count:cakeUnfulfilled,
    title:'Complete paid Daisy Pastries orders',
    why:cakeUnfulfilled+' paid cake order(s) still need verified production or fulfilment. Review the actual order queue.',
    href:'/admin/cakes'
  })
  const proofPending=numberAt(sections,'foodQueue','payment_proofs_pending')
  if(proofPending!==null&&proofPending>0)append({
    id:'food-payment-proof',position:'administrations',priority:'today',count:proofPending,
    title:'Resolve submitted customer payment proofs',
    why:proofPending+' food customer payment reference(s) still await authorized verification. Proof submission alone is not a sale.',
    href:'/admin/carrier-food-payments'
  })
  const needsHelp=numberAt(sections,'regionalSupport','needs_help')
  if(needsHelp!==null&&needsHelp>0)append({
    id:'people-need-help',position:'administrations',priority:'today',count:needsHelp,
    title:'Support the people who carry the work',
    why:needsHelp+' regional staff check-in(s) have an unresolved assistance request. Route support through the appointed supervisors.',
    href:'/admin/regional-operations'
  })
  const purchased=numberAt(sections,'prospects','packages')
  const attempted=numberAt(sections,'outreach','attempted')
  if(purchased!==null&&purchased>0&&attempted===0)append({
    id:'hope-outreach',position:'bridger',priority:'today',count:purchased,
    title:'Turn purchased possibilities into respectful human contact',
    why:'Prospect packages were purchased but no sent outreach is recorded for this window. Check whether Bridgers received usable candidates and know their next permitted action.',
    href:'/admin/prospect-engine'
  })
  const awaitingPayment=numberAt(sections,'folderQueue','awaiting_payment')
  if(awaitingPayment!==null&&awaitingPayment>0)append({
    id:'bridge-follow-up',position:'bridger',priority:'monitor',count:awaitingPayment,
    title:'Continue the Bridge without assuming a sale',
    why:awaitingPayment+' File Folder checkout(s) still await actual customer payment. Follow up respectfully; do not count intent as earnings.',
    href:'/admin/file-folder-sales-manager'
  })
  return actions.sort((a,b)=>{
    const weight={immediate:0,today:1,monitor:2}
    return weight[a.priority]-weight[b.priority]
  })
}

/** Company earnings are not a sum of gross sales, deposits or owner receipts.
 * Until audited company-retained NGN earnings exist, achievement remains UNKNOWN.
 */
export function manifestoEvidenceState(){
  return {
    targetCompanyEarningsNgn:BURNING_RIVER_MANIFESTO.targetCompanyEarningsNgn,
    verifiedCompanyEarningsNgn:null,
    remainingCompanyEarningsNgn:null,
    progressPercent:null,
    status:'awaiting_company_earnings_reconciliation' as const,
    reason:'Existing records do not yet provide an independently reconciled, company-retained earnings total across all rails, fees, refunds, product costs and commissions.'
  }
}
