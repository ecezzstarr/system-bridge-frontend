import { randomUUID } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { getPool } from '@/lib/db'
import { ensureVideoAdStudioSchema, listVideoStudioPackages, mapVideoStudioOrder, VIDEO_STUDIO_CUSTOMER_ROLES } from '@/lib/video-ad-studio'

function receiptNumber() {
  return `WEAVE-PUR-${Date.now()}-${randomUUID().slice(0,8).toUpperCase()}`
}

function text(value: unknown, max: number) {
  return String(value || '').trim().slice(0, max)
}

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user) return NextResponse.json({ success:false, error:'Unauthorized' }, { status:401 })
  if (user.role === 'admin') return NextResponse.json({ success:true, admin:true, packages:await listVideoStudioPackages(true), orders:[] })
  if (!VIDEO_STUDIO_CUSTOMER_ROLES.has(user.role)) return NextResponse.json({ success:false, error:'Video Ad Studio is available to Agents, Bridgers and Clients' }, { status:403 })

  try {
    await ensureVideoAdStudioSchema()
    const pool = getPool()
    const [packages, orders, wallet] = await Promise.all([
      listVideoStudioPackages(false),
      pool.query('SELECT * FROM video_ad_studio_orders WHERE user_id=$1::uuid ORDER BY created_at DESC LIMIT 50', [user.id]),
      pool.query('SELECT balance_trx FROM wallets WHERE user_id=$1::uuid AND is_primary=true LIMIT 1', [user.id]),
    ])
    return NextResponse.json({
      success:true,
      packages,
      orders:orders.rows.map(mapVideoStudioOrder),
      balanceFlameCoin:Number(wallet.rows[0]?.balance_trx || 0),
    }, { headers:{ 'Cache-Control':'private, no-store' } })
  } catch (error:any) {
    console.error('[Video Ad Studio] GET failed:', error)
    return NextResponse.json({ success:false, error:error.message || 'Unable to load Video Ad Studio' }, { status:500 })
  }
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user) return NextResponse.json({ success:false, error:'Unauthorized' }, { status:401 })
  if (!VIDEO_STUDIO_CUSTOMER_ROLES.has(user.role)) return NextResponse.json({ success:false, error:'Video Ad Studio purchases are for Agents, Bridgers and Clients' }, { status:403 })

  const pool = getPool()
  const client = await pool.connect()
  try {
    await ensureVideoAdStudioSchema()
    const body = await request.json()
    const packageKey = text(body?.packageKey, 80)
    const businessName = text(body?.businessName, 180)
    const subject = text(body?.subject, 1600)
    const objective = text(body?.objective, 1600)
    const audience = text(body?.audience, 900)
    const notes = text(body?.notes, 2000)
    const assets = Array.isArray(body?.assets)
      ? body.assets.map((item:unknown)=>text(item, 2048)).filter(Boolean).slice(0,12)
      : []
    if (!packageKey || !businessName || !subject || !objective || !audience) {
      return NextResponse.json({ success:false, error:'Choose a video package and provide the business name, subject, objective and audience' }, { status:400 })
    }

    await client.query('BEGIN')
    const packageResult = await client.query(
      'SELECT * FROM video_ad_studio_packages WHERE package_key=$1 AND active=true FOR SHARE',
      [packageKey]
    )
    const pack = packageResult.rows[0]
    if (!pack) {
      await client.query('ROLLBACK')
      return NextResponse.json({ success:false, error:'This Video Ad Studio package is not currently available' }, { status:404 })
    }
    const price = Number(pack.price_flame_coin)
    const walletResult = await client.query(
      'SELECT id,balance_trx FROM wallets WHERE user_id=$1::uuid AND is_primary=true FOR UPDATE',
      [user.id]
    )
    const wallet = walletResult.rows[0]
    const balance = Number(wallet?.balance_trx || 0)
    if (!wallet || balance < price) {
      await client.query('ROLLBACK')
      return NextResponse.json({
        success:false,
        error:'Insufficient Flame Coin for this video package',
        requiredFlameCoin:price,
        availableFlameCoin:balance,
      }, { status:402 })
    }

    await client.query('UPDATE wallets SET balance_trx=balance_trx-$1,updated_at=NOW() WHERE id=$2::uuid', [price, wallet.id])
    const orderResult = await client.query(
      `INSERT INTO video_ad_studio_orders
       (user_id,user_role,package_key,package_name,duration_seconds,price_flame_coin,business_name,subject,objective,audience,notes,assets,status)
       VALUES($1::uuid,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,'paid') RETURNING *`,
      [user.id,user.role,pack.package_key,pack.name,pack.duration_seconds,price,businessName,subject,objective,audience,notes,JSON.stringify(assets)]
    )
    const order = orderResult.rows[0]
    const receipt = receiptNumber()
    await client.query(
      `INSERT INTO weave_receipts(receipt_number,user_id,kind,source,source_id,amount,currency,status,description,metadata)
       VALUES($1,$2::uuid,'purchase','video_ad_studio',$3,$4,'FLAME_COIN','paid',$5,$6::jsonb)`,
      [receipt,user.id,String(order.id),price,`${pack.name} · ${pack.duration_seconds}s Video Ad Studio production`,JSON.stringify({ packageKey, businessName, durationSeconds:Number(pack.duration_seconds) })]
    )
    await client.query('COMMIT')

    return NextResponse.json({
      success:true,
      order:mapVideoStudioOrder(order),
      receiptNumber:receipt,
      balanceFlameCoin:balance-price,
    }, { status:201 })
  } catch (error:any) {
    await client.query('ROLLBACK').catch(()=>{})
    console.error('[Video Ad Studio] purchase failed:', error)
    return NextResponse.json({ success:false, error:error.message || 'Video order could not be created' }, { status:500 })
  } finally {
    client.release()
  }
}
