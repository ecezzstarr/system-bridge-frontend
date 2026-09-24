export const FILE_FOLDER_PRICING = {
  standardFlameCoin: 35800,
  minimumFlameCoin: 1800,
  flameCoinPerUsd: Number(
    process.env.FILE_FOLDER_FLAME_COIN_PER_USD ||
    process.env.FILE_FOLDER_TRX_PER_USD ||
    10
  ),
} as const

export function isValidFileFolderAmount(amount: number) {
  return Number.isFinite(amount) && amount >= FILE_FOLDER_PRICING.minimumFlameCoin
}
