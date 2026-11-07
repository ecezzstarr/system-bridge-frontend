import Link from 'next/link'
import AdministrationControlTerminal from '@/components/admin/administration-control-terminal'

export default function AdministrationControlCenter(){
  return <>
    <div className="mx-auto max-w-6xl px-4 pt-4">
      <Link href="/admin/food-distribution-employment" data-admin-food-distribution-review-link="true" className="inline-flex min-h-10 items-center border border-amber-300/25 bg-amber-300/[.05] px-4 py-2 text-xs font-black text-amber-100">
        Food Distribution Employment · Review Agent applications →
      </Link>
      <Link href="/admin/regional-manager-applications" data-admin-regional-manager-review-link="true" className="ml-2 inline-flex min-h-10 items-center border border-cyan-300/25 bg-cyan-300/[.05] px-4 py-2 text-xs font-black text-cyan-100">
        Regional Manager Applications · Review queue →
      </Link>
      <Link href="/admin/pro-regional-manager-activations" data-admin-pro-regional-manager-activation-link="true"
        className="ml-2 inline-flex min-h-10 items-center border border-sky-300/25 bg-sky-300/[.05] px-4 py-2 text-xs font-black text-sky-100">
        Pro Manager Activation · Forensics
      </Link>
      <Link href="/admin/pro-regional-manager-applications" data-admin-pro-regional-manager-review-link="true"
        className="ml-2 inline-flex min-h-10 items-center border border-sky-300/25 bg-sky-300/[.05] px-4 py-2 text-xs font-black text-sky-100">
        Pro Regional Manager · Agent and Bridger applications
      </Link>
      <Link href="/admin/code-workshop" data-admin-code-workshop-entry="true"
        className="ml-2 inline-flex min-h-10 items-center border border-sky-300/25 bg-sky-300/[.05] px-4 py-2 text-xs font-black text-sky-100">
        Company Code Workshop · Source Terminal
      </Link>
      <Link href="/policies" data-admin-governance-policy-entry="true"
        className="ml-2 inline-flex min-h-10 items-center border border-sky-300/25 bg-sky-300/[.05] px-4 py-2 text-xs font-black text-sky-100">
        Company Policies · Operating Guardrails
      </Link>
      <Link href="/admin/company-active-wallet" data-admin-company-active-wallet-settings="true"
        className="ml-2 inline-flex min-h-10 items-center border border-sky-300/25 bg-sky-300/[.05] px-4 py-2 text-xs font-black text-sky-100">
        Company Active Wallet · Admin configuration
      </Link>
      <Link href="/admin/pro-file-number-verifications" data-admin-external-client-pro-verification="true"
        className="ml-2 inline-flex min-h-10 items-center border border-sky-300/25 bg-sky-300/[.05] px-4 py-2 text-xs font-black text-sky-100">
        Pro Staff Verification · External Clients
      </Link>
    </div>
    <AdministrationControlTerminal />
  </>
}
