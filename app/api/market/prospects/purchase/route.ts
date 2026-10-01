import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { getPool } from '@/lib/db'
import { creditBridgerActivityCommission } from '@/lib/bridger-commission-router'
import { ensureMarketTables } from '@/lib/market'
import { ensureWeaveReceiptSchema, issueWeaveReceipt } from '@/lib/weave-receipts'

async function finalizeProspectPurchase(input:{
  packageId:string
  userId:string
  priceTrx:number
  contactCount:number
  balanceAfter:number
}){
  await ensureWeaveReceiptSchema()
  const lockClient=await getPool().connect()
  try{
    await lockClient.query('BEGIN')
    await lockClient.query('SELECT pg_advisory_xact_lock(hashtext($1))',[`prospect-finalize:${input.packageId}`])

    const commissionMovement=await creditBridgerActivityCommission({
      bridgerId:input.userId,
      activity:'prospect_package_purchase',
      baseAmount:input.priceTrx,
      sourceId:input.packageId,
      description:`Agent Prospect share from Bridger purchase of ${input.priceTrx} Flame Coin`,
    })

    if(commissionMovement.agentExpected&&!commissionMovement.agentShare){
      await lockClient.query('COMMIT')
      return {commissionMovement,receipt:null,complete:false}
    }

    const existing=await lockClient.query(
      `SELECT *
       FROM weave_receipts
       WHERE user_id=$1::uuid
         AND kind='purchase'
         AND source='prospect_package'
         AND source_id=$2
       ORDER BY created_at ASC
       LIMIT 1`,
      [input.userId,input.packageId],
    )

    const receipt=existing.rows[0]||await issueWeaveReceipt({
      userId:input.userId,
      kind:'purchase',
      source:'prospect_package',
      sourceId:input.packageId,
      amount:input.priceTrx,
      currency:'Flame Coin',
      status:'completed',
      description:'Bridger prospect package purchase',
      metadata:{packageId:input.packageId,contactCount:input.contactCount,balanceAfter:input.balanceAfter},
    })

    await lockClient.query('COMMIT')
    return {commissionMovement,receipt,complete:true}
  }catch(error){
    try{await lockClient.query('ROLLBACK')}catch{}
    throw error
  }finally{
    lockClient.release()
  }
}

export async function POST(request: NextRequest) {
  const authUser=await getAuthUser(request)
  if(!authUser)return NextResponse.json({error:'Unauthorized'},{status:401})
  const userId=authUser.id

  let packageId:string
  try{
    const body=await request.json()
    packageId=String(body.packageId||'').trim()
  }catch{
    return NextResponse.json({error:'Invalid request body'},{status:400})
  }
  if(!packageId)return NextResponse.json({error:'packageId required'},{status:400})

  await ensureMarketTables()
  const client=await getPool().connect()
  let primaryCommitted=false

  try{
    await client.query('BEGIN')

    // Lock by identity first so a completed purchase can be replayed safely.
    const pkgResult=await client.query(
      `SELECT * FROM market_prospect_packages WHERE id=$1::uuid FOR UPDATE`,
      [packageId],
    )
    const pkg=pkgResult.rows[0]
    if(!pkg){
      await client.query('ROLLBACK')
      return NextResponse.json({error:'Package not found'},{status:404})
    }
    const priceTrx=Number(pkg.price_trx)

    if(pkg.status==='sold'){
      if(String(pkg.purchased_by||'')!==String(userId)){
        await client.query('ROLLBACK')
        return NextResponse.json({error:'Package is no longer available'},{status:409})
      }

      const contactsResult=await client.query(
        `SELECT * FROM market_prospect_contacts WHERE package_id=$1::uuid`,
        [packageId],
      )
      const walletResult=await client.query(
        `SELECT balance_trx FROM wallets WHERE user_id=$1::uuid AND is_primary=true LIMIT 1`,
        [userId],
      )
      const balanceAfter=Number(walletResult.rows[0]?.balance_trx||0)
      await client.query('COMMIT')
      primaryCommitted=true

      const finalized=await finalizeProspectPurchase({
        packageId,userId,priceTrx,contactCount:contactsResult.rows.length,balanceAfter,
      })
      if(!finalized.complete){
        return NextResponse.json({
          error:'Prospect purchase is complete, but the attached Agent share still needs reconciliation. Verify the Agent primary wallet and retry this same purchase.',
          purchaseCompleted:true,
          replayed:true,
        },{status:503})
      }
      return NextResponse.json({
        success:true,
        replayed:true,
        package:pkg,
        contacts:contactsResult.rows,
        newBalance:balanceAfter,
        receipt:finalized.receipt,
        commissionMovement:finalized.commissionMovement,
      })
    }

    if(pkg.status!=='published'){
      await client.query('ROLLBACK')
      return NextResponse.json({error:'Package is not available for purchase'},{status:409})
    }

    const bridgerResult=await client.query(
      `SELECT status FROM bridger_profiles WHERE user_id=$1::uuid`,
      [userId],
    )
    const bridger=bridgerResult.rows[0]
    if(!bridger||bridger.status!=='active'){
      await client.query('ROLLBACK')
      return NextResponse.json({error:'Only active Bridgers can purchase prospect packages'},{status:403})
    }

    const walletResult=await client.query(
      `SELECT balance_trx FROM wallets WHERE user_id=$1::uuid AND is_primary=true FOR UPDATE`,
      [userId],
    )
    const wallet=walletResult.rows[0]
    if(!wallet){
      await client.query('ROLLBACK')
      return NextResponse.json({error:'Wallet not found'},{status:404})
    }
    const currentBalance=Number(wallet.balance_trx)||0
    if(currentBalance<priceTrx){
      await client.query('ROLLBACK')
      return NextResponse.json({error:'Insufficient Flame Coin balance',currentBalance,required:priceTrx},{status:400})
    }

    const newBalance=currentBalance-priceTrx
    await client.query(
      `UPDATE wallets SET balance_trx=$1,updated_at=NOW() WHERE user_id=$2::uuid AND is_primary=true`,
      [newBalance,userId],
    )

    await client.query(
      `INSERT INTO ledger_entries
       (id,user_id,entry_type,amount,currency,description,balance_before,balance_after,created_at)
       VALUES (gen_random_uuid(),$1::uuid,'prospect_package_purchase',$2,'Flame Coin',$3,$4,$5,NOW())`,
      [userId,priceTrx,`Purchased prospect package ${packageId}`,currentBalance,newBalance],
    )

    const soldResult=await client.query(
      `UPDATE market_prospect_packages
       SET status='sold',purchased_by=$1::uuid,purchased_at=NOW(),updated_at=NOW()
       WHERE id=$2::uuid AND status='published'
       RETURNING *`,
      [userId,packageId],
    )
    if(soldResult.rows.length!==1)throw new Error('Prospect package changed before purchase completed')

    await client.query(
      `INSERT INTO market_prospect_audit (package_id,actor_id,action,details)
       VALUES ($1::uuid,$2::uuid,'purchased',$3::jsonb)`,
      [packageId,userId,JSON.stringify({priceTrx})],
    )

    const contactsResult=await client.query(
      `SELECT * FROM market_prospect_contacts WHERE package_id=$1::uuid`,
      [packageId],
    )

    const bridgeResult=await client.query(
      `SELECT id,bridge_code FROM bridge_ais
       WHERE bridger_id=$1::uuid AND status='active'
       ORDER BY created_at DESC LIMIT 1`,
      [userId],
    )
    const bridgeAi=bridgeResult.rows[0]

    for(const contact of contactsResult.rows){
      const outreachId=crypto.randomUUID()
      const prospectName=String(contact.name||'').trim()
      const greeting=prospectName?`Hello ${prospectName}.`:'Hello.'
      const message=`${greeting} My name is your Bridger from WEAVE. I work with people around something they are already trying to build, sell, organize or move forward in their life or work. Can I ask what you currently do, or what you're trying to make work better?`
      await client.query(
        `INSERT INTO market_prospect_outreach
         (id,contact_id,bridger_id,bridge_ai_id,status,message_sent)
         VALUES ($1::uuid,$2::uuid,$3::uuid,$4::uuid,'pending',$5)`,
        [outreachId,contact.id,userId,bridgeAi?.id||null,message],
      )
    }

    await client.query('COMMIT')
    primaryCommitted=true

    import('@/lib/fulfillment-agent').then(({fulfillmentAgent})=>{
      fulfillmentAgent.reconcile().catch(err=>console.error('[market purchase] reconcile error:',err))
    })

    const finalized=await finalizeProspectPurchase({
      packageId,userId,priceTrx,contactCount:contactsResult.rows.length,balanceAfter:newBalance,
    })
    if(!finalized.complete){
      return NextResponse.json({
        error:'Prospect purchase completed, but the attached Agent share could not be credited. Verify the Agent primary wallet and retry this same purchase to reconcile the share.',
        purchaseCompleted:true,
      },{status:503})
    }

    return NextResponse.json({
      success:true,
      package:soldResult.rows[0],
      contacts:contactsResult.rows,
      newBalance,
      receipt:finalized.receipt,
      commissionMovement:finalized.commissionMovement,
    })
  }catch(error){
    if(!primaryCommitted){
      try{await client.query('ROLLBACK')}catch{}
    }
    console.error('[Market Prospects Purchase] Error:',error)
    return NextResponse.json({
      error:primaryCommitted
        ?'Prospect purchase completed but post-purchase reconciliation needs another attempt.'
        :'Purchase failed',
      purchaseCompleted:primaryCommitted,
    },{status:primaryCommitted?503:500})
  }finally{
    client.release()
  }
}
