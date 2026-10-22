import Link from 'next/link'

// Legacy Continuance URL now explains the no-subscription Bridger position.
export default function BridgerFreePositionPage() {
  return <main className="mx-auto max-w-3xl px-5 py-10 text-white" data-bridger-no-continuance>
    <h1 className="text-3xl font-black">Bridger Participation · No Subscription</h1>
    <p className="mt-4 text-sm leading-6 text-slate-300">Bridgers no longer pay Continuance. Ordinary Bridger work is free. Bridge AI costs 8 Flame Coin each time you open a template. Echo is free. Agentic-Bridger is a permanent, one-time 20 Flame Coin purchase that opens Lifestyle and eligible employment positions.</p>
    <div className="mt-6 flex flex-wrap gap-3">
      <Link href="/bridger/dashboard" className="rounded-xl border border-white/20 px-4 py-3 text-sm">Return to Bridger</Link>
      <Link href="/weave/lifestyles" className="rounded-xl bg-emerald-300 px-4 py-3 text-sm font-bold text-slate-950">Open Lifestyle</Link>
      <Link href="/bridger/bridge-ai" className="rounded-xl border border-white/20 px-4 py-3 text-sm">Bridge AI Templates</Link>
    </div>
  </main>
}
