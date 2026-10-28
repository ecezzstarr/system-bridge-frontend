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
    </div>
    <AdministrationControlTerminal />
  </>
}
