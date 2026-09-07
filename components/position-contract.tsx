'use client'

import Link from 'next/link'
import { ArrowLeft, CheckCircle2, FileText, ShieldCheck } from 'lucide-react'

export type PositionRole = 'agent' | 'bridger'

const CONTRACTS = {
  agent: {
    title: 'Agent Position & Participation Agreement',
    subtitle: 'Weave of Presence · System Switch · Bridge Radiance',
    purpose: 'The Agent is a salary-based Weave worker responsible for bringing, organizing, and supporting Bridgers so the company can extend participation through the marketplace.',
    authority: 'The Agent operates within the authority of Weave and Administration. The Agent does not own Client enterprises or Client File Folders.',
    duties: [
      'Recruit, support, and manage Bridgers assigned to the Agent.',
      'Maintain the movement of Bridgers through the active marketplace and company processes.',
      'Support prospect and Client continuity without presenting the Agent as the owner of a Client relationship or enterprise.',
      'Use company systems, records, communications, and approved functions consciously and accurately.',
      'Preserve the distinction between Agent work, Bridger work, Client ownership, and Administration authority.',
    ],
    economics: [
      'Agent compensation includes the established 5% share of qualifying File Folder value under Loop One.',
      'The 5% is recorded by the company transaction system; it is not a private charge to the Client.',
      'Company distribution remains 35% and Client Siblings Fund / Client Vault remains 30%.',
    ],
    boundaries: [
      'An Agent does not cross System Switch as a Client.',
      'An Agent does not own a Client File Folder, Client enterprise, or Client Vault.',
      'An Agent cannot alter Client balances outside authorized company functions.',
      'Any financial action must have a corresponding company record and authorized source.',
    ],
  },
  bridger: {
    title: 'Bridger Position & Participation Agreement',
    subtitle: 'Weave of Presence · Marketplace · Bridge Radiance',
    purpose: 'The Bridger is the human partnership that accompanies prospects and Clients toward participation in Weave. The Bridger is the connection; the Client is the person who crosses System Switch.',
    authority: 'The Bridger operates as a participant of Weave under the assigned Agent and company structure. The Bridger does not become the Client by accompanying the Client.',
    duties: [
      'Purchase and work prospects made available through the marketplace.',
      'Initiate and maintain the approved Bridge AI / WhatsApp connection with prospects.',
      'Accompany a prospect through the File Folder purchase and Client formation process.',
      'Remain available as the Client’s relationship and connection point after crossing.',
      'Keep communications truthful, recorded where required, and consistent with the Client’s actual position.',
    ],
    economics: [
      'Bridger compensation includes the established 30% share of qualifying File Folder value under Loop One.',
      'The 30% is recorded by the company transaction system as Bridger earnings.',
      'The remaining File Folder distribution is 5% Agent, 35% Company, and 30% Client Siblings Fund / Client Vault.',
    ],
    boundaries: [
      'A Bridger does not pass through System Switch.',
      'A Bridger does not own the Client’s File Folder or enterprise.',
      'A Bridger cannot represent a Client as having a balance, entitlement, or approval that the company record does not show.',
      'A Bridger does not approve Client Vault withdrawals; that authority belongs to Administration.',
    ],
  },
} as const

export function PositionContract({ role }: { role: PositionRole }) {
  const contract = CONTRACTS[role]
  const roleName = role === 'agent' ? 'Agent' : 'Bridger'

  return (
    <main className="min-h-screen bg-slate-950 text-white px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <Link href={role === 'agent' ? '/agent/dashboard' : '/bridger/dashboard'} className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white">
            <ArrowLeft className="h-4 w-4" /> Return to Dashboard
          </Link>
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-300">
            <ShieldCheck className="h-4 w-4 text-cyan-400" /> Position Record
          </div>
        </div>

        <section className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-900/80 shadow-2xl">
          <header className="border-b border-slate-700 p-6 sm:p-8">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-3">
                <FileText className="h-6 w-6 text-cyan-400" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-cyan-400">Weave of Presence</p>
                <p className="text-xs text-slate-500">System Switch · Bridge Radiance</p>
              </div>
            </div>
            <h1 className="text-2xl font-bold sm:text-4xl">{contract.title}</h1>
            <p className="mt-2 text-sm text-slate-400">{contract.subtitle}</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-4"><p className="text-xs text-slate-500">Position</p><p className="mt-1 font-semibold">{roleName}</p></div>
              <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-4"><p className="text-xs text-slate-500">Standing</p><p className="mt-1 font-semibold text-green-400">Active participation</p></div>
              <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-4"><p className="text-xs text-slate-500">Record</p><p className="mt-1 font-semibold">Digital company record</p></div>
            </div>
          </header>

          <div className="space-y-8 p-6 sm:p-8">
            <section><h2 className="mb-2 text-lg font-semibold">1. Position</h2><p className="leading-7 text-slate-300">{contract.purpose}</p></section>
            <section><h2 className="mb-2 text-lg font-semibold">2. Authority & Place</h2><p className="leading-7 text-slate-300">{contract.authority}</p></section>
            <section><h2 className="mb-3 text-lg font-semibold">3. Functions</h2><ul className="space-y-3">{contract.duties.map(item => <li key={item} className="flex gap-3 text-slate-300"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-cyan-400" />{item}</li>)}</ul></section>
            <section><h2 className="mb-3 text-lg font-semibold">4. Economics</h2><ul className="space-y-3">{contract.economics.map(item => <li key={item} className="flex gap-3 text-slate-300"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />{item}</li>)}</ul></section>
            <section><h2 className="mb-3 text-lg font-semibold">5. Boundaries</h2><ul className="space-y-3">{contract.boundaries.map(item => <li key={item} className="flex gap-3 text-slate-300"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />{item}</li>)}</ul></section>

            <section className="rounded-xl border border-slate-700 bg-slate-950/70 p-5">
              <h2 className="text-lg font-semibold">6. Acknowledgment</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">This page states the operating position used by the Weave system. It is intended to keep the participant, company, Client, and financial records aligned. It does not replace any separate employment, partnership, customer, or legally required agreement that may apply.</p>
              <div className="mt-5 flex items-center gap-3 text-sm text-slate-300"><span className="h-3 w-3 rounded-full bg-green-400" />Position terms are visible before participation.</div>
            </section>
          </div>
        </section>
      </div>
    </main>
  )
}
