import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { getPool, getSql } from '@/lib/db'
import {
  ensureBridgerNumberEngineSchema,
  ensureBridgerNumberPosition,
  ensurePrimaryWallet,
  normalizeCountry,
} from '@/lib/bridger-number-engine'
import { issueWeaveReceipt } from '@/lib/weave-receipts'
import { notifyAdministrators } from '@/lib/deposit-notifications'

export const dynamic='force-dynamic'

function isUuid(value:string){
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

export async function GET(request:NextRequest){
  const user=await getAuthUser(request)
  if(!user) return NextResponse.json({error:'Unauthorized'},{status:401})
  if(user.role!=='bridger') return NextResponse.json({error:'Only Bridgers can access this inventory'},{status:403})

  await ensureBridgerNumberEngineSchema(getSql())
  const pool=getPool()
  const client=await pool.connect()
  try{
    const available=(await client.query(`
      SELECT id,country,price_flame_coin,status,created_at
      FROM bridger_whatsapp_numbers
      WHERE status='available' AND assigned_to IS NULL
      ORDER BY country ASC,price_flame_coin ASC,created_at ASC
      LIMIT 200
    `)).rows

    const offers=(await client.query(`
      SELECT
        o.country,
        o.price_flame_coin,
        o.delivery_minutes,
        o.enabled,
        COALESCE(stock.stock_count,0)::int AS stock_count
      FROM bridger_number_country_offers o
      LEFT JOIN LATERAL (
        SELECT COUNT(*)::int AS stock_count
        FROM bridger_whatsapp_numbers n
        WHERE LOWER(n.country)=LOWER(o.country)
          AND n.status='available'
          AND n.assigned_to IS NULL
      ) stock ON true
      WHERE o.enabled=true
      ORDER BY CASE WHEN COALESCE(stock.stock_count,0)>0 THEN 0 ELSE 1 END,o.country ASC
    `)).rows

    const mine=(await client.query(`
      SELECT id,phone_e164,country,price_flame_coin,status,assigned_at
      FROM bridger_whatsapp_numbers
      WHERE assigned_to=$1::uuid
      ORDER BY assigned_at DESC
    `,[user.id])).rows

    const orders=(await client.query(`
      SELECT
        o.id,o.country,o.price_flame_coin,o.status,o.deadline_at,o.admin_message,
        o.delivered_at,o.cancelled_at,o.created_at,
        n.phone_e164,n.id AS number_id
      FROM bridger_number_orders o
      LEFT JOIN bridger_whatsapp_numbers n ON n.id=o.number_id
      WHERE o.bridger_id=$1::uuid
      ORDER BY o.created_at DESC
      LIMIT 100
    `,[user.id])).rows

    return NextResponse.json(
      {success:true,available,offers,mine,orders},
      {headers:{'Cache-Control':'private, no-store'}},
    )
  } finally {
    client.release()
  }
}

export async function POST(request:NextRequest){
  const user=await getAuthUser(request)
  if(!user) return NextResponse.json({error:'Unauthorized'},{status:401})
  if(user.role!=='bridger') return NextResponse.json({error:'Only Bridgers can purchase or order numbers'},{status:403})

  const body=await request.json().catch(()=>({}))
  const action=String(body.action||((body.numberId||body.number_id)?'purchase_number':'')).trim()
  const numberId=String(body.numberId||body.number_id||'').trim()
  const country=normalizeCountry(body.country)

  if(!['purchase_number','purchase_country','order_country'].includes(action)){
    return NextResponse.json({error:'Choose a number purchase or country order action'},{status:400})
  }
  if(action==='purchase_number'&&!isUuid(numberId)){
    return NextResponse.json({error:'Valid number selection required'},{status:400})
  }
  if((action==='purchase_country'||action==='order_country')&&!country){
    return NextResponse.json({error:'Country is required'},{status:400})
  }

  await ensureBridgerNumberEngineSchema(getSql())
  const pool=getPool()
  const client=await pool.connect()

  try{
    await client.query('BEGIN')

    const position=await ensureBridgerNumberPosition(client,user.id)
    if(!position.ok){
      await client.query('ROLLBACK')
      return NextResponse.json({error:position.error},{status:403})
    }

    const wallet=await ensurePrimaryWallet(client,user.id)
    const before=Number(wallet.balance_trx)||0

    if(action==='order_country'){
      const offer=(await client.query(`
        SELECT country,price_flame_coin,delivery_minutes
        FROM bridger_number_country_offers
        WHERE LOWER(country)=LOWER($1) AND enabled=true
        FOR UPDATE
      `,[country])).rows[0]
      if(!offer){
        await client.query('ROLLBACK')
        return NextResponse.json({error:'That country is not currently open for WEAVE number orders'},{status:404})
      }

      const stocked=(await client.query(`
        SELECT id
        FROM bridger_whatsapp_numbers
        WHERE LOWER(country)=LOWER($1)
          AND status='available'
          AND assigned_to IS NULL
        ORDER BY created_at ASC
        LIMIT 1
        FOR UPDATE
      `,[offer.country])).rows[0]
      if(stocked){
        await client.query('ROLLBACK')
        return NextResponse.json({
          error:'A number for this country is currently in stock. Purchase it immediately from the bay.',
          gate:'stock_available',
          stockAvailable:true,
        },{status:409})
      }

      const existing=(await client.query(`
        SELECT id,status,deadline_at
        FROM bridger_number_orders
        WHERE bridger_id=$1::uuid
          AND LOWER(country)=LOWER($2)
          AND status IN ('requested','fulfilling')
        ORDER BY created_at DESC
        LIMIT 1
      `,[user.id,offer.country])).rows[0]
      if(existing){
        await client.query('ROLLBACK')
        return NextResponse.json({
          error:'You already have an active order for this country.',
          order:existing,
        },{status:409})
      }

      const price=Number(offer.price_flame_coin)
      if(before<price){
        await client.query('ROLLBACK')
        return NextResponse.json({
          error:'Insufficient Flame Coin balance',
          required:price,
          currentBalance:before,
        },{status:400})
      }

      const after=before-price
      await client.query(`
        UPDATE wallets
        SET balance_trx=$1,updated_at=NOW()
        WHERE id=$2::uuid
      `,[after,wallet.id])

      const order=(await client.query(`
        INSERT INTO bridger_number_orders (
          bridger_id,country,price_flame_coin,status,deadline_at
        )
        VALUES (
          $1::uuid,$2,$3,'requested',NOW()+($4::int*interval '1 minute')
        )
        RETURNING *
      `,[user.id,offer.country,price,Number(offer.delivery_minutes)||30])).rows[0]

      await client.query(`
        INSERT INTO ledger_entries(
          id,user_id,entry_type,amount,currency,description,balance_before,balance_after,created_at
        )
        VALUES(
          gen_random_uuid(),$1::uuid,'whatsapp_number_order',$2,'Flame Coin',$3,$4,$5,NOW()
        )
      `,[
        user.id,
        price,
        `Ordered WEAVE WhatsApp business number for ${offer.country}; Administration delivery due within ${Number(offer.delivery_minutes)||30} minutes`,
        before,
        after,
      ])

      await client.query('COMMIT')

      await notifyAdministrators({
        type:'bridger_number_order',
        title:`Number order · ${offer.country}`,
        content:`${user.name||user.email||'A Bridger'} ordered a WEAVE WhatsApp number for ${offer.country}. Delivery is due by ${new Date(order.deadline_at).toLocaleString()}.`,
        link:'/admin/bridger-numbers',
        fromUserId:user.id,
        fromUserName:user.name||'Bridger',
      })

      const receipt=await issueWeaveReceipt({
        userId:user.id,
        kind:'purchase',
        source:'bridger_whatsapp_number_order',
        sourceId:String(order.id),
        amount:price,
        currency:'Flame Coin',
        status:'pending',
        description:`WEAVE Worldwide WhatsApp Number order · ${offer.country}`,
        metadata:{
          country:offer.country,
          deliveryDeadline:order.deadline_at,
          balanceAfter:after,
        },
      })

      return NextResponse.json({
        success:true,
        ordered:true,
        order,
        newBalance:after,
        receipt,
      },{headers:{'Cache-Control':'private, no-store'}})
    }

    let number:any=null

    if(action==='purchase_number'){
      number=(await client.query(`
        SELECT *
        FROM bridger_whatsapp_numbers
        WHERE id=$1::uuid
          AND status='available'
          AND assigned_to IS NULL
        FOR UPDATE
      `,[numberId])).rows[0]
    }else{
      const offer=(await client.query(`
        SELECT country
        FROM bridger_number_country_offers
        WHERE LOWER(country)=LOWER($1) AND enabled=true
        LIMIT 1
      `,[country])).rows[0]
      if(!offer){
        await client.query('ROLLBACK')
        return NextResponse.json({error:'That country is not currently open in the Number Bay'},{status:404})
      }
      number=(await client.query(`
        SELECT *
        FROM bridger_whatsapp_numbers
        WHERE LOWER(country)=LOWER($1)
          AND status='available'
          AND assigned_to IS NULL
        ORDER BY created_at ASC
        LIMIT 1
        FOR UPDATE
      `,[offer.country])).rows[0]
    }

    if(!number){
      await client.query('ROLLBACK')
      return NextResponse.json({
        error:'No stocked number is available for that selection. Place a 30-minute country order instead.',
        gate:'out_of_stock',
      },{status:409})
    }

    const price=Number(number.price_flame_coin)
    if(before<price){
      await client.query('ROLLBACK')
      return NextResponse.json({
        error:'Insufficient Flame Coin balance',
        required:price,
        currentBalance:before,
      },{status:400})
    }

    const after=before-price
    await client.query(`
      UPDATE wallets
      SET balance_trx=$1,updated_at=NOW()
      WHERE id=$2::uuid
    `,[after,wallet.id])

    await client.query(`
      INSERT INTO ledger_entries(
        id,user_id,entry_type,amount,currency,description,balance_before,balance_after,created_at
      )
      VALUES(
        gen_random_uuid(),$1::uuid,'whatsapp_number_purchase',$2,'Flame Coin',$3,$4,$5,NOW()
      )
    `,[
      user.id,
      price,
      `Purchased assigned WhatsApp business number ${number.id}`,
      before,
      after,
    ])

    const assigned=(await client.query(`
      UPDATE bridger_whatsapp_numbers
      SET status='assigned',assigned_to=$1::uuid,assigned_at=NOW(),updated_at=NOW()
      WHERE id=$2::uuid
      RETURNING *
    `,[user.id,number.id])).rows[0]

    await client.query('COMMIT')

    const receipt=await issueWeaveReceipt({
      userId:user.id,
      kind:'purchase',
      source:'bridger_whatsapp_number',
      sourceId:String(number.id),
      amount:price,
      currency:'Flame Coin',
      status:'completed',
      description:'Bridger WhatsApp business number assignment',
      metadata:{
        country:number.country,
        product:'WEAVE Worldwide WhatsApp Number',
        balanceAfter:after,
      },
    })

    const publicNumber={
      id:assigned.id,
      phone_e164:assigned.phone_e164,
      country:assigned.country,
      price_flame_coin:assigned.price_flame_coin,
      status:assigned.status,
      assigned_at:assigned.assigned_at,
    }

    return NextResponse.json({
      success:true,
      number:publicNumber,
      newBalance:after,
      receipt,
    },{headers:{'Cache-Control':'private, no-store'}})
  }catch(error){
    await client.query('ROLLBACK').catch(()=>null)
    console.error('[Bridger Number purchase/order]',error)
    return NextResponse.json({error:'Number Bay movement failed'},{status:500})
  }finally{
    client.release()
  }
}
