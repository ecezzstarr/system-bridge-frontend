export const MUSIC_ARTIST_ROLES = ['agent', 'bridger', 'client'] as const
export const ARTIST_TIME_ZONE = 'Africa/Lagos'
export const ARTIST_DUTY = 'Perform live music at the times agreed with WEAVE Administration through the shared DJ broadcast.'

export class ArtistError extends Error {
  constructor(message: string, public status = 400) { super(message) }
}

export function artistText(value: unknown, label: string, min: number, max: number) {
  if (typeof value !== 'string' || value.trim().length < min || value.trim().length > max) {
    throw new ArtistError(`${label} must contain ${min}–${max} characters.`)
  }
  return value.trim()
}

export function artistId(value: unknown) {
  if (typeof value !== 'string' || !/^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i.test(value)) {
    throw new ArtistError('A valid artist or performance ID is required.')
  }
  return value
}

export function artistUrl(value: unknown, label = 'Audio listener URL') {
  const text = artistText(value, label, 1, 2048)
  let url: URL
  try { url = new URL(text) } catch { throw new ArtistError(`${label} must be an HTTPS URL.`) }
  // Listener URLs are sent to the audience, never fetched by the server. Reject
  // credentials and local/IP destinations so they cannot target listener devices.
  const host = url.hostname.toLowerCase()
  if (url.protocol !== 'https:' || url.username || url.password || url.port ||
      !host.includes('.') || /[\[\]:]/.test(host) || /^[\d.]+$/.test(host) ||
      /(?:^|\.)(localhost|local|internal|test|invalid|example)$/.test(host)) {
    throw new ArtistError(`${label} must use a public HTTPS host without credentials or a custom port.`)
  }
  return url.href
}

export function artistTimeZone(value: unknown) {
  const zone = artistText(value, 'Time zone', 1, 80)
  try { new Intl.DateTimeFormat('en-GB', { timeZone: zone }).format() }
  catch { throw new ArtistError('Choose a valid time zone, for example Africa/Lagos.') }
  return zone
}

function localParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(date)
  const get = (key: string) => Number(parts.find(part => part.type === key)?.value)
  return Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'))
}

export function localArtistTime(value: string, timeZone: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) throw new ArtistError('Choose a date and start time.')
  const plain = new Date(`${value}:00Z`)
  if (!Number.isFinite(plain.getTime()) || plain.toISOString().slice(0, 16) !== value) throw new ArtistError('Invalid performance date or time.')
  const target = plain.getTime()
  const offsets = new Set([-36, 0, 36].map(hours => {
    const probe = new Date(target + hours * 3600000)
    return localParts(probe, timeZone) - probe.getTime()
  }))
  const candidates = [...offsets].map(offset => new Date(target - offset))
    .filter(date => localParts(date, timeZone) === target)
  if (candidates.length !== 1) throw new ArtistError('This local time changes with daylight saving. Choose another start time.')
  return candidates[0]
}

export function dailyArtistSlots(input: { startLocal: unknown; timeZone: unknown; durationMinutes: unknown; days: unknown }, now = Date.now()) {
  const startLocal = artistText(input.startLocal, 'Start time', 16, 16)
  const timeZone = artistTimeZone(input.timeZone)
  const duration = Number(input.durationMinutes)
  const days = Number(input.days)
  if (!Number.isInteger(duration) || duration < 1 || duration > 360) throw new ArtistError('Performance length must be 1–360 minutes.')
  if (!Number.isInteger(days) || days < 1 || days > 31) throw new ArtistError('Schedule between 1 and 31 daily performances at a time.')
  localArtistTime(startLocal, timeZone)
  const localDate = new Date(`${startLocal}:00Z`)
  return Array.from({ length: days }, (_, index) => {
    const day = new Date(localDate)
    day.setUTCDate(day.getUTCDate() + index)
    const startsAt = localArtistTime(day.toISOString().slice(0, 16), timeZone)
    if (startsAt.getTime() <= now) throw new ArtistError('Performance slots must start in the future.')
    return { startsAt: startsAt.toISOString(), endsAt: new Date(startsAt.getTime() + duration * 60000).toISOString(), timeZone }
  })
}

export function canStartArtistSlot(slot: { status: string; starts_at: string | Date; ends_at: string | Date }, now = Date.now()) {
  return slot.status === 'scheduled' && new Date(slot.starts_at).getTime() <= now && now < new Date(slot.ends_at).getTime()
}

export type MusicArtistProfile = {
  user_id: string; source_role: string; stage_name: string; experience: 'upcoming' | 'established'
  genre: string; sample_url: string | null; availability: string; time_zone: string; introduction: string
  status: 'pending' | 'offered' | 'active' | 'rejected' | 'ended'
  offer_terms: string | null; offer_version: string | null; review_note: string | null
  accepted_name: string | null; accepted_at: string | null; created_at: string; name?: string
}

export type ArtistPerformance = {
  id: string; artist_id: string; stage_name: string; title: string; starts_at: string; ends_at: string
  time_zone: string; status: 'scheduled' | 'live' | 'completed' | 'cancelled' | 'missed'
  stream_url?: string | null; started_at: string | null; ended_at: string | null
}
