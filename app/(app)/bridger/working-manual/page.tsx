import Link from 'next/link'
import { ArrowLeft, Clock3, Users, Workflow } from 'lucide-react'

const steps = [
  ['Find', 'Open the Prospect Marketplace and select available candidates for outreach. A candidate is unverified until real interaction establishes otherwise.'],
  ['Contact', 'Each working hour, reach out to at least two prospects. Make the contact personal and relevant to the person rather than sending a mass, generic pitch.'],
  ['Understand', 'Ask what the person is building, selling, organizing or trying to move forward. Listen before explaining WEAVE.'],
  ['Recognize', 'Reflect the prospect’s actual movement and identify where their present work could use more room or structure.'],
  ['Introduce', 'Explain only the parts of WEAVE and the File Folder that are relevant to what the prospect has shared.'],
  ['Request permission', 'Offer to open the Bridge only when the prospect understands why it is relevant and agrees to continue.'],
  ['Continue the crossing', 'Guide a willing prospect through Bridge AI, File Folder options, the official payment process and Administrations verification.'],
]

export default function BridgerWorkingManualPage() {
  return (
    <main className="mx-auto w-full max-w-5xl space-y-8 px-4 py-8 text-slate-100 sm:px-6">
      <Link href="/weave/market/prospects" className="inline-flex items-center gap-2 text-sm font-semibold text-sky-300 hover:text-sky-200">
        <ArrowLeft className="h-4 w-4" /> Prospect Marketplace
      </Link>

      <header className="space-y-3">
        <p className="text-xs font-black uppercase tracking-[.2em] text-sky-300">Company of Time · Hope · Bridger Department</p>
        <h1 className="text-3xl font-black tracking-tight sm:text-5xl">Bridger Working Manual</h1>
        <p className="max-w-3xl text-base leading-7 text-slate-300">
          Weave moves as time itself by doing its work through the people occupying its departments.
          The Bridger carries that movement into the marketplace through direct, thoughtful contact with prospects.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-sky-400/30 bg-sky-400/10 p-5">
          <div className="flex items-center gap-2 text-sky-200"><Clock3 className="h-5 w-5" /><span className="text-xs font-black uppercase tracking-widest">Hourly work requirement</span></div>
          <p className="mt-3 text-4xl font-black text-white">2 prospects</p>
          <p className="mt-2 text-sm leading-6 text-slate-300">Make contact with at least two prospects every working hour.</p>
        </div>
        <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-5">
          <div className="flex items-center gap-2 text-emerald-300"><Users className="h-5 w-5" /><span className="text-xs font-black uppercase tracking-widest">Daily movement</span></div>
          <p className="mt-3 text-2xl font-black text-white">2 × working hours</p>
          <p className="mt-2 text-sm leading-6 text-slate-300">The daily contact target follows the number of working hours. For example, six working hours require at least twelve prospect contacts.</p>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Workflow className="h-5 w-5 text-sky-300" />
          <h2 className="text-xl font-bold">How the work moves</h2>
        </div>
        <ol className="space-y-3">
          {steps.map(([title, description], index) => (
            <li key={title} className="flex gap-4 rounded-xl border border-slate-800 bg-slate-900/50 p-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-800 text-sm font-black text-sky-200">{index + 1}</span>
              <div><h3 className="font-bold text-white">{title}</h3><p className="mt-1 text-sm leading-6 text-slate-400">{description}</p></div>
            </li>
          ))}
        </ol>
      </section>

      <section className="rounded-2xl border border-slate-700 bg-slate-900/60 p-5 sm:p-6">
        <h2 className="text-lg font-bold text-white">The standard of contact</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-300">
          <li>Contact two prospects in every working hour; do not leave the hour’s outreach until the end of the day.</li>
          <li>Use the Prospect Marketplace to source candidates and My Prospects to continue assigned outreach.</li>
          <li>Personalize the opening around the person’s real work, business, skill or idea.</li>
          <li>Listen before explaining. Do not force the conversation or manufacture urgency.</li>
          <li>Never promise income, customers, profit or guaranteed results from a File Folder.</li>
          <li>A sent message is an outreach attempt, not proof of a response, interest, conversion or sale.</li>
          <li>Send a Bridge only after the prospect understands the next step and gives permission.</li>
          <li>Use WEAVE’s official payment route. Payment must be verified before Client ownership is established.</li>
        </ul>
      </section>

      <section className="rounded-2xl border border-sky-400/20 bg-sky-400/5 p-5">
        <p className="text-sm font-semibold leading-7 text-slate-200">
          The Bridger does not merely advertise Weave. The Bridger creates the connection through which another person can understand an opportunity to participate. The work is the contact; the result is allowed to emerge from a real human decision.
        </p>
      </section>

      <Link href="/weave/market/prospects" className="inline-flex rounded-lg bg-sky-600 px-5 py-3 text-sm font-bold text-white hover:bg-sky-500">
        Open Prospect Marketplace
      </Link>
    </main>
  )
}
