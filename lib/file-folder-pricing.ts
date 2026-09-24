export const FILE_FOLDER_PRICING = {
  premiumFlameCoin: 35800,
  standardMinimumFlameCoin: 180,
  standardMaximumExclusiveFlameCoin: 35800,
  // Legacy aliases retained while older callers are migrated.
  standardFlameCoin: 35800,
  minimumFlameCoin: 180,
  flameCoinPerUsd: Number(
    process.env.FILE_FOLDER_FLAME_COIN_PER_USD ||
    process.env.FILE_FOLDER_TRX_PER_USD ||
    10
  ),
} as const

export type FileFolderTier = 'standard' | 'premium'

export function getFileFolderTier(amount: number): FileFolderTier | null {
  if (!Number.isFinite(amount)) return null
  if (amount === FILE_FOLDER_PRICING.premiumFlameCoin) return 'premium'
  if (
    amount >= FILE_FOLDER_PRICING.standardMinimumFlameCoin &&
    amount < FILE_FOLDER_PRICING.standardMaximumExclusiveFlameCoin
  ) return 'standard'
  return null
}

export function isValidFileFolderAmount(amount: number) {
  return getFileFolderTier(amount) !== null
}
