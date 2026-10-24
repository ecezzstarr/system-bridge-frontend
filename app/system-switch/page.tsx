'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft, ArrowRight, FolderOpen, Waves } from 'lucide-react'
import { useAuth } from '@/lib/auth-provider'
import { AdaptiveCanvas } from '@/components/world/adaptive-canvas'
import { RiverSurface } from '@/components/events/flame-event-mobile-scene'
import { SystemSwitchThreshold } from '@/components/world/system-switch-threshold'

/**
 * One staff crossing: Flame Event -> Burning River System Switch Gate
 * -> public File Folder open world -> an opened Client Customer Door.
 * Staff never mount a Client's private File Folder workshop.
 */
export default function SystemSwitchEntryPage() {
  const { user, isInitialized, isLoading } = useAuth()
  const [webgl, setWebgl] = useState(false)

  useEffect(() => {
    try {
      const canvas = document.createElement('canvas')
      setWebgl(Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl')))
    } catch {
      setWebgl(false)
    }
  }, [])

  if (!isInitialized || isLoading) return null
  if (!user || !user.role) redirect('/login')
  if (user.role === 'client') redirect('/client/system-switch')
  if (!['admin', 'agent', 'bridger'].includes(user.role)) redirect('/login')

  const role = user.role as 'admin' | 'agent' | 'bridger'
  const backHref = '/event'
  const position = role === 'admin' ? 'Administration' : role === 'agent' ? 'Agent · Stability' : 'Bridger · Hope'

  return (
    <main
      className="relative isolate min-h-[88svh] overflow-hidden bg-[#04101f] text-white"
      data-system-switch-gate="burning-river"
      data-weave-world="system-switch-gate"
      data-system-switch-role={role}
      data-system-switch-threshold="staff-to-file-folder-open-world"
      data-system-switch-crossed="false"
    >
      <div className="relative h-[88svh] min-h-[560px] w-full overflow-hidden" data-system-switch-living-river="water-fire-bridge">
        <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_65%,#245f76,#082b44_50%,#04101f)]" />
        {webgl && (
          <div className="absolute inset-0" data-system-switch-gate-world="live-3d">
            <AdaptiveCanvas camera={{ position: [0, 7.5, 15], fov: 47, near: 0.1, far: 250 }} gl={{ antialias: false, powerPreference: 'low-power' }} mobileGame>
              <fog attach="fog" args={['#061b30', 34, 110]} />
              <ambientLight intensity={1.3} />
              <hemisphereLight args={['#b6e6fc', '#a34c24', 1.6]} />
              <directionalLight position={[8, 18, 10]} intensity={2.2} color="#ffe5b6" />
              <RiverSurface quiet={false} />
              <SystemSwitchThreshold active scale={1.2} />
            </AdaptiveCanvas>
          </div>
        )}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#031020]/80 via-transparent via-45% to-[#031020]/95" />
        <div className="absolute inset-x-0 top-0 z-10 px-4 pb-6 pt-5 sm:px-8">
          <Link href={backHref} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-sky-200/25 bg-[#071d30]/80 px-4 text-xs font-bold text-sky-100">
            <ArrowLeft className="h-4 w-4" /> Return to Burning River Event
          </Link>
          <Link href="/system-switch/bridge-radiance/flame-coin" className="ml-2 inline-flex min-h-11 items-center rounded-full border border-amber-200/25 bg-[#071d30]/80 px-4 text-xs font-bold text-amber-100">Flame Coin</Link>
        </div>
        <div className="absolute inset-x-0 bottom-0 z-10 mx-auto flex max-w-2xl flex-col items-center px-4 pb-[max(2rem,env(safe-area-inset-bottom))] text-center sm:pb-12">
          <p className="text-[10px] font-black uppercase tracking-[.25em] text-amber-200">The Company of Time · Burning River</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">System Switch Gate</h1>
          <p className="mt-3 max-w-lg text-xs leading-5 text-sky-100/85 sm:text-sm">
            {position} · Cross the river of water and fire to enter the shared open world of Client File Folders. Open a commissioned Customer Door to visit the Client's public systems.
          </p>
          <Link
            href="/system-switch/world?via=system-switch"
            data-system-switch-crossing="open-file-folder-world"
            className="mt-6 inline-flex min-h-14 w-full max-w-md items-center justify-center gap-3 rounded-xl border border-amber-100 bg-amber-200 px-5 py-3 text-sm font-black text-[#0a2033] shadow-[0_8px_35px_rgba(253,197,99,.24)]"
          >
            <FolderOpen className="h-5 w-5" /> Enter Weave Open World <ArrowRight className="h-5 w-5" />
          </Link>
          <p className="mt-3 flex items-center gap-2 text-[11px] text-sky-100/65">
            <Waves className="h-4 w-4 text-sky-300" /> Public Client worlds only · Private Client builds stay protected
          </p>
        </div>
      </div>
    </main>
  )
}
