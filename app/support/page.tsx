import Link from 'next/link'

export const metadata = {
  title: 'Support | Weave of Presence',
}

export default function SupportPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-slate-100">
      <article className="mx-auto max-w-3xl space-y-8 rounded-3xl border border-white/10 bg-white/[0.03] p-8 md:p-12">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-300">Weave of Presence</p>
          <h1 className="mt-3 text-3xl font-semibold">Support</h1>
          <p className="mt-3 text-sm leading-7 text-slate-400">
            Support follows the Weave path you are using.
          </p>
        </div>

        <section className="space-y-3 text-sm leading-7 text-slate-300">
          <p>
            Existing Clients should enter through the Client Portal and use the support functions attached to their File Folder.
            Bridgers, Agents, and other authorized positions should use the support or messaging functions available inside their
            dashboard.
          </p>
          <p>
            If you arrived through a ChatGPT referral, open the crossing link that was created for you. The crossing preserves
            the initiating need so Weave can continue from that point.
          </p>
          <p>
            Never send passwords, wallet private keys, seed phrases, or authentication secrets through support messages.
          </p>
        </section>

        <div className="flex flex-wrap gap-3 text-sm">
          <Link className="rounded-full border border-white/10 px-4 py-2 hover:bg-white/5" href="/client/login">Client Portal</Link>
          <Link className="rounded-full border border-white/10 px-4 py-2 hover:bg-white/5" href="/privacy">Privacy</Link>
          <Link className="rounded-full border border-white/10 px-4 py-2 hover:bg-white/5" href="/terms">Terms</Link>
          <Link className="rounded-full border border-white/10 px-4 py-2 hover:bg-white/5" href="/">Return to Weave</Link>
        </div>
      </article>
    </main>
  )
}
