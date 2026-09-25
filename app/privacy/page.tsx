import Link from 'next/link'

export const metadata = {
  title: 'Privacy | Weave of Presence',
}

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-slate-100">
      <article className="mx-auto max-w-3xl space-y-8 rounded-3xl border border-white/10 bg-white/[0.03] p-8 md:p-12">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-300">Weave of Presence</p>
          <h1 className="mt-3 text-3xl font-semibold">Privacy Notice</h1>
          <p className="mt-3 text-sm leading-7 text-slate-400">Effective September 25, 2026.</p>
        </div>

        <section className="space-y-3 text-sm leading-7 text-slate-300">
          <p>
            Weave processes information that a person chooses to provide when using its website, Client paths, System Switch,
            Bridge AI, support functions, or connected integrations. This can include account information, messages, business
            information, transaction records, and technical records needed to operate and secure the service.
          </p>
          <p>
            A ChatGPT-origin referral stores the user need and optional continuity context used to create a short-lived crossing.
            The crossing records its source as ChatGPT/OpenAI for attribution. It does not mean that OpenAI endorses Weave.
          </p>
          <p>
            Referral crossings expire after 24 hours unless they are continued through the normal Weave process. Weave uses
            information to provide requested services, maintain security, prevent abuse, keep operational records, and satisfy
            applicable legal obligations.
          </p>
          <p>
            Weave does not require a person to provide more information than is needed for the function they choose to use.
            Users should not place passwords, private keys, or other account secrets into ordinary messages or referral context.
          </p>
        </section>

        <div className="flex flex-wrap gap-3 text-sm">
          <Link className="rounded-full border border-white/10 px-4 py-2 hover:bg-white/5" href="/terms">Terms</Link>
          <Link className="rounded-full border border-white/10 px-4 py-2 hover:bg-white/5" href="/support">Support</Link>
          <Link className="rounded-full border border-white/10 px-4 py-2 hover:bg-white/5" href="/">Return to Weave</Link>
        </div>
      </article>
    </main>
  )
}
