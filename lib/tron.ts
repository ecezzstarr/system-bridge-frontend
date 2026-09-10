// Server-side TRON integration. Private keys must exist only in Google Cloud Secret Manager / runtime env.
const TRONGRID_API_KEY = process.env.TRONGRID_API_KEY!
const PLATFORM_TRON_PRIVATE_KEY = process.env.PLATFORM_TRON_PRIVATE_KEY!
const COMPANY_TRON_WALLET = process.env.COMPANY_TRON_WALLET!

const TRON_CONFIG = { fullHost: 'https://api.trongrid.io', headers: { 'TRON-PRO-API-KEY': TRONGRID_API_KEY } }

export function trxToSun(trx: number): number { return Math.floor(trx * 1_000_000) }
export function sunToTrx(sun: number): number { return sun / 1_000_000 }

export async function getWalletBalance(address: string) {
  try {
    const response=await fetch(`https://api.trongrid.io/v1/accounts/${encodeURIComponent(address)}`,{headers:{'TRON-PRO-API-KEY':TRONGRID_API_KEY}})
    if(!response.ok)throw new Error('Failed to fetch balance')
    const data=await response.json(); const balance=data.data?.[0]?.balance||0
    return {success:true,balance,balanceTrx:sunToTrx(balance)}
  }catch(error){return {success:false,error:error instanceof Error?error.message:'Failed to get balance'}}
}

export async function getTransactionHistory(address: string, limit=20) {
  try{
    const safeLimit=Math.min(Math.max(Math.floor(limit),1),50)
    const response=await fetch(`https://api.trongrid.io/v1/accounts/${encodeURIComponent(address)}/transactions?limit=${safeLimit}`,{headers:{'TRON-PRO-API-KEY':TRONGRID_API_KEY}})
    if(!response.ok)throw new Error('Failed to fetch transactions')
    const data=await response.json()
    const transactions=(data.data||[]).map((tx:any)=>{const isReceive=tx.to===address;return {txId:tx.txID,from:tx.ownerAddress||tx.from,to:tx.toAddress||tx.to,amount:tx.amount||0,amountTrx:sunToTrx(tx.amount||0),timestamp:tx.block_timestamp,type:isReceive?'receive':'send'}})
    return {success:true,transactions}
  }catch(error){return {success:false,error:error instanceof Error?error.message:'Failed to get transactions'}}
}

export async function sendTrx(toAddress:string,amountTrx:number){
  try{
    if(!PLATFORM_TRON_PRIVATE_KEY)throw new Error('Platform TRON signing key is not configured')
    if(!/^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(toAddress))throw new Error('Invalid TRON destination')
    if(!Number.isFinite(amountTrx)||amountTrx<=0)throw new Error('Invalid TRX amount')
    const TronWeb=(await import('tronweb')).default
    const tronWeb=new TronWeb({...TRON_CONFIG,privateKey:PLATFORM_TRON_PRIVATE_KEY})
    const transaction=await tronWeb.transactionBuilder.sendTrx(toAddress,trxToSun(amountTrx),tronWeb.defaultAddress.base58)
    const signedTx=await tronWeb.trx.sign(transaction); const result=await tronWeb.trx.sendRawTransaction(signedTx)
    if(result.result)return {success:true,txId:result.txid}
    return {success:false,error:'Transaction was rejected by TRON network'}
  }catch(error){return {success:false,error:error instanceof Error?error.message:'Failed to send TRX'}}
}

/** No custodial user sweep is performed here. A sweep must be an approved, scoped workflow. */
export async function sweepToCompanyWallet(userWalletAddress:string,amountTrx:number){
  if(!/^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(userWalletAddress)||!Number.isFinite(amountTrx)||amountTrx<=0)return {success:false,error:'Invalid sweep request'}
  return {success:false,error:'Custodial sweep execution is disabled until an approved wallet-signing workflow is configured'}
}

export async function getCompanyWalletInfo(){
  if(!COMPANY_TRON_WALLET)return {success:false,error:'Company wallet not configured'}
  const balanceResult=await getWalletBalance(COMPANY_TRON_WALLET)
  return balanceResult.success?{success:true,address:COMPANY_TRON_WALLET,balance:balanceResult.balance,balanceTrx:balanceResult.balanceTrx}:balanceResult
}

export function isValidTronAddress(address:string){return /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(address)}
