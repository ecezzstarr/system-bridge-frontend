import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { sql } from '@/lib/db'
import { WORLD_RULES } from '@/lib/world/constants'
import { notifyDepositSubmitted } from '@/lib/deposit-notifications'
import {
  submitClientTronDeposit,normalizeTronTxHash,normalizeTronAmount,
  ensureClientTronSourceSchema,CLIENT_TRON_SOURCES,CLIENT_TRON_FUNDING_ENABLED
} from '@/lib/client-trx-deposits'

export const dynamic='force-dynamic'
const headers={'Cache-Control':'private, no-store','Vary':'Authorization'}
const answer=(payload:object,status=200)=>NextResponse.json(payload,{status,headers})

export async function GET(request:NextRequest){
  const user=await getAuthUser(request)
  if(!user||user.role!=='client')return answer({error:'Client login required'},403)
  try{
    await ensureClientTronSourceSchema()
    const deposits=await sql`
      SELECT d.id,d.amount_trx,d.amount_usd,d.method,d.currency,d.status,d.receipt_data,
        d.created_at,d.updated_at,d.verified_at,s.source AS funding_source
      FROM deposits d LEFT JOIN weave_client_tron_deposit_sources s ON s.deposit_id=d.id
      WHERE d.user_id=${user.id}::uuid AND d.method IN ('tron','paystack')
      ORDER BY d.created_at DESC LIMIT 30
    `
    return answer({success:true,deposits,companyTrxWallet:CLIENT_TRON_FUNDING_ENABLED?WORLD_RULES.COMPANY_TRX_WALLET:null,
      fundingEnabled:CLIENT_TRON_FUNDING_ENABLED,network:'tron-mainnet',
      supportedSources:CLIENT_TRON_SOURCES,peg:{trx:1,systemSwitch:1}})
  }catch(error){console.error('[client TRX deposit history]',error);return answer({error:'Deposit records unavailable'},503)}
}

export async function POST(request:NextRequest){
  const user=await getAuthUser(request)
  if(!user||user.role!=='client')return answer({error:'Client login required'},403)
  if(!CLIENT_TRON_FUNDING_ENABLED)return answer({
    error:'TRON deposits are not enabled until Administrations confirms custody of the official receiving address and production Forensics verification.'},503)
  const body=await request.json().catch(()=>({}))
  if(body.network!=='tron-mainnet'||body.confirmSentToCompany!==true)
    return answer({error:'Confirm native TRX was sent on TRON mainnet to the exact Weave receiving address'},422)
  if(body.confirmSourceOwnTransaction!==true)
    return answer({error:'Confirm you control the transaction or are its authorized beneficiary'},422)
  const source=String(body.source||'')
  if(!CLIENT_TRON_SOURCES.includes(source as typeof CLIENT_TRON_SOURCES[number]))
    return answer({error:'Choose the sending wallet source: Bybit, Bitget, Tron Wallet or other TRON wallet'},422)
  try{
    const amount=normalizeTronAmount(body.amountTrx)
    const hash=normalizeTronTxHash(body.txHash)
    const created=await submitClientTronDeposit(user.id,amount,hash,source)
    if(!created.existing){
      await notifyDepositSubmitted({
        depositorId:user.id,depositorName:user.name||user.username||'Client',
        role:'Client',depositId:String(created.id),rail:'TRX',
        amountLabel:amount.toLocaleString()+' TRX',
        secondaryLabel:'TRON mainnet · '+source+' · independent chain verification required',
        adminLink:'/admin/client-deposits'
      })
    }
    return answer({success:true,depositId:created.id,status:'pending',
      existing:created.existing,amountTrx:amount,fundingSource:source,
      estimatedSystemSwitch:amount,
      message:'Forensics review requested. No System Switch credit until solidified on-chain receipt and independent approval.'},created.existing?200:201)
  }catch(error){
    const message=error instanceof Error?error.message:'Unable to submit TRON transaction'
    return answer({error:message},/already belongs|invalid|Invalid|Enter |choose/i.test(message)?409:503)
  }
}
