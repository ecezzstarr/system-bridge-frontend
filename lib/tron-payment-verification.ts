import { WORLD_RULES } from '@/lib/world/constants'

const TRON_MAINNET_SOLIDITY = 'https://api.trongrid.io/walletsolidity/gettransactionbyid'
const SUN_PER_TRX = 1_000_000

export type TronPaymentVerification =
  | {
      state: 'verified'
      txId: string
      fromAddress: string
      toAddress: string
      amountTrx: number
      blockTimestamp: number | null
    }
  | {
      state: 'pending'
      reason: string
    }
  | {
      state: 'invalid'
      reason: string
    }

function normalizeHash(value: string) {
  return value.trim().toLowerCase()
}

function validTransactionHash(value: string) {
  return /^[0-9a-f]{64}$/i.test(value.trim())
}

function sameTrxAmount(actualSun: number, expectedTrx: number) {
  const expectedSun = Math.round(expectedTrx * SUN_PER_TRX)
  return Number.isSafeInteger(actualSun) && actualSun === expectedSun
}

async function tronAddressFromHex(hexAddress: string) {
  const { TronWeb } = await import('tronweb')
  return TronWeb.address.fromHex(hexAddress)
}

async function querySolidifiedTransaction(txId: string) {
  const headers:Record<string,string>={
    accept:'application/json',
    'content-type':'application/json',
  }
  const apiKey=process.env.TRONGRID_API_KEY?.trim()
  if(apiKey)headers['TRON-PRO-API-KEY']=apiKey

  const response=await fetch(TRON_MAINNET_SOLIDITY,{
    method:'POST',
    headers,
    body:JSON.stringify({value:txId}),
    cache:'no-store',
  })
  if(!response.ok)throw new Error(`TRON node responded ${response.status}`)
  return response.json()
}

export async function verifyNativeTrxPayment(input:{
  txId:string
  expectedAmountTrx:number
  expectedRecipient?:string
}):Promise<TronPaymentVerification>{
  const txId=input.txId.trim()
  const expectedRecipient=(input.expectedRecipient||WORLD_RULES.COMPANY_TRX_WALLET).trim()

  if(!validTransactionHash(txId)){
    return {state:'invalid',reason:'TRX transaction hash must be a 64-character hexadecimal transaction ID.'}
  }
  if(!Number.isFinite(input.expectedAmountTrx)||input.expectedAmountTrx<=0){
    return {state:'invalid',reason:'Expected TRX amount is invalid.'}
  }

  let transaction:any
  try{
    transaction=await querySolidifiedTransaction(txId)
  }catch(error:any){
    console.error('[tron-payment-verification] solidified lookup failed',error)
    return {state:'pending',reason:'TRON verification service is temporarily unavailable. WEAVE will keep checking this transaction.'}
  }

  if(!transaction||!transaction.txID){
    return {state:'pending',reason:'TRX transaction has not reached solidified confirmation yet.'}
  }
  if(normalizeHash(String(transaction.txID))!==normalizeHash(txId)){
    return {state:'invalid',reason:'TRON returned a different transaction ID.'}
  }

  const contractRet=String(transaction.ret?.[0]?.contractRet||'SUCCESS')
  if(contractRet!=='SUCCESS'){
    return {state:'invalid',reason:`TRX transaction execution is ${contractRet.toLowerCase()}.`}
  }

  const contracts=Array.isArray(transaction.raw_data?.contract)?transaction.raw_data.contract:[]
  if(contracts.length!==1||contracts[0]?.type!=='TransferContract'){
    return {state:'invalid',reason:'File Folder payment must be a direct native TRX transfer.'}
  }

  const transfer=contracts[0]?.parameter?.value||{}
  const toHex=String(transfer.to_address||'')
  const fromHex=String(transfer.owner_address||'')
  const amountSun=Number(transfer.amount)

  if(!toHex||!fromHex||!Number.isFinite(amountSun)){
    return {state:'invalid',reason:'TRX transfer details are incomplete.'}
  }

  let toAddress:string
  let fromAddress:string
  try{
    ;[toAddress,fromAddress]=await Promise.all([
      tronAddressFromHex(toHex),
      tronAddressFromHex(fromHex),
    ])
  }catch(error){
    console.error('[tron-payment-verification] address decoding failed',error)
    return {state:'invalid',reason:'TRX transfer addresses could not be verified.'}
  }

  if(toAddress!==expectedRecipient){
    return {state:'invalid',reason:'TRX payment was not sent to the WEAVE company wallet.'}
  }
  if(!sameTrxAmount(amountSun,input.expectedAmountTrx)){
    return {
      state:'invalid',
      reason:`TRX payment amount does not match the selected File Folder value of ${input.expectedAmountTrx.toLocaleString()} TRX.`,
    }
  }

  return {
    state:'verified',
    txId,
    fromAddress,
    toAddress,
    amountTrx:amountSun/SUN_PER_TRX,
    blockTimestamp:Number.isFinite(Number(transaction.raw_data?.timestamp))
      ?Number(transaction.raw_data.timestamp)
      :null,
  }
}
