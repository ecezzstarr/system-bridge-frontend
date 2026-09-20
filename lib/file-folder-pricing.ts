export const FILE_FOLDER_PRICING = {
  standardTrx: 35800,
  minimumTrx: 1800,
  trxPerUsd: Number(process.env.FILE_FOLDER_TRX_PER_USD || 10),
} as const

export function isValidFileFolderAmount(amount: number) {
  return Number.isFinite(amount) && amount >= FILE_FOLDER_PRICING.minimumTrx
}
