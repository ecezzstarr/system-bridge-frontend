export const HOPE_OUTREACH_CHANNELS = {
  tiktok: { name: 'TikTok', hosts: ['tiktok.com'], guide: 'Show a business example and reply where the conversation is relevant.' },
  facebook: { name: 'Facebook', hosts: ['facebook.com', 'fb.com'], guide: 'Answer questions in local and trade groups that allow business participation.' },
  instagram: { name: 'Instagram', hosts: ['instagram.com'], guide: 'Use Reels and Stories to demonstrate what Weave can do for a business.' },
  x: { name: 'X', hosts: ['x.com', 'twitter.com'], guide: 'Join relevant public conversations and Spaces.' },
  youtube: { name: 'YouTube', hosts: ['youtube.com', 'youtu.be'], guide: 'Publish walkthroughs and answer questions on your videos.' },
  linkedin: { name: 'LinkedIn', hosts: ['linkedin.com'], guide: 'Meet founders and operators through industry discussions.' },
  snapchat: { name: 'Snapchat', hosts: ['snapchat.com'], guide: 'Show short business examples in public Stories or Spotlight.' },
  telegram: { name: 'Telegram', hosts: ['t.me', 'telegram.me'], guide: 'Take part in discussions where group rules allow it.' },
  discord: { name: 'Discord', hosts: ['discord.com'], guide: 'Join relevant server conversations and community events.' },
  reddit: { name: 'Reddit', hosts: ['reddit.com', 'redd.it'], guide: 'Answer questions and share resources where subreddit rules allow.' },
  nairaland: { name: 'Nairaland', hosts: ['nairaland.com'], guide: 'Join relevant Nigerian business and trade discussions.' },
  pinterest: { name: 'Pinterest', hosts: ['pinterest.com', 'pin.it'], guide: 'Share examples that give interested visitors a route into Weave.' },
  twitch: { name: 'Twitch', hosts: ['twitch.tv'], guide: 'Answer questions during live demonstrations.' },
  threads: { name: 'Threads', hosts: ['threads.com', 'threads.net'], guide: 'Join public topic conversations around your assigned audience.' },
  bluesky: { name: 'Bluesky', hosts: ['bsky.app'], guide: 'Use focused feeds to find conversations where you can contribute.' },
  divine: { name: 'Divine', hosts: ['divine.video'], guide: 'Test original six-second business demonstrations where signup is available.' },
} as const

export type HopePostChannel = keyof typeof HOPE_OUTREACH_CHANNELS
export const HOPE_POST_CHANNELS = Object.keys(HOPE_OUTREACH_CHANNELS) as HopePostChannel[]
export const HOPE_PROSPECT_CHANNELS = [...HOPE_POST_CHANNELS, 'whatsapp'] as const
export type HopeProspectChannel = typeof HOPE_PROSPECT_CHANNELS[number]

export function hopeChannelName(channel: HopeProspectChannel) {
  return channel === 'whatsapp' ? 'WhatsApp' : HOPE_OUTREACH_CHANNELS[channel].name
}
