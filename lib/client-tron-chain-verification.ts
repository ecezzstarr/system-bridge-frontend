import {createHash,timingSafeEqual} from 'node:crypto'
import {WORLD_RULES} from '@/lib/world/constants'
import {normalizeTronTxHash,normalizeTronAmount} from '@/lib/client-trx-deposits'

// Only native TRX transfers on TRON mainnet count. A transaction hash,
// an explorer screenshot or an exchange withdrawal order is not proof.
const BASE58='123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
export function tronAddressToHex(address:string):string{
  if(!/^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(address))throw new Error('Invalid TRON mainnet receiving address')
  let value=0n
  for(const c of address){
    const i=BASE58.indexOf(c)
    if(i<0)throw new Error('Invalid base58 TRON address')
    value=value*58n+BigInt(i)
  }
  let raw=value.toString(16)
  if(raw.length%2)raw='0'+raw
  const leading=address.match(/^1*/)?.[0].length||0
  const payload=Buffer.concat([Buffer.alloc(leading),Buffer.from(raw,'hex')])
  if(payload.length!==25||payload[0]!==0x41)throw new Error('Invalid TRON address payload')
  const hash=(bytes:Buffer)=>createHash('sha256').update(bytes).digest()
  const expected=hash(hash(payload.subarray(0,21))).subarray(0,4)
  if(!timingSafeEqual(payload.subarray(21),expected))throw new Error('TRON address checksum mismatch')
  return payload.subarray(0,21).toString('hex').toLowerCase()
}
export type VerifiedNativeTrx={
  txHash:string;receivedTrx:number;destinationHex:string;sourceHex:string;
  network:'tron-mainnet';confirmation:'solidified';verificationProvider:'trongrid-solidity'
}
export function validateSolidifiedTrxTransfer(
  tx:Record<string,unknown>,txHash:string,amountTrx:number,companyAddress:string,
):VerifiedNativeTrx{
  const normalized=normalizeTronTxHash(txHash)
  const amount=normalizeTronAmount(amountTrx)
  if(String(tx?.txID||'').toLowerCase()!==normalized)throw new Error('Chain transaction ID mismatch')
  const results=Array.isArray(tx?.ret)?tx.ret as Array<Record<string,unknown>>:[]
  if(results.length!==1||String(results[0].contractRet)!=='SUCCESS')
    throw new Error('TRON transfer execution has not succeeded in solidified state')
  const raw=tx.raw_data as Record<string,unknown>|undefined
  const contracts=Array.isArray(raw?.contract)?raw?.contract as Array<Record<string,unknown>>:[]
  if(contracts.length!==1||contracts[0].type!=='TransferContract')
    throw new Error('Only direct native TRX transfers can fund System Switch; TRC20/other tokens are excluded')
  const parameter=contracts[0].parameter as Record<string,unknown>|undefined
  const details=parameter?.value as Record<string,unknown>|undefined
  const destination=String(details?.to_address||'').toLowerCase()
  const source=String(details?.owner_address||'').toLowerCase()
  const expectedDestination=tronAddressToHex(companyAddress)
  if(destination!==expectedDestination)throw new Error('TRX was not received at the approved Weave company address')
  if(!/^41[0-9a-f]{40}$/.test(source))throw new Error('Invalid sender address in transfer')
  const sun=String(details?.amount||'')
  if(!/^[1-9][0-9]*$/.test(sun))throw new Error('Invalid or zero TRX chain amount')
  if(BigInt(sun)!==BigInt(Math.round(amount*1e6)))
    throw new Error('On-chain SUN amount differs from submitted TRX amount')
  return {txHash:normalized,receivedTrx:amount,destinationHex:destination,
    sourceHex:source,network:'tron-mainnet',confirmation:'solidified',
    verificationProvider:'trongrid-solidity'}
}
export async function verifyClientNativeTrxDeposit(
  txHash:string,expectedTrx:number,
  companyAddress:string=WORLD_RULES.COMPANY_TRX_WALLET,
):Promise<VerifiedNativeTrx>{
  const hash=normalizeTronTxHash(txHash)
  const tronGridKey=process.env.TRON_GRID_API_KEY||''
  const response=await fetch('https://api.trongrid.io/walletsolidity/gettransactionbyid',{
    method:'POST',headers:{
      'Content-Type':'application/json',
      ...(tronGridKey?{'TRON-PRO-API-KEY':tronGridKey}:{})
    },body:JSON.stringify({value:hash}),cache:'no-store',
    signal:AbortSignal.timeout(10000)
  })
  if(!response.ok)throw new Error('TRON mainnet verification provider is unavailable')
  const tx=await response.json() as Record<string,unknown>
  if(tx?.Error||!tx?.txID)throw new Error('TRX transfer has not been found in the solidified TRON mainnet chain')
  return validateSolidifiedTrxTransfer(tx,hash,expectedTrx,companyAddress)
}
