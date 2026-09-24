'use client'

import {
  Sparkles,
  MessageSquare,
  Wallet,
  Hammer,
  ChevronRight,
  X,
  UserCog,
  ClipboardList,
  Scale,
  Search,
  Send,
  Loader2,
  Copy,
  Check,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { WeaveLogo } from '@/components/weave-logo'
import { WORLD_RULES } from '@/lib/world/constants'

interface HUDProps {
  activeStation: string | null
  fileNumber: string | null
  bridger: any
  messages: any[]
  input: string
  setInput: (v: string) => void
  onSendMessage: () => void
  sending: boolean
  depositFlow: {
    isOpen: boolean
    status: 'idle' | 'pending' | 'approved' | 'rejected'
    tier: number | null
    setTier: (t: number) => void
    name: string
    setName: (n: string) => void
    phone: string
    setPhone: (p: string) => void
    txHash: string
    setTxHash: (h: string) => void
    onSubmit: () => void
    submitting: boolean
    onConfirmUnderstanding: () => void
    understood: boolean
  }
  support: {
    isOpen: boolean
    setOpen: (o: boolean) => void
    messages: any[]
    input: string
    setInput: (v: string) => void
    onSend: () => void
    sending: boolean
    loading: boolean
    position: string | null
    setPosition: (p: string) => void
    onOpenSupport: (p: string) => void
  }
  onGoToRegister: () => void
}

const STATION_CONTENT: Record<string, {
  title: string
  description: string
  icon: any
}> = {
  workshops: {
    title: 'Workshops',
    description: 'Refine your presence and master the tools of the Weave.',
    icon: Hammer,
  },
  marketplace: {
    title: 'Marketplace',
    description: 'The economic exchange where creation finds its value.',
    icon: Search,
  },
  stores: {
    title: 'Stores',
    description: 'Establish your own presence and reach participants directly.',
    icon: Sparkles,
  },
  services: {
    title: 'Services',
    description: 'Provide or discover essential institutional capacities.',
    icon: UserCog,
  },
  enterprises: {
    title: 'Enterprises',
    description: 'Build lasting organizations within the Weave ecosystem.',
    icon: Scale,
  },
  roles: {
    title: 'Bridgers & Agents',
    description: "Participate in the institution's growth and circulation.",
    icon: ClipboardList,
  },
  folder: {
    title: 'The File Folder',
    description: 'Interaction recognized. Proceed with the File Folder to receive your File Number.',
    icon: Wallet,
  },
}

export function HUD({
  activeStation,
  fileNumber,
  bridger,
  messages,
  input,
  setInput,
  onSendMessage,
  sending,
  depositFlow,
  support,
  onGoToRegister,
}: HUDProps) {
  const station = activeStation ? STATION_CONTENT[activeStation] : null

  return (
    <div className="fixed inset-0 pointer-events-none z-20 flex flex-col font-sans text-white">

      <header className="pointer-events-auto px-5 py-5 md:px-8 md:py-7">
        <div className="flex items-center justify-between">
          <WeaveLogo size="sm" />

          {fileNumber && (
            <div className="hidden sm:flex items-center gap-3 px-4 py-2 rounded-full bg-black/50 backdrop-blur-xl border border-[#e8b93f]/30">
              <div className="w-1.5 h-1.5 rounded-full bg-[#e8b93f] animate-pulse" />
              <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#e8b93f]">
                File {fileNumber}
              </span>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pointer-events-none px-5 pb-8 md:px-8">
        <div className="min-h-full flex flex-col justify-center">

          <motion.section
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="w-full max-w-6xl mx-auto mb-8"
          >
            <div className="max-w-3xl">
              <p className="text-[10px] md:text-xs font-bold uppercase tracking-[0.35em] text-[#e8b93f] mb-4">
                Real Life Gaming OS
              </p>

              <h1 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-[-0.04em] leading-[0.95]">
                Bridge Radiance
              </h1>

              <p className="mt-5 text-sm md:text-base text-white/60 leading-relaxed max-w-2xl">
                Presence → Bridge → Support → Enterprise → Weave. 
                <br />
                Interaction in Motion, where your participation becomes organized work and value.
              </p>

            </div>
          </motion.section>

          <section className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[0.8fr_1.2fr] gap-5">

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15, duration: 0.6 }}
              className="pointer-events-auto"
            >
              <div className="h-full rounded-[30px] bg-black/45 backdrop-blur-xl border border-white/10 p-6 md:p-7">

                <div className="flex items-center justify-between mb-7">
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-[#e8b93f]">
                      Your Bridger
                    </p>
                    <p className="mt-1 text-[10px] uppercase tracking-widest text-white/30">
                      Witness
                    </p>
                  </div>

                  <UserCog className="w-5 h-5 text-white/30" />
                </div>

                {bridger ? (
                  <>
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#e8b93f] to-[#14b8a6] flex items-center justify-center shrink-0">
                        <UserCog className="w-6 h-6 text-black" />
                      </div>

                      <div>
                        <h2 className="text-xl font-black text-white">
                          {bridger.name}
                        </h2>

                        {bridger.username && (
                          <p className="text-xs text-white/35 mt-1">
                            @{bridger.username}
                          </p>
                        )}
                      </div>
                    </div>

                    <p className="mt-7 text-sm leading-relaxed text-white/55">
                      Your Bridger accompanies the movement. What you bring into the interaction is allowed to become visible through the Bridge.
                    </p>

                    <button
                      onClick={() => support.onOpenSupport('bridger')}
                      className="mt-7 w-full py-3.5 rounded-2xl bg-white/[0.04] border border-white/10 text-[10px] font-bold uppercase tracking-[0.2em] text-white/70 hover:bg-white/[0.08] hover:text-white transition-colors"
                    >
                      Message Bridger
                    </button>
                  </>
                ) : (
                  <p className="text-sm text-white/40">
                    Your Bridger is being resolved from the Bridge.
                  </p>
                )}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.25, duration: 0.6 }}
              className="pointer-events-auto"
            >
              <div className="h-full min-h-[390px] rounded-[30px] bg-black/45 backdrop-blur-xl border border-[#14b8a6]/20 p-6 md:p-7 flex flex-col">

                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#14b8a6]/10 border border-[#14b8a6]/20 flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-[#14b8a6]" />
                    </div>

                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-[#14b8a6]">
                        Bridge AI
                      </p>
                      <p className="text-[10px] text-white/30 mt-1">
                        Interaction in Motion
                      </p>
                    </div>
                  </div>

                  <MessageSquare className="w-4 h-4 text-white/20" />
                </div>

                <div className="flex-1 min-h-[220px] max-h-[360px] overflow-y-auto custom-scrollbar pr-2 space-y-3">
                  {messages.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-center">
                      <p className="text-sm text-white/40 max-w-xs">
                        Speak. The Bridge AI follows the movement of your words.
                      </p>
                    </div>
                  ) : (
                    messages.map((m, i) => (
                      <div
                        key={i}
                        className={`flex ${
                          m.role === 'user' ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        <div
                          className={`max-w-[88%] px-4 py-3 rounded-2xl text-[11px] leading-relaxed ${
                            m.role === 'user'
                              ? 'bg-[#14b8a6] text-black font-bold'
                              : 'bg-white/[0.04] text-white/80 border border-white/[0.07]'
                          }`}
                        >
                          {m.content}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="mt-5 flex gap-2">
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') onSendMessage()
                    }}
                    placeholder="Speak into the Bridge..."
                    className="flex-1 min-w-0 bg-white/[0.04] border border-white/10 rounded-2xl px-4 py-3 text-xs text-white placeholder:text-white/20 outline-none focus:border-[#14b8a6]/50 transition-colors"
                  />

                  <button
                    onClick={onSendMessage}
                    disabled={sending || !input.trim()}
                    className="w-11 h-11 shrink-0 rounded-2xl bg-[#14b8a6] text-black flex items-center justify-center disabled:opacity-30 transition-opacity"
                  >
                    {sending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </section>

          <motion.section
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="w-full max-w-6xl mx-auto mt-5 pointer-events-auto"
          >
            <div className="rounded-[30px] bg-black/40 backdrop-blur-xl border border-white/10 p-6 md:p-7">

              <div className="flex items-end justify-between gap-4 mb-6">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-white/35">
                    Real Company Supports
                  </p>

                  <h2 className="mt-2 text-2xl md:text-3xl font-black tracking-tight">
                    The company meets the movement.
                  </h2>
                </div>

                <UserCog className="hidden sm:block w-5 h-5 text-white/20" />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  {
                    id: 'mandate',
                    name: 'Mandate',
                    icon: ClipboardList,
                    description: 'Execution',
                  },
                  {
                    id: 'lawyer',
                    name: 'Attorney',
                    icon: Scale,
                    description: 'Clarity',
                  },
                  {
                    id: 'forensic',
                    name: 'Forensic',
                    icon: Search,
                    description: 'Confirmation',
                  },
                  {
                    id: 'admin',
                    name: 'Administration',
                    icon: UserCog,
                    description: 'Elevation',
                  },
                ].map((position) => {
                  const Icon = position.icon

                  return (
                    <button
                      key={position.id}
                      onClick={() => support.onOpenSupport(position.id)}
                      className="text-left rounded-2xl border border-white/10 bg-white/[0.025] p-4 hover:bg-white/[0.06] hover:border-[#e8b93f]/20 transition-all group"
                    >
                      <div className="w-10 h-10 rounded-xl bg-white/[0.04] flex items-center justify-center mb-4 group-hover:bg-[#e8b93f]/10 transition-colors">
                        <Icon className="w-4 h-4 text-white/60 group-hover:text-[#e8b93f] transition-colors" />
                      </div>

                      <p className="text-sm font-bold text-white">
                        {position.name}
                      </p>

                      <p className="text-[9px] uppercase tracking-[0.2em] text-white/25 mt-1">
                        {position.description}
                      </p>
                    </button>
                  )
                })}
              </div>
            </div>
          </motion.section>

          {!fileNumber && (
            <motion.section
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.6 }}
              className="w-full max-w-6xl mx-auto mt-5 pointer-events-auto"
            >
              <div className="rounded-[30px] bg-[#e8b93f] p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">

                <div className="max-w-2xl">
                  <p className="text-[9px] font-black uppercase tracking-[0.3em] text-black/50">
                    Become a Client
                  </p>

                  <h2 className="mt-2 text-3xl md:text-4xl font-black text-black tracking-tight">
                    Issue File Folder
                  </h2>

                  <p className="mt-3 text-sm text-black/60 leading-relaxed max-w-xl">
                    The File Folder is your persistent workshop at System Switch. It establishes your place and prepares your formal Client crossing.
                  </p>
                </div>

                <button
                  onClick={depositFlow.onConfirmUnderstanding}
                  className="shrink-0 px-7 py-4 rounded-2xl bg-black text-[#e8b93f] font-black text-xs uppercase tracking-[0.2em] hover:scale-[1.02] active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
                >
                  Purchase File Folder
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </motion.section>
          )}

          {fileNumber && (
            <motion.section
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full max-w-6xl mx-auto mt-5 pointer-events-auto"
            >
              <div className="rounded-[30px] bg-black/45 backdrop-blur-xl border border-[#e8b93f]/25 p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-5">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-[#e8b93f]">
                    Client File
                  </p>

                  <p className="mt-2 text-2xl font-black font-mono tracking-widest">
                    {fileNumber}
                  </p>
                </div>

                <button
                  onClick={onGoToRegister}
                  className="px-7 py-4 rounded-2xl bg-[#e8b93f] text-black font-black text-xs uppercase tracking-[0.2em] hover:scale-[1.02] active:scale-[0.98] transition-transform"
                >
                  Enter Weave
                </button>
              </div>
            </motion.section>
          )}

          <AnimatePresence>
            {station && activeStation !== 'folder' && (
              <motion.section
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 15 }}
                className="w-full max-w-6xl mx-auto mt-5 pointer-events-auto"
              >
                <div className="rounded-[26px] bg-black/50 backdrop-blur-xl border border-white/10 p-5 flex items-center gap-4">
                  <div className="w-11 h-11 rounded-xl bg-[#e8b93f]/10 flex items-center justify-center shrink-0">
                    <station.icon className="w-5 h-5 text-[#e8b93f]" />
                  </div>

                  <div className="min-w-0">
                    <p className="text-sm font-bold">
                      {station.title}
                    </p>

                    <p className="text-xs text-white/40 mt-1">
                      {station.description}
                    </p>
                  </div>
                </div>
              </motion.section>
            )}
          </AnimatePresence>

        </div>
      </main>

      <AnimatePresence>
        {support.isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60] flex items-center justify-center p-4 pointer-events-auto"
          >
            <div className="w-full max-w-lg bg-[#08090f] border border-white/10 rounded-[40px] overflow-hidden flex flex-col max-h-[90vh]">

              <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white tracking-tight">
                    {support.position
                      ? support.position.charAt(0).toUpperCase() + support.position.slice(1)
                      : 'Company Support'}
                  </h3>

                  <p className="text-xs text-white/40 uppercase tracking-widest mt-1">
                    Real interaction with Weave
                  </p>
                </div>

                <button
                  onClick={() => {
                    support.setOpen(false)
                    support.setPosition('')
                  }}
                  className="p-2 hover:bg-white/5 rounded-full transition-colors"
                >
                  <X className="h-5 w-5 text-white/70" />
                </button>
              </div>

              {!support.position ? (
                <div className="p-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { id: 'mandate', name: 'Mandate', icon: ClipboardList },
                    { id: 'lawyer', name: 'Attorney', icon: Scale },
                    { id: 'forensic', name: 'Forensic', icon: Search },
                    { id: 'admin', name: 'Administration', icon: UserCog },
                  ].map((pos) => {
                    const Icon = pos.icon

                    return (
                      <button
                        key={pos.id}
                        onClick={() => support.onOpenSupport(pos.id)}
                        className="flex items-center gap-4 p-4 rounded-3xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/10 transition-all text-left group"
                      >
                        <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center group-hover:bg-[#e8b93f]/20 transition-colors">
                          <Icon className="h-5 w-5" />
                        </div>

                        <span className="text-sm font-bold text-white/80">
                          {pos.name}
                        </span>
                      </button>
                    )
                  })}
                </div>
              ) : (
                <>
                  <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                    {support.loading ? (
                      <div className="flex justify-center py-12">
                        <Loader2 className="h-6 w-6 animate-spin text-[#e8b93f]" />
                      </div>
                    ) : support.messages.length === 0 ? (
                      <div className="text-center py-12 space-y-3">
                        <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center mx-auto">
                          <MessageSquare className="h-6 w-6 text-white/20" />
                        </div>

                        <p className="text-sm text-white/40 max-w-[220px] mx-auto leading-relaxed">
                          Send a message and the Weave company position will respond.
                        </p>
                      </div>
                    ) : (
                      support.messages.map((m) => (
                        <div
                          key={m.id}
                          className={`flex ${
                            m.senderType === 'visitor'
                              ? 'justify-end'
                              : 'justify-start'
                          }`}
                        >
                          <div
                            className={`max-w-[80%] px-4 py-3 rounded-3xl text-sm leading-relaxed ${
                              m.senderType === 'visitor'
                                ? 'bg-[#e8b93f] text-black font-bold'
                                : 'bg-white/5 text-white/80 border border-white/5'
                            }`}
                          >
                            {m.content}
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="p-6 border-t border-white/5 flex gap-3">
                    <input
                      value={support.input}
                      onChange={(e) => support.setInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') support.onSend()
                      }}
                      placeholder="Enter your message..."
                      className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-sm text-white placeholder:text-white/20 outline-none focus:border-[#e8b93f]/50 transition-colors"
                    />

                    <button
                      onClick={support.onSend}
                      disabled={support.sending || !support.input.trim()}
                      className="px-6 bg-[#e8b93f] text-black font-bold rounded-2xl disabled:opacity-40 transition-transform active:scale-95"
                    >
                      <Send className="h-5 w-5" />
                    </button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}

        {depositFlow.isOpen && depositFlow.status === 'idle' && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            className="fixed inset-0 bg-black/90 backdrop-blur-2xl z-[70] flex items-center justify-center p-4 pointer-events-auto overflow-y-auto"
          >
            <div className="w-full max-w-xl p-8 md:p-12 space-y-8">

              <div className="text-center space-y-3">
                <div className="inline-flex px-4 py-1.5 bg-[#e8b93f]/10 border border-[#e8b93f]/20 rounded-full mb-2">
                  <span className="text-[10px] font-bold text-[#e8b93f] uppercase tracking-[0.3em]">
                    File Folder
                  </span>
                </div>

                <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-none">
                  Become a Client
                </h2>

                <p className="text-white/40 text-lg max-w-md mx-auto">
                  Establish your place in the system through the File Folder.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <button
                  onClick={() => depositFlow.setTier(WORLD_RULES.FILE_FOLDER_PREMIUM_PRICE_FLAME_COIN)}
                  className={`p-6 rounded-[32px] border transition-all text-left relative overflow-hidden group ${
                    depositFlow.tier === WORLD_RULES.FILE_FOLDER_PREMIUM_PRICE_FLAME_COIN
                      ? 'bg-[#e8b93f] border-[#e8b93f]'
                      : 'bg-white/5 border-white/10 hover:border-white/20'
                  }`}
                >
                  <p className={`text-[10px] font-black uppercase tracking-[0.28em] ${
                    depositFlow.tier === WORLD_RULES.FILE_FOLDER_PREMIUM_PRICE_FLAME_COIN
                      ? 'text-black/55'
                      : 'text-[#e8b93f]'
                  }`}>
                    Premium File Folder
                  </p>
                  <div
                    className={`mt-2 text-3xl font-black mb-1 ${
                      depositFlow.tier === WORLD_RULES.FILE_FOLDER_PREMIUM_PRICE_FLAME_COIN
                        ? 'text-black'
                        : 'text-[#e8b93f]'
                    }`}
                  >
                    {WORLD_RULES.FILE_FOLDER_PREMIUM_PRICE_FLAME_COIN.toLocaleString()} Flame Coin
                  </div>
                  <p className={`text-sm font-bold uppercase tracking-widest ${
                    depositFlow.tier === WORLD_RULES.FILE_FOLDER_PREMIUM_PRICE_FLAME_COIN
                      ? 'text-black/60'
                      : 'text-white/40'
                  }`}>
                    {WORLD_RULES.FILE_FOLDER_PREMIUM_PRICE_FLAME_COIN.toLocaleString()} TRX · Fixed Premium Price
                  </p>
                  {depositFlow.tier === WORLD_RULES.FILE_FOLDER_PREMIUM_PRICE_FLAME_COIN && (
                    <motion.div
                      layoutId="tier-check"
                      className="absolute top-6 right-6 w-8 h-8 bg-black rounded-full flex items-center justify-center"
                    >
                      <Check className="h-5 w-5 text-[#e8b93f]" />
                    </motion.div>
                  )}
                </button>

                <div
                  className={`p-6 rounded-[32px] border transition-all ${
                    depositFlow.tier !== null &&
                    depositFlow.tier >= WORLD_RULES.FILE_FOLDER_STANDARD_MIN_FLAME_COIN &&
                    depositFlow.tier < WORLD_RULES.FILE_FOLDER_PREMIUM_PRICE_FLAME_COIN
                      ? 'bg-[#14b8a6]/10 border-[#14b8a6]/40'
                      : 'bg-white/5 border-white/10'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => depositFlow.setTier(WORLD_RULES.FILE_FOLDER_STANDARD_MIN_FLAME_COIN)}
                    className="w-full text-left"
                  >
                    <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#14b8a6]">
                      Standard File Folder
                    </p>
                    <p className="mt-2 text-2xl font-black text-white">
                      From {WORLD_RULES.FILE_FOLDER_STANDARD_MIN_FLAME_COIN.toLocaleString()} Flame Coin
                    </p>
                    <p className="mt-1 text-xs text-white/40">
                      Choose any value below {WORLD_RULES.FILE_FOLDER_PREMIUM_PRICE_FLAME_COIN.toLocaleString()}. Same numeric amount in TRX.
                    </p>
                  </button>

                  <div className="mt-4">
                    <label className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/35">
                      Your Standard File Folder Value
                    </label>
                    <div className="mt-2 flex items-center rounded-2xl border border-white/10 bg-black/30 px-4">
                      <input
                        type="number"
                        min={WORLD_RULES.FILE_FOLDER_STANDARD_MIN_FLAME_COIN}
                        max={WORLD_RULES.FILE_FOLDER_PREMIUM_PRICE_FLAME_COIN - 0.000001}
                        step="0.000001"
                        value={
                          depositFlow.tier !== null &&
                          depositFlow.tier < WORLD_RULES.FILE_FOLDER_PREMIUM_PRICE_FLAME_COIN
                            ? depositFlow.tier
                            : ''
                        }
                        onFocus={() => {
                          if (
                            depositFlow.tier === null ||
                            depositFlow.tier >= WORLD_RULES.FILE_FOLDER_PREMIUM_PRICE_FLAME_COIN
                          ) {
                            depositFlow.setTier(WORLD_RULES.FILE_FOLDER_STANDARD_MIN_FLAME_COIN)
                          }
                        }}
                        onChange={(e) => depositFlow.setTier(Number(e.target.value))}
                        placeholder={WORLD_RULES.FILE_FOLDER_STANDARD_MIN_FLAME_COIN.toString()}
                        className="w-full bg-transparent py-3 text-lg font-bold text-white outline-none"
                      />
                      <span className="text-xs text-white/35">Flame Coin / TRX</span>
                    </div>
                    {depositFlow.tier !== null &&
                      depositFlow.tier < WORLD_RULES.FILE_FOLDER_PREMIUM_PRICE_FLAME_COIN &&
                      depositFlow.tier < WORLD_RULES.FILE_FOLDER_STANDARD_MIN_FLAME_COIN && (
                        <p className="mt-2 text-xs text-red-300">
                          Standard begins at {WORLD_RULES.FILE_FOLDER_STANDARD_MIN_FLAME_COIN.toLocaleString()} Flame Coin.
                        </p>
                      )}
                  </div>
                </div>
              </div>

              {depositFlow.tier && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-6"
                >
                  <div className="p-6 bg-black border border-white/5 rounded-3xl space-y-4">
                    <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">
                      Company TRX Payment Wallet
                    </p>

                    <div className="flex items-center justify-between gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                      <p className="font-mono text-xs md:text-sm text-[#e8b93f] break-all leading-relaxed">
                        {WORLD_RULES.COMPANY_TRX_WALLET}
                      </p>

                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(
                            WORLD_RULES.COMPANY_TRX_WALLET
                          )
                        }}
                        className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl transition-colors shrink-0"
                      >
                        <Copy className="h-4 w-4 text-white/70" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      placeholder="Your Full Name"
                      value={depositFlow.name}
                      onChange={(e) => depositFlow.setName(e.target.value)}
                      className="bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white placeholder:text-white/20 outline-none focus:border-[#e8b93f]/50 transition-colors"
                    />

                    <input
                      placeholder="WhatsApp / Phone"
                      value={depositFlow.phone}
                      onChange={(e) => depositFlow.setPhone(e.target.value)}
                      className="bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white placeholder:text-white/20 outline-none focus:border-[#e8b93f]/50 transition-colors"
                    />
                  </div>

                  <input
                    placeholder="TRX Transaction Hash"
                    value={depositFlow.txHash}
                    onChange={(e) => depositFlow.setTxHash(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white placeholder:text-white/20 outline-none focus:border-[#e8b93f]/50 transition-colors"
                  />

                  <div className="flex gap-4">
                    <button
                      onClick={depositFlow.onConfirmUnderstanding}
                      className="flex-1 bg-white/5 text-white/70 font-bold py-5 rounded-[24px] border border-white/10 hover:bg-white/10 transition-all active:scale-95"
                    >
                      Cancel
                    </button>

                    <button
                      onClick={depositFlow.onSubmit}
                      disabled={
                        depositFlow.submitting ||
                        !depositFlow.tier ||
                        depositFlow.tier < WORLD_RULES.FILE_FOLDER_STANDARD_MIN_FLAME_COIN ||
                        depositFlow.tier > WORLD_RULES.FILE_FOLDER_PREMIUM_PRICE_FLAME_COIN ||
                        !depositFlow.name.trim() ||
                        !depositFlow.phone.trim() ||
                        !depositFlow.txHash.trim()
                      }
                      className="flex-[2] bg-[#e8b93f] text-black font-black py-5 rounded-[24px] shadow-2xl shadow-[#e8b93f]/20 hover:bg-[#d4a935] transition-all active:scale-95 disabled:opacity-40"
                    >
                      {depositFlow.submitting
                        ? 'Authenticating...'
                        : 'Confirm Payment'}
                    </button>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}

        {depositFlow.status === 'pending' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[80] flex flex-col items-center justify-center p-6 text-center pointer-events-auto"
          >
            <div className="w-32 h-32 relative mb-12">
              <div className="absolute inset-0 border-4 border-[#e8b93f]/20 rounded-full" />

              <motion.div
                className="absolute inset-0 border-4 border-t-[#e8b93f] rounded-full"
                animate={{ rotate: 360 }}
                transition={{
                  repeat: Infinity,
                  duration: 2,
                  ease: 'linear',
                }}
              />

              <div className="absolute inset-0 flex items-center justify-center">
                <Sparkles className="h-10 w-10 text-[#e8b93f]" />
              </div>
            </div>

            <h2 className="text-3xl md:text-5xl font-black text-white mb-4 tracking-tight drop-shadow-2xl">
              Held in Stillness
            </h2>

            <p className="text-white/90 font-bold text-lg max-sm leading-relaxed drop-shadow-lg">
              Verification in progress. The Bridge is responding to your intent.
            </p>
          </motion.div>
        )}

        {depositFlow.status === 'approved' && fileNumber && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-[#e8b93f] z-[90] flex flex-col items-center justify-center p-6 text-center pointer-events-auto"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="space-y-8"
            >
              <div className="w-24 h-24 bg-black rounded-[40px] flex items-center justify-center mx-auto shadow-2xl">
                <Check className="h-12 w-12 text-[#e8b93f]" />
              </div>

              <div className="space-y-2">
                <h2 className="text-5xl md:text-7xl font-black text-black tracking-tighter leading-none">
                  CROSSING
                </h2>

                <p className="text-black/60 font-bold uppercase tracking-[0.4em]">
                  System Switch Opened
                </p>
              </div>

              <div className="p-8 bg-black/10 rounded-[40px] border border-black/10 backdrop-blur-md">
                <p className="text-xs font-bold text-black/40 uppercase tracking-[0.2em] mb-2">
                  Issued File Number
                </p>

                <p className="text-3xl font-black text-black tracking-widest font-mono">
                  {fileNumber}
                </p>
              </div>

              <button
                onClick={onGoToRegister}
                className="px-12 py-6 bg-black text-[#e8b93f] font-black rounded-[32px] text-xl hover:scale-105 transition-transform active:scale-95 shadow-2xl"
              >
                ENTER WEAVE
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }

        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.02);
          border-radius: 10px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </div>
  )
}
