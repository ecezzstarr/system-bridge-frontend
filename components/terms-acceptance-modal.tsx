'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { AGENT_CONTENT, BRIDGER_CONTENT, TERMS_SECTIONS } from '@/lib/weave-terms'

interface Props {
  role: 'agent' | 'bridger'
  userName: string
  onAccepted: (acceptedVersion: number) => void
}

export function TermsAcceptanceModal({ role, userName, onAccepted }: Props) {
  const [readChecked, setReadChecked] = useState(false)
  const [agreeChecked, setAgreeChecked] = useState(false)
  const [fullName, setFullName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const content = role === 'agent' ? AGENT_CONTENT : BRIDGER_CONTENT

  const canSubmit = readChecked && agreeChecked && fullName.trim().length > 1

  const handleAccept = async () => {
    if (!canSubmit) return
    setIsSubmitting(true)
    try {
      const token = localStorage.getItem('ssb_auth_token')
      const res = await fetch('/api/terms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ fullName }),
      })
      const data = await res.json()
      if (data.success) {
        onAccepted(data.acceptedVersion)
      } else {
        toast.error(data.error || "That didn't record. Try again.")
      }
    } catch (err) {
      console.error('Terms accept error:', err)
      toast.error("That didn't record. Try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
        <div className="p-6 border-b border-slate-800">
          <h2 className="text-xl font-bold text-white">
            {role === 'agent' ? 'Agent Employment Terms' : 'Bridger Partnership Terms'}
          </h2>
          <p className="text-sm text-slate-400 mt-1">Please read and accept to continue using WEAVE.</p>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-cyan-400 mb-2">{content.positionTitle}</h3>
            <p className="text-sm text-slate-300 leading-relaxed">{content.positionSummary}</p>
          </div>

          <div className="space-y-2">
            {TERMS_SECTIONS.map((section) => (
              <div key={section.title}>
                <p className="text-xs font-bold text-white">{section.title}</p>
                <p className="text-xs text-slate-400 leading-relaxed">{section.body}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 border-t border-slate-800 space-y-3">
          <label className="flex items-start gap-2 text-sm text-slate-300 cursor-pointer">
            <input type="checkbox" checked={readChecked} onChange={(e) => setReadChecked(e.target.checked)} className="mt-0.5" />
            I have read and understood these terms.
          </label>
          <label className="flex items-start gap-2 text-sm text-slate-300 cursor-pointer">
            <input type="checkbox" checked={agreeChecked} onChange={(e) => setAgreeChecked(e.target.checked)} className="mt-0.5" />
            I agree to follow WEAVE policies and operational requirements.
          </label>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Type your full name to confirm ({userName})</label>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Full name"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder:text-slate-500 outline-none"
            />
          </div>
          <Button
            onClick={handleAccept}
            disabled={!canSubmit || isSubmitting}
            className="w-full bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl"
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Accept and Continue'}
          </Button>
        </div>
      </div>
    </div>
  )
}
