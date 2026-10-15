export const FILE_FOLDER_PRICING = {
  premiumFlameCoin: 35800,
  standardMinimumFlameCoin: 180,
  standardMaximumFlameCoin: 3000,
  proNegotiatedMinimumFlameCoin: 3000,
  proStartingFlameCoin: 6500,
  proMaximumExclusiveFlameCoin: 35800,
  // Legacy aliases retained while older callers are migrated.
  standardFlameCoin: 3000,
  minimumFlameCoin: 180,
  flameCoinPerUsd: Number(
    process.env.FILE_FOLDER_FLAME_COIN_PER_USD ||
    process.env.FILE_FOLDER_TRX_PER_USD ||
    10
  ),
} as const

export type FileFolderTier = 'standard' | 'pro' | 'premium'

function isRequestedTier(value: unknown): value is FileFolderTier {
  return value === 'standard' || value === 'pro' || value === 'premium'
}

export function getFileFolderTier(
  amount: number,
  requestedTier?: FileFolderTier | string | null,
): FileFolderTier | null {
  if (!Number.isFinite(amount)) return null

  const requested = isRequestedTier(requestedTier) ? requestedTier : null

  if (requested === 'premium') {
    return amount === FILE_FOLDER_PRICING.premiumFlameCoin ? 'premium' : null
  }

  if (requested === 'standard') {
    return amount >= FILE_FOLDER_PRICING.standardMinimumFlameCoin &&
      amount <= FILE_FOLDER_PRICING.standardMaximumFlameCoin
      ? 'standard'
      : null
  }

  if (requested === 'pro') {
    return amount >= FILE_FOLDER_PRICING.proNegotiatedMinimumFlameCoin &&
      amount < FILE_FOLDER_PRICING.proMaximumExclusiveFlameCoin
      ? 'pro'
      : null
  }

  if (amount === FILE_FOLDER_PRICING.premiumFlameCoin) return 'premium'

  if (
    amount >= FILE_FOLDER_PRICING.standardMinimumFlameCoin &&
    amount <= FILE_FOLDER_PRICING.standardMaximumFlameCoin
  ) return 'standard'

  // Pro is a negotiated/external sale and must be explicitly marked as Pro.
  // This preserves the 3,000 overlap without misclassifying a normal Standard purchase.
  return null
}

export function isValidFileFolderAmount(
  amount: number,
  requestedTier?: FileFolderTier | string | null,
) {
  return getFileFolderTier(amount, requestedTier) !== null
}

export function fileFolderTierLabel(tier: FileFolderTier) {
  if (tier === 'premium') return 'Premium'
  if (tier === 'pro') return 'Pro'
  return 'Standard'
}
