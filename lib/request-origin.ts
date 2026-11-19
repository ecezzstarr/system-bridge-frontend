import { WEAVE_PUBLIC_ORIGIN } from '@/lib/weave-origin'
import { WEAVE_DOMAIN_ROLES } from '@/lib/weave-domains'

/** Cookie-authenticated mutations must come from a configured company origin. */
export function trustedMutationOrigin(request: { method: string; url: string; headers: Headers }) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method.toUpperCase())) return true
  const origin = request.headers.get('origin')
  if (!origin) return request.headers.get('sec-fetch-site') !== 'cross-site'
  const allowed = [...Object.keys(WEAVE_DOMAIN_ROLES).flatMap(host => ['https://' + host, 'https://www.' + host]), WEAVE_PUBLIC_ORIGIN, process.env.WEAVE_PUBLIC_ORIGIN, process.env.NEXT_PUBLIC_APP_URL, process.env.APP_URL]
  if (process.env.NODE_ENV !== 'production') allowed.push(new URL(request.url).origin)
  return allowed.some(value => {
    try { return Boolean(value) && new URL(value!).origin === origin } catch { return false }
  })
}
