import Link from 'next/link'
import AdministrationControlTerminal from '@/components/admin/administration-control-terminal'

/**
 * The Control Center is the entrance to verified company work, not a list of
 * indistinguishable links. Each decision still occurs at its original source.
 * The existing terminal below remains intact and is not replaced by this map.
 */
export default function AdministrationControlCenter(){
  return <>
    <section data-phe-control className="mx-auto w-full max-w-[1500px] px-3 pt-5 pb-6 text-white sm:px-6">
      <header data-phe-control-panel className="overflow-hidden rounded-[1.6rem] p-5 sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[.17em] text-amber-200">Administrations · A Time</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-3xl">
            <h1 className="text-2xl font-bold tracking-tight sm:text-4xl">Company Control Center</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-200">Choose the responsibility before opening its workshop. Each entrance leads to actual people, records, verification or company systems; nothing here invents approvals or financial results.</p>
          </div>
          <a href="#company-control-terminal" className="inline-flex min-h-11 items-center rounded-xl border border-amber-200/50 bg-amber-200/10 px-4 py-2 text-sm font-semibold text-amber-100 hover:bg-amber-200/20">Go to existing Control Terminal</a>
        </div>
      </header>

      <nav aria-label="Administrations responsibility map" data-phe-control-grid className="mt-5">
        <section data-phe-control-group aria-labelledby="phe-people-title">
          <p className="text-[11px] font-semibold uppercase tracking-[.15em] text-amber-200">01 · Workforce</p>
          <h2 id="phe-people-title" className="mt-1 text-lg font-bold">People and daily participation</h2>
          <p className="mt-1 text-xs leading-5 text-slate-400">Support real employees, applications and assigned managers.</p>
          <Link data-phe-control-link href="/admin/regional-operations" data-admin-regional-operations="true">Regional Workforce · Daily participation and staff support<small>Supervision, assignments and attendance</small></Link>
          <Link data-phe-control-link href="/weave/lifestyles/support" data-admin-manager-support-link="true">Company Work Support · Assign and review<small>Private worker cases and authorized action</small></Link>
          <Link data-phe-control-link href="/admin/food-distribution-employment" data-admin-food-distribution-review-link="true">Food Distribution Employment · Review Agent applications<small>Verify candidates and appointments</small></Link>
          <Link data-phe-control-link href="/admin/regional-manager-applications" data-admin-regional-manager-review-link="true">Regional Manager Applications · Review queue<small>Ordinary regional positions and decisions</small></Link>
        </section>

        <section data-phe-control-group aria-labelledby="phe-evidence-title">
          <p className="text-[11px] font-semibold uppercase tracking-[.15em] text-cyan-200">02 · Evidence</p>
          <h2 id="phe-evidence-title" className="mt-1 text-lg font-bold">Company movement and alerts</h2>
          <p className="mt-1 text-xs leading-5 text-slate-400">See what happened; make decisions only with source evidence.</p>
          <Link data-phe-control-link href="/admin/company-movement" data-admin-company-movement-link="true">Company Movement · Sales, prospects, Clients and payments<small>Actual participation and formation records</small></Link>
          <Link data-phe-control-link href="/admin/notification-health" data-admin-notification-health="true">Administrations Alerts · Delivery Health<small>Check notification routing and exceptions</small></Link>
          <Link data-phe-control-link href="/notifications">Company Notifications · Full Inbox<small>Read original messages and action links</small></Link>
          <Link data-phe-control-link href="/admin/company-active-wallet" data-admin-company-active-wallet-settings="true">Company Active Wallet · Admin configuration<small>Authorized payment settings, not customer balances</small></Link>
        </section>

        <section data-phe-control-group aria-labelledby="phe-authority-title">
          <p className="text-[11px] font-semibold uppercase tracking-[.15em] text-sky-200">03 · Authority and formation</p>
          <h2 id="phe-authority-title" className="mt-1 text-lg font-bold">Verification and systems</h2>
          <p className="mt-1 text-xs leading-5 text-slate-400">Preserve distinct Client, software and governance responsibilities.</p>
          <Link data-phe-control-link href="/admin/pro-regional-manager-applications" data-admin-pro-regional-manager-review-link="true">Pro Regional Manager · Agent and Bridger applications<small>Examine approved positions and requirements</small></Link>
          <Link data-phe-control-link href="/admin/pro-regional-manager-activations" data-admin-pro-regional-manager-activation-link="true">Pro Manager Activation · Forensics<small>Evidence before entitlement</small></Link>
          <Link data-phe-control-link href="/admin/pro-file-number-verifications" data-admin-external-client-pro-verification="true">Pro Staff Verification · External Clients<small>File Number, verification and Client continuity</small></Link>
          <Link data-phe-control-link href="/admin/code-workshop" data-admin-code-workshop-entry="true">Company Code Workshop · Source Terminal<small>Owned drafts, review and release boundaries</small></Link>
          <Link data-phe-control-link href="/policies" data-admin-governance-policy-entry="true">Company Policies · Operating Guardrails<small>Permissions, obligations and accountability</small></Link>
        </section>
      </nav>
    </section>
    <div id="company-control-terminal" className="scroll-mt-24"><AdministrationControlTerminal /></div>
  </>
}
