import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { sql } from '@/lib/db'
import { notifyDepositDecision } from '@/lib/deposit-notifications'
import { getFileFolderWorldSnapshot } from '@/lib/client-file-folder-world'
import { decideClientTronDeposit } from '@/lib/client-trx-deposits'

export const dynamic='force-dynamic'
export async function POST(request:NextRequest){
  const admin=await getAuthUser(request)
  if(!admin||admin.role!=='admin')return NextResponse.json({error:'Administration only'},{status:403})
  try{
    const body=await request.json()
    if(!['approved','rejected'].includes(body?.status))
      return NextResponse.json({error:'Choose Approve or Reject'},{status:400})
    const result=await decideClientTronDeposit({
      adminId:admin.id,depositId:String(body?.depositId||''),
      decision:body.status,
      confirmation:String(body?.confirmation||''),
      verifiedAmountTrx:body?.verifiedAmountTrx,
    })
    // Notifications run after the committed wallet and deposit transaction.
    await notifyDepositDecision({
      userId:result.userId,approved:result.decision==='approved',rail:'TRX',
      depositId:result.depositId,amountLabel:result.paidTrx.toLocaleString()+' TRX',
      creditedFlameCoin:result.decision==='approved'?result.flameCoinAmount:undefined,
      adminId:admin.id,
    })
    let buildFunding=null
    if(result.decision==='approved'){
      try{
        const [clientFolder]=await sql`
          SELECT file_number FROM users WHERE id=${result.userId}::uuid
          AND role='client' LIMIT 1
        `
        if(clientFolder?.file_number){
          const world=await getFileFolderWorldSnapshot(sql,result.userId,String(clientFolder.file_number))
          buildFunding=world.buildFunding
        }
      }catch(error){console.error('[TRX verify] File Folder funding refresh unavailable',error)}
    }
    return NextResponse.json({
      success:true,message:result.decision==='approved'?'Client Flame Coin credited and receipt issued.':'Client deposit rejected. No wallet credit applied.',
      depositId:result.depositId,status:result.decision,
      paidTrx:result.paidTrx,flameCoinAmount:result.flameCoinAmount,
      newBalance:result.balance,receipt:result.receipt,buildFunding,
      peg:'1 Flame Coin = 1 TRX',
    },{headers:{'Cache-Control':'private, no-store'}})
  }catch(error:any){
    const message=String(error?.message||'Client deposit decision failed')
    const conflict=/already decided|already credited|conflict|duplicated/.test(message)
    console.error('[TRX verify] refused',message)
    return NextResponse.json({error:message},{status:conflict?409:400})
  }
}
