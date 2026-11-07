import Link from 'next/link'
import {COMPANY_POLICY_SECTIONS,WEAVE_GOVERNANCE_VERSION} from '@/lib/weave-company-governance'

export const metadata={title:'Company Policies | Weave of Presence',
 description:'Weave company responsibilities, participation and verified operating safeguards.'}

export default function CompanyPoliciesPage(){
 return <main className="min-h-dvh bg-[#071a2d] px-4 py-10 text-white" data-weave-company-policies="published">
  <div className="mx-auto max-w-6xl">
   <nav className="flex flex-wrap gap-5 text-sm text-sky-200">
    <Link href="/">Weave of Presence</Link><Link href="/terms">Terms of Service</Link>
    <Link href="/privacy">Privacy Notice</Link><Link href="/support">Support</Link>
   </nav>
   <header className="mt-8 overflow-hidden rounded-3xl border border-sky-300/25 bg-[radial-gradient(circle_at_86%_15%,rgba(98,193,240,.24),transparent_44%),linear-gradient(112deg,#09243c,#16466c)] p-7 sm:p-11">
    <p className="text-xs font-bold uppercase tracking-[.19em] text-sky-200">WEAVE of Presence · A Time · Company of Time</p>
    <h1 className="mt-4 text-3xl font-bold leading-tight sm:text-5xl">Company Policies & Operating Responsibilities</h1>
    <p className="mt-5 max-w-4xl text-sm leading-7 text-sky-50">Weave turns human presence, interaction and real work into organized participation. The company must remain understandable to the people who use it, accountable for the records it creates, and safe to operate as its systems grow.</p>
    <p className="mt-4 text-xs text-sky-200">Operating policy reference: {WEAVE_GOVERNANCE_VERSION}</p>
   </header>

   <section className="mt-6 rounded-2xl border border-sky-200/20 bg-sky-300/[.05] p-6">
    <h2 className="text-xl font-bold">What these policies mean</h2>
    <p className="mt-3 text-sm leading-7 text-slate-200">These are Weave’s published operating safeguards for the existing company functions. They explain how departments work, how claims and transactions are verified, and how technology and people interact. A specific signed employment agreement, applicable service transaction, valid consent or mandatory law may create additional or overriding terms. This reference does not retroactively change earlier agreements or imply that a proposed system is already live.</p>
   </section>

   <nav aria-label="Company policy contents" className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
    {COMPANY_POLICY_SECTIONS.map(section=><a key={section.id} href={'#'+section.id}
      className="rounded-xl border border-white/10 bg-white/[.04] p-4 transition hover:border-sky-300/40">
     <p className="text-xs font-bold uppercase tracking-wider text-sky-200">{section.audience}</p>
     <h2 className="mt-2 text-base font-bold">{section.title}</h2>
     <p className="mt-2 text-xs leading-6 text-slate-300">{section.summary}</p>
    </a>)}
   </nav>

   <div className="mt-9 space-y-5">
    {COMPANY_POLICY_SECTIONS.map(section=><section id={section.id} key={section.id}
      className="scroll-mt-5 rounded-2xl border border-white/10 bg-[#0d273d] p-6 sm:p-8">
     <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-xl font-bold sm:text-2xl">{section.title}</h2>
      <span className="rounded-full border border-sky-300/20 px-3 py-1.5 text-xs text-sky-200">{section.audience}</span>
     </div>
     <p className="mt-2 text-sm leading-7 text-sky-100">{section.summary}</p>
     <ol className="mt-5 space-y-4">
      {section.rules.map((rule,index)=><li key={index} className="flex gap-3 text-sm leading-7 text-slate-200">
       <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-sky-300/20 text-[11px] font-bold text-sky-200">{index+1}</span>
       <span>{rule}</span>
      </li>)}
     </ol>
    </section>)}
   </div>
   <footer className="mt-8 rounded-2xl border border-sky-200/20 bg-white/[.04] p-6">
    <h2 className="text-lg font-bold">Need a correction or formal clarification?</h2>
    <p className="mt-2 text-sm leading-7 text-slate-200">Use the official support channel for complaints, discrepancies, requests about account information or questions about terms applying to a particular service. Do not place passwords, wallet recovery phrases or private keys in messages.</p>
    <div className="mt-5 flex flex-wrap gap-4 text-sm text-sky-200">
     <Link href="/support" className="underline">Contact Support</Link>
     <Link href="/terms" className="underline">Read Terms of Service</Link>
     <Link href="/privacy" className="underline">Read Privacy Notice</Link>
    </div>
   </footer>
  </div>
 </main>
}
