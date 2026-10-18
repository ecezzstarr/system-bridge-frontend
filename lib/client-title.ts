export type ClientGender = 'female' | 'male'
export function normalizeClientGender(value: unknown): ClientGender | null {
  if (typeof value !== 'string') return null
  const gender = value.trim().toLowerCase()
  return gender === 'female' || gender === 'male' ? gender : null
}
export function clientTitle(gender: unknown): 'Lady' | 'Lord' | 'Client' {
  const recorded = normalizeClientGender(gender)
  return recorded === 'female' ? 'Lady' : recorded === 'male' ? 'Lord' : 'Client'
}
