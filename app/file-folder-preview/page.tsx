'use client'

import Link from 'next/link'
import { ArrowLeft, ArrowRight, Building2, DoorOpen, Hammer, Layers3, PackageOpen, Store, Users, Workflow } from 'lucide-react'

const tiers = [
  {
    id: 'standard',
    name: 'Standard',
    subtitle: 'Living business valley',
    tone: 'standard',
    image: '/weave/file-folder/assets/customer-door.svg',
    imageAlt: 'Customer Door system illustration for the Standard File Folder',
    description: 'A landscape for forming a real business from its first operating structure.',
    systems: [
      ['Customer Door', 'Public entrance, published offers and customer requests.'],
      ['Food Business', 'Product offers connected to fulfilment and real orders.'],
      ['Farm to Customer', 'Agriculture, marketplace and delivery pathways.'],
      ['Boutique Brand', 'Retail identity, products and storefront systems.'],
      ['Creative Studio', 'Media, animation and production workflows.'],
      ['App & Platform', 'Software projects and platform services.'],
      ['Build Yard', 'Construction states tied to recorded Client builds.'],
    ],
    action: 'Purchase Standard',
  },
  {
    id: 'pro',
    name: 'Pro',
    subtitle: 'Business operations',
    tone: 'pro',
    image: '/weave/file-folder/assets/operations-module.svg',
    imageAlt: 'Operations module illustration for the Pro File Folder',
    description: 'A negotiated company pathway for organizing a business and its day-to-day operating work.',
    systems: [
      ['Customer Door', 'Bring the Client’s published business into one public entrance.'],
      ['Products & Services', 'Keep the offer connected to the system that delivers it.'],
      ['Operations', 'Coordinate assigned people, work and requests.'],
      ['Orders & Records', 'Keep actual order and activity records with the Client.'],
      ['Bridge AI', 'Continue from the entry crossing into Client support.'],
    ],
    action: 'View Pro pathway',
  },
  {
    id: 'premium',
    name: 'Premium',
    subtitle: 'Black-and-gold citadel',
    tone: 'premium',
    image: '/weave/file-folder/assets/enterprise-expansion.svg',
    imageAlt: 'Enterprise expansion system illustration for the Premium File Folder',
    description: 'A dedicated operating world with six distinct zones connected to the Client’s real records.',
    systems: [
      ['Build Zone', 'Inspect blueprints and their acquisition requirements.'],
      ['Materials Depot', 'Acquire the exact kits required by a selected blueprint.'],
      ['Systems', 'View commissioned technologies and their recorded status.'],
      ['Live Operations', 'Enter completed systems and inspect actual output records.'],
      ['Participation', 'Organize the Client business, team and work.'],
      ['Customer Access', 'Open the public Customer Door only when commissioned.'],
    ],
    action: 'Purchase Premium',
  },
  {
    id: 'plus',
    name: 'Plus',
    subtitle: 'White-and-gold complete systems',
    tone: 'plus',
    image: '/weave/plus-file-folder-white-official.webp',
    imageAlt: 'Approved white-and-gold Plus File Folder reference image',
    description: 'The Plus environment uses its own approved white-and-gold design and six connected equipment zones.',
    systems: [
      ['Systems', 'Enter the Client’s commissioned operating systems.'],
      ['Modules', 'Connect installed capabilities to their parent systems.'],
      ['Tools', 'Use available tools and recorded capability modules.'],
      ['People', 'Connect assigned participation to actual Client work.'],
      ['Operations', 'Follow real operating records and completed systems.'],
      ['Expansion', 'Extend the environment through verified builds and systems.'],
    ],
    action: 'Purchase Plus',
  },
] as const

const iconByTier = {
  standard: DoorOpen,
  pro: Workflow,
  premium: Building2,
  plus: Layers3,
} as const

export default function FileFolderPreviewPage() {
  return (
    <main className="min-h-screen bg-[#080b10] px-3 py-5 text-white sm:px-5 sm:py-8" data-file-folder-tier-preview="four-types">
      <div className="mx-auto max-w-7xl">
        <nav className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Link href="/" className="inline-flex min-h-11 items-center gap-2 text-xs font-bold text-slate-400 hover:text-white">
            <ArrowLeft className="h-4 w-4" /> Return to WEAVE
          </Link>
          <Link href="/file-folder" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-4 py-2 text-xs font-black text-slate-950">
            Purchase a File Folder <ArrowRight className="h-4 w-4" />
          </Link>
        </nav>

        <header className="max-w-4xl">
          <p className="text-[10px] font-black uppercase tracking-[.24em] text-amber-200">The Weave of Presence · System Switch</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">Four File Folders. Four operating environments.</h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300">
            Each File Folder type has its own visual language, districts and operating systems. These previews describe the actual routes and capabilities in the codebase. A preview does not invent live businesses, customer orders, completed builds or earnings; those appear only when supported by the Client’s records.
          </p>
        </header>

        <section className="mt-8 grid gap-5 xl:grid-cols-2" aria-label="File Folder type previews">
          {tiers.map(tier => {
            const Icon = iconByTier[tier.id]
            const isPlus = tier.id === 'plus'
            return (
              <article key={tier.id} className={`overflow-hidden rounded-3xl border ${tier.tone === 'standard' ? 'border-emerald-200/20 bg-[#101b16]' : tier.tone === 'pro' ? 'border-sky-200/20 bg-[#0b1724]' : tier.tone === 'premium' ? 'border-amber-200/20 bg-[#17120e]' : 'border-yellow-100/35 bg-[#f7f4ec] text-[#28251f]'}`} data-file-folder-tier={tier.id}>
                <div className="grid sm:grid-cols-[.88fr_1.12fr]">
                  <div className={`relative flex min-h-64 items-center justify-center overflow-hidden p-5 ${tier.tone === 'standard' ? 'bg-gradient-to-br from-sky-200 via-emerald-800 to-[#12291e]' : tier.tone === 'pro' ? 'bg-gradient-to-br from-sky-100 via-blue-900 to-[#07111d]' : tier.tone === 'premium' ? 'bg-gradient-to-br from-[#5a4128] via-[#151218] to-black' : 'bg-gradient-to-br from-white via-[#eee6d5] to-[#c6a96e]'}`}>
                    {isPlus ? (
                      <img src={tier.image} alt={tier.imageAlt} className="max-h-[340px] w-full object-contain" loading="lazy" />
                    ) : (
                      <div className="relative flex h-52 w-full max-w-xs items-center justify-center rounded-2xl border border-white/20 bg-black/10 p-7 shadow-2xl backdrop-blur-sm">
                        <div aria-hidden="true" className={`absolute inset-x-8 bottom-7 h-14 rounded-[50%] blur-xl ${tier.tone === 'standard' ? 'bg-emerald-200/30' : tier.tone === 'pro' ? 'bg-sky-200/30' : 'bg-amber-200/25'}`} />
                        <img src={tier.image} alt={tier.imageAlt} className="relative z-10 max-h-36 w-full object-contain drop-shadow-2xl" />
                        <p className="absolute bottom-3 left-0 right-0 text-center text-[9px] font-black uppercase tracking-[.18em] text-white/75">{tier.subtitle}</p>
                      </div>
                    )}
                    <span className={`absolute left-4 top-4 rounded-full border px-3 py-1 text-[9px] font-black uppercase tracking-[.16em] ${isPlus ? 'border-[#9b7a3c]/30 bg-white/75 text-[#6a5127]' : 'border-white/25 bg-black/25 text-white'}`}> {tier.name} File Folder </span>
                  </div>
                  <div className="p-5 sm:p-6">
                    <div className="flex items-center gap-3">
                      <span className={`flex h-11 w-11 items-center justify-center rounded-xl border ${isPlus ? 'border-[#a9894e]/30 bg-white text-[#87652b]' : 'border-white/10 bg-white/[.04] text-amber-200'}`}><Icon className="h-5 w-5" /></span>
                      <div>
                        <h2 className="text-2xl font-black">{tier.name}</h2>
                        <p className={`mt-1 text-xs ${isPlus ? 'text-stone-600' : 'text-slate-400'}`}>{tier.subtitle}</p>
                      </div>
                    </div>
                    <p className={`mt-4 text-sm leading-6 ${isPlus ? 'text-stone-700' : 'text-slate-300'}`}>{tier.description}</p>
                    <div className="mt-5">
                      <h3 className={`text-[9px] font-black uppercase tracking-[.18em] ${isPlus ? 'text-stone-500' : 'text-slate-500'}`}>Systems in this environment</h3>
                      <ul className="mt-3 space-y-3">
                        {tier.systems.map(([name, detail]) => (
                          <li key={name} className="flex gap-3">
                            <span className={`mt-0.5 ${isPlus ? 'text-[#96733b]' : 'text-amber-200'}`}><PackageOpen className="h-4 w-4" /></span>
                            <div><p className="text-xs font-bold">{name}</p><p className={`mt-1 text-[10px] leading-5 ${isPlus ? 'text-stone-600' : 'text-slate-400'}`}>{detail}</p></div>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="mt-6 flex flex-wrap gap-2 border-t border-current/10 pt-4">
                      {tier.id === 'pro' ? (
                        <Link href="/file-folder" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-current/20 px-4 py-2 text-xs font-black"> {tier.action} <ArrowRight className="h-4 w-4" /></Link>
                      ) : (
                        <Link href={`/file-folder?tier=${tier.id}`} className={`inline-flex min-h-11 items-center gap-2 rounded-xl px-4 py-2 text-xs font-black ${isPlus ? 'bg-[#2f3b35] text-white' : 'bg-white text-slate-950'}`}>{tier.action} <ArrowRight className="h-4 w-4" /></Link>
                      )}
                      <Link href="/client/login" className={`inline-flex min-h-11 items-center gap-2 rounded-xl border border-current/20 px-4 py-2 text-xs font-bold`}>
                        Enter live systems <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                </div>
              </article>
            )
          })}
        </section>

        <section className="mt-8 grid gap-3 rounded-2xl border border-white/10 bg-white/[.025] p-5 sm:grid-cols-3">
          <div className="flex gap-3"><Hammer className="h-5 w-5 shrink-0 text-amber-200" /><div><h2 className="text-sm font-bold">Builds follow records</h2><p className="mt-1 text-xs leading-5 text-slate-400">Construction progress comes from saved build records and timestamps.</p></div></div>
          <div className="flex gap-3"><Store className="h-5 w-5 shrink-0 text-amber-200" /><div><h2 className="text-sm font-bold">Systems remain connected</h2><p className="mt-1 text-xs leading-5 text-slate-400">Districts open the matching existing workshop or operating system.</p></div></div>
          <div className="flex gap-3"><Users className="h-5 w-5 shrink-0 text-amber-200" /><div><h2 className="text-sm font-bold">People create the movement</h2><p className="mt-1 text-xs leading-5 text-slate-400">A visual preview is not a substitute for real participation or live business records.</p></div></div>
        </section>
      </div>
    </main>
  )
}
