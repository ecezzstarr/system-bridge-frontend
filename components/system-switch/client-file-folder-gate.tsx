'use client'

import Link from 'next/link'
import { ArrowLeft, Bot, FileBox, Scale, Search, ShieldCheck, UserRoundCheck } from 'lucide-react'

type GateStage = 'bridge_file_folder' | 'forensics' | 'administration' | 'personalization' | 'active'

const stageMeta: Record<Exclude<GateStage, 'active'>, {
  eyebrow: string
  icon: typeof FileBox
  status: string
}> = {
  bridge_file_folder: {
    eyebrow: 'Bridge → File Folder',
    icon: FileBox,
    status: 'File Folder required',
  },
  forensics: {
    eyebrow: 'Company Support · Forensics',
    icon: Search,
    status: 'Verification required',
  },
  administration: {
    eyebrow: 'System Switch Gate',
    icon: ShieldCheck,
    status: 'Awaiting Administration',
  },
  personalization: {
    eyebrow: 'Client Personalization',
    icon: UserRoundCheck,
    status: 'First workshop forming',
  },
}

export default function ClientFileFolderGate({ entry }: { entry: any }) {
  const stage = entry?.gate?.stage as Exclude<GateStage, 'active'>
  const meta = stageMeta[stage] || stageMeta.bridge_file_folder
  const Icon = meta.icon

  return (
    <main className="min-h-screen bg-[#02050b] px-4 py-8 text-white">
      <div className="mx-auto max-w-3xl">
        <div className="rounded-[2rem] border border-sky-300/10 bg-slate-950/90 p-6 shadow-2xl md:p-9">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/20 bg-sky-400/5 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-sky-300">
              <Icon className="h-3.5 w-3.5" />
              {meta.eyebrow}
            </div>
            <span className="rounded-full border border-amber-400/20 bg-amber-400/5 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-amber-300">
              {meta.status}
            </span>
          </div>

          <h1 className="mt-6 text-3xl font-black tracking-tight">{entry?.gate?.title || 'File Folder Gate'}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-400">{entry?.gate?.detail}</p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">Client</p>
              <p className="mt-2 text-sm font-semibold">{entry?.client?.name || 'Client'}</p>
              <p className="mt-1 font-mono text-[10px] text-slate-500">{entry?.client?.file_number || 'No File Number attached'}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">My Bridger</p>
              <p className="mt-2 text-sm font-semibold">{entry?.bridger?.name || 'Not yet attached'}</p>
              <p className="mt-1 text-[10px] text-slate-500">Carries the Client through the Bridge and into the File Folder movement.</p>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.025] p-5">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-violet-300">Bridge structure</p>
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              {[
                ['Bridger', UserRoundCheck],
                ['Bridge AI', Bot],
                ['Mandate', ShieldCheck],
                ['Attorney', Scale],
                ['Forensics', Search],
                ['Administration', ShieldCheck],
              ].map(([label, ItemIcon]: any) => (
                <div key={label} className="flex items-center gap-2 rounded-xl border border-white/5 bg-black/20 px-3 py-2.5 text-xs text-slate-300">
                  <ItemIcon className="h-3.5 w-3.5 text-sky-300" />
                  {label}
                </div>
              ))}
            </div>
          </div>

          {stage === 'bridge_file_folder' && (
            <div className="mt-6 rounded-2xl border border-sky-400/20 bg-sky-400/5 p-5">
              <p className="text-sm font-semibold">Continue through your Bridge</p>
              <p className="mt-2 text-xs leading-6 text-slate-400">
                File Folder purchase belongs to the Bridge. This account cannot skip that movement because it already has a Client login.
              </p>
              <Link href="/client/chat/bridger" className="mt-4 inline-flex rounded-full bg-sky-500 px-5 py-2.5 text-xs font-bold text-slate-950">
                Continue with My Bridger
              </Link>
            </div>
          )}

          {stage === 'forensics' && (
            <div className="mt-6 rounded-2xl border border-violet-400/20 bg-violet-400/5 p-5 text-xs leading-6 text-slate-300">
              Receipt/payment evidence is in the verification movement. System Switch remains closed until Forensics confirms it.
            </div>
          )}

          {stage === 'administration' && (
            <div className="mt-6 rounded-2xl border border-amber-400/20 bg-amber-400/5 p-5 text-xs leading-6 text-slate-300">
              You are at the System Switch Gate. The File Folder has been recognized; Administration is the authority that opens the crossing.
            </div>
          )}

          {stage === 'personalization' && (
            <div className="mt-6 rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-5 text-xs leading-6 text-slate-300">
              No generic “first workshop” will be inserted. The first workshop must reflect what your own interaction revealed and what WEAVE recognized from it.
            </div>
          )}

          <div className="mt-6">
            <Link href="/client/dashboard" className="inline-flex items-center gap-2 text-xs text-slate-500 hover:text-white">
              <ArrowLeft className="h-3.5 w-3.5" />
              Return to Client Home
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
