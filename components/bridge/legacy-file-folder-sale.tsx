'use client'

import { useEffect } from 'react'
import { Check, Copy, Crown, Loader2, Wallet, X } from 'lucide-react'
import { FILE_FOLDER_PRICING, getFileFolderTier } from '@/lib/file-folder-pricing'
import { WORLD_RULES } from '@/lib/world/constants'

export function LegacyFileFolderSale({
  open,
  status,
  amount,
  setAmount,
  name,
  setName,
  phone,
  setPhone,
  txHash,
  setTxHash,
  submitting,
  onSubmit,
  onClose,
}: {
  open: boolean
  status: 'idle' | 'pending' | 'approved' | 'rejected'
  amount: number | null
  setAmount: (value: number) => void
  name: string
  setName: (value: string) => void
  phone: string
  setPhone: (value: string) => void
  txHash: string
  setTxHash: (value: string) => void
  submitting: boolean
  onSubmit: () => void
  onClose: () => void
}) {
  useEffect(() => {
    if (open && status === 'idle' && amount === null) {
      setAmount(FILE_FOLDER_PRICING.proStartingFlameCoin)
    }
  }, [open, status, amount, setAmount])

  if (!open || status !== 'idle') return null

  const tier = amount === FILE_FOLDER_PRICING.premiumFlameCoin ? 'premium' : 'pro'
  const valid = amount !== null && getFileFolderTier(amount, tier) === tier
  const isPremium = tier === 'premium'

  return (
    <div className="fixed inset-0 z-[75] flex items-center justify-center overflow-y-auto bg-black/90 p-4 backdrop-blur-2xl">
      <section className="relative w-full max-w-2xl overflow-hidden rounded-[2rem] border border-white/10 bg-[#08090f] text-white shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded-full border border-white/10 bg-black/40 p-2 text-white/60 hover:text-white"
          aria-label="Close File Folder sale"
        >
          <X className="h-4 w-4" />
        </button>

        <header className="border-b border-white/8 px-6 py-7 sm:px-8">
          <p className="text-[9px] font-black uppercase tracking-[.24em] text-orange-200">Prospect File Folder Sale</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight">Pro File Folder</h2>
          <p className="mt-3 max-w-xl text-xs leading-6 text-white/45">
            Pro normally starts at {FILE_FOLDER_PRICING.proStartingFlameCoin.toLocaleString()} Flame Coin. A real negotiated sale may be approved as low as {FILE_FOLDER_PRICING.proNegotiatedMinimumFlameCoin.toLocaleString()} Flame Coin. Premium remains fixed at {FILE_FOLDER_PRICING.premiumFlameCoin.toLocaleString()} Flame Coin.
          </p>
        </header>

        <div className="grid gap-0 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setAmount(FILE_FOLDER_PRICING.proStartingFlameCoin)}
            className={`border-b border-white/8 p-5 text-left sm:border-b-0 sm:border-r ${!isPremium ? 'bg-cyan-300/[.06]' : 'bg-transparent'}`}
          >
            <div className="flex items-center gap-2 text-cyan-200"><Wallet className="h-4 w-4" /><span className="text-[9px] font-black uppercase tracking-[.16em]">Pro</span></div>
            <p className="mt-4 text-2xl font-black">From {FILE_FOLDER_PRICING.proStartingFlameCoin.toLocaleString()}</p>
            <p className="mt-1 text-[9px] text-white/35">Negotiable to {FILE_FOLDER_PRICING.proNegotiatedMinimumFlameCoin.toLocaleString()} Flame Coin</p>
          </button>
          <button
            type="button"
            onClick={() => setAmount(FILE_FOLDER_PRICING.premiumFlameCoin)}
            className={`p-5 text-left ${isPremium ? 'bg-orange-300/[.06]' : 'bg-transparent'}`}
          >
            <div className="flex items-center gap-2 text-orange-200"><Crown className="h-4 w-4" /><span className="text-[9px] font-black uppercase tracking-[.16em]">Premium</span></div>
            <p className="mt-4 text-2xl font-black">{FILE_FOLDER_PRICING.premiumFlameCoin.toLocaleString()}</p>
            <p className="mt-1 text-[9px] text-white/35">Fixed Flame Coin value</p>
          </button>
        </div>

        <div className="space-y-5 border-t border-white/8 px-6 py-7 sm:px-8">
          {!isPremium && (
            <label className="block">
              <span className="text-[9px] font-black uppercase tracking-[.15em] text-white/35">Negotiated Pro value</span>
              <div className="mt-2 flex items-center gap-3 rounded-2xl border border-white/10 bg-black/30 px-4">
                <input
                  type="number"
                  min={FILE_FOLDER_PRICING.proNegotiatedMinimumFlameCoin}
                  max={FILE_FOLDER_PRICING.proMaximumExclusiveFlameCoin - 0.000001}
                  step="0.000001"
                  value={amount ?? ''}
                  onChange={event => setAmount(Number(event.target.value))}
                  className="min-w-0 flex-1 bg-transparent py-3 text-xl font-black outline-none"
                />
                <span className="text-[9px] font-black uppercase tracking-[.12em] text-white/35">Flame Coin</span>
              </div>
              <p className="mt-2 text-[9px] leading-4 text-white/35">Values below {FILE_FOLDER_PRICING.proStartingFlameCoin.toLocaleString()} are negotiated Pro sales, not Standard purchases.</p>
            </label>
          )}

          <div className="rounded-2xl border border-white/8 bg-white/[.025] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[8px] font-black uppercase tracking-[.16em] text-white/30">Company TRX wallet</p>
                <p className="mt-2 break-all font-mono text-[10px] text-orange-100">{WORLD_RULES.COMPANY_TRX_WALLET}</p>
              </div>
              <button type="button" onClick={() => navigator.clipboard.writeText(WORLD_RULES.COMPANY_TRX_WALLET)} className="rounded-xl border border-white/10 p-2 text-white/50 hover:text-white"><Copy className="h-4 w-4" /></button>
            </div>
            <p className="mt-3 text-[9px] text-white/35">1 Flame Coin = 1 TRX for this File Folder movement.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <input value={name} onChange={event => setName(event.target.value)} placeholder="Your full name" className="rounded-2xl border border-white/10 bg-white/[.035] px-4 py-3 text-sm outline-none placeholder:text-white/20" />
            <input value={phone} onChange={event => setPhone(event.target.value)} placeholder="WhatsApp / phone" className="rounded-2xl border border-white/10 bg-white/[.035] px-4 py-3 text-sm outline-none placeholder:text-white/20" />
          </div>

          <input value={txHash} onChange={event => setTxHash(event.target.value)} placeholder="TRX transaction hash" className="w-full rounded-2xl border border-white/10 bg-white/[.035] px-4 py-3 font-mono text-xs outline-none placeholder:text-white/20" />

          <button
            type="button"
            onClick={onSubmit}
            disabled={!valid || !name.trim() || !phone.trim() || !txHash.trim() || submitting}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-200 px-5 py-4 text-xs font-black uppercase tracking-[.15em] text-black disabled:opacity-35"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {submitting ? 'Recording movement…' : `Confirm ${isPremium ? 'Premium' : 'Pro'} payment`}
          </button>
        </div>
      </section>
    </div>
  )
}
