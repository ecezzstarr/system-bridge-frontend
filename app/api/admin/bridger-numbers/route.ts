import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { getPool, getSql } from '@/lib/db'
import {
  BRIDGER_NUMBER_ORDER_DELIVERY_MINUTES,
  ensureBridgerNumberEngineSchema,
  ensurePrimaryWallet,
  normalizeCountry,
  normalizeE164,
} from '@/lib/bridger-number-engine'
import { notifyUser } from '@/lib/deposit-notifications'

export const dynamic='force-dynamic'

function isUuid(value:string){
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

export async function GET(request:NextRequest){
  const user=await getAuthUser(request)
  if(!user) return NextResponse.json({error:'Unauthorized'},{status:401})
  if(user.role!=='admin') return NextResponse.json({error:'Forbidden'},{status:403})

  const sql=getSql()
  await ensureBridgerNumberEngineSchema(sql)

  const [numbers,offers,orders]=await Promise.all([
    sql`
      SELECT n.*,u.name AS assigned_name,u.email AS assigned_email
      FROM bridger_whatsapp_numbers n
      LEFT JOIN users u ON u.id=n.assigned_to
      ORDER BY n.created_at DESC
      LIMIT 500
    `,
    sql`
      SELECT
        o.country,o.price_flame_coin,o.enabled,o.delivery_minutes,o.updated_at,
        COALESCE(stock.stock_count,0)::int AS stock_count
      FROM bridger_number_country_offers o
      LEFT JOIN LATERAL (
        SELECT COUNT(*)::int AS stock_count
        FROM bridger_whatsapp_numbers n
        WHERE LOWER(n.country)=LOWER(o.country)
          AND n.status='available'
          AND n.assigned_to IS NULL
      ) stock ON true
      ORDER BY o.enabled DESC,o.country ASC
    `,
    sql`
      SELECT
        o.*,
        u.name AS bridger_name,
        u.email AS bridger_email,
        n.phone_e164,
        CASE WHEN o.status IN ('requested','fulfilling') AND o.deadline_at<NOW() THEN true ELSE false END AS overdue
      FROM bridger_number_orders o
      JOIN users u ON u.id=o.bridger_id
      LEFT JOIN bridger_whatsapp_numbers n ON n.id=o.number_id
      ORDER BY
        CASE WHEN o.status IN ('requested','fulfilling') THEN 0 ELSE 1 END,
        o.deadline_at ASC,
        o.created_at DESC
      LIMIT 300
    `,
  ])

  return NextResponse.json(
    {success:true,numbers,offers,orders},
    {headers:{'Cache-Control':'private, no-store'}},
  )
}

export async function POST(request:NextRequest){
  const user=await getAuthUser(request)
  if(!user) return NextResponse.json({error:'Unauthorized'},{status:401})
  if(user.role!=='admin') return NextResponse.json({error:'Forbidden'},{status:403})

  const body=await request.json().catch(()=>({}))
  const action=String(body.action||'load_number')

  const sql=getSql()
  await ensureBridgerNumberEngineSchema(sql)

  if(action==='upsert_offer'){
    const country=normalizeCountry(body.country)
    const price=Number(body.priceFlameCoin)
    const deliveryMinutes=Math.max(5,Math.min(120,Number(body.deliveryMinutes)||BRIDGER_NUMBER_ORDER_DELIVERY_MINUTES))
    if(!country) return NextResponse.json({error:'Country is required'},{status:400})
    if(!Number.isFinite(price)||price<=0) return NextResponse.json({error:'Enter a valid Bridger price in Flame Coin'},{status:400})

    const [offer]=await sql`
      INSERT INTO bridger_number_country_offers(
        country,price_flame_coin,enabled,delivery_minutes,updated_by
      )
      VALUES(
        ${country},${price},true,${deliveryMinutes},${user.id}::uuid
      )
      ON CONFLICT (country) DO UPDATE SET
        price_flame_coin=EXCLUDED.price_flame_coin,
        enabled=true,
        delivery_minutes=EXCLUDED.delivery_minutes,
        updated_by=EXCLUDED.updated_by,
        updated_at=NOW()
      RETURNING *
    `
    return NextResponse.json({success:true,offer})
  }

  const phone=normalizeE164(body.phone)
  const country=normalizeCountry(body.country)
  const provider='Aphone'
  const providerReference=String(body.providerReference||'').trim().slice(0,220)
  const notes=String(body.notes||'').trim().slice(0,2000)
  const acquisitionCost=body.acquisitionCost===''||body.acquisitionCost==null?null:Number(body.acquisitionCost)
  const priceRaw=body.priceFlameCoin
  const price=priceRaw===''||priceRaw==null?NaN:Number(priceRaw)

  if(!phone) return NextResponse.json({error:'Enter the provisioned number in E.164 format, for example +2348012345678.'},{status:400})
  if(!country) return NextResponse.json({error:'Country is required'},{status:400})
  if(acquisitionCost!==null&&(!Number.isFinite(acquisitionCost)||acquisitionCost<0)){
    return NextResponse.json({error:'Valid Aphone acquisition cost is required'},{status:400})
  }
  if(!Number.isFinite(price)||price<=0){
    return NextResponse.json({error:'Enter the Bridger purchase price in Flame Coin (greater than 0)'},{status:400})
  }

  try{
    const [number]=await sql`
      INSERT INTO bridger_whatsapp_numbers
        (phone_e164,country,provider,provider_reference,acquisition_cost,price_flame_coin,status,notes,created_by)
      VALUES
        (${phone},${country},${provider},${providerReference||null},${acquisitionCost},${price},'available',${notes||null},${user.id}::uuid)
      RETURNING *
    `

    await sql`
      INSERT INTO bridger_number_country_offers(
        country,price_flame_coin,enabled,delivery_minutes,updated_by
      )
      VALUES(
        ${country},${price},true,${BRIDGER_NUMBER_ORDER_DELIVERY_MINUTES},${user.id}::uuid
      )
      ON CONFLICT (country) DO UPDATE SET
        price_flame_coin=EXCLUDED.price_flame_coin,
        enabled=true,
        updated_by=EXCLUDED.updated_by,
        updated_at=NOW()
    `

    return NextResponse.json({success:true,number})
  }catch(error:any){
    if(String(error?.message||'').toLowerCase().includes('unique')){
      return NextResponse.json({error:'That number is already in the Number Engine.'},{status:409})
    }
    console.error('[Number Engine admin POST]',error)
    return NextResponse.json({error:'Unable to add number'},{status:500})
  }
}

export async function PATCH(request:NextRequest){
  const user=await getAuthUser(request)
  if(!user) return NextResponse.json({error:'Unauthorized'},{status:401})
  if(user.role!=='admin') return NextResponse.json({error:'Forbidden'},{status:403})

  const body=await request.json().catch(()=>({}))
  const action=String(body.action||'inventory_status')
  await ensureBridgerNumberEngineSchema(getSql())

  if(action==='inventory_status'){
    const id=String(body.id||'')
    const status=String(body.status||'')
    if(!isUuid(id)) return NextResponse.json({error:'Valid inventory number required'},{status:400})
    if(!['available','reserved','suspended','retired'].includes(status)){
      return NextResponse.json({error:'Invalid inventory status'},{status:400})
    }
    const sql=getSql()
    const [number]=await sql`
      UPDATE bridger_whatsapp_numbers
      SET status=${status},updated_at=NOW()
      WHERE id=${id}::uuid AND assigned_to IS NULL
      RETURNING *
    `
    if(!number) return NextResponse.json({error:'Only unassigned inventory can be changed here'},{status:409})
    return NextResponse.json({success:true,number})
  }

  const orderId=String(body.orderId||body.id||'')
  if(!isUuid(orderId)) return NextResponse.json({error:'Valid number order required'},{status:400})

  const pool=getPool()
  const client=await pool.connect()
  try{
    await client.query('BEGIN')

    const order=(await client.query(`
      SELECT *
      FROM bridger_number_orders
      WHERE id=$1::uuid
      FOR UPDATE
    `,[orderId])).rows[0]

    if(!order){
      await client.query('ROLLBACK')
      return NextResponse.json({error:'Number order not found'},{status:404})
    }

    if(action==='start_order'){
      if(order.status!=='requested'){
        await client.query('ROLLBACK')
        return NextResponse.json({error:'Only a requested order can enter fulfillment'},{status:409})
      }
      const updated=(await client.query(`
        UPDATE bridger_number_orders
        SET status='fulfilling',admin_message=$2,updated_at=NOW()
        WHERE id=$1::uuid
        RETURNING *
      `,[
        orderId,
        String(body.message||'Administration is acquiring and preparing your number.').trim().slice(0,1000),
      ])).rows[0]
      await client.query('COMMIT')
      await notifyUser(String(order.bridger_id),{
        type:'bridger_number_order',
        title:`Number order in fulfillment · ${order.country}`,
        content:updated.admin_message,
        link:'/bridger/numbers',
        fromUserId:user.id,
        fromUserName:'WEAVE Administration',
      })
      return NextResponse.json({success:true,order:updated})
    }

    if(action==='cancel_order'){
      if(!['requested','fulfilling'].includes(order.status)){
        await client.query('ROLLBACK')
        return NextResponse.json({error:'Only an open number order can be cancelled'},{status:409})
      }
      const wallet=await ensurePrimaryWallet(client,String(order.bridger_id))
      const before=Number(wallet.balance_trx)||0
      const refund=Number(order.price_flame_coin)||0
      const after=before+refund

      await client.query(`
        UPDATE wallets SET balance_trx=$1,updated_at=NOW() WHERE id=$2::uuid
      `,[after,wallet.id])

      await client.query(`
        INSERT INTO ledger_entries(
          id,user_id,entry_type,amount,currency,description,balance_before,balance_after,created_at
        )
        VALUES(
          gen_random_uuid(),$1::uuid,'whatsapp_number_order_refund',$2,'Flame Coin',$3,$4,$5,NOW()
        )
      `,[
        order.bridger_id,
        refund,
        `Refunded cancelled WEAVE WhatsApp number order ${order.id} for ${order.country}`,
        before,
        after,
      ])

      const message=String(body.message||'Administration cancelled this number order and returned the Flame Coin to your wallet.').trim().slice(0,1000)
      const updated=(await client.query(`
        UPDATE bridger_number_orders
        SET status='cancelled',admin_message=$2,cancelled_at=NOW(),updated_at=NOW()
        WHERE id=$1::uuid
        RETURNING *
      `,[orderId,message])).rows[0]

      await client.query('COMMIT')
      await notifyUser(String(order.bridger_id),{
        type:'bridger_number_order',
        title:`Number order cancelled · ${order.country}`,
        content:`${message} ${refund.toLocaleString()} Flame Coin was returned.`,
        link:'/bridger/numbers',
        fromUserId:user.id,
        fromUserName:'WEAVE Administration',
      })
      return NextResponse.json({success:true,order:updated,refund,newBalance:after})
    }

    if(action!=='deliver_order'){
      await client.query('ROLLBACK')
      return NextResponse.json({error:'Unknown Number Engine action'},{status:400})
    }

    if(!['requested','fulfilling'].includes(order.status)){
      await client.query('ROLLBACK')
      return NextResponse.json({error:'This order is no longer awaiting delivery'},{status:409})
    }

    const existingNumberId=String(body.numberId||'').trim()
    let assigned:any=null

    if(existingNumberId){
      if(!isUuid(existingNumberId)){
        await client.query('ROLLBACK')
        return NextResponse.json({error:'Valid stocked number required'},{status:400})
      }
      const number=(await client.query(`
        SELECT *
        FROM bridger_whatsapp_numbers
        WHERE id=$1::uuid
          AND status='available'
          AND assigned_to IS NULL
          AND LOWER(country)=LOWER($2)
        FOR UPDATE
      `,[existingNumberId,order.country])).rows[0]
      if(!number){
        await client.query('ROLLBACK')
        return NextResponse.json({error:'That stocked number is unavailable or belongs to a different country'},{status:409})
      }
      assigned=(await client.query(`
        UPDATE bridger_whatsapp_numbers
        SET
          status='assigned',
          assigned_to=$1::uuid,
          assigned_at=NOW(),
          updated_at=NOW()
        WHERE id=$2::uuid
        RETURNING *
      `,[order.bridger_id,number.id])).rows[0]
    }else{
      const phone=normalizeE164(body.phone)
      const providerReference=String(body.providerReference||'').trim().slice(0,220)
      const notes=String(body.notes||'').trim().slice(0,2000)
      const acquisitionCost=body.acquisitionCost===''||body.acquisitionCost==null?null:Number(body.acquisitionCost)
      if(!phone){
        await client.query('ROLLBACK')
        return NextResponse.json({error:'Enter the delivered number in E.164 format or choose a stocked number'},{status:400})
      }
      if(acquisitionCost!==null&&(!Number.isFinite(acquisitionCost)||acquisitionCost<0)){
        await client.query('ROLLBACK')
        return NextResponse.json({error:'Valid acquisition cost required'},{status:400})
      }

      try{
        assigned=(await client.query(`
          INSERT INTO bridger_whatsapp_numbers(
            phone_e164,country,provider,provider_reference,acquisition_cost,
            price_flame_coin,status,assigned_to,assigned_at,notes,created_by
          )
          VALUES(
            $1,$2,'Aphone',$3,$4,$5,'assigned',$6::uuid,NOW(),$7,$8::uuid
          )
          RETURNING *
        `,[
          phone,
          order.country,
          providerReference||null,
          acquisitionCost,
          order.price_flame_coin,
          order.bridger_id,
          notes||null,
          user.id,
        ])).rows[0]
      }catch(error:any){
        if(String(error?.message||'').toLowerCase().includes('unique')){
          await client.query('ROLLBACK')
          return NextResponse.json({error:'That delivered number already exists in the Number Engine'},{status:409})
        }
        throw error
      }
    }

    const message=String(body.message||'Administration delivered your ordered WEAVE WhatsApp number. It is now in My Numbers and ready for verification movement.').trim().slice(0,1000)
    const updated=(await client.query(`
      UPDATE bridger_number_orders
      SET
        status='delivered',
        number_id=$2::uuid,
        admin_message=$3,
        delivered_at=NOW(),
        updated_at=NOW()
      WHERE id=$1::uuid
      RETURNING *
    `,[orderId,assigned.id,message])).rows[0]

    await client.query('COMMIT')

    await notifyUser(String(order.bridger_id),{
      type:'bridger_number_order',
      title:`Number delivered · ${order.country}`,
      content:message,
      link:'/bridger/numbers',
      fromUserId:user.id,
      fromUserName:'WEAVE Administration',
    })

    return NextResponse.json({
      success:true,
      order:updated,
      number:{
        id:assigned.id,
        phone_e164:assigned.phone_e164,
        country:assigned.country,
        status:assigned.status,
        assigned_at:assigned.assigned_at,
      },
    })
  }catch(error){
    await client.query('ROLLBACK').catch(()=>null)
    console.error('[Number Engine admin PATCH]',error)
    return NextResponse.json({error:'Unable to complete Number Engine action'},{status:500})
  }finally{
    client.release()
  }
}
