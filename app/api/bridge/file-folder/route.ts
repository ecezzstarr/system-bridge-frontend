import { NextResponse } from 'next/server'
import { FILE_FOLDER_PRICING } from '@/lib/file-folder-pricing'
import { WORLD_RULES } from '@/lib/world/constants'

export async function GET() {
  const premiumPriceFlameCoin = FILE_FOLDER_PRICING.premiumFlameCoin
  const standardMinimumFlameCoin = FILE_FOLDER_PRICING.standardMinimumFlameCoin
  const standardMaximumFlameCoin = FILE_FOLDER_PRICING.standardMaximumFlameCoin
  const proStartingFlameCoin = FILE_FOLDER_PRICING.proStartingFlameCoin
  const proNegotiatedMinimumFlameCoin = FILE_FOLDER_PRICING.proNegotiatedMinimumFlameCoin

  return NextResponse.json({
    success: true,
    fundingAsset: 'TRX',
    creditedAsset: 'Flame Coin',
    companyTrxWallet: WORLD_RULES.COMPANY_TRX_WALLET,
    depositWallet: WORLD_RULES.COMPANY_TRX_WALLET,
    plus: {priceFlameCoin:FILE_FOLDER_PRICING.plusFlameCoin,quoteRequired:true,checkoutEnabled:false},
    premium: {
      priceFlameCoin: premiumPriceFlameCoin,
      requiredTrx: premiumPriceFlameCoin,
      fixed: true,
    },
    pro: {
      startingFlameCoin: proStartingFlameCoin,
      negotiatedMinimumFlameCoin: proNegotiatedMinimumFlameCoin,
      maximumExclusiveFlameCoin: premiumPriceFlameCoin,
      startingTrx: proStartingFlameCoin,
      negotiatedMinimumTrx: proNegotiatedMinimumFlameCoin,
      maximumExclusiveTrx: premiumPriceFlameCoin,
      fixed: false,
      negotiated: true,
    },
    standard: {
      minimumFlameCoin: standardMinimumFlameCoin,
      maximumFlameCoin: standardMaximumFlameCoin,
      minimumTrx: standardMinimumFlameCoin,
      maximumTrx: standardMaximumFlameCoin,
      fixed: false,
    },
    peg: '1 Flame Coin = 1 TRX',
    // Compatibility aliases for older clients. Canonical callers should use
    // standard/pro/premium above instead of inferring a tier from these values.
    standardPriceFlameCoin: standardMaximumFlameCoin,
    minimumProspectPriceFlameCoin: proNegotiatedMinimumFlameCoin,
    standardPriceTrx: standardMaximumFlameCoin,
    minimumProspectPriceTrx: proNegotiatedMinimumFlameCoin,
    requiredTrx: premiumPriceFlameCoin,
    depositMethods: ['TRX'],
  })
}
