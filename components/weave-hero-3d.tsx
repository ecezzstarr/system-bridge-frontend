'use client'

import { AdaptiveCanvas } from '@/components/world/adaptive-canvas'
import { FlameEventArtifact3D } from '@/components/events/flame-event-artifact'

export function WeaveHero3D() {
  return (
    <div className="h-full w-full" data-weave-hero-artifact="flame-event-4d">
      <AdaptiveCanvas camera={{position:[0,0.15,4.8],fov:44}}>
        <ambientLight intensity={0.46}/>
        <pointLight position={[4,4,4]} intensity={22} color="#ffffff"/>
        <pointLight position={[-4,-2,3]} intensity={16} color="#cbd5e1"/>
        <pointLight position={[0,5,-2]} intensity={36} color="#ffffff"/>
        <FlameEventArtifact3D variant="hero" progress={4} active surface="weave-hero"/>
      </AdaptiveCanvas>
    </div>
  )
}
