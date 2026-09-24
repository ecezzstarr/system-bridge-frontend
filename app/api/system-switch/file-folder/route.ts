import { NextResponse } from 'next/server'
import { WORLD_RULES } from '@/lib/world/constants'

export async function GET() {
  const premiumPriceFlameCoin = WORLD_RULES.FILE_FOLDER_PREMIUM_PRICE_FLAME_COIN
  const standardMinimumFlameCoin = WORLD_RULES.FILE_FOLDER_STANDARD_MIN_FLAME_COIN

  return NextResponse.json({
    success: true,
    fundingAsset: 'TRX',
    creditedAsset: 'Flame Coin',
    companyTrxWallet: WORLD_RULES.COMPANY_TRX_WALLET,
    depositWallet: WORLD_RULES.COMPANY_TRX_WALLET,
    premium: {
      priceFlameCoin: premiumPriceFlameCoin,
      requiredTrx: premiumPriceFlameCoin,
      fixed: true,
    },
    standard: {
      minimumFlameCoin: standardMinimumFlameCoin,
      maximumExclusiveFlameCoin: premiumPriceFlameCoin,
      minimumTrx: standardMinimumFlameCoin,
      maximumExclusiveTrx: premiumPriceFlameCoin,
      fixed: false,
    },
    peg: '1 Flame Coin = 1 TRX',
    // Compatibility aliases for older clients.
    standardPriceFlameCoin: premiumPriceFlameCoin,
    minimumProspectPriceFlameCoin: standardMinimumFlameCoin,
    standardPriceTrx: premiumPriceFlameCoin,
    minimumProspectPriceTrx: standardMinimumFlameCoin,
    requiredTrx: premiumPriceFlameCoin,
    depositMethods: ['TRX'],
  })
}
