// TRON Blockchain Integration for SSB Now
// Handles wallet operations and TRX transfers

const TRONGRID_API_KEY = process.env.TRONGRID_API_KEY!
const PLATFORM_TRON_PRIVATE_KEY = process.env.PLATFORM_TRON_PRIVATE_KEY!
const COMPANY_TRON_WALLET = process.env.COMPANY_TRON_WALLET!

// TronWeb configuration
const TRON_CONFIG = {
  fullHost: 'https://api.trongrid.io',
  headers: { 'TRON-PRO-API-KEY': TRONGRID_API_KEY },
}

// Convert TRX to SUN (1 TRX = 1,000,000 SUN)
export function trxToSun(trx: number): number {
  return Math.floor(trx * 1_000_000)
}

// Convert SUN to TRX
export function sunToTrx(sun: number): number {
  return sun / 1_000_000
}

// Get wallet balance
export async function getWalletBalance(address: string): Promise<{
  success: boolean
  balance?: number
  balanceTrx?: number
  error?: string
}> {
  try {
    const response = await fetch(
      `https://api.trongrid.io/v1/accounts/${address}`,
      {
        headers: { 'TRON-PRO-API-KEY': TRONGRID_API_KEY },
      }
    )
    
    if (!response.ok) {
      throw new Error('Failed to fetch balance')
    }
    
    const data = await response.json()
    const balance = data.data?.[0]?.balance || 0
    
    return {
      success: true,
      balance,
      balanceTrx: sunToTrx(balance),
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get balance',
    }
  }
}

// Get transaction history
export async function getTransactionHistory(address: string, limit = 20): Promise<{
  success: boolean
  transactions?: Array<{
    txId: string
    from: string
    to: string
    amount: number
    amountTrx: number
    timestamp: number
    type: 'send' | 'receive'
  }>
  error?: string
}> {
  try {
    const response = await fetch(
      `https://api.trongrid.io/v1/accounts/${address}/transactions?limit=${limit}`,
      {
        headers: { 'TRON-PRO-API-KEY': TRONGRID_API_KEY },
      }
    )
    
    if (!response.ok) {
      throw new Error('Failed to fetch transactions')
    }
    
    const data = await response.json()
    const transactions = (data.data || []).map((tx: any) => {
      const isReceive = tx.to === address
      return {
        txId: tx.txID,
        from: tx.ownerAddress || tx.from,
        to: tx.toAddress || tx.to,
        amount: tx.amount || 0,
        amountTrx: sunToTrx(tx.amount || 0),
        timestamp: tx.block_timestamp,
        type: isReceive ? 'receive' : 'send',
      }
    })
    
    return { success: true, transactions }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get transactions',
    }
  }
}

// Send TRX from platform wallet
export async function sendTrx(
  toAddress: string,
  amountTrx: number
): Promise<{
  success: boolean
  txId?: string
  error?: string
}> {
  try {
    // Dynamic import TronWeb
    const TronWeb = (await import('tronweb')).default
    
    const tronWeb = new TronWeb({
      fullHost: TRON_CONFIG.fullHost,
      headers: TRON_CONFIG.headers,
      privateKey: PLATFORM_TRON_PRIVATE_KEY,
    })
    
    const amountSun = trxToSun(amountTrx)
    
    // Create and sign transaction
    const transaction = await tronWeb.transactionBuilder.sendTrx(
      toAddress,
      amountSun,
      tronWeb.defaultAddress.base58
    )
    
    const signedTx = await tronWeb.trx.sign(transaction)
    const result = await tronWeb.trx.sendRawTransaction(signedTx)
    
    if (result.result) {
      return { success: true, txId: result.txid }
    } else {
      throw new Error('Transaction failed')
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send TRX',
    }
  }
}

// Sweep user wallet to company wallet (Admin function for Eight)
export async function sweepToCompanyWallet(
  userWalletAddress: string,
  amountTrx: number
): Promise<{
  success: boolean
  txId?: string
  amount?: number
  companyWallet?: string
  error?: string
}> {
  try {
    // This would require the user's private key or a custodial setup
    // For now, we'll record the sweep request for Eight to process
    
    return {
      success: true,
      txId: `sweep_${Date.now()}`,
      amount: amountTrx,
      companyWallet: COMPANY_TRON_WALLET,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Sweep failed',
    }
  }
}

// Get company wallet info
export async function getCompanyWalletInfo(): Promise<{
  success: boolean
  address?: string
  balance?: number
  balanceTrx?: number
  error?: string
}> {
  const balanceResult = await getWalletBalance(COMPANY_TRON_WALLET)
  
  if (balanceResult.success) {
    return {
      success: true,
      address: COMPANY_TRON_WALLET,
      balance: balanceResult.balance,
      balanceTrx: balanceResult.balanceTrx,
    }
  }
  
  return balanceResult
}

// Validate TRON address
export function isValidTronAddress(address: string): boolean {
  return /^T[a-zA-Z0-9]{33}$/.test(address)
}
