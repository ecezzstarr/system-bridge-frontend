'use client'

import { useEffect, useState } from 'react'
import useSWR from 'swr'
import {
  ArrowUpRight,
  Check,
  Copy,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
  Wallet,
} from 'lucide-react'
import { useAuth } from '@/lib/auth-provider'

interface FundWallData {
  companyWallet: { id?: string; address?: string; trx: number; usdt: number }
  platformWallet: { id?: string; address?: string; trx: number; usdt: number }
  stats: { totalLocked: number; totalTransactions: number; lastSweep: string | null }
  recentSweeps: Array<{ id:string; amount:number; from:string; to:string; completedAt:string }>
}

export default function ReserveEnginePage() {
  const { user, token } = useAuth()
  const creator = user?.role === 'creator'
  const [copied, setCopied] = useState<string | null>(null)

  const { data, error, mutate, isLoading } = useSWR<FundWallData>(
    creator ? '/api/fund-wall' : null,
    async (url:string) => {
      const response = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        cache: 'no-store',
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error || 'Unable to read Reserve state')
      return body
    },
    {
      refreshInterval: 5000,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 5000,
    },
  )

  useEffect(()=>{
    if(!copied) return
    const timer=window.setTimeout(()=>setCopied(null),1800)
    return ()=>window.clearTimeout(timer)
  },[copied])

  const copy = async (key:string,address?:string) => {
    if(!address) return
    await navigator.clipboard.writeText(address)
    setCopied(key)
  }

  if (!user) return null

  if (!creator) {
    return (
      <main className="mx-auto w-full max-w-3xl p-3 md:p-6">
        <section className="weave-system-depth rounded-[2rem] border border-rose-300/15 bg-[#030a15]/72 p-6 md:p-8">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-rose-300/20 bg-rose-400/10"><LockKeyhole className="h-5 w-5 text-rose-200"/></div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-rose-300">Reserve Engine</p>
              <h1 className="mt-1 text-2xl font-black text-white">Creator authority required.</h1>
              <p className="mt-3 text-sm leading-6 text-slate-300">The Reserve exposes company and platform wallet state, escrow totals and sweep history. It is intentionally not a general participant surface.</p>
            </div>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="mx-auto w-full max-w-6xl p-3 md:p-6">
      <section className="weave-system-depth overflow-hidden rounded-[2rem] border border-amber-300/15 bg-[#030a15]/72">
        <header className="border-b border-white/10 bg-[radial-gradient(circle_at_14%_0%,rgba(245,158,11,.13),transparent_34%),radial-gradient(circle_at_88%_0%,rgba(16,185,129,.08),transparent_28%)] p-5 md:p-7">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="weave-word-presence text-[9px] font-black uppercase tracking-[0.22em] text-amber-300">Reserve Engine</p>
              <h1 className="mt-2 text-2xl font-black text-white md:text-3xl">Company reserve, platform reserve and sweep history in one live state.</h1>
              <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-300">This surface reads the protected Reserve API every five seconds. Wallet balances, escrow and sweep history are presented as recorded financial state rather than decorative totals.</p>
            </div>
            <button onClick={()=>void mutate()} disabled={isLoading} className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-300/15 bg-amber-400/[0.06] px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.1em] text-amber-100 disabled:opacity-50">
              <RefreshCw className={`h-4 w-4 ${isLoading?'animate-spin':''}`}/>Refresh
            </button>
          </div>
        </header>

        <div className="grid gap-4 p-4 md:p-6 lg:grid-cols-[1fr_320px]">
          <section className="weave-reading-surface rounded-3xl p-4 md:p-5">
            {error && <div className="mb-4 rounded-2xl border border-rose-300/15 bg-rose-400/[0.05] p-4 text-sm text-rose-100">{error instanceof Error ? error.message : 'Unable to read Reserve state'}</div>}

            <div className="grid gap-3 md:grid-cols-2">
              <WalletState
                label="Platform reserve"
                detail="System funds recorded in the platform wallet."
                balance={data?.platformWallet.trx ?? 0}
                address={data?.platformWallet.address}
                tone="sky"
                copied={copied==='platform'}
                onCopy={()=>void copy('platform',data?.platformWallet.address)}
              />
              <WalletState
                label="Company reserve"
                detail="Creator-authorized company wallet state."
                balance={data?.companyWallet.trx ?? 0}
                address={data?.companyWallet.address}
                tone="emerald"
                copied={copied==='company'}
                onCopy={()=>void copy('company',data?.companyWallet.address)}
              />
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <Metric label="Escrow locked" value={isLoading?'…':Number(data?.stats.totalLocked||0).toLocaleString(undefined,{maximumFractionDigits:2})} detail="Flame Coin awaiting release" tone="amber"/>
              <Metric label="Completed transactions" value={isLoading?'…':Number(data?.stats.totalTransactions||0).toLocaleString()} detail="Recorded completed movement" tone="sky"/>
              <Metric label="Last sweep" value={data?.stats.lastSweep ? new Date(data.stats.lastSweep).toLocaleDateString() : 'None'} detail="Most recent recorded sweep" tone="violet"/>
            </div>

            <div className="mt-5">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.18em] text-emerald-300">Sweep record</p>
                  <p className="mt-1 text-xs text-slate-400">Recent completed reserve consolidation movements.</p>
                </div>
                <ArrowUpRight className="h-5 w-5 text-emerald-300"/>
              </div>

              {!data?.recentSweeps?.length ? (
                <div className="mt-4 rounded-2xl border border-dashed border-white/10 p-6 text-center text-xs text-slate-400">No completed sweep is currently recorded.</div>
              ) : (
                <div className="mt-4 space-y-2">
                  {data.recentSweeps.map(sweep=>(
                    <div key={sweep.id} className="flex flex-col gap-2 rounded-2xl border border-white/8 bg-black/20 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-xs font-black text-white">Reserve consolidation</p>
                        <p className="mt-1 truncate font-mono text-[9px] text-slate-500">{sweep.from || 'source not recorded'} → {sweep.to || 'destination not recorded'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-emerald-200">+{Number(sweep.amount||0).toLocaleString(undefined,{maximumFractionDigits:2})} Flame Coin</p>
                        <p className="mt-1 text-[9px] text-slate-500">{sweep.completedAt ? new Date(sweep.completedAt).toLocaleString() : 'Recorded'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          <aside className="space-y-4">
            <section className="rounded-3xl border border-emerald-300/15 bg-emerald-400/[0.04] p-4">
              <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-300"/><p className="text-[9px] font-black uppercase tracking-[0.18em] text-emerald-300">Reserve causality</p></div>
              <div className="mt-3 space-y-2 text-xs font-semibold text-slate-300">
                <p>Platform movement → platform reserve.</p>
                <p>Escrow → locked state.</p>
                <p>Completed sweep → company reserve.</p>
                <p>API record → visible state.</p>
              </div>
            </section>

            <section className="rounded-3xl border border-sky-300/15 bg-sky-400/[0.04] p-4">
              <div className="flex items-center gap-2"><Wallet className="h-4 w-4 text-sky-300"/><p className="text-[9px] font-black uppercase tracking-[0.18em] text-sky-300">Truth rule</p></div>
              <p className="mt-3 text-xs leading-5 text-slate-300">This page does not initiate sweeps. It observes balances and completed sweep records returned by the creator-authorized API.</p>
            </section>
          </aside>
        </div>
      </section>
    </main>
  )
}

function WalletState({label,detail,balance,address,tone,copied,onCopy}:{label:string;detail:string;balance:number;address?:string;tone:'sky'|'emerald';copied:boolean;onCopy:()=>void}) {
  const color=tone==='sky'
    ? 'border-sky-300/15 bg-sky-400/[0.04] text-sky-300'
    : 'border-emerald-300/15 bg-emerald-400/[0.04] text-emerald-300'
  return (
    <section className={`rounded-2xl border p-5 ${color}`}>
      <div className="flex items-center gap-2"><Wallet className="h-4 w-4"/><p className="text-[9px] font-black uppercase tracking-[0.18em]">{label}</p></div>
      <p className="mt-4 text-3xl font-black text-white">{Number(balance||0).toLocaleString(undefined,{maximumFractionDigits:2})}</p>
      <p className="text-xs font-black text-slate-300">Flame Coin</p>
      <p className="mt-2 text-[10px] leading-4 text-slate-400">{detail}</p>
      <div className="mt-4 flex items-center gap-2 rounded-xl border border-white/8 bg-black/25 p-2.5">
        <code className="min-w-0 flex-1 truncate text-[9px] text-slate-300">{address || 'No wallet address recorded'}</code>
        <button onClick={onCopy} disabled={!address} className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] disabled:opacity-40">
          {copied?<Check className="h-3.5 w-3.5"/>:<Copy className="h-3.5 w-3.5"/>}
        </button>
      </div>
    </section>
  )
}

function Metric({label,value,detail,tone}:{label:string;value:string;detail:string;tone:'amber'|'sky'|'violet'}) {
  const color=tone==='amber'?'text-amber-300 border-amber-300/15 bg-amber-400/[0.035]':tone==='violet'?'text-violet-300 border-violet-300/15 bg-violet-400/[0.035]':'text-sky-300 border-sky-300/15 bg-sky-400/[0.035]'
  return <div className={`rounded-2xl border p-4 ${color}`}><p className="text-[8px] font-black uppercase tracking-[0.12em]">{label}</p><p className="mt-2 text-xl font-black text-white">{value}</p><p className="mt-1 text-[9px] leading-4 text-slate-400">{detail}</p></div>
}
