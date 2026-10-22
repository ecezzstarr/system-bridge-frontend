import Link from 'next/link'
import { WEAVE_LIFESTYLE_CATALOG } from '@/lib/weave-lifestyle-catalog'

export const metadata = { title: 'Lifestyle · WEAVE', description: 'Explore the ways to work and participate in WEAVE.' }

export default function PublicLifestylePage() {
  return <main className="min-h-dvh bg-[#061322] px-4 py-6 text-white" data-public-lifestyle-catalog>
    <div className="mx-auto max-w-5xl">
      <nav className="flex flex-wrap items-center justify-between gap-3 text-xs font-bold text-amber-100"><Link href="/">← Open WEAVE</Link><Link href="/flame-event">Burning River →</Link></nav>
      <header className="py-8">
        <p className="text-xs font-black uppercase tracking-widest text-amber-200">Open WEAVE · Ways to participate</p>
        <h1 className="mt-3 text-4xl font-black">Lifestyle</h1>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-300">Explore Lifestyle here, then enter through your existing WEAVE position. Agents receive Lifestyle with their active Agent position. Bridgers have no monthly subscription. A permanent 11 Flame Coin Agentic-Bridger purchase opens eligible Lifestyle jobs; Client access follows Client subscription and eligibility. Employment and departmental work require the relevant approval.</p>
        <div className="mt-5 flex flex-wrap gap-3"><Link href="/weave/lifestyles" className="rounded-lg bg-amber-200 px-4 py-3 text-sm font-black text-slate-950">Open my Lifestyle</Link><Link href="/register" className="rounded-lg border border-white/20 px-4 py-3 text-sm font-bold">Join WEAVE</Link><Link href="/client/login" className="px-4 py-3 text-sm font-bold text-sky-100">Client entrance →</Link></div>
      </header>
      <section className="grid gap-4 sm:grid-cols-2" aria-label="WEAVE Lifestyles">
        {Object.values(WEAVE_LIFESTYLE_CATALOG).map(lifestyle=><article key={lifestyle.key} className="rounded-xl border border-amber-200/20 bg-white/[.04] p-5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-amber-200">{lifestyle.roles.join(' · ')}</p>
          <h2 className="mt-2 text-xl font-black">{lifestyle.label}</h2>
          <p className="mt-3 text-sm leading-6 text-slate-300">{lifestyle.summary}</p>
          <Link href={lifestyle.route} className="mt-4 inline-flex min-h-10 items-center text-sm font-bold text-amber-100">Enter through my position →</Link>
        </article>)}
        <article className="rounded-xl border border-amber-200/20 bg-white/[.04] p-5"><p className="text-[10px] font-bold uppercase tracking-wider text-amber-200">Client enterprise employment</p><h2 className="mt-2 text-xl font-black">Legion</h2><p className="mt-3 text-sm leading-6 text-slate-300">Agents and eligible Bridgers can apply to a Client enterprise or accept its invitation. Accepted Legion employment carries exclusive work for that Client until the employment ends.</p><Link href="/weave/lifestyles/legion" className="mt-4 inline-flex min-h-10 items-center text-sm font-bold text-amber-100">Open Legion through my position →</Link></article>
      </section>
    </div>
  </main>
}
