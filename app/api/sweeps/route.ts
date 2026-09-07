import { NextRequest, NextResponse } from 'next/server'
import { requireWorkshopAuthorization } from '@/lib/workshop-auth'
import { neon } from '@/lib/pg-neon'

const getDb=()=>neon(process.env.DATABASE_URL||'')

export async function GET(request: NextRequest) {
  const auth=await requireWorkshopAuthorization(request); if(!auth.authorized)return auth.response
  try{
    const sql=getDb()
    const sweeps=await sql`SELECT sa.id,sa.amount_trx,sa.status,sa.created_at,sa.approved_at,sa.executed_at,sa.transaction_hash,uw.name AS created_by_name,auw.name AS approved_by_name FROM sweeps_approval sa LEFT JOIN users uw ON sa.created_by=uw.id LEFT JOIN users auw ON sa.approved_by=auw.id ORDER BY sa.created_at DESC`
    return NextResponse.json({sweeps},{headers:{'Cache-Control':'private, no-store'}})
  }catch(error){console.error('Error fetching sweeps:',error instanceof Error?error.message:'unknown error');return NextResponse.json({error:'Failed to fetch sweeps'},{status:500})}
}

export async function POST(request: NextRequest) {
  const auth=await requireWorkshopAuthorization(request); if(!auth.authorized)return auth.response
  try{
    const adminId=auth.session?.user?.id; if(!adminId)return NextResponse.json({error:'Administrator identity unavailable'},{status:401})
    const body=await request.json(); const action=body.action; const amount=Number(body.amount); const sweepId=typeof body.sweepId==='string'?body.sweepId:''
    const sql=getDb()
    if(action==='request'){
      if(!Number.isFinite(amount)||amount<=0)return NextResponse.json({error:'Valid sweep amount required'},{status:400})
      const fromAddress=process.env.PLATFORM_TRON_WALLET; const toAddress=process.env.COMPANY_TRON_WALLET
      if(!fromAddress||!toAddress)return NextResponse.json({error:'Sweep wallets are not configured'},{status:503})
      const wallets=await sql`SELECT id,tron_address FROM wallets WHERE tron_address IN (${fromAddress},${toAddress})`
      const platformWallet=wallets.find((w:any)=>w.tron_address===fromAddress); const companyWallet=wallets.find((w:any)=>w.tron_address===toAddress)
      if(!platformWallet||!companyWallet)return NextResponse.json({error:'Sweep wallets not found'},{status:400})
      const result=await sql`INSERT INTO sweeps_approval(from_wallet_id,to_wallet_id,amount_trx,status,created_by) VALUES(${platformWallet.id},${companyWallet.id},${amount},'pending',${adminId}::uuid) RETURNING id,amount_trx,status,created_at`
      return NextResponse.json({success:true,message:'Sweep request created',sweep:result[0]})
    }
    if(!sweepId||!['approve','reject'].includes(action))return NextResponse.json({error:'Invalid sweep action'},{status:400})
    const status=action==='approve'?'approved':'rejected'
    const result=await sql`UPDATE sweeps_approval SET status=${status},approved_by=${adminId}::uuid,approved_at=NOW() WHERE id=${sweepId} AND status='pending' RETURNING id,status,approved_at`
    if(!result.length)return NextResponse.json({error:'Sweep not found or already reviewed'},{status:409})
    return NextResponse.json({success:true,message:action==='approve'?'Sweep approved. Eight Engine will execute the transfer.':'Sweep rejected.',sweep:result[0]})
  }catch(error){console.error('Error managing sweeps:',error instanceof Error?error.message:'unknown error');return NextResponse.json({error:'Failed to process sweep'},{status:500})}
}
