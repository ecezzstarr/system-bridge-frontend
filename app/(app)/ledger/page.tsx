'use client'

import { displayCurrencyName } from '@/lib/flame-coin'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-provider'
import { visiblePoll } from '@/lib/visible-poll'
import { BalanceSummary } from '@/components/balance-summary'
import { EscrowList } from '@/components/escrow-list'
import { TransactionItem } from '@/components/transaction-item'
import { WeaveStationFrame } from '@/components/world/weave-station-frame'

interface LedgerEntry {
  id:string;entry_type:any;amount:number;currency:string;description?:string
  created_at:string;balance_after?:number|null
}
interface LedgerData {
  ledger:LedgerEntry[]
  escrow:any[]
  balance:{available:number|null;locked:number|null;total:number|null}
  sections:{
    wallet:'available'|'legacy_wallet'|'missing'|'ambiguous'|'unavailable'
    escrow:'available'|'unavailable'
    ledger:'available'|'unavailable'
  }
  warnings:string[]
  nextCursor:string|null
  hasMore:boolean
  readAt:string
}

const noStore={cache:'no-store' as const}

export default function LedgerPage() {
  const {token,isInitialized}=useAuth()
  const [data,setData]=useState<LedgerData|null>(null)
  const [cursor,setCursor]=useState<string|null>(null)
  const [loading,setLoading]=useState(true)
  const [loadingMore,setLoadingMore]=useState(false)
  const [error,setError]=useState('')
  const [refreshing,setRefreshing]=useState(false)

  useEffect(()=>{
    if (!isInitialized) return
    setData(null)
    setCursor(null)
    setError('')
    if (!token) {
      setError('Your WEAVE session is unavailable. Sign in again to open Record.')
      setLoading(false)
      return
    }
    let stopped=false
    const refresh=async(signal:AbortSignal)=>{
      setRefreshing(true)
      try {
        const response=await fetch('/api/ledger?limit=50',{
          ...noStore,headers:{Authorization:`Bearer ${token}`},signal,
        })
        const json=await response.json().catch(()=>null)
        if (!response.ok || !json?.success || !json.data?.balance) {
          throw new Error(json?.error || 'Recorded funds could not be loaded.')
        }
        if (signal.aborted || stopped) return
        const fresh=json.data as LedgerData
        setData(previous=>{
          if (!previous) return fresh
          const combined=new Map<string,LedgerEntry>()
          for (const entry of previous.ledger) combined.set(entry.id,entry)
          for (const entry of fresh.ledger) combined.set(entry.id,entry)
          return {
            ...fresh,
            ledger:Array.from(combined.values()).sort((a,b)=>
              new Date(b.created_at).getTime()-new Date(a.created_at).getTime() ||
              b.id.localeCompare(a.id)
            ),
          }
        })
        setCursor(previous=>previous ?? fresh.nextCursor)
        setError('')
      } catch(cause) {
        if (!signal.aborted && !stopped) {
          setError(cause instanceof Error?cause.message:'Financial records unavailable.')
        }
      } finally {
        if (!stopped) {setLoading(false);setRefreshing(false)}
      }
    }
    const stop=visiblePoll(refresh,20000)
    return ()=>{stopped=true;stop()}
  },[isInitialized,token])

  const loadMore=async()=>{
    if (!token || !cursor || loadingMore) return
    setLoadingMore(true)
    try {
      const response=await fetch('/api/ledger?limit=50&cursor='+encodeURIComponent(cursor),{
        ...noStore,headers:{Authorization:`Bearer ${token}`},
      })
      const json=await response.json().catch(()=>null)
      if (!response.ok || !json?.success || !Array.isArray(json.data?.ledger)) {
        throw new Error(json?.error || 'More transaction records could not be loaded.')
      }
      const next=json.data as LedgerData
      setData(previous=>{
        if (!previous) return next
        const seen=new Set(previous.ledger.map(entry=>entry.id))
        return {...previous,ledger:[
          ...previous.ledger,...next.ledger.filter(entry=>!seen.has(entry.id)),
        ]}
      })
      setCursor(next.nextCursor)
      setError('')
    } catch(cause) {
      setError(cause instanceof Error?cause.message:'Additional records unavailable.')
    } finally {setLoadingMore(false)}
  }

  if (!isInitialized || (loading && !data)) {
    return <div className="p-8 text-center text-base text-slate-300">Opening your recorded financial history...</div>
  }
  if (!data) {
    return <div className="mx-auto max-w-2xl p-8" role="alert">
      <div className="rounded-2xl border border-red-400/20 bg-red-400/5 p-6">
        <p className="text-sm font-black uppercase tracking-wider text-red-300">Record unavailable</p>
        <p className="mt-3 text-base leading-7 text-slate-300">{error || 'No verified financial snapshot was loaded.'}</p>
        <p className="mt-2 text-xs text-slate-400">Your stored funds have not been reset. Reopen Record when the connection is restored.</p>
      </div>
    </div>
  }
  return (
    <WeaveStationFrame station="Movement Record" movement="Value movement → confirmation → preserved record → continuity">
      <div className="space-y-8 p-4 sm:p-6">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-sky-300">WEAVE Record</p>
          <h1 className="mt-2 text-3xl font-black text-white">Record</h1>
          <p className="mt-2 text-sm text-slate-400">Your financial record is preserved in PostgreSQL and available again after logging out or returning to Weave.</p>
          <p className="mt-2 text-xs text-sky-200">
            Recorded: {new Date(data.readAt).toLocaleString()} {refreshing ? ' · Updating…' : ' · Database record'}
          </p>
        </div>
        {error && <p role="alert" className="rounded-xl border border-amber-400/20 p-3 text-xs text-amber-100">
          Latest refresh failed: {error}. Showing the last successfully loaded records, not a replacement zero balance.
        </p>}
        {data.warnings?.length>0 && (
          <div role="status" className="space-y-1 rounded-xl border border-amber-400/20 bg-amber-400/5 p-4 text-xs leading-5 text-amber-100">
            <p className="font-bold">Financial record needs attention</p>
            {data.warnings.map((warning,i)=><p key={i}>{warning}</p>)}
          </div>
        )}
        <BalanceSummary available={data.balance.available} locked={data.balance.locked} currency="System Switch"/>
        {data.sections?.escrow==='available'
          ? <EscrowList escrows={data.escrow.map(item=>({...item,locked_at:new Date(item.locked_at)}))}/>
          : <p className="text-sm text-amber-200">Escrow history unavailable. No locked-balance value has been assumed.</p>}
        <section className="border-y border-white/10 bg-black/15 py-4" data-record-rail="transactions">
          <div className="mb-4 border-l border-sky-300/25 pl-3">
            <h2 className="text-sm font-black text-white">Transaction movement</h2>
            <p className="mt-1 text-[10px] text-slate-500">
              Permanent ledger entries in newest-first order. Older records are available below.
            </p>
          </div>
          <div className="space-y-2">
            {data.sections?.ledger==='unavailable'
              ? <p className="py-6 text-center text-amber-200">Transaction history could not be retrieved. This does not mean the account has no transactions.</p>
              : data.ledger.length ? data.ledger.map(entry=>(
              <TransactionItem key={entry.id} type={entry.entry_type}
                amount={Number(entry.amount)} currency={displayCurrencyName(entry.currency)}
                description={entry.description||'Recorded transaction'}
                date={new Date(entry.created_at)}
                balanceAfter={entry.balance_after == null?undefined:Number(entry.balance_after)}/>
            )) : <p className="py-8 text-center text-slate-400">No recorded transactions yet.</p>}
          </div>
          {cursor && <button type="button" disabled={loadingMore}
            onClick={()=>void loadMore()}
            className="mt-4 rounded-xl border border-sky-300/30 px-4 py-2 text-sm font-semibold text-sky-100 disabled:opacity-50">
            {loadingMore?'Loading older records…':'Load older transactions'}
          </button>}
        </section>
      </div>
    </WeaveStationFrame>
  )
}
