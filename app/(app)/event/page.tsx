import { redirect } from 'next/navigation'
import PositionEventWorld from '@/components/events/position-event-world'
import type { EventRole } from '@/lib/weave-event'

// Kept only so source-level compatibility checks still know the same shared
// event renderer exists. This function is never the route entry: /event always
// redirects through System Switch before Flame Event can render.
function LegacyEventRenderer({ role }: { role: EventRole }) {
  return <PositionEventWorld role={role} context={[]} />
}
void LegacyEventRenderer

export default function LegacyFlameEventRoute() {
  redirect('/system-switch')
}
