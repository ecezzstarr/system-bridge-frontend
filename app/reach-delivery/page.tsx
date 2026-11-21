import Link from 'next/link'
import { PublicReachRequestForm } from '@/components/reach-delivery/public-request-form'
import { ReachRequestTracker } from '@/components/reach-delivery/request-tracker'

export default function PublicReachDelivery() {
  return <main className="mx-auto max-w-5xl space-y-6 px-4 py-6">
    <Link href="/">Company Grounds</Link>
    <h1 className="font-serif text-3xl">Reach and Delivery</h1>
    <PublicReachRequestForm />
    <ReachRequestTracker />
  </main>
}
