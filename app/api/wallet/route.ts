import { NextRequest, NextResponse } from 'next/server'
import { getWalletBalance } from '@/lib/tron-wallet'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getWalletByUserId, getTransactionsByUserId, createTransaction } from '@/lib/db'

export async function GET() {
  try {
    const session=await getServerSession(authOptions); if(!session?.user?.id)return NextResponse.json({error:'Unauthorized'},{status:401})
    const wallet=await getWalletByUserId(session.user.id)
    if(!wallet)return NextResponse.json({wallet:{address:null,trx:0,usdt:0},transactions:[],message:'No wallet connected'})
    const balance=await getWalletBalance(wallet.tron_address); const transactions=await getTransactionsByUserId(session.user.id,20)
    return NextResponse.json({wallet:{id:wallet.id,address:balance.address,trx:balance.trx,usdt:balance.usdt,tokens:balance.tokens},transactions:transactions.map((tx:Record<string,unknown>)=>({id:tx.id,type:tx.type,amount:tx.amount,currency:tx.currency,status:tx.status,txHash:tx.tx_hash,fromAddress:tx.from_address,toAddress:tx.to_address,description:tx.description,createdAt:tx.created_at}))},{headers:{'Cache-Control':'private, no-store'}})
  }catch(error){console.error('Wallet GET error:',error instanceof Error?error.message:'unknown error');return NextResponse.json({error:'Failed to load wallet'},{status:500})}
}

export async function POST(request:NextRequest){
  try{
    const session=await getServerSession(authOptions); if(!session?.user?.id)return NextResponse.json({error:'Unauthorized'},{status:401})
    const body=await request.json(); const action=body.action; const amount=Number(body.amount); const toAddress=typeof body.toAddress==='string'?body.toAddress.trim():''; const tokenType=body.tokenType==='USDT'?'USDT':'TRX'
    if(action!=='send')return NextResponse.json({error:'Invalid action'},{status:400})
    if(!Number.isFinite(amount)||amount<=0||amount>100000000)return NextResponse.json({error:'Invalid amount'},{status:400})
    if(!/^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(toAddress))return NextResponse.json({error:'Invalid TRON destination'},{status:400})
    const wallet=await getWalletByUserId(session.user.id); if(!wallet)return NextResponse.json({error:'No wallet found'},{status:400})
    const tx=await createTransaction({userId:session.user.id,type:'transfer',amount,currency:tokenType,fromAddress:wallet.tron_address,toAddress,description:`Send ${amount} ${tokenType} to ${toAddress}`})
    return NextResponse.json({success:true,message:'Transfer request submitted. Awaiting Eight approval.',transactionId:tx.id},{headers:{'Cache-Control':'no-store'}})
  }catch(error){console.error('Wallet POST error:',error instanceof Error?error.message:'unknown error');return NextResponse.json({error:'Wallet request failed'},{status:500})}
}
