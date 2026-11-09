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
    <div className="fixed inset-0 z-[100] bg-[rgba(8,19,33,0.78)] flex items-center justify-center p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="weave-terms-title"
        className="flex max-h-[calc(100dvh-2rem)] w-full max-w-2xl flex-col rounded-2xl border border-[#cab990] bg-[#fffefa] text-[#243d50] shadow-2xl">
        <div className="border-b border-[#decfaf] p-4 sm:p-6">
          <h2 id="weave-terms-title" className="text-xl font-bold">
            {role === 'agent' ? 'Agent Employment Terms' : 'Bridger Partnership Terms'}
          </h2>
          <p className="text-sm text-[#496274] mt-1">Please read and accept to continue using WEAVE.</p>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4 sm:p-6">
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-[#376076] mb-2">{content.positionTitle}</h3>
            <p className="text-sm text-[#324e60] leading-relaxed">{content.positionSummary}</p>
          </div>

          <div className="space-y-2">
            {TERMS_SECTIONS.map((section) => (
              <div key={section.title}>
                <p className="text-sm font-bold">{section.title}</p>
                <p className="text-sm leading-relaxed text-[#496274]">{section.body}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3 border-t border-[#decfaf] p-4 sm:p-6">
          <label className="flex items-start gap-2 text-sm text-[#324e60] cursor-pointer">
            <input type="checkbox" checked={readChecked} onChange={(e) => setReadChecked(e.target.checked)} className="mt-0.5" />
            I have read and understood these terms.
          </label>
          <label className="flex items-start gap-2 text-sm text-[#324e60] cursor-pointer">
            <input type="checkbox" checked={agreeChecked} onChange={(e) => setAgreeChecked(e.target.checked)} className="mt-0.5" />
            I agree to follow WEAVE policies and operational requirements.
          </label>
          <div>
            <label htmlFor="weave-terms-full-name" className="mb-1 block text-sm text-[#496274]">Type your full name to confirm ({userName})</label>
            <input
              id="weave-terms-full-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Full name"
              className="w-full rounded-xl border border-[#bbac92] bg-[#fffefa] px-3 py-2 text-base text-[#243d50] placeholder:text-[#586b77]"
            />
          </div>
          <Button
            onClick={handleAccept}
            disabled={!canSubmit || isSubmitting}
            className="w-full rounded-xl bg-[#254961] text-white hover:bg-[#19364b]"
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Accept and Continue'}
          </Button>
        </div>
      </div>
    </div>
  )
}
