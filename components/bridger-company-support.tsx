'use client'

import { useEffect, useState } from 'react'
import { LifeBuoy, X, Send, Copy, CheckCircle2, MessageSquareText } from 'lucide-react'
import { getAuthHeaders } from '@/lib/auth-client'

type SupportRequest = {
  id: string
  prospect_name?: string | null
  prospect_message: string
  suggested_response?: string | null
  status: string
  created_at: string
}

export default function BridgerCompanySupport({ user }: { user: any }) {
  const [message, setMessage] = useState('')
  const [prospectName, setProspectName] = useState('')
  const [answer, setAnswer] = useState('')
  const [requests, setRequests] = useState<SupportRequest[]>([])
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const load = async () => {
    if (!user?.id) return
    const response = await fetch('/api/bridger/prospect-support', { headers: getAuthHeaders() })
    const data = await response.json()
    if (response.ok) setRequests(data.requests || [])
  }

  useEffect(() => { load() }, [user?.id])

  const askCompany = async () => {
    if (!message.trim()) return
    setLoading(true)
    setAnswer('')
    try {
      const response = await fetch('/api/bridger/prospect-support', {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ prospectName: prospectName.trim() || null, prospectMessage: message.trim() }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Unable to get company support')
      setAnswer(data.request?.suggested_response || '')
      setRequests((current) => [data.request, ...current].filter(Boolean).slice(0, 50))
    } catch (error: any) {
      setAnswer(error?.message || 'Unable to get company support')
    } finally {
      setLoading(false)
    }
  }

  const copyAnswer = async () => {
    if (!answer) return
    await navigator.clipboard.writeText(answer)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-emerald-500/20 bg-slate-900/80 p-5 sm:p-6">
        <div className="mb-5 flex items-start gap-3">
          <div className="rounded-xl bg-emerald-500/10 p-3"><LifeBuoy className="h-6 w-6 text-emerald-400" /></div>
          <div>
            <h2 className="text-xl font-bold text-white">Company Support</h2>
            <p className="mt-1 text-sm text-slate-400">Bring a prospect&apos;s question here when you need company guidance before System Switch.</p>
          </div>
        </div>
        <div className="space-y-3">
          <input value={prospectName} onChange={(e) => setProspectName(e.target.value)} placeholder="Prospect name (optional)" className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-emerald-500" />
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Paste the prospect&apos;s WhatsApp message here..." rows={5} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-emerald-500" />
          <button onClick={askCompany} disabled={loading || !message.trim()} className="w-full rounded-lg bg-emerald-600 px-4 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">
            <span className="inline-flex items-center gap-2"><Send className="h-4 w-4" />{loading ? 'Company Support is preparing a response…' : 'Get Company Guidance'}</span>
          </button>
        </div>
      </div>

      {answer && <div className="rounded-2xl border border-cyan-500/20 bg-slate-900/80 p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 font-semibold text-cyan-400"><MessageSquareText className="h-5 w-5" />Suggested response</div>
          <button onClick={copyAnswer} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:text-white">{copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}{copied ? 'Copied' : 'Copy'}</button>
        </div>
        <p className="whitespace-pre-wrap text-sm leading-6 text-slate-200">{answer}</p>
        <p className="mt-4 text-xs text-slate-500">Company guidance assists the Bridger. The Bridger remains the human connection with the prospect.</p>
      </div>}

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <h3 className="mb-4 font-semibold text-white">Recent guidance</h3>
        {requests.length === 0 ? <p className="text-sm text-slate-500">Your prospect questions will appear here.</p> : <div className="space-y-3">{requests.map((item) => <div key={item.id} className="rounded-xl border border-slate-800 bg-slate-950/50 p-4"><p className="mb-1 text-xs text-emerald-400">{item.prospect_name || 'Prospect'}</p><p className="line-clamp-2 text-sm text-slate-300">{item.prospect_message}</p>{item.suggested_response && <p className="mt-2 line-clamp-2 text-sm text-slate-500">{item.suggested_response}</p>}</div>)}</div>}
      </div>
    </div>
  )
}

export function BridgerSupportAd() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    let timer: number | undefined
    const show = () => {
      setVisible(true)
      if (timer) window.clearTimeout(timer)
      timer = window.setTimeout(() => setVisible(false), 4200)
    }

    const onWhatsAppClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null
      const button = target?.closest('button, a') as HTMLElement | null
      if (!button) return
      const label = (button.textContent || '').toLowerCase()
      const href = (button.getAttribute('href') || '').toLowerCase()
      if (label.includes('whatsapp') || label.includes('message prospect') || href.includes('whatsapp')) show()
    }

    window.addEventListener('bridger:whatsapp-opened', show)
    document.addEventListener('click', onWhatsAppClick, true)
    return () => {
      window.removeEventListener('bridger:whatsapp-opened', show)
      document.removeEventListener('click', onWhatsAppClick, true)
      if (timer) window.clearTimeout(timer)
    }
  }, [])

  if (!visible) return null

  return (
    <div className="fixed bottom-5 right-5 z-[100] w-[min(360px,calc(100vw-2rem))] rounded-2xl border border-emerald-500/30 bg-slate-950/95 p-4 shadow-2xl backdrop-blur">
      <button onClick={() => setVisible(false)} className="absolute right-3 top-3 text-slate-500 hover:text-white"><X className="h-4 w-4" /></button>
      <div className="pr-5">
        <p className="text-sm font-bold text-emerald-400">Need help with the prospect?</p>
        <p className="mt-1 text-sm leading-5 text-slate-300">You do not need to contact general support. Use <strong className="text-white">Company Support</strong> in your Bridger panel to get guidance on what to say next.</p>
      </div>
      <a href="/bridger/company-support" onClick={() => setVisible(false)} className="mt-3 inline-block text-xs font-semibold text-cyan-400 hover:text-cyan-300">Open Company Support →</a>
    </div>
  )
}
