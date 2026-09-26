/**
 * WORLD RULES - Authority for all system constants
 * Real Life Gaming OS for Human Presence
 */

export const WORLD_RULES = {

  // File Folder (Client Crossing)
  FILE_FOLDER_PREMIUM_PRICE_FLAME_COIN: 35800,
  FILE_FOLDER_STANDARD_MIN_FLAME_COIN: 180,
  FILE_FOLDER_PUBLIC_DOOR_THRESHOLD_FLAME_COIN: 17900, // 50% of Premium
  CLIENT_BUILD_SPEED_MIN: 0.25,
  CLIENT_BUILD_SPEED_MAX: 4,
  // Compatibility alias: existing callers that expect the premium price.
  FILE_FOLDER_PRICE_FLAME_COIN: 35800,
  
  // Commissions (Yields)
  BRIDGER_YIELD_RATE: 0.30,      // 30% on client crossing
  AGENT_LEAD_YIELD_RATE: 0.30,   // 30% on bridger lead purchase
  AGENT_CROSSING_YIELD_RATE: 0.02, // 5% of 40% = 2% total on client crossing
  
  // Continuance (formerly Continuance)
  BRIDGER_CONTINUANCE_NGN: 5000,
  
  // Wallet Fees
  PLATFORM_FEE_PERCENT: 5,

  // Casino loss-return policy. A player who reaches the weekly loss threshold
  // receives one 30% return for that week's accumulated losses.
  CASINO_WEEKLY_LOSS_THRESHOLD_FLAME_COIN: 200000,
  CASINO_LOSS_RETURN_RATE: 0.30,
  
  // Client funding rail: real TRX is paid here, then verified value is credited as Flame Coin.
  COMPANY_TRX_WALLET: 'THGBvmPt3XEb8mbSRXViA93GkW3PpCanJk',
  TRX_PAYMENT_NGN_FALLBACK_RATE: Number(process.env.TRX_NGN_FALLBACK_RATE || 441.09),
}
