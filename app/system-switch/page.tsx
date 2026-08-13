'use client'

import dynamic from 'next/dynamic'

const SystemSwitchWorld = dynamic(() => import('@/components/system-switch/system-switch-world'), { ssr: false })

export default function SystemSwitchPage() {
  return (
    <main className="min-h-screen bg-black p-3 md:p-6">
      <SystemSwitchWorld />
    </main>
  )
}
