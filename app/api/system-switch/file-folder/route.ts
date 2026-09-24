import { NextResponse } from 'next/server'
import { WORLD_RULES } from '@/lib/world/constants'

export async function GET() {
  const standardPriceFlameCoin = WORLD_RULES.FILE_FOLDER_PRICE_FLAME_COIN
  const minimumProspectPriceFlameCoin = 1800

  return NextResponse.json({
    success: true,
    fundingAsset: 'TRX',
    creditedAsset: 'Flame Coin',
    companyTrxWallet: WORLD_RULES.COMPANY_TRX_WALLET,
    depositWallet: WORLD_RULES.COMPANY_TRX_WALLET,
    standardPriceFlameCoin,
    minimumProspectPriceFlameCoin,
    requiredTrx: standardPriceFlameCoin,
    peg: '1 Flame Coin = 1 TRX',
    // Compatibility aliases for existing clients while the DB/API migration completes.
    standardPriceTrx: standardPriceFlameCoin,
    minimumProspectPriceTrx: minimumProspectPriceFlameCoin,
    depositMethods: ['TRX'],
  })
}
