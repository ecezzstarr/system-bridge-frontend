'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-provider'
import { Activity, BarChart3, CalendarDays, ExternalLink, Loader2, Mail, Megaphone, Radio, RefreshCw, Share2, Video } from 'lucide-react'
import { Button } from '@/components/ui/button'

type DistributionChannel = {
  key: string
  label: string
  kind: 'native' | 'external'
  status: string
  accountLabel: string | null
  connectedAt: string | null
  route: string | null
}

type Campaign = {
  id: string
  title: string
  media_type: string
  status: string
  start_at: string
  end_at: string | null
  public_movement: boolean
  public_platforms: string[]
  movement_code: string | null
  movement_destination: string
  referral_code: string | null
  entrances: number
  registrations: number
  file_folder_purchases: number
}

type DistributionState = {
  channels: DistributionChannel[]
  summary: {
    liveCampaigns: number
    draftCampaigns: number
    publicCampaigns: number
    entrances: number
    registrations: number
    fileFolderPurchases: number
    carrierLive: number
    carrierReach: number
    carrierSupport: number
    carrierShares: number
  }
  campaigns: Campaign[]
  platformRecord: Record<string, Record<string, number>>
}

function compact(value: number) {
  return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(value || 0)
}

function dateLabel(value: string | null) {
  if (!value) return 'Open movement'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Unscheduled'
  return date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function DistributionStudioPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [state, setState] = useState<DistributionState | null>(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    if (user.role !== 'admin') router.replace('/dashboard')
  }, [user, router])

  const authHeaders = (): Record<string, string> => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('ssb_auth_token') : null
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  const load = async () => {
    setLoading(true)
    setMessage(null)
    try {
      const response = await fetch('/api/admin/distribution-studio', { headers: authHeaders(), cache: 'no-store' })
      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data.success) throw new Error(data.error || 'Distribution Studio could not open')
      setState(data)
    } catch (error: any) {
      setMessage(error.message || 'Distribution Studio could not open')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user?.role === 'admin') void load()
  }, [user?.role])

  const channelByKey = useMemo(() => new Map((state?.channels || []).map(channel => [channel.key, channel])), [state?.channels])
  const connectedExternal = useMemo(() => (state?.channels || []).filter(channel => channel.kind === 'external' && channel.status === 'ready').length, [state?.channels])

  if (!user || user.role !== 'admin') return null

  return (
    <main className="mx-auto max-w-7xl space-y-6 pb-16" data-distribution-studio="weave-native">
      <section className="overflow-hidden border-y border-cyan-300/15 bg-[#07101a]/88 p-5 text-white sm:rounded-[2rem] sm:border sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-4xl">
            <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.28em] text-cyan-300">
              <Share2 className="h-4 w-4" /> Administration · Company Movement
            </div>
            <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">WEAVE DISTRIBUTION STUDIO</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
              WEAVE owns the marketing brain. Form content, choose where movement travels, schedule it, carry people into a real WEAVE destination, then follow the record from entrance to participation and value.
            </p>
          </div>
          <Button variant="outline" onClick={() => void load()} disabled={loading} className="border-white/15 text-white">
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> REFRESH RECORD
          </Button>
        </div>

        <div className="mt-7 grid grid-cols-2 border-y border-white/10 sm:grid-cols-4">
          <Metric label="Live Movements" value={state?.summary.liveCampaigns || 0} />
          <Metric label="Public Entrances" value={state?.summary.entrances || 0} bordered />
          <Metric label="Registrations" value={state?.summary.registrations || 0} bordered />
          <Metric label="File Folder Purchases" value={state?.summary.fileFolderPurchases || 0} />
        </div>
      </section>

      {message && <div className="border border-red-300/20 bg-red-300/[0.04] px-4 py-3 text-sm text-red-100">{message}</div>}

      {loading && !state ? (
        <div className="flex min-h-64 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-cyan-300" /></div>
      ) : (
        <>
          <section className="grid gap-4 lg:grid-cols-4">
            <OperatingGate href="/admin/ad-workshop" icon={<Megaphone className="h-5 w-5" />} label="FORMATION" detail="Form text, image and live WEAVE placements." />
            <OperatingGate href="/admin/video-ad-workshop" icon={<Video className="h-5 w-5" />} label="VIDEO" detail="Form and render video, then move it into distribution." />
            <OperatingGate href="/weave/carrier" icon={<Radio className="h-5 w-5" />} label="CARRIER" detail="Carry live Ace activity directly to people outside WEAVE." />
            <OperatingGate href="/admin/email-outreach" icon={<Mail className="h-5 w-5" />} label="EMAIL" detail="Move targeted prospect communication through the outreach engine." />
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.05fr_.95fr]">
            <div className="border-y border-white/10 bg-black/15 p-5 sm:border sm:p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.24em] text-cyan-300">CHANNELS</p>
                  <h2 className="mt-1 text-2xl font-black text-white">WHERE MOVEMENT TRAVELS</h2>
                </div>
                <div className="text-right text-[9px] font-black uppercase tracking-widest text-slate-600">{connectedExternal} external ready</div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {(state?.channels || []).map(channel => (
                  <div key={channel.key} className="border border-white/10 bg-[#07101a]/55 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-black text-white">{channel.label}</p>
                        <p className="mt-1 text-[9px] font-black uppercase tracking-widest text-slate-600">{channel.kind === 'native' ? 'WEAVE NATIVE' : 'EXTERNAL OUTLET'}</p>
                      </div>
                      <span className={`border px-2 py-1 text-[8px] font-black uppercase tracking-wider ${channel.status === 'ready' ? 'border-emerald-300/25 bg-emerald-300/[0.06] text-emerald-200' : 'border-white/10 text-slate-500'}`}>{channel.status === 'ready' ? 'READY' : 'CONNECTION REQUIRED'}</span>
                    </div>
                    {channel.accountLabel && <p className="mt-3 text-xs text-slate-400">{channel.accountLabel}</p>}
                    {channel.route ? (
                      <Button asChild variant="outline" className="mt-4 h-8 border-white/10 text-[10px] text-white"><Link href={channel.route}>OPEN CHANNEL <ExternalLink className="ml-2 h-3 w-3" /></Link></Button>
                    ) : (
                      <p className="mt-4 text-[10px] leading-4 text-slate-600">OAuth/API connection enters here without moving the marketing brain outside WEAVE.</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="border-y border-white/10 bg-black/15 p-5 sm:border sm:p-6">
              <div className="flex items-center gap-2"><BarChart3 className="h-4 w-4 text-yellow-300" /><p className="text-[9px] font-black uppercase tracking-[0.24em] text-yellow-300">RECORD</p></div>
              <h2 className="mt-2 text-2xl font-black text-white">MOVEMENT → VALUE</h2>
              <p className="mt-2 text-xs leading-5 text-slate-500">The Studio does not stop at likes. It follows the movement deeper into WEAVE.</p>

              <div className="mt-5 space-y-2">
                <FunnelStep label="Carrier public reach" value={state?.summary.carrierReach || 0} />
                <FunnelStep label="Public entrances" value={state?.summary.entrances || 0} />
                <FunnelStep label="Registrations" value={state?.summary.registrations || 0} />
                <FunnelStep label="File Folder purchases" value={state?.summary.fileFolderPurchases || 0} />
              </div>

              <div className="mt-5 grid grid-cols-3 border-y border-white/10 text-center">
                <MiniMetric label="Carrier Live" value={state?.summary.carrierLive || 0} />
                <MiniMetric label="Support" value={state?.summary.carrierSupport || 0} bordered />
                <MiniMetric label="Shares" value={state?.summary.carrierShares || 0} />
              </div>
            </div>
          </section>

          <section className="border-y border-white/10 bg-black/15 p-5 sm:border sm:p-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <div className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-fuchsia-300" /><p className="text-[9px] font-black uppercase tracking-[0.24em] text-fuchsia-300">MOVEMENT CALENDAR</p></div>
                <h2 className="mt-2 text-2xl font-black text-white">CURRENT DISTRIBUTION</h2>
                <p className="mt-1 text-xs text-slate-500">One record for what is live, waiting, paused and converting.</p>
              </div>
              <div className="text-xs text-slate-500">{state?.summary.draftCampaigns || 0} draft · {state?.summary.publicCampaigns || 0} public</div>
            </div>

            <div className="mt-5 space-y-3">
              {(state?.campaigns || []).length === 0 ? <p className="py-8 text-center text-sm text-slate-600">No campaign movement has been formed yet.</p> : (state?.campaigns || []).map(campaign => (
                <article key={campaign.id} className="grid gap-4 border border-white/10 bg-[#07101a]/45 p-4 lg:grid-cols-[1.4fr_.8fr_.8fr] lg:items-center">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-[8px] font-black uppercase tracking-widest ${campaign.status === 'published' ? 'text-emerald-300' : campaign.status === 'draft' ? 'text-yellow-300' : 'text-slate-500'}`}>{campaign.status}</span>
                      <span className="text-[8px] font-black uppercase tracking-widest text-slate-600">{campaign.media_type}</span>
                      {campaign.public_movement && <span className="text-[8px] font-black uppercase tracking-widest text-cyan-300">public movement</span>}
                    </div>
                    <h3 className="mt-2 text-base font-black text-white">{campaign.title}</h3>
                    <p className="mt-1 text-[10px] text-slate-600">{dateLabel(campaign.start_at)}{campaign.end_at ? ` → ${dateLabel(campaign.end_at)}` : ''}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">{(campaign.public_platforms || []).map(platform => <span key={platform} className="border border-white/10 px-2 py-1 text-[8px] font-black uppercase text-slate-500">{channelByKey.get(platform)?.label || platform}</span>)}</div>
                  </div>
                  <div className="text-xs text-slate-500">
                    <p className="text-[8px] font-black uppercase tracking-widest text-slate-600">Destination</p>
                    <p className="mt-1 break-all text-slate-300">{campaign.movement_destination || '/'}</p>
                    {campaign.referral_code && <p className="mt-2 text-[9px]">REF · {campaign.referral_code}</p>}
                  </div>
                  <div className="grid grid-cols-3 text-center">
                    <MiniMetric label="Enter" value={campaign.entrances} />
                    <MiniMetric label="Register" value={campaign.registrations} bordered />
                    <MiniMetric label="Folder" value={campaign.file_folder_purchases} />
                  </div>
                </article>
              ))}
            </div>
          </section>
        </>
      )}
    </main>
  )
}

function Metric({ label, value, bordered = false }: { label: string; value: number; bordered?: boolean }) {
  return <div className={`px-3 py-4 text-center ${bordered ? 'border-x border-white/10' : ''}`}><p className="text-2xl font-black text-white">{compact(value)}</p><p className="mt-1 text-[8px] font-black uppercase tracking-widest text-slate-600">{label}</p></div>
}

function MiniMetric({ label, value, bordered = false }: { label: string; value: number; bordered?: boolean }) {
  return <div className={`px-2 py-3 ${bordered ? 'border-x border-white/10' : ''}`}><p className="text-lg font-black text-white">{compact(value)}</p><p className="mt-1 text-[7px] font-black uppercase tracking-widest text-slate-600">{label}</p></div>
}

function FunnelStep({ label, value }: { label: string; value: number }) {
  return <div className="flex items-center justify-between border-b border-white/10 px-1 py-3"><div className="flex items-center gap-2"><Activity className="h-3.5 w-3.5 text-cyan-300" /><span className="text-xs text-slate-400">{label}</span></div><strong className="text-sm text-white">{compact(value)}</strong></div>
}

function OperatingGate({ href, icon, label, detail }: { href: string; icon: React.ReactNode; label: string; detail: string }) {
  return <Link href={href} className="group border-y border-white/10 bg-black/15 p-4 transition hover:bg-white/[0.03] sm:border"><div className="text-cyan-300">{icon}</div><p className="mt-3 text-[9px] font-black uppercase tracking-[0.24em] text-white">{label}</p><p className="mt-2 text-xs leading-5 text-slate-500">{detail}</p><p className="mt-3 text-[8px] font-black uppercase tracking-widest text-cyan-300/70">ENTER →</p></Link>
}
