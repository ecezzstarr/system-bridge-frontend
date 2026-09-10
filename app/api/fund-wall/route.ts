import { NextRequest, NextResponse } from 'next/server'
import { requireWorkshopAuthorization } from '@/lib/workshop-auth'
import { neon } from '@/lib/pg-neon'

export async function GET(request: NextRequest) {
  const auth=await requireWorkshopAuthorization(request); if(!auth.authorized)return auth.response
  try{
    const sql=neon(process.env.DATABASE_URL||'')
    const companyWalletResult=await sql`SELECT w.* FROM wallets w JOIN users u ON w.user_id=u.id WHERE u.role='admin' AND u.is_active=true AND w.is_primary=true LIMIT 1`
    const platformWalletResult=await sql`SELECT w.* FROM wallets w JOIN users u ON w.user_id=u.id WHERE u.name='PLATFORM_WALLET' LIMIT 1`
    const companyWallet=companyWalletResult[0], platformWallet=platformWalletResult[0]
    if(!companyWallet)return NextResponse.json({wallet:{id:null,address:null,trx:0,usdt:0},stats:{totalLocked:0,totalTransactions:0,lastSweep:null},message:'Company wallet not found'})
    const [escrowStats]=await sql`SELECT COALESCE(SUM(CAST(amount AS DECIMAL)),0) AS total_locked FROM escrow WHERE status='locked' AND currency='TRX'`
    const [txStats]=await sql`SELECT COUNT(*) AS total_transactions FROM transactions WHERE currency='TRX' AND status='completed'`
    const recentSweeps=await sql`SELECT id,amount,from_address,to_address,completed_at FROM transactions WHERE type='sweep' AND currency='TRX' AND status='completed' ORDER BY completed_at DESC LIMIT 10`
    return NextResponse.json({companyWallet:{id:companyWallet.id,address:companyWallet.tron_address,trx:Number(companyWallet.balance_trx)||0,usdt:Number(companyWallet.balance_usdt)||0},platformWallet:platformWallet?{id:platformWallet.id,address:platformWallet.tron_address,trx:Number(platformWallet.balance_trx)||0,usdt:Number(platformWallet.balance_usdt)||0}:null,stats:{totalLocked:Number(escrowStats?.total_locked)||0,totalTransactions:Number(txStats?.total_transactions)||0,lastSweep:recentSweeps[0]?.completed_at||null},recentSweeps},{headers:{'Cache-Control':'private, no-store'}})
  }catch(error){console.error('Fund wall error:',error instanceof Error?error.message:'unknown error');return NextResponse.json({error:'Failed to load fund wall'},{status:500})}
}
