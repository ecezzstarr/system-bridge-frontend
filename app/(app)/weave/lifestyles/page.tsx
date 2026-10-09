'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { Bot, BriefcaseBusiness, Gamepad2, Loader2, LockKeyhole, Megaphone, Mic2, Sparkles } from 'lucide-react'
import { toast } from 'sonner'

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
  source: 'role_monthly_subscription' | 'administration' | 'unsupported'
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

  useEffect(() => { void load() }, [])

  const roleLabel = useMemo(() => {
    const role = access?.role || 'WEAVE'
    return role === 'bridger' ? 'Bridger' : role === 'agent' ? 'Agent' : role === 'client' ? 'Client' : role === 'admin' ? 'Administration' : 'WEAVE'
  }, [access?.role])

  const aceOpen = Boolean(access?.active && carrier?.active && carrier?.position === 'Ace')
  const agenticAvailable = access?.role === 'bridger'
  const agenticOpen = Boolean(agenticAvailable && aceOpen)
  const distributionManagerAvailable = access?.role === 'agent' || access?.role === 'bridger'
  const distributionManagerOpen = Boolean(distributionManagerAvailable && access?.active)

  return (
    <main className="weave-operating-environment min-h-[70vh] overflow-hidden border-y border-yellow-300/15 bg-[#080b12]/78 px-4 py-6 sm:rounded-[2rem] sm:border sm:px-7" data-weave-lifestyle-catalog="canonical">
      <header className="border-b border-white/10 pb-6">
        <p className="text-[10px] font-black uppercase tracking-[0.34em] text-yellow-300/70">WEAVE Lifestyle · Position Access</p>
        <div className="mt-2 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-white">LIFESTYLE</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">Lifestyle is a layer carried by your existing WEAVE position. There is no second Lifestyle subscription. Core roles remain Administration, Agent, Bridger and Client; Lifestyle changes how an eligible person operates without creating another core role.</p>
          </div>
          <Sparkles className="h-8 w-8 shrink-0 text-yellow-400" />
        </div>
      </header>

      {loading ? (
        <div className="flex min-h-64 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-yellow-400" /></div>
      ) : (
        <>
          <section className="mt-6 border-y border-white/10 py-4" data-lifestyle-entitlement="position-subscription">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">{roleLabel} monthly subscription</p>
                <p className="mt-1 text-sm font-black text-white">{access?.active ? 'LIFESTYLE LAYER OPEN' : 'LIFESTYLE LAYER CLOSED'}</p>
                <p className="mt-1 text-xs text-slate-500">One subscription → the Lifestyle identities allowed by your current position.</p>
                {access?.expiresAt && <p className="mt-1 text-xs text-slate-500">Current period ends {new Date(access.expiresAt).toLocaleDateString()}</p>}
              </div>
              {!access?.active && (
                <div className="max-w-sm border-l border-amber-300/20 pl-3 text-xs leading-5 text-amber-100/70">
                  <span className="inline-flex items-center gap-2 font-black text-amber-200"><LockKeyhole className="h-4 w-4" />Renew your {roleLabel} monthly subscription</span>
                  <p className="mt-1 text-slate-500">Lifestyle reopens automatically when the position subscription returns to active. No separate Lifestyle payment is taken.</p>
                </div>
              )}
            </div>
          </section>

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
                reason={carrier?.reason || (access?.active ? 'Your current position has not opened Ace.' : `Renew the ${roleLabel} monthly subscription first.`)}
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
                  detail="Agentic-Bridger is the Bridger-only Lifestyle specialization inside Ace. Your Bridger role remains intact; active Continuance opens the specialization and its eligible 45% earning rule."
                  open={agenticOpen}
                  reason={access?.active ? (carrier?.reason || 'Ace has not opened yet.') : 'Active Bridger Continuance is required.'}
                  href="/weave/lifestyles/agentic-bridger"
                  action="Enter Agentic-Bridger"
                  tools={[{icon:<Bot className="h-3.5 w-3.5"/>,label:'Bridger movement'},{icon:<Gamepad2 className="h-3.5 w-3.5"/>,label:'Ace standing'}]}
                  nested
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
                  reason={access?.active ? 'Distribution Manager entry is available from your current position.' : `Renew the ${roleLabel} monthly subscription to reopen this Lifestyle.`}
                  href="/manager/dashboard"
                  action="Enter Distribution Manager"
                  tools={[{icon:<Megaphone className="h-3.5 w-3.5"/>,label:'Distribution Studio'},{icon:<BriefcaseBusiness className="h-3.5 w-3.5"/>,label:'WEAVE employment'}]}
                />
              )}

              {['agent', 'bridger', 'client'].includes(access?.role || '') && <LifestyleGround
                tone="cyan"
                icon={<Mic2 className="h-8 w-8" />}
                eyebrow="WEAVE employment Lifestyle"
                title="MUSIC ARTIST"
                detail="Established and upcoming music artists can apply from their Client, Bridger or Agent account. Accept an employment offer, receive daily time slots and perform live through WEAVE DJ broadcasting."
                open={Boolean(access?.active)}
                reason={`Renew the ${roleLabel} monthly subscription to enter Music Artist.`}
                href="/weave/lifestyles/music-artist"
                action="Enter Music Artist"
                tools={[{ icon: <Mic2 className="h-3.5 w-3.5" />, label: 'Live performance' }, { icon: <BriefcaseBusiness className="h-3.5 w-3.5" />, label: 'Artist employment' }]}
              />}

              <div className="border-y border-white/10 px-4 py-5 sm:border" data-lifestyle-position-rule="true">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">Position rule</p>
                <h2 className="mt-1 text-xl font-black text-white">ONE SUBSCRIPTION · POSITION-SCOPED ACCESS</h2>
                <p className="mt-2 text-xs leading-5 text-slate-500">A Lifestyle never replaces your core WEAVE role. Your position determines what identities can open; each identity then contains the environments and instruments that belong to that way of operating.</p>
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
  tone:'yellow'|'cyan'|'amber'
}){
  const toneClass=tone==='cyan'?'text-cyan-300 border-cyan-300/20 bg-cyan-300/[0.035]':tone==='amber'?'text-amber-300 border-amber-300/20 bg-amber-300/[0.035]':'text-yellow-300 border-yellow-300/20 bg-yellow-300/[0.035]'
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
