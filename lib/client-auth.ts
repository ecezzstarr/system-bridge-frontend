// Client features share the live application's session.
export function getClientToken(): string | null {
  try { return localStorage.getItem('ssb_auth_token') } catch { return null }
}
export function getClientUser(): any {
  try { return JSON.parse(localStorage.getItem('ssb_auth_user') || 'null') } catch { return null }
}
export function isClientAuthenticated() { return Boolean(getClientToken() && getClientUser()) }
