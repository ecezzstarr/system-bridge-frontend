import { FLAME_EVENT, resolveEventStatus } from '@/lib/weave-event'

/** Read the Administration-controlled event before choosing a login destination. */
export async function isFlameEventActive(): Promise<boolean> {
  try {
    const response = await fetch('/api/events/flame', { cache: 'no-store' })
    if (!response.ok) throw new Error('Event state unavailable')
    const data = await response.json()
    const event = data?.success && data.event ? data.event : FLAME_EVENT
    return (event.effectiveStatus || resolveEventStatus(event, new Date())) === 'active'
  } catch {
    return resolveEventStatus(FLAME_EVENT, new Date()) === 'active'
  }
}
