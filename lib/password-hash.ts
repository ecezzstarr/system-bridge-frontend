/**
 * Return an existing bcrypt credential in the form bcryptjs can verify.
 * A valid stored hash is not a reason to force password recovery.
 * Trim database padding/whitespace, but never alter the supplied password.
 */
export function usableBcryptPasswordHash(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const hash = value.trim()
  // $2a$, $2b$ and $2y$ bcrypt hashes have a 7-character header + 53 encoded characters.
  return /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(hash) ? hash : null
}
