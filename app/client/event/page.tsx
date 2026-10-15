import { redirect } from 'next/navigation'
import PositionEventWorld from '@/components/events/position-event-world'

// Source compatibility only. The legacy Client event URL never renders this
// function because the route always returns through Client System Switch first.
function LegacyClientEventRenderer() {
  return <PositionEventWorld role="client" context={[]} />
}
void LegacyClientEventRenderer

export default function LegacyClientFlameEventRoute() {
  redirect('/client/system-switch')
}
