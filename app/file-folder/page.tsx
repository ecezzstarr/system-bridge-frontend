'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Copy,
  Crown,
  FileKey2,
  FolderOpen,
  Loader2,
  Radio,
  ShieldCheck,
  UserRound,
  Wallet,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { WeaveLogo } from '@/components/weave-logo'
import { FILE_FOLDER_PRICING, getFileFolderTier } from '@/lib/file-folder-pricing'

const STORAGE_KEY = 'weave:public-file-folder-purchase'

interface PendingPurchase {
  id: string
  accessToken: string
  status: string
  fileNumber?: string | null
  amountFlameCoin?: number
}

function authHeaders(json = false): Record<string, string> {
  const token = typeof window !== 'undefined' ? window.localStorage.getItem('ssb_auth_token') : null
  return {
    ...(json ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

export default function PublicFileFolderPurchasePage() {
  const [tier, setTier] = useState<'standard' | 'premium' | 'plus'>('standard')
  const [standardAmount, setStandardAmount] = useState(String(FILE_FOLDER_PRICING.standardMinimumFlameCoin))
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [reference, setReference] = useState('')
  const [wallet, setWallet] = useState('')
  const [walletLoading, setWalletLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [busy, setBusy] = useState(false)
  const [checking, setChecking] = useState(false)
  const [message, setMessage] = useState('')
  const [purchase, setPurchase] = useState<PendingPurchase | null>(null)
  const [registerUrl, setRegisterUrl] = useState('')

  const amount = tier === 'plus' ? FILE_FOLDER_PRICING.plusTrx : tier === 'premium' ? FILE_FOLDER_PRICING.premiumFlameCoin : Number(standardAmount)
  const amountTier = getFileFolderTier(amount, tier)
  const validAmount = amountTier === tier
  const returningClient = registerUrl.startsWith('/client/system-switch')

  const stage = useMemo(() => {
    if (purchase?.status === 'confirmed' && purchase.fileNumber) return 5
    if (purchase?.status === 'rejected') return 4
    if (purchase) return 4
    if (reference.trim()) return 3
    if (name.trim() && phone.trim() && validAmount) return 2
    return 1
  }, [purchase, reference, name, phone, validAmount])

  useEffect(() => {
    fetch('/api/bridge/file-folder', { cache: 'no-store' })
      .then(async response => response.ok ? response.json() : null)
      .then(data => setWallet(data?.companyTrxWallet || data?.depositWallet || ''))
      .catch(() => setWallet(''))
      .finally(() => setWalletLoading(false))

    try {
      const stored = window.localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (parsed?.id && parsed?.accessToken) {
          if (parsed.tier === 'plus' || parsed.tier === 'premium' || parsed.tier === 'standard') setTier(parsed.tier)
          setPurchase({
            id: String(parsed.id),
            accessToken: String(parsed.accessToken),
            status: 'pending_admin_confirmation',
          })
          setMessage('Restoring your File Folder purchase while Administration verification continues.')
        }
      }
    } catch {}
  }, [])

  useEffect(() => {
    if (!purchase?.id || !purchase.accessToken || purchase.status !== 'pending_admin_confirmation') return

    let stopped = false
    let timer: number | null = null

    const check = async () => {
      if (stopped) return
      if (document.visibilityState === 'hidden') {
        timer = window.setTimeout(check, 5000)
        return
      }

      setChecking(true)
      try {
        const token = window.localStorage.getItem('ssb_auth_token')
        const response = token
          ? await fetch('/api/public/file-folder/purchase', {
              method: 'PATCH',
              headers: authHeaders(true),
              body: JSON.stringify({ purchaseId: purchase.id, accessToken: purchase.accessToken }),
              cache: 'no-store',
            })
          : await fetch(
              `/api/public/file-folder/purchase?purchaseId=${encodeURIComponent(purchase.id)}&accessToken=${encodeURIComponent(purchase.accessToken)}`,
              { cache: 'no-store' },
            )
        const body = await response.json()
        if (!response.ok) throw new Error(body.error || 'Unable to read purchase status')

        const next = {
          ...purchase,
          ...body.purchase,
          accessToken: purchase.accessToken,
        }
        setPurchase(next)
        if (body.purchase?.fileFolderTier === 'plus' || body.purchase?.fileFolderTier === 'premium' || body.purchase?.fileFolderTier === 'standard') {
          setTier(body.purchase.fileFolderTier)
        }

        if (body.crossing?.ready) {
          const nextUrl = body.crossing.systemSwitchUrl || body.crossing.registerUrl || ''
          setRegisterUrl(nextUrl)
          setMessage(
            body.crossing.systemSwitchUrl
              ? `Administration verified your payment and File Number ${body.purchase.fileNumber} is now attached to your Client File Folder.`
              : `Administration verified your payment and issued File Number ${body.purchase.fileNumber}. You can now create your Client account.`
          )
          try { window.localStorage.removeItem(STORAGE_KEY) } catch {}
          return
        }

        if (body.purchase?.status === 'rejected') {
          setMessage('Administration could not verify this payment. Review the TRX transaction reference before submitting a new File Folder purchase.')
          try { window.localStorage.removeItem(STORAGE_KEY) } catch {}
          return
        }
      } catch {
        // Keep the public crossing alive through temporary network interruptions.
      } finally {
        setChecking(false)
      }

      if (!stopped) timer = window.setTimeout(check, 5000)
    }

    timer = window.setTimeout(check, 2500)
    return () => {
      stopped = true
      if (timer) window.clearTimeout(timer)
    }
  }, [purchase?.id, purchase?.accessToken, purchase?.status])

  const copyWallet = async () => {
    if (!wallet) return
    await navigator.clipboard.writeText(wallet)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  const submitPurchase = async () => {
    if (!validAmount || !name.trim() || !phone.trim() || !reference.trim() || purchase) return
    setBusy(true)
    setMessage('')

    try {
      const response = await fetch('/api/public/file-folder/purchase', {
        method: 'POST',
        headers: authHeaders(true),
        body: JSON.stringify({
          amountTrx: amount,
          fileFolderTier: tier,
          paymentMethod: 'trx',
          paymentReference: reference.trim(),
          buyerName: name.trim(),
          buyerPhone: phone.trim(),
          buyerEmail: email.trim() || undefined,
        }),
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error || 'Unable to record File Folder purchase')

      const next: PendingPurchase = {
        id: String(body.purchase.id),
        accessToken: String(body.accessToken),
        status: body.purchase.status,
        fileNumber: body.purchase.fileNumber || null,
        amountFlameCoin: Number(body.purchase.amountFlameCoin || amount),
      }
      setPurchase(next)
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ id: next.id, accessToken: next.accessToken, tier }))
      setMessage(body.message || 'Payment recorded. Administration verification is now open.')
    } catch (error: any) {
      setMessage(error?.message || 'Unable to record File Folder purchase')
    } finally {
      setBusy(false)
    }
  }

  const resetRejected = () => {
    setPurchase(null)
    setRegisterUrl('')
    setReference('')
    setMessage('')
    try { window.localStorage.removeItem(STORAGE_KEY) } catch {}
  }

  const stages = ['Recognize', 'Choose File Folder', 'Record payment', 'Administration', 'Become Client']

  return (
    <main className="min-h-screen bg-[#03060b] text-white">
      <nav className="border-b border-cyan-300/10 bg-[#03101d]/82 px-4 py-3 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <Link href="/"><WeaveLogo size="sm" /></Link>
          <div className="flex items-center gap-2">
            <Link href="/file-folder-preview"><Button variant="ghost" className="text-xs">Preview File Folder</Button></Link>
            <Link href="/"><Button variant="outline" className="border-white/10"><ArrowLeft className="mr-2 h-4 w-4" /> Home</Button></Link>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-6xl px-3 py-5 sm:px-5 sm:py-8">
        <section className="overflow-hidden rounded-[2rem] border border-orange-200/15 bg-[#0b0706]/92 shadow-[0_32px_110px_rgba(85,20,5,.18)]">
          <header className="grid gap-5 border-b border-white/10 px-5 py-6 md:grid-cols-[1fr_auto] md:items-end md:px-8">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[.22em] text-orange-200">Public Client Crossing · File Folder</p>
              <h1 className="mt-3 max-w-4xl text-3xl font-black tracking-tight sm:text-5xl">Purchase your File Folder. Enter WEAVE as a Client.</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-400">Visitors do not need a Bridger link to become Clients. Choose the File Folder level, send the matching TRX amount to the WEAVE company wallet, submit the transaction hash, and Administration issues your File Number after verification.</p>
            </div>
            <div className="border-l border-white/10 pl-4">
              <p className="text-[8px] font-black uppercase tracking-[.18em] text-white/35">Current state</p>
              <p className="mt-1 text-sm font-black">
                {purchase?.status === 'confirmed' ? 'File Number issued' : purchase?.status === 'rejected' ? 'Payment not verified' : purchase ? 'Administration verification' : 'Ready to begin'}
              </p>
              {purchase?.status === 'pending_admin_confirmation' && <p className="mt-2 inline-flex items-center gap-2 text-[9px] text-amber-200"><Radio className="h-3.5 w-3.5" /> {checking ? 'Checking decision…' : 'Waiting for Administration'}</p>}
            </div>
          </header>

          <div className="grid border-b border-white/10 sm:grid-cols-5">
            {stages.map((label, index) => {
              const reached = stage >= index + 1
              return <div key={label} className="flex items-center gap-3 border-b border-white/7 px-4 py-3 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0"><span className={`flex h-7 w-7 items-center justify-center rounded-full border text-[8px] font-black ${reached ? 'border-orange-200/35 bg-orange-300/10 text-orange-100' : 'border-white/10 text-white/25'}`}>{index + 1}</span><span className={`text-[8px] font-black uppercase tracking-[.12em] ${reached ? 'text-white' : 'text-white/25'}`}>{label}</span></div>
            })}
          </div>

          <div className="grid lg:grid-cols-[.82fr_1.18fr]">
            <section className="border-b border-white/10 p-5 lg:border-b-0 lg:border-r lg:p-8">
              <div className="flex items-center gap-2 text-sky-200"><UserRound className="h-4 w-4" /><p className="text-[9px] font-black uppercase tracking-[.18em]">Your identity</p></div>
              <div className="mt-5 space-y-5">
                <label className="block"><span className="text-[9px] font-bold uppercase tracking-[.12em] text-stone-500">Name</span><input value={name} onChange={e=>setName(e.target.value)} disabled={Boolean(purchase)} placeholder="Your name" className="mt-2 w-full border-b border-white/12 bg-transparent pb-2 text-sm outline-none placeholder:text-white/20 disabled:opacity-50" /></label>
                <label className="block"><span className="text-[9px] font-bold uppercase tracking-[.12em] text-stone-500">Phone / WhatsApp</span><input value={phone} onChange={e=>setPhone(e.target.value)} disabled={Boolean(purchase)} placeholder="International phone number" className="mt-2 w-full border-b border-white/12 bg-transparent pb-2 text-sm outline-none placeholder:text-white/20 disabled:opacity-50" /></label>
                <label className="block"><span className="text-[9px] font-bold uppercase tracking-[.12em] text-stone-500">Email · optional</span><input type="email" value={email} onChange={e=>setEmail(e.target.value)} disabled={Boolean(purchase)} placeholder="you@example.com" className="mt-2 w-full border-b border-white/12 bg-transparent pb-2 text-sm outline-none placeholder:text-white/20 disabled:opacity-50" /></label>
              </div>

              <div className="mt-8 rounded-2xl border border-cyan-300/10 bg-cyan-300/[.035] p-4">
                <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-cyan-200" /><p className="text-[9px] font-black uppercase tracking-[.15em] text-cyan-100">What happens after approval</p></div>
                <p className="mt-3 text-xs leading-5 text-slate-400">Administration issues your File Number. Existing Clients are attached directly to the verified File Folder; new visitors continue once through Client registration and then enter the same operating environment.</p>
              </div>
            </section>

            <section className="p-5 lg:p-8">
              <div className="flex items-center gap-2 text-orange-200"><FolderOpen className="h-4 w-4" /><p className="text-[9px] font-black uppercase tracking-[.18em]">Choose File Folder</p></div>
              <div className="mt-4 grid overflow-hidden rounded-2xl border border-white/10 sm:grid-cols-2">
                <button type="button" disabled={Boolean(purchase)} onClick={()=>setTier('standard')} className={`min-h-36 border-b border-white/10 p-4 text-left sm:border-b-0 sm:border-r ${tier==='standard'?'bg-sky-300/[.07]':'bg-black/15'}`}><div className="flex items-center gap-2"><Wallet className="h-4 w-4 text-sky-200" /><span className="text-[9px] font-black uppercase tracking-[.14em]">Standard</span></div><p className="mt-5 text-2xl font-black">{FILE_FOLDER_PRICING.standardMinimumFlameCoin.toLocaleString()}–{FILE_FOLDER_PRICING.standardMaximumFlameCoin.toLocaleString()}</p><p className="mt-1 text-[9px] text-stone-500">Flame Coin · building power</p></button>
                <button type="button" disabled={Boolean(purchase)} onClick={()=>setTier('premium')} className={`min-h-36 p-4 text-left ${tier==='premium'?'bg-orange-300/[.07]':'bg-black/15'}`}><div className="flex items-center gap-2"><Crown className="h-4 w-4 text-orange-200" /><span className="text-[9px] font-black uppercase tracking-[.14em]">Premium</span></div><p className="mt-5 text-2xl font-black">{FILE_FOLDER_PRICING.premiumFlameCoin.toLocaleString()}</p><p className="mt-1 text-[9px] text-stone-500">Flame Coin · fixed · same amount in TRX</p></button>
                <button type="button" disabled={Boolean(purchase)} onClick={()=>setTier('plus')} className={`min-h-36 border-t border-white/10 p-4 text-left sm:col-span-2 ${tier==='plus'?'bg-emerald-300/[.07]':'bg-black/15'}`}><div className="flex items-center gap-2"><Crown className="h-4 w-4 text-emerald-200" /><span className="text-[9px] font-black uppercase tracking-[.14em]">Plus · Completed systems</span></div><p className="mt-3 text-2xl font-black">{FILE_FOLDER_PRICING.plusFlameCoin.toLocaleString()} Flame Coin</p><p className="mt-1 text-[10px] text-stone-300">Pay {FILE_FOLDER_PRICING.plusTrx.toLocaleString()} TRX · {FILE_FOLDER_PRICING.plusUsdt.toLocaleString()} USDT reference</p><p className="mt-1 text-[9px] text-stone-500">Administration-defined package quote, not a live exchange rate. Payment on this page is TRX only.</p></button>
              </div>

              {tier === 'standard' && <label className="mt-4 block"><span className="text-[9px] font-bold uppercase tracking-[.12em] text-stone-500">Standard amount · {FILE_FOLDER_PRICING.standardMinimumFlameCoin.toLocaleString()} to {FILE_FOLDER_PRICING.standardMaximumFlameCoin.toLocaleString()}</span><input inputMode="decimal" type="number" min={FILE_FOLDER_PRICING.standardMinimumFlameCoin} max={FILE_FOLDER_PRICING.standardMaximumFlameCoin} value={standardAmount} onChange={e=>setStandardAmount(e.target.value)} disabled={Boolean(purchase)} className="mt-2 w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-sm outline-none" /></label>}

              <div className="mt-5 rounded-2xl border border-emerald-300/10 bg-emerald-300/[.035] p-4">
                <p className="text-[8px] font-black uppercase tracking-[.16em] text-emerald-200">WEAVE company TRX wallet</p>
                <div className="mt-3 flex gap-2"><div className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-3 font-mono text-[10px] text-slate-300 break-all">{walletLoading?'Loading wallet…':wallet||'Company wallet is unavailable'}</div><Button type="button" variant="outline" disabled={!wallet} onClick={copyWallet}><Copy className="h-4 w-4" /> {copied?'Copied':'Copy'}</Button></div>
                <p className="mt-3 text-[10px] leading-5 text-slate-500">Send exactly <strong className="text-white">{Number.isFinite(amount)?amount.toLocaleString():'—'} TRX</strong>. {tier==='plus' ? `Plus is valued at ${FILE_FOLDER_PRICING.plusFlameCoin.toLocaleString()} Flame Coin, with a ${FILE_FOLDER_PRICING.plusUsdt.toLocaleString()} USDT reference. Your payment is in TRX, not USDT. Ready systems activate only after Administration verifies payment and attaches your Client File Folder.` : 'For Standard and Premium, the amount paid in TRX is the same numeric File Folder value in Flame Coin.'}</p>
              </div>

              <label className="mt-5 block"><span className="text-[9px] font-bold uppercase tracking-[.12em] text-stone-500">TRX transaction hash</span><div className="mt-2 flex items-center gap-3 rounded-xl border border-white/10 bg-black/25 px-3"><FileKey2 className="h-4 w-4 text-orange-200" /><input value={reference} onChange={e=>setReference(e.target.value)} disabled={Boolean(purchase)} placeholder="Paste transaction hash after payment" className="w-full bg-transparent py-3 text-sm outline-none placeholder:text-white/20 disabled:opacity-50" /></div></label>

              {!purchase && <Button onClick={submitPurchase} disabled={busy || !wallet || !validAmount || !name.trim() || !phone.trim() || !reference.trim()} className="mt-5 h-12 w-full bg-white font-black text-[#090605] hover:bg-stone-100">{busy?<Loader2 className="mr-2 h-4 w-4 animate-spin"/>:<ArrowRight className="mr-2 h-4 w-4"/>}Submit File Folder purchase</Button>}

              {message && <div className={`mt-5 rounded-2xl border p-4 text-xs leading-5 ${purchase?.status==='confirmed'?'border-emerald-300/20 bg-emerald-300/[.06] text-emerald-100':purchase?.status==='rejected'?'border-rose-300/20 bg-rose-300/[.05] text-rose-100':'border-amber-300/15 bg-amber-300/[.04] text-amber-100'}`}>{message}</div>}

              {registerUrl && purchase?.fileNumber && <div className="mt-5 rounded-2xl border border-emerald-300/20 bg-emerald-300/[.06] p-5"><CheckCircle2 className="h-7 w-7 text-emerald-300" /><p className="mt-3 text-lg font-black">File Number {purchase.fileNumber}</p><p className="mt-2 text-xs leading-5 text-slate-300">{returningClient ? (tier==='plus' ? 'Your Plus File Folder is attached to your Client account; its completed systems and Customer Door should now be available.' : 'Your verified File Folder is attached to your Client account and its included Customer Door formation has started.') : 'Your File Folder has been verified. Create your Client account with the issued File Number to enter your System Switch environment.'}</p><Link href={registerUrl}><Button className="mt-4 w-full bg-emerald-300 font-black text-[#02110b] hover:bg-emerald-200">{returningClient ? 'Enter File Folder' : 'Become a Client'} <ArrowRight className="ml-2 h-4 w-4" /></Button></Link></div>}

              {purchase?.status==='rejected' && <Button variant="outline" onClick={resetRejected} className="mt-4 w-full border-white/10">Start a new purchase</Button>}
            </section>
          </div>
        </section>
      </div>
    </main>
  )
}
