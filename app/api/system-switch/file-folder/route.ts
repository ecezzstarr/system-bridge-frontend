import { NextResponse } from 'next/server'

const STANDARD_PRICE_TRX = 35800
const MINIMUM_PROSPECT_PRICE_TRX = 1800

export async function GET() {
  return NextResponse.json({
    success: true,
    depositWallet: process.env.COMPANY_TRON_WALLET || '',
    currency: 'TRX',
    standardPriceTrx: STANDARD_PRICE_TRX,
    minimumProspectPriceTrx: MINIMUM_PROSPECT_PRICE_TRX,
    depositMethods: ['TRX', 'Flutterwave'],
    withdrawalMethods: ['TRX'],
  })
}
