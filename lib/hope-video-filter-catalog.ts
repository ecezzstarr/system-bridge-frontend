/**
 * Original camera picture is available without payment.
 * Each visual treatment is a separately purchased, permanent Hope license.
 * Prices are server-owned; never trust a price submitted from a browser.
 * CSS filters are reproduced on an outgoing WebRTC canvas track.
 */
export const HOPE_VIDEO_FILTERS = [
  { id:'radiance-warm', name:'Radiance Warm', detail:'Soft golden light and warmer skin tones.', priceSystemSwitch:2, css:'brightness(1.08) contrast(1.04) saturate(1.22) sepia(0.11)' },
  { id:'studio-light', name:'Studio Light', detail:'Bright, crisp look for business conversations.', priceSystemSwitch:2, css:'brightness(1.16) contrast(1.09) saturate(1.07)' },
  { id:'cinema-noir', name:'Cinema Noir', detail:'Classic black-and-white contrast.', priceSystemSwitch:2, css:'grayscale(1) contrast(1.33) brightness(1.05)' },
  { id:'ocean-cool', name:'Ocean Cool', detail:'Clean cool-blue tint for your video.', priceSystemSwitch:3, css:'brightness(1.05) contrast(1.08) saturate(1.25) hue-rotate(14deg)' },
  { id:'dream-violet', name:'Dream Violet', detail:'A rich violet-toned cinematic finish.', priceSystemSwitch:3, css:'brightness(1.08) contrast(1.05) saturate(1.36) hue-rotate(35deg)' },
  { id:'soft-portrait', name:'Soft Portrait', detail:'A gentle overall soft-focus image (not background segmentation).', priceSystemSwitch:3, css:'blur(0.55px) brightness(1.1) contrast(0.95) saturate(1.12)' },
] as const
export type HopeVideoFilterId = typeof HOPE_VIDEO_FILTERS[number]['id']
export type HopeVideoFilter = typeof HOPE_VIDEO_FILTERS[number]

export function findHopeVideoFilter(value: unknown):HopeVideoFilter | undefined {
  return HOPE_VIDEO_FILTERS.find(filter=>filter.id===value)
}
