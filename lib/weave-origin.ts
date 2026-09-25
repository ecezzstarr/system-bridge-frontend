export const WEAVE_PUBLIC_DOMAIN = 'weavingsystem.online'
export const WEAVE_PUBLIC_ORIGIN = `https://${WEAVE_PUBLIC_DOMAIN}`

function cleanOrigin(value: string) {
  return value.replace(/\/+$/, '')
}

export function getWeavePublicOrigin() {
  return cleanOrigin(
    process.env.WEAVE_PUBLIC_ORIGIN ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    WEAVE_PUBLIC_ORIGIN
  )
}

export function getWeaveBridgeOrigin() {
  return cleanOrigin(process.env.NEXT_PUBLIC_BRIDGE_URL || getWeavePublicOrigin())
}
