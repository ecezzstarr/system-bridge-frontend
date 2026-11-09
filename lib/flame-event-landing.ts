import { FLAME_EVENT, resolveEventStatus } from '@/lib/weave-event'
import { fetchWithTimeout } from '@/lib/fetch-with-timeout'

/** Read the Administration-controlled event before choosing a login destination. */
export async function isFlameEventActive(): Promise<boolean> {
  try {
    // A slow event service must not leave a successful login waiting indefinitely.
    const response = await fetchWithTimeout('/api/events/flame', { cache: 'no-store' }, 5000)
    if (!response.ok) throw new Error('Event state unavailable')
    const data = await response.json()
    const event = data?.success && data.event ? data.event : FLAME_EVENT
    return (event.effectiveStatus || resolveEventStatus(event, new Date())) === 'active'
  } catch {
    return resolveEventStatus(FLAME_EVENT, new Date()) === 'active'
  }
}
