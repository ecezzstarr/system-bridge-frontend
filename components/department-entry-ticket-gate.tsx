'use client'

import { useEffect, useRef, useState } from 'react'
import {
  ArrowLeft,
  CheckCircle2,
  Copy,
  CreditCard,
  KeyRound,
  Loader2,
  Music2,
  ShieldCheck,
  Ticket,
  Volume2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type Department = 'AGENT' | 'BRIDGER'

type EntryTicket = {
  id: string
  ticketNumber: string
  department: Department
  status: 'PRESENTED' | 'PAYMENT_PENDING' | 'VERIFYING' | 'CODE_ISSUED' | 'REJECTED' | 'EXPIRED'
  priceFlameCoin: number
  trxNgnRate: number
  amountNgn: number
  opayAccountNumber: string
  payerName?: string | null
  payerEmail?: string | null
  payerPhone?: string | null
  paymentReference?: string | null
  departmentalCode?: string | null
  rejectedReason?: string | null
  expiresAt: string
}

export function DepartmentEntryTicketGate({
  department,
  onCodeReady,
  onBack,
}: {
  department: Department
  onCodeReady: (code: string) => void
  onBack: () => void
}) {
  const [entered, setEntered] = useState(false)
  const [entering, setEntering] = useState(false)
  const [musicUrl, setMusicUrl] = useState<string | null>(null)
  const [musicTitle, setMusicTitle] = useState<string | null>(null)
  const [ticket, setTicket] = useState<EntryTicket | null>(null)
  const [accessToken, setAccessToken] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [copied, setCopied] = useState('')
  const [form, setForm] = useState({
    payerName: '',
    payerEmail: '',
    payerPhone: '',
    paymentReference: '',
  })

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const synthTimerRef = useRef<number | null>(null)

  const storageKey = `weave_department_entry_${department}`

  useEffect(() => {
    fetch('/api/department-entry/music')
      .then(res => res.json())
      .then(data => {
        if (data?.track?.fileUrl) {
          setMusicUrl(data.track.fileUrl)
          setMusicTitle(data.track.title || 'WEAVE Entry')
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    return () => {
      audioRef.current?.pause()
      if (synthTimerRef.current) window.clearInterval(synthTimerRef.current)
      audioContextRef.current?.close().catch(() => {})
    }
  }, [])

  const playSynthPhrase = (ctx: AudioContext) => {
    const now = ctx.currentTime
    const notes = [261.63, 329.63, 392, 523.25]
    notes.forEach((frequency, index) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = frequency
      gain.gain.setValueAtTime(0.0001, now + index * 0.32)
      gain.gain.exponentialRampToValueAtTime(0.075, now + index * 0.32 + 0.04)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.32 + 0.28)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now + index * 0.32)
      osc.stop(now + index * 0.32 + 0.3)
    })
  }

  const startFallbackMusic = async () => {
    const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioContextCtor) return false

    const ctx = new AudioContextCtor()
    audioContextRef.current = ctx
    await ctx.resume()
    if (ctx.state !== 'running') return false

    playSynthPhrase(ctx)
    synthTimerRef.current = window.setInterval(() => playSynthPhrase(ctx), 1800)
    setMusicTitle('WEAVE Entry Signal')
    return true
  }

  const startRequiredMusic = async () => {
    if (musicUrl) {
      try {
        const audio = new Audio(musicUrl)
        audio.loop = true
        audio.volume = 0.5
        audioRef.current = audio
        await audio.play()
        return true
      } catch {
        // Browser or media failure: use a user-gesture WebAudio fallback.
      }
    }
    return startFallbackMusic()
  }

  const loadTicket = async (token: string) => {
    const res = await fetch('/api/department-entry/ticket', {
      headers: { 'x-entry-ticket-token': token },
    })
    const data = await res.json()
    if (!res.ok || !data.success || data.ticket?.department !== department) return null
    setAccessToken(token)
    setTicket(data.ticket)
    setForm(prev => ({
      payerName: data.ticket.payerName || prev.payerName,
      payerEmail: data.ticket.payerEmail || prev.payerEmail,
      payerPhone: data.ticket.payerPhone || prev.payerPhone,
      paymentReference: data.ticket.paymentReference || prev.paymentReference,
    }))
    return data.ticket as EntryTicket
  }

  const createTicket = async () => {
    const res = await fetch('/api/department-entry/ticket', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ department }),
    })
    const data = await res.json()
    if (!res.ok || !data.success) throw new Error(data.error || 'Unable to present ticket')

    sessionStorage.setItem(storageKey, data.accessToken)
    setAccessToken(data.accessToken)
    setTicket(data.ticket)
  }

  const enterDepartment = async () => {
    setEntering(true)
    setError('')
    try {
      const musicStarted = await startRequiredMusic()
      if (!musicStarted) {
        throw new Error('Sound must start before Department Entry can open. Check your device audio and try again.')
      }

      setEntered(true)
      const saved = sessionStorage.getItem(storageKey)
      if (saved) {
        const existing = await loadTicket(saved)
        if (existing && !['EXPIRED'].includes(existing.status)) return
        sessionStorage.removeItem(storageKey)
      }
      await createTicket()
    } catch (err: any) {
      setError(err?.message || 'Unable to enter Department Ticket Center')
    } finally {
      setEntering(false)
    }
  }

  const refreshTicket = async () => {
    if (!accessToken) return
    try {
      const latest = await loadTicket(accessToken)
      if (latest?.status === 'CODE_ISSUED' && latest.departmentalCode) {
        setError('')
      }
    } catch {}
  }

  useEffect(() => {
    if (!entered || !accessToken || !ticket) return
    if (!['PAYMENT_PENDING', 'VERIFYING'].includes(ticket.status)) return

    const timer = window.setInterval(refreshTicket, 5000)
    return () => window.clearInterval(timer)
  }, [entered, accessToken, ticket?.status])

  const submitPayment = async () => {
    if (!accessToken) return
    if (!form.payerName.trim() || !form.paymentReference.trim() || (!form.payerEmail.trim() && !form.payerPhone.trim())) {
      setError('Enter your name, payment reference, and either email or phone.')
      return
    }

    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/department-entry/ticket', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-entry-ticket-token': accessToken,
        },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || 'Unable to submit payment')
      setTicket(data.ticket)
    } catch (err: any) {
      setError(err?.message || 'Unable to submit payment')
    } finally {
      setSubmitting(false)
    }
  }

  const copy = async (value: string, label: string) => {
    await navigator.clipboard.writeText(value)
    setCopied(label)
    window.setTimeout(() => setCopied(''), 1400)
  }

  const resetTicket = () => {
    sessionStorage.removeItem(storageKey)
    setTicket(null)
    setAccessToken('')
    setForm({ payerName: '', payerEmail: '', payerPhone: '', paymentReference: '' })
    setError('')
    createTicket().catch((err: any) => setError(err?.message || 'Unable to present new ticket'))
  }

  if (!entered) {
    return (
      <div className="space-y-5 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-cyan-400/20 bg-cyan-400/10">
          <Music2 className="h-7 w-7 text-cyan-300" />
        </div>
        <div>
          <h3 className="text-xl font-black uppercase tracking-tight text-white">
            {department === 'AGENT' ? 'Agent' : 'Bridger'} Department Entry
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Department Entry begins with sound. Once the music starts, your ticket is presented and Administration is notified of your arrival.
          </p>
        </div>

        {error && <p className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs font-bold text-red-300">{error}</p>}

        <Button
          type="button"
          onClick={enterDepartment}
          disabled={entering}
          className="h-12 w-full bg-cyan-600 font-black uppercase tracking-widest hover:bg-cyan-500"
        >
          {entering ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Volume2 className="mr-2 h-4 w-4" /> Enter With Music</>}
        </Button>
        <Button type="button" variant="ghost" onClick={onBack} className="w-full text-slate-500">
          <ArrowLeft className="mr-2 h-3 w-3" /> Select Different Role
        </Button>
      </div>
    )
  }

  if (!ticket) {
    return (
      <div className="py-10 text-center">
        <Loader2 className="mx-auto h-7 w-7 animate-spin text-cyan-400" />
        <p className="mt-3 text-xs uppercase tracking-widest text-slate-500">Presenting ticket</p>
      </div>
    )
  }

  const awaitingVerification = ['PAYMENT_PENDING', 'VERIFYING'].includes(ticket.status)
  const codeIssued = ticket.status === 'CODE_ISSUED' && Boolean(ticket.departmentalCode)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between rounded-xl border border-cyan-400/20 bg-cyan-400/5 px-4 py-3">
        <div className="flex items-center gap-3">
          <Volume2 className="h-4 w-4 text-cyan-300" />
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-cyan-300">Entry Music</p>
            <p className="text-xs text-white">{musicTitle || 'WEAVE Entry Sound'}</p>
          </div>
        </div>
        <span className="text-[9px] font-black uppercase tracking-widest text-green-400">Playing</span>
      </div>

      <div className="rounded-2xl border border-amber-400/25 bg-gradient-to-b from-amber-400/10 to-slate-950 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.25em] text-amber-300">Department Entry Ticket</p>
            <h3 className="mt-1 text-lg font-black text-white">{ticket.ticketNumber}</h3>
            <p className="mt-1 text-xs text-slate-400">{department} · valid for this entry process</p>
          </div>
          <Ticket className="h-7 w-7 text-amber-300" />
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-white/10 bg-black/25 p-3">
            <p className="text-[9px] uppercase tracking-widest text-slate-500">Ticket Price</p>
            <p className="mt-1 text-xl font-black text-white">{ticket.priceFlameCoin} Flame Coin</p>
            <p className="mt-1 text-[10px] text-slate-500">{ticket.priceFlameCoin} TRX value</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/25 p-3">
            <p className="text-[9px] uppercase tracking-widest text-slate-500">Pay in Naira</p>
            <p className="mt-1 text-xl font-black text-white">₦{ticket.amountNgn.toLocaleString()}</p>
            <p className="mt-1 text-[10px] text-slate-500">₦{ticket.trxNgnRate.toLocaleString()} per TRX</p>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-4">
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-green-400" />
            <p className="text-xs font-black uppercase tracking-widest text-white">WEAVE Payment Center · OPay</p>
          </div>
          <p className="mt-3 text-[9px] uppercase tracking-widest text-slate-500">Company OPay Account</p>
          <div className="mt-1 flex items-center gap-2">
            <p className="font-mono text-lg font-black tracking-wider text-green-300">{ticket.opayAccountNumber}</p>
            <button type="button" onClick={() => copy(ticket.opayAccountNumber, 'opay')} className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white">
              <Copy className="h-4 w-4" />
            </button>
            {copied === 'opay' && <span className="text-[9px] font-bold text-green-400">Copied</span>}
          </div>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            Send exactly ₦{ticket.amountNgn.toLocaleString()} for this 3 Flame Coin Department Entry Ticket.
            This payment buys the ticket; it is not a wallet top-up.
          </p>
        </div>
      </div>

      {ticket.status === 'PRESENTED' && (
        <div className="space-y-3 rounded-2xl border border-white/10 bg-slate-950/60 p-5">
          <p className="text-xs font-black uppercase tracking-widest text-slate-300">Submit Payment for Verification</p>
          <Input
            value={form.payerName}
            onChange={e => setForm(prev => ({ ...prev, payerName: e.target.value }))}
            placeholder="Full name used for payment"
            className="border-slate-700 bg-slate-900 text-white"
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              value={form.payerEmail}
              onChange={e => setForm(prev => ({ ...prev, payerEmail: e.target.value }))}
              placeholder="Email"
              type="email"
              className="border-slate-700 bg-slate-900 text-white"
            />
            <Input
              value={form.payerPhone}
              onChange={e => setForm(prev => ({ ...prev, payerPhone: e.target.value }))}
              placeholder="Phone / WhatsApp"
              className="border-slate-700 bg-slate-900 text-white"
            />
          </div>
          <Input
            value={form.paymentReference}
            onChange={e => setForm(prev => ({ ...prev, paymentReference: e.target.value }))}
            placeholder="OPay payment reference / transaction ID"
            className="border-slate-700 bg-slate-900 font-mono text-white"
          />
          <Button
            type="button"
            onClick={submitPayment}
            disabled={submitting}
            className="h-11 w-full bg-green-600 font-black uppercase tracking-widest hover:bg-green-500"
          >
            {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Submit Payment'}
          </Button>
        </div>
      )}

      {awaitingVerification && (
        <div className="rounded-2xl border border-purple-400/20 bg-purple-400/5 p-6 text-center">
          <Loader2 className="mx-auto h-7 w-7 animate-spin text-purple-300" />
          <p className="mt-3 text-sm font-black uppercase tracking-widest text-white">Administration Verification</p>
          <p className="mt-2 text-xs leading-5 text-slate-400">
            Administration has been notified. This page checks automatically; your departmental code will appear here after the payment is approved.
          </p>
          <Button type="button" variant="ghost" onClick={refreshTicket} className="mt-3 text-xs text-purple-300">
            Check now
          </Button>
        </div>
      )}

      {codeIssued && (
        <div className="rounded-2xl border border-green-400/30 bg-green-400/10 p-6 text-center">
          <CheckCircle2 className="mx-auto h-9 w-9 text-green-400" />
          <p className="mt-3 text-[10px] font-black uppercase tracking-[0.22em] text-green-300">Payment Verified · Code Released</p>
          <div className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-green-400/20 bg-black/30 p-4">
            <KeyRound className="h-4 w-4 text-green-400" />
            <code className="break-all font-mono text-sm font-black tracking-wider text-white">{ticket.departmentalCode}</code>
            <button type="button" onClick={() => copy(ticket.departmentalCode!, 'code')} className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white">
              <Copy className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-3 text-xs text-slate-400">This code is one-use and belongs to the {department} department.</p>
          <Button
            type="button"
            onClick={() => onCodeReady(ticket.departmentalCode!)}
            className="mt-5 h-11 w-full bg-green-600 font-black uppercase tracking-widest hover:bg-green-500"
          >
            <ShieldCheck className="mr-2 h-4 w-4" /> Use Code & Continue Registration
          </Button>
        </div>
      )}

      {ticket.status === 'REJECTED' && (
        <div className="rounded-2xl border border-red-400/20 bg-red-400/5 p-5 text-center">
          <p className="text-sm font-black uppercase tracking-widest text-red-300">Payment Not Verified</p>
          <p className="mt-2 text-xs text-slate-400">{ticket.rejectedReason || 'Administration could not verify this payment.'}</p>
          <Button type="button" onClick={resetTicket} className="mt-4 bg-slate-700 hover:bg-slate-600">Present a New Ticket</Button>
        </div>
      )}

      {ticket.status === 'EXPIRED' && (
        <div className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-5 text-center">
          <p className="text-sm font-black uppercase tracking-widest text-amber-300">Ticket Expired</p>
          <Button type="button" onClick={resetTicket} className="mt-4 bg-slate-700 hover:bg-slate-600">Present a New Ticket</Button>
        </div>
      )}

      {error && <p className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-center text-xs font-bold text-red-300">{error}</p>}

      <Button type="button" variant="ghost" onClick={onBack} className="w-full text-slate-500">
        <ArrowLeft className="mr-2 h-3 w-3" /> Select Different Role
      </Button>
    </div>
  )
}
