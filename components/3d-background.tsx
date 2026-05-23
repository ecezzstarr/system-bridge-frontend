'use client'

import { Suspense } from 'react'
import dynamic from 'next/dynamic'

const ThreeScene = dynamic(() => import('@/components/three-scene'), { ssr: false })

export function Background3D() {
  return (
    <div className="fixed inset-0 -z-10">
      <Suspense fallback={<div className="w-full h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />}>
        <ThreeScene />
      </Suspense>
    </div>
  )
}
