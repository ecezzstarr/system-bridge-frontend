'use client'

export function FlameEventRiverField() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_12%,rgba(14,165,233,0.16),transparent_34%),radial-gradient(circle_at_18%_56%,rgba(37,99,235,0.11),transparent_30%),radial-gradient(circle_at_82%_64%,rgba(239,68,68,0.10),transparent_30%)]" />

      <div className="absolute -left-[18%] top-[18%] h-7 w-[92%] rotate-[12deg] rounded-full bg-gradient-to-r from-transparent via-sky-400/20 to-blue-300/5 blur-xl animate-pulse" />
      <div className="absolute -left-[12%] top-[19%] h-px w-[88%] rotate-[12deg] bg-gradient-to-r from-transparent via-sky-200/55 to-transparent" />

      <div className="absolute -right-[20%] top-[31%] h-8 w-[96%] -rotate-[10deg] rounded-full bg-gradient-to-l from-transparent via-red-400/18 to-sky-400/7 blur-xl animate-pulse" />
      <div className="absolute -right-[14%] top-[32%] h-px w-[92%] -rotate-[10deg] bg-gradient-to-l from-transparent via-red-200/45 to-transparent" />

      <div className="absolute -left-[15%] top-[55%] h-10 w-[108%] -rotate-[4deg] rounded-full bg-gradient-to-r from-transparent via-sky-500/18 via-55% to-red-400/10 blur-2xl animate-pulse" />
      <div className="absolute -left-[8%] top-[57%] h-px w-[101%] -rotate-[4deg] bg-gradient-to-r from-transparent via-sky-200/45 via-60% to-red-200/25" />

      <div className="absolute -right-[22%] top-[72%] h-9 w-[105%] rotate-[8deg] rounded-full bg-gradient-to-l from-transparent via-blue-400/16 to-red-400/8 blur-2xl animate-pulse" />
      <div className="absolute -right-[14%] top-[73%] h-px w-[98%] rotate-[8deg] bg-gradient-to-l from-transparent via-blue-200/40 to-transparent" />

      <div className="absolute bottom-[-20%] left-1/2 h-[52%] w-[56%] -translate-x-1/2 rounded-[50%] border border-sky-300/10 bg-sky-400/[0.025] blur-sm" />
      <div className="absolute bottom-[-24%] left-1/2 h-[58%] w-[68%] -translate-x-1/2 rounded-[50%] border border-red-300/8" />
    </div>
  )
}
