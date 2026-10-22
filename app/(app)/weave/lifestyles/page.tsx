'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { Bot, BriefcaseBusiness, ChefHat, Gamepad2, Loader2, LockKeyhole, Megaphone, ShieldCheck, Sparkles, Users, Sprout, ShoppingBasket } from 'lucide-react'
import { toast } from 'sonner'
import { WORLD_RULES } from '@/lib/world/constants'

function authHeaders() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('ssb_auth_token') : null
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

type AccessState = {
  active: boolean
  status: string
  expiresAt: string | null
  role: string
  source: 'role_monthly_subscription' | 'agentic_bridger_one_time' | 'agent_position' | 'administration' | 'unsupported'
  positionScoped: true
}

type CarrierState = {
  active: boolean
  reason: string
  position: 'Ace' | null
  qualifyingState?: string | null
}

export default function WeaveLifestylesPage() {
  const [access, setAccess] = useState<AccessState | null>(null)
  const [carrier, setCarrier] = useState<CarrierState | null>(null)
  const [loading, setLoading] = useState(true)
  const [agenticAttainmentPending, setAgenticAttainmentPending] = useState(false)
  const [agenticAttainmentError, setAgenticAttainmentError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const headers = authHeaders()
      const [lifestyleResponse, carrierResponse] = await Promise.all([
        fetch('/api/weave/lifestyles/access', { headers, cache: 'no-store' }),
        fetch('/api/carrier/access', { headers, cache: 'no-store' }),
      ])
      const data = await lifestyleResponse.json()
      const carrierData = await carrierResponse.json().catch(() => ({}))
      if (!lifestyleResponse.ok) throw new Error(data.error || 'Could not read WEAVE Lifestyle access')
      setAccess(data.access)
      setCarrier(carrierData?.access || null)
    } catch (error: any) {
      toast.error(error.message || 'Could not read WEAVE Lifestyle access')
    } finally {
      setLoading(false)
    }
  }

  const attainAgenticBridger = async () => {
    if (access?.role !== 'bridger' || access.active || agenticAttainmentPending) return
    setAgenticAttainmentPending(true)
    setAgenticAttainmentError(null)
    try {
      const response = await fetch('/api/weave/lifestyles/agentic/purchase', {
        method: 'POST',
        headers: authHeaders(),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data.success) {
        if (data.reason === 'insufficient_balance') {
          setAgenticAttainmentError(`Your wallet has ${Number(data.availableFlameCoin || 0).toLocaleString()} Flame Coin. Attaining Agentic-Bridger requires a one-time payment of ${Number(data.requiredFlameCoin ?? WORLD_RULES.AGENTIC_BRIDGER_ONE_TIME_FLAME_COIN).toLocaleString()} Flame Coin. Fund your wallet and try again.`)
          return
        }

        if (data.reason === 'bridger_unavailable') {
          setAgenticAttainmentError('This Bridger account is inactive. Contact Administration to check your position.')
          return
        }
        throw new Error(data.error || 'Could not complete Agentic-Bridger attainment.')
      }
      await load()
      toast.success(data.alreadyOwned ? 'Agentic-Bridger already attained.' : 'Agentic-Bridger attained permanently. Lifestyle access is now enabled.')
    } catch (error: any) {
      setAgenticAttainmentError(error.message || 'Could not complete Agentic-Bridger attainment.')
    } finally {
      setAgenticAttainmentPending(false)
    }
  }

  useEffect(() => { void load() }, [])

  const roleLabel = useMemo(() => {
    const role = access?.role || 'WEAVE'
    return role === 'bridger' ? 'Bridger' : role === 'agent' ? 'Agent' : role === 'client' ? 'Client' : role === 'admin' ? 'Administration' : 'WEAVE'
  }, [access?.role])

  const agentFree = access?.role === 'agent'
  const bridger = access?.role === 'bridger'
  const aceOpen = Boolean(access?.active && carrier?.active && carrier?.position === 'Ace')
  const agenticAvailable = access?.role === 'bridger'
  const agenticOpen = Boolean(agenticAvailable && aceOpen)
  const mandateAvailable = access?.role === 'agent' || access?.role === 'bridger'
  const mandateOpen = Boolean(mandateAvailable && access?.active)
  const foodPreparationAvailable = access?.role === 'agent'
  const foodPreparationOpen = Boolean(foodPreparationAvailable && access?.active)
  const foodAvailable = access?.role === 'agent' || access?.role === 'bridger'
  const foodOpen = Boolean(foodAvailable && access?.active)
  const distributionManagerAvailable = access?.role === 'agent' || access?.role === 'bridger'
  const distributionManagerOpen = Boolean(distributionManagerAvailable && access?.active)
  const legionAvailable = access?.role === 'agent' || access?.role === 'bridger'
  const legionOpen = Boolean(legionAvailable && access?.active)

  return (
    <main className="weave-operating-environment min-h-[70vh] overflow-hidden border-y border-yellow-300/15 bg-[#080b12]/78 px-4 py-6 sm:rounded-[2rem] sm:border sm:px-7" data-weave-lifestyle-catalog="canonical">
      <header className="border-b border-white/10 pb-6">
        <p className="text-[10px] font-black uppercase tracking-[0.34em] text-yellow-300/70">WEAVE Lifestyle · Position Access</p>
        <div className="mt-2 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-white">LIFESTYLE</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">Agents have included Lifestyle access. Bridgers can attain Agentic-Bridger with one payment of 11 Flame Coin. Agentic-Bridger then enables Lifestyle access and eligibility to apply for positions such as Distribution Manager and Legion. Regular Bridger work has no subscription; Clients follow their own access terms.</p>
          </div>
          <Sparkles className="h-8 w-8 shrink-0 text-yellow-400" />
        </div>
      </header>

      {loading ? (
        <div className="flex min-h-64 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-yellow-400" /></div>
      ) : (
        <>
          <section className="mt-6 border-y border-white/10 py-4" data-lifestyle-entitlement={agentFree ? 'agent-position' : bridger ? 'agentic-permanent' : 'position-subscription'}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">{agentFree ? 'Agent position access' : bridger ? 'Agentic-Bridger · permanent access' : `${roleLabel} monthly subscription`}</p>
                <p className="mt-1 text-sm font-black text-white">{access?.active ? 'LIFESTYLE LAYER OPEN' : 'LIFESTYLE LAYER CLOSED'}</p>
                <p className="mt-1 text-xs text-slate-500">{agentFree ? 'Agents enter Lifestyle at no additional monthly charge.' : bridger ? 'One payment of 11 Flame Coin attains Agentic-Bridger permanently. Agentic-Bridger enables Lifestyle access; job appointments still require application and approval.' : 'Your Client subscription determines Lifestyle access.'}</p>
                {!agentFree && !bridger && access?.expiresAt && <p className="mt-1 text-xs text-slate-500">Current period ends {new Date(access.expiresAt).toLocaleDateString()}</p>}
              </div>
              {!agentFree && !bridger && !access?.active && (
                <div className="max-w-sm border-l border-amber-300/20 pl-3 text-xs leading-5 text-amber-100/70">
                  <span className="inline-flex items-center gap-2 font-black text-amber-200"><LockKeyhole className="h-4 w-4" />Renew your {roleLabel} monthly subscription</span>
                  <p className="mt-1 text-slate-500">Lifestyle reopens automatically when the position subscription returns to active. No separate Lifestyle payment is taken.</p>
                </div>
              )}
            </div>
          </section>

          {access?.role === 'bridger' && (
            <section className="mt-5 rounded-2xl border border-emerald-300/25 bg-emerald-400/[.05] p-5 sm:p-6" data-lifestyle-agentic-purchase="self-service">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-300">Attain Agentic-Bridger · Enable Lifestyle</p>
                  <h2 className="mt-2 text-2xl font-black text-white">{WORLD_RULES.AGENTIC_BRIDGER_ONE_TIME_FLAME_COIN} Flame Coin <span className="text-sm text-slate-300">· one time</span></h2>
                  <p className="mt-2 max-w-2xl text-xs leading-6 text-slate-300">Pay 11 Flame Coin once to attain Agentic-Bridger. This permanent attainment enables Lifestyle access, including applications for eligible Distribution Manager and Legion positions. Appointment and employment are separate approval processes. Regular Bridger activity remains free.</p>
                  <p className="mt-2 text-xs text-slate-400">Bridge AI costs 8 Flame Coin per new template. Echo is free. Agentic-Bridger is attained once for 11 Flame Coin; there is no recurring Bridger or Agentic-Bridger subscription.</p>
                  
                </div>
                <span className={`rounded-full border px-3 py-1.5 text-[10px] font-black uppercase ${access.active ? 'border-emerald-300/25 text-emerald-200' : 'border-amber-300/25 text-amber-200'}`}>{access.active ? 'Attained permanently' : 'Not attained'}</span>
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                {!access.active && (
                  <button type="button" onClick={() => void attainAgenticBridger()} disabled={agenticAttainmentPending} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-emerald-300 px-5 py-3 text-xs font-black uppercase tracking-wider text-slate-950 disabled:cursor-wait disabled:opacity-50">
                    {agenticAttainmentPending ? 'Attaining Agentic-Bridger…' : 'Attain Agentic-Bridger · 11 Flame Coin once'}
                  </button>
                )}
                <Link href="/wallet/deposit-withdraw" className="inline-flex min-h-11 items-center rounded-xl border border-white/15 bg-white/[.06] px-4 py-3 text-xs font-black text-white">Fund Flame Coin Wallet</Link>
                <Link href="/weave/lifestyles/agentic-bridger" className="inline-flex min-h-11 items-center rounded-xl border border-white/15 px-4 py-3 text-xs font-black text-emerald-100">Agentic-Bridger · Permanent attainment</Link>
              </div>
              {agenticAttainmentError && <p role="alert" className="mt-4 rounded-xl border border-rose-400/20 bg-rose-400/[.08] px-4 py-3 text-xs leading-5 text-rose-200">{agenticAttainmentError}</p>}
            </section>
          )}

          <section className="mt-7">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">Lifestyle identities</p>
                <p className="mt-1 text-xs text-slate-500">Identities first. Their operating environments sit inside them.</p>
              </div>
              <p className="text-[9px] font-black uppercase tracking-[.16em] text-yellow-300/60">{roleLabel} position</p>
            </div>

            <div className="mt-4 space-y-4">
              <LifestyleGround
                tone="yellow"
                icon={<Gamepad2 className="h-8 w-8" />}
                eyebrow="Ace Lifestyle"
                title="ACE"
                detail="Ace is the playing and outward-distribution identity. Arena is the Ace game ground. Carrier is the Ace distribution instrument. They are not separate Lifestyles."
                open={aceOpen}
                reason={carrier?.reason || (access?.active ? 'Your current position has not opened Ace.' : agentFree ? 'An active Agent account is required.' : bridger ? 'Attain Agentic-Bridger for a one-time 11 Flame Coin payment.' : `Renew the ${roleLabel} monthly subscription first.`)}
                href="/weave/lifestyles/ace"
                action="Enter Ace"
                tools={[{icon:<Gamepad2 className="h-3.5 w-3.5"/>,label:'Arena'},{icon:<Megaphone className="h-3.5 w-3.5"/>,label:'Carrier'}]}
              />

              {agenticAvailable && (
                <LifestyleGround
                  tone="cyan"
                  icon={<Bot className="h-8 w-8" />}
                  eyebrow="Inside Ace · Bridger only"
                  title="AGENTIC-BRIDGER"
                  detail="Agentic-Bridger is attained through a one-time payment of 11 Flame Coin. Attainment permanently enables Lifestyle access and eligible activities, including the Agentic-Bridger earning rules; it does not change the underlying Bridger role or automatically approve employment."
                  open={agenticOpen}
                  reason={access?.active ? (carrier?.reason || 'Ace has not opened yet.') : 'Attain Agentic-Bridger for a one-time 11 Flame Coin payment.'}
                  href="/weave/lifestyles/agentic-bridger"
                  action="Enter Agentic-Bridger"
                  tools={[{icon:<Bot className="h-3.5 w-3.5"/>,label:'Bridger movement'},{icon:<Gamepad2 className="h-3.5 w-3.5"/>,label:'Ace standing'}]}
                  nested
                />
              )}

              {mandateAvailable && (
                <LifestyleGround
                  tone="amber"
                  icon={<ShieldCheck className="h-8 w-8" />}
                  eyebrow="Company Support · Apply for an appointment"
                  title="WEAVE MANDATE"
                  detail="Agents and Bridgers can apply for Company Guidance departments: Mandate, Forensics or Attorney. Administration reviews each application. Approved personnel can answer only the guidance conversations assigned to their department. No additional Lifestyle payment."
                  open={mandateOpen}
                  reason={access?.active ? 'Mandate is open for applications from your position.' : agentFree ? 'An active Agent account is required.' : 'Attain Agentic-Bridger for a one-time 11 Flame Coin payment.'}
                  href="/weave/lifestyles/mandate"
                  action="Apply to Weave Mandate"
                  tools={[{icon:<ShieldCheck className="h-3.5 w-3.5"/>,label:'Department application'},{icon:<BriefcaseBusiness className="h-3.5 w-3.5"/>,label:'Company Guidance'}]}
                />
              )}
              {foodPreparationAvailable && (
                <LifestyleGround
                  tone="amber"
                  icon={<ChefHat className="h-8 w-8" />}
                  eyebrow="Agent employment · Company food operations"
                  title="FOOD PREPARATION TEAM"
                  detail="The Head of WEAVE Stability leads Agent food operations and allocates work to two Assistant Managers. One lead and two assistant application places are available. Eligible Agents can apply for a vacant position and, following Administration approval, prepare verified Agility, Electrolyte, Ember and Daisy Pastries orders."
                  open={foodPreparationOpen}
                  reason={access?.active ? 'Apply for Administration appointment.' : 'An active Agent position is required to apply.'}
                  href="/weave/lifestyles/food-preparation"
                  action="Apply / Open Kitchen Desk"
                  tools={[{icon:<ChefHat className="h-3.5 w-3.5"/>,label:'Preparation & packaging'},{icon:<BriefcaseBusiness className="h-3.5 w-3.5"/>,label:'1 Manager · 2 Assistants'}]}
                />
              )}
              {foodAvailable && (
                <LifestyleGround
                  tone="amber"
                  icon={<Sprout className="h-8 w-8" />}
                  eyebrow="Flame Event · Everyday food"
                  title="FARM TO FAMILY"
                  detail="Agent farmers list surplus at their own prices; Agents and Bridgers buy for households across Nigeria. Buyers pay the accepted farm and transport quote to WEAVE. After verified receipt and buyer delivery confirmation, WEAVE deducts a flat ₦1,000 fee from the farmer for each completed order, not per item. No extra Lifestyle access charge."
                  open={foodOpen}
                  reason={access?.active ? 'Agent or Bridger access required.' : 'Your Agent or Bridger Lifestyle must be active.'}
                  href="/weave/lifestyles/food"
                  action="Enter Food Exchange"
                  tools={[{icon:<Sprout className="h-3.5 w-3.5"/>,label:'Farmer surplus'},{icon:<ShoppingBasket className="h-3.5 w-3.5"/>,label:'Household orders'}]}
                />
              )}

              {distributionManagerAvailable && (
                <LifestyleGround
                  tone="amber"
                  icon={<BriefcaseBusiness className="h-8 w-8" />}
                  eyebrow="WEAVE employment Lifestyle"
                  title="DISTRIBUTION MANAGER"
                  detail="Distribution Manager is an actual WEAVE distribution position carried by an existing Agent or Bridger: public distribution, campaign movement, Agent/Bridger acquisition, coordination and reporting back to Administration."
                  open={distributionManagerOpen}
                  reason={access?.active ? 'Distribution Manager entry is available from your current position.' : agentFree ? 'An active Agent account is required.' : bridger ? 'Attain Agentic-Bridger for a one-time 11 Flame Coin payment.' : `Renew the ${roleLabel} monthly subscription to reopen this Lifestyle.`}
                  href="/manager/dashboard"
                  action="Enter Distribution Manager"
                  tools={[{icon:<Megaphone className="h-3.5 w-3.5"/>,label:'Distribution Studio'},{icon:<BriefcaseBusiness className="h-3.5 w-3.5"/>,label:'WEAVE employment'}]}
                />
              )}

              {distributionManagerAvailable && (
                <LifestyleGround
                  tone="cyan"
                  icon={<Users className="h-8 w-8" />}
                  eyebrow="WEAVE distribution employment · 6 appointments"
                  title="ASSISTANT DISTRIBUTION MANAGER"
                  detail="Work alongside verified WEAVE Distribution Managers on campaigns, outreach, follow-up and verified Agent/Bridger acquisition. Six appointments are available, two per Manager. Read the salary, monthly target and payment conditions inside the employment document before submitting an application."
                  open={distributionManagerOpen}
                  reason={access?.active ? 'Assistant Distribution Manager applications are available.' : agentFree ? 'An active Agent account is required.' : 'Attain Agentic-Bridger once to enable Lifestyle applications.'}
                  href="/weave/lifestyles/distribution-assistant"
                  action="Apply for Assistant Distribution Manager"
                  tools={[{icon:<BriefcaseBusiness className="h-3.5 w-3.5"/>,label:'Employment application'},{icon:<Users className="h-3.5 w-3.5"/>,label:'Monthly referrals'}]}
                />
              )}

              {legionAvailable && (
                <LifestyleGround
                  tone="violet"
                  icon={<Users className="h-8 w-8" />}
                  eyebrow="Client enterprise employment"
                  title="LEGION"
                  detail="Legion is exclusive employment inside a Client enterprise. Agents and subscribed Bridgers can apply to open Client Legion Quarters or accept a Client invitation. Once accepted, normal Agent/Bridger functions close and the person works only for that Client inside Weave until Legion employment ends."
                  open={legionOpen}
                  reason={access?.active ? 'Legion employment is available from your current position.' : agentFree ? 'An active Agent account is required.' : bridger ? 'Attain Agentic-Bridger once to enable Lifestyle applications.' : `Renew the ${roleLabel} monthly subscription before applying.`}
                  href="/weave/lifestyles/legion"
                  action="Enter Legion Market"
                  tools={[{icon:<Users className="h-3.5 w-3.5"/>,label:'Client recruitment'},{icon:<BriefcaseBusiness className="h-3.5 w-3.5"/>,label:'Exclusive employment'}]}
                />
              )}

              <div className="border-y border-white/10 px-4 py-5 sm:border" data-lifestyle-position-rule="true">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">Position rule</p>
                <h2 className="mt-1 text-xl font-black text-white">{agentFree ? 'AGENT POSITION · FREE LIFESTYLE ACCESS' : 'POSITION-SCOPED LIFESTYLE ACCESS'}</h2>
                <p className="mt-2 text-xs leading-5 text-slate-500">{agentFree ? 'The Agent position itself opens Lifestyle and Ace. No Agent monthly subscription is required. Legion remains the exclusive-employment exception: normal Agent functions pause while the Agent serves a Client as Legion.' : 'Your core account role remains Administration, Agent, Bridger or Client. Legion is the exclusive-employment exception: the underlying Agent/Bridger identity is preserved, but its normal work functions are suspended while the person serves a Client as Legion.'}</p>
              </div>
            </div>
          </section>
        </>
      )}
    </main>
  )
}

function LifestyleGround({
  icon,eyebrow,title,detail,open,reason,href,action,tools,nested=false,tone,
}:{
  icon:React.ReactNode
  eyebrow:string
  title:string
  detail:string
  open:boolean
  reason:string
  href:string
  action:string
  tools:{icon:React.ReactNode;label:string}[]
  nested?:boolean
  tone:'yellow'|'cyan'|'amber'|'violet'
}){
  const toneClass=tone==='cyan'?'text-cyan-300 border-cyan-300/20 bg-cyan-300/[0.035]':tone==='amber'?'text-amber-300 border-amber-300/20 bg-amber-300/[0.035]':tone==='violet'?'text-violet-300 border-violet-300/20 bg-violet-300/[0.035]':'text-yellow-300 border-yellow-300/20 bg-yellow-300/[0.035]'
  return <div className={`${nested?'ml-3 border-l-2 pl-4 sm:ml-8':'p-5 sm:p-6'} ${nested?'border-cyan-300/20':'border'} ${nested?'':'rounded-[1.5rem]'} ${nested?'':' '+toneClass.split(' ').filter(item=>item.startsWith('border-')||item.startsWith('bg-')).join(' ')}`} data-lifestyle={title.toLowerCase().replaceAll(' ','_')}>
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="max-w-3xl">
        <div className={`flex items-center gap-2 ${toneClass.split(' ')[0]}`}>{icon}<div><p className="text-[9px] font-black uppercase tracking-[0.22em]">{eyebrow}</p><h2 className="mt-1 text-2xl font-black text-white">{title}</h2></div></div>
        <p className="mt-3 text-xs leading-5 text-slate-400">{detail}</p>
        <div className="mt-4 flex flex-wrap gap-2">{tools.map(tool=><span key={tool.label} className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-[9px] font-black uppercase tracking-wider text-slate-300">{tool.icon}{tool.label}</span>)}</div>
      </div>
      <span className={`rounded-full border px-3 py-1.5 text-[9px] font-black uppercase tracking-wider ${open?'border-emerald-300/20 bg-emerald-300/[0.05] text-emerald-200':'border-white/10 text-slate-600'}`}>{open?'Open':'Closed'}</span>
    </div>
    {open?<Link href={href} className="mt-5 inline-flex items-center rounded-xl border border-white/10 bg-white/[0.05] px-4 py-2.5 text-[10px] font-black uppercase tracking-wider text-white hover:bg-white/[0.09]">{action}</Link>:<div className="mt-4 flex items-start gap-2 text-xs leading-5 text-slate-500"><LockKeyhole className="mt-0.5 h-4 w-4 shrink-0"/><span>{reason}</span></div>}
  </div>
}
