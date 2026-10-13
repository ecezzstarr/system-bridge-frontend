import Link from 'next/link'
import { ArrowRight, CheckCircle2, Download, ExternalLink, ShieldCheck, Smartphone } from 'lucide-react'
import { WeaveInstallButton } from '@/components/system-store/weave-install-button'
import { WeaveLogo } from '@/components/weave-logo'

const steps = [
  {
    title: 'Install WEAVE',
    copy: 'Tap the install control below. On supported Android and desktop browsers, WEAVE will open the native installation prompt.',
  },
  {
    title: 'Open from your device',
    copy: 'After installation, launch WEAVE from your home screen or app launcher just like your other apps.',
  },
  {
    title: 'Sign in and work',
    copy: 'Sign in with your WEAVE account. Agents, Bridgers, Clients and Administration continue into their existing role environment.',
  },
]

export default function DownloadWeavePage() {
  return (
    <main className="min-h-screen bg-[#020814] px-3 py-5 text-white sm:px-5 sm:py-8" data-weave-download-page>
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center justify-between gap-3">
          <Link href="/" aria-label="Return to WEAVE home"><WeaveLogo size="sm" /></Link>
          <Link href="/login" className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[.03] px-3 py-2 text-[9px] font-black uppercase tracking-[.12em] text-slate-300 hover:text-white">
            Sign In <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <section className="relative mt-5 overflow-hidden rounded-[2rem] border border-cyan-200/15 bg-[#04111f]/90 p-5 shadow-[0_30px_100px_rgba(0,0,0,.45)] sm:p-8">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_0%,rgba(34,211,238,.12),transparent_35%),radial-gradient(circle_at_90%_30%,rgba(59,130,246,.08),transparent_30%)]" />
          <div className="relative">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-200/20 bg-cyan-300 text-slate-950">
              <Download className="h-6 w-6" />
            </div>
            <p className="mt-5 text-[9px] font-black uppercase tracking-[.2em] text-cyan-200">Official WEAVE Application</p>
            <h1 className="mt-2 max-w-3xl text-3xl font-black tracking-tight sm:text-5xl">Download WEAVE and begin work from your device.</h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
              This is the official installable WEAVE web application. It uses the live WEAVE release, so users continue receiving the current system without downloading a new APK after every deployment.
            </p>

            <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4 sm:p-5" data-weave-install-control>
              <WeaveInstallButton />
              <p className="mt-3 max-w-2xl text-xs leading-5 text-slate-400">
                If your browser does not show an install prompt, open the browser menu and choose <strong className="text-slate-200">Install app</strong> or <strong className="text-slate-200">Add to Home screen</strong>.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-4 grid gap-3 sm:grid-cols-3" aria-label="WEAVE installation steps">
          {steps.map((step, index) => (
            <article key={step.title} className="rounded-2xl border border-white/10 bg-white/[.025] p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[9px] font-black uppercase tracking-[.16em] text-cyan-200">Step {index + 1}</span>
                <CheckCircle2 className="h-4 w-4 text-emerald-300" />
              </div>
              <h2 className="mt-3 text-sm font-black text-white">{step.title}</h2>
              <p className="mt-2 text-xs leading-5 text-slate-400">{step.copy}</p>
            </article>
          ))}
        </section>

        <section className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
            <div className="flex items-center gap-2 text-cyan-200"><Smartphone className="h-4 w-4" /><h2 className="text-sm font-black">Android / Chrome</h2></div>
            <p className="mt-2 text-xs leading-5 text-slate-400">Tap <strong className="text-slate-200">Install WEAVE</strong>. If the prompt is unavailable, use the browser menu and choose Install app or Add to Home screen.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
            <div className="flex items-center gap-2 text-cyan-200"><ExternalLink className="h-4 w-4" /><h2 className="text-sm font-black">iPhone / iPad</h2></div>
            <p className="mt-2 text-xs leading-5 text-slate-400">Open WEAVE in Safari, tap <strong className="text-slate-200">Share</strong>, then choose <strong className="text-slate-200">Add to Home Screen</strong>.</p>
          </div>
        </section>

        <section className="mt-4 rounded-2xl border border-emerald-200/15 bg-emerald-300/[.035] p-5">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
            <div>
              <h2 className="text-sm font-black text-white">Use the official WEAVE installation only.</h2>
              <p className="mt-1 text-xs leading-5 text-slate-400">The official app is served from the WEAVE system itself. Users should not install unofficial APK files or third-party copies presented as WEAVE.</p>
            </div>
          </div>
        </section>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <Link href="/register" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-5 text-xs font-black text-slate-950 hover:bg-slate-100">
            Create WEAVE Account <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/login" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[.03] px-5 text-xs font-black text-white hover:bg-white/[.06]">
            Sign In and Start Work
          </Link>
        </div>
      </div>
    </main>
  )
}
