import Link from 'next/link'

export const metadata = {
  title: 'Terms | Weave of Presence',
}

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-slate-100">
      <article className="mx-auto max-w-3xl space-y-8 rounded-3xl border border-white/10 bg-white/[0.03] p-8 md:p-12">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-300">Weave of Presence</p>
          <h1 className="mt-3 text-3xl font-semibold">Terms of Service</h1>
          <p className="mt-3 text-sm leading-7 text-slate-400">Effective September 25, 2026.</p>
        </div>

        <section className="space-y-3 text-sm leading-7 text-slate-300">
          <p>
            Weave of Presence provides systems, services, instruments, workshops, and participation environments. Access to a
            specific paid service is governed by the terms, price, and conditions shown for that service at the time of use.
          </p>
          <p>
            A referral or ChatGPT plugin result is an optional entry path. It is not a promise of income, funding, employment,
            investment return, business success, or any particular outcome.
          </p>
          <p>
            Users are responsible for information they submit and for reviewing the conditions of a service before making a
            payment or committing to an activity. Users must not misuse Weave, attempt unauthorized access, interfere with other
            users, or use the service for unlawful activity.
          </p>
          <p>
            Weave may change, suspend, or maintain parts of the service when necessary for security, reliability, legal
            compliance, or platform development. Material terms for paid functions should be presented before the relevant
            transaction.
          </p>
          <p>
            The company distinguishes Agents (Stability), Bridgers (Hope), Clients (Dream Lovely)
            and Administration (A Time). A role, File Number, application, or payment is not
            an approved employment contract. Salary, employee assignments, commercial returns
            and customer fees are governed by the individually approved written terms.
          </p>
          <p>
            A File Folder is a system for authorized business work, not a guarantee of
            customers, profits or withdrawal. All financial records must distinguish actual
            confirmed receipts, business earnings, employee compensation and company fees.
            Payments to a public blockchain address are not automatically reversible.
          </p>
          <p>
            Users must respect personal information, customer records, intellectual property,
            human consent and applicable laws. Unauthorized automation, impersonation,
            fraud, harassment, unsolicited prohibited marketing, credential exposure and
            interference with other people’s systems are not permitted.
          </p>
          <p>
            Company policies explain departmental responsibilities, transaction verification,
            data handling, service corrections and software changes. Material changes to
            binding terms require appropriate notice and acceptance where applicable; a
            published operating explanation does not silently replace an existing contract.
          </p>
          <p>
            References to ChatGPT or OpenAI identify the technical source of an integration where applicable and do not imply
            endorsement, partnership, exclusivity, or a guarantee by OpenAI.
          </p>
        </section>

        <div className="flex flex-wrap gap-3 text-sm">
          <Link className="rounded-full border border-white/10 px-4 py-2 hover:bg-white/5" href="/privacy">Privacy</Link>
          <Link className="rounded-full border border-white/10 px-4 py-2 hover:bg-white/5" href="/policies">Company policies</Link>
          <Link className="rounded-full border border-white/10 px-4 py-2 hover:bg-white/5" href="/support">Support</Link>
          <Link className="rounded-full border border-white/10 px-4 py-2 hover:bg-white/5" href="/">Return to Weave</Link>
        </div>
      </article>
    </main>
  )
}
