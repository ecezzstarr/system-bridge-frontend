import { randomUUID } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { getPool } from '@/lib/db'
import { getWeavePublicOrigin } from '@/lib/weave-origin'
import {
  ensureVideoAdStudioSchema,
  ensureVideoServiceProfile,
  listVideoStudioPackages,
  mapVideoServiceOrder,
  mapVideoStudioOrder,
  VIDEO_STUDIO_CUSTOMER_ROLES,
} from '@/lib/video-ad-studio'
import { ensureVideoAdWorkshopSchema, generateVideoAdStoryboard, mapVideoAdProject, type VideoAdScene } from '@/lib/video-ad-workshop'

function receiptNumber() {
  return `WEAVE-PUR-${Date.now()}-${randomUUID().slice(0,8).toUpperCase()}`
}

function text(value: unknown, max: number) {
  return String(value || '').trim().slice(0, max)
}

function assetTypeFromUrl(url:string): 'image' | 'video' {
  return /\.(mp4|webm|mov)(?:$|\?)/i.test(url) ? 'video' : 'image'
}

function providerName(user:any) {
  return text(user?.name || user?.username || user?.email || 'WEAVE Producer',160)
}

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user) return NextResponse.json({ success:false, error:'Unauthorized' }, { status:401 })
  if (user.role === 'admin') return NextResponse.json({ success:true, admin:true, packages:await listVideoStudioPackages(true), orders:[] })
  if (!VIDEO_STUDIO_CUSTOMER_ROLES.has(user.role || '')) return NextResponse.json({ success:false, error:'Video Ad Studio is available to Agents, Bridgers and Clients' }, { status:403 })

  try {
    await Promise.all([ensureVideoAdStudioSchema(),ensureVideoAdWorkshopSchema()])
    const pool = getPool()
    const profile = await ensureVideoServiceProfile(user.id,providerName(user))
    const [packages, orders, wallet, prices, serviceOrders, projects] = await Promise.all([
      listVideoStudioPackages(false),
      pool.query('SELECT * FROM video_ad_studio_orders WHERE user_id=$1::uuid ORDER BY created_at DESC LIMIT 50', [user.id]),
      pool.query('SELECT balance_trx FROM wallets WHERE user_id=$1::uuid AND is_primary=true LIMIT 1', [user.id]),
      pool.query(`SELECT p.package_key,p.personal_price,p.business_price,p.currency,p.active
                  FROM video_ad_service_prices p WHERE p.user_id=$1::uuid`,[user.id]),
      pool.query('SELECT * FROM video_ad_service_orders WHERE provider_user_id=$1::uuid ORDER BY created_at DESC LIMIT 100',[user.id]),
      pool.query('SELECT * FROM admin_video_ad_projects WHERE created_by=$1::uuid AND order_id IS NOT NULL ORDER BY updated_at DESC LIMIT 60',[user.id]),
    ])
    return NextResponse.json({
      success:true,
      packages,
      orders:orders.rows.map(mapVideoStudioOrder),
      balanceFlameCoin:Number(wallet.rows[0]?.balance_trx || 0),
      serviceProfile:profile,
      serviceDoorUrl:`${getWeavePublicOrigin()}/video-service/${profile.publicCode}`,
      servicePrices:prices.rows.map((row:any)=>({
        packageKey:String(row.package_key),
        personalPrice:row.personal_price===null?null:Number(row.personal_price),
        businessPrice:row.business_price===null?null:Number(row.business_price),
        currency:String(row.currency||'NGN'),
        active:Boolean(row.active),
      })),
      serviceOrders:serviceOrders.rows.map(mapVideoServiceOrder),
      projects:projects.rows.map(mapVideoAdProject),
    }, { headers:{ 'Cache-Control':'private, no-store' } })
  } catch (error:any) {
    console.error('[Video Ad Studio] GET failed:', error)
    return NextResponse.json({ success:false, error:error.message || 'Unable to load Video Ad Studio' }, { status:500 })
  }
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user) return NextResponse.json({ success:false, error:'Unauthorized' }, { status:401 })
  if (!VIDEO_STUDIO_CUSTOMER_ROLES.has(user.role || '')) return NextResponse.json({ success:false, error:'Video Ad Studio purchases are for Agents, Bridgers and Clients' }, { status:403 })

  const pool = getPool()
  let body:any
  try { body = await request.json() } catch { body = {} }
  const action = text(body?.action,64)

  try {
    await ensureVideoAdStudioSchema()

    if (action === 'save_service_profile') {
      const displayName = text(body?.displayName,160) || providerName(user)
      const tagline = text(body?.tagline,500)
      const active = body?.active !== false
      const result = await pool.query(
        `INSERT INTO video_ad_service_profiles(user_id,display_name,tagline,active)
         VALUES($1::uuid,$2,$3,$4)
         ON CONFLICT(user_id) DO UPDATE SET display_name=EXCLUDED.display_name,tagline=EXCLUDED.tagline,active=EXCLUDED.active,updated_at=NOW()
         RETURNING *`,
        [user.id,displayName,tagline,active]
      )
      return NextResponse.json({ success:true, profile:result.rows[0] })
    }

    if (action === 'save_service_prices') {
      const rows = Array.isArray(body?.prices) ? body.prices.slice(0,20) : []
      if (!rows.length) return NextResponse.json({ success:false, error:'At least one service price is required' },{status:400})
      for (const item of rows) {
        const packageKey = text(item?.packageKey,80)
        const currency = text(item?.currency,12).toUpperCase() || 'NGN'
        const personalPrice = item?.personalPrice === '' || item?.personalPrice === null || item?.personalPrice === undefined ? null : Number(item.personalPrice)
        const businessPrice = item?.businessPrice === '' || item?.businessPrice === null || item?.businessPrice === undefined ? null : Number(item.businessPrice)
        if (!packageKey || (personalPrice!==null&&(!Number.isFinite(personalPrice)||personalPrice<0)) || (businessPrice!==null&&(!Number.isFinite(businessPrice)||businessPrice<0))) {
          return NextResponse.json({ success:false, error:'Service prices must be valid non-negative amounts' },{status:400})
        }
        await pool.query(
          `INSERT INTO video_ad_service_prices(user_id,package_key,personal_price,business_price,currency,active)
           SELECT $1::uuid,p.package_key,$3,$4,$5,true FROM video_ad_studio_packages p WHERE p.package_key=$2
           ON CONFLICT(user_id,package_key) DO UPDATE SET personal_price=EXCLUDED.personal_price,business_price=EXCLUDED.business_price,currency=EXCLUDED.currency,active=true,updated_at=NOW()`,
          [user.id,packageKey,personalPrice,businessPrice,currency]
        )
      }
      return NextResponse.json({ success:true })
    }

    if (action === 'service_order_status') {
      const orderId = text(body?.orderId,80)
      const next = body?.status === 'accepted' ? 'accepted' : body?.status === 'rejected' ? 'rejected' : null
      if (!orderId || !next) return NextResponse.json({ success:false, error:'Valid outside order status is required' },{status:400})
      const result = await pool.query(
        `UPDATE video_ad_service_orders SET status=$3,updated_at=NOW()
         WHERE id=$1::uuid AND provider_user_id=$2::uuid AND status IN ('requested','accepted') RETURNING *`,
        [orderId,user.id,next]
      )
      if (!result.rows[0]) return NextResponse.json({ success:false, error:'Outside order cannot be changed' },{status:404})
      return NextResponse.json({ success:true, serviceOrder:mapVideoServiceOrder(result.rows[0]) })
    }

    if (action === 'record_customer_payment') {
      const orderId = text(body?.orderId,80)
      const result = await pool.query(
        `UPDATE video_ad_service_orders SET customer_payment_status='received',status=CASE WHEN status='requested' THEN 'accepted' ELSE status END,updated_at=NOW()
         WHERE id=$1::uuid AND provider_user_id=$2::uuid AND status NOT IN ('rejected','delivered') RETURNING *`,
        [orderId,user.id]
      )
      if (!result.rows[0]) return NextResponse.json({ success:false, error:'Outside order not found or already closed' },{status:404})
      return NextResponse.json({ success:true, serviceOrder:mapVideoServiceOrder(result.rows[0]), evidence:'Provider recorded customer payment as received outside WEAVE' })
    }

    if (action === 'add_service_asset') {
      const orderId = text(body?.orderId,80)
      const url = text(body?.url,2048)
      if (!orderId || !url) return NextResponse.json({ success:false, error:'Order and uploaded media are required' },{status:400})
      const current = await pool.query('SELECT assets FROM video_ad_service_orders WHERE id=$1::uuid AND provider_user_id=$2::uuid',[orderId,user.id])
      if (!current.rows[0]) return NextResponse.json({ success:false, error:'Outside order not found' },{status:404})
      const assets = Array.isArray(current.rows[0].assets) ? current.rows[0].assets.map(String).filter(Boolean) : []
      if (!assets.includes(url)) assets.push(url)
      const result = await pool.query('UPDATE video_ad_service_orders SET assets=$3::jsonb,updated_at=NOW() WHERE id=$1::uuid AND provider_user_id=$2::uuid RETURNING *',[orderId,user.id,JSON.stringify(assets.slice(0,24))])
      return NextResponse.json({ success:true, serviceOrder:mapVideoServiceOrder(result.rows[0]) })
    }

    if (action === 'activate_service_order') {
      const orderId = text(body?.orderId,80)
      if (!orderId) return NextResponse.json({ success:false, error:'Outside order id is required' },{status:400})
      await ensureVideoAdWorkshopSchema()
      const source = await pool.query('SELECT * FROM video_ad_service_orders WHERE id=$1::uuid AND provider_user_id=$2::uuid LIMIT 1',[orderId,user.id])
      const preview = source.rows[0]
      if (!preview) return NextResponse.json({ success:false, error:'Outside order not found' },{status:404})
      if (preview.customer_payment_status !== 'received') return NextResponse.json({ success:false, error:'Record the outside customer payment before using the WEAVE Studio for this job' },{status:409})
      if (preview.project_id) {
        const existing = await pool.query('SELECT * FROM admin_video_ad_projects WHERE id=$1::uuid AND created_by=$2::uuid',[preview.project_id,user.id])
        return NextResponse.json({ success:true, existing:true, serviceOrder:mapVideoServiceOrder(preview), project:existing.rows[0]?mapVideoAdProject(existing.rows[0]):null })
      }
      const generated = await generateVideoAdStoryboard({
        title:String(preview.business_name || preview.customer_name),
        subject:String(preview.subject),
        objective:String(preview.objective),
        audience:String(preview.audience),
        durationSeconds:Number(preview.duration_seconds),
      })
      const sourceAssets = Array.isArray(preview.assets)?preview.assets.map(String).filter(Boolean):[]
      const storyboard:VideoAdScene[] = generated.scenes.map((scene,index)=>{
        const assetUrl = sourceAssets.length ? sourceAssets[index % sourceAssets.length] : null
        return { ...scene, assetUrl, assetType:assetUrl?assetTypeFromUrl(assetUrl):null }
      })

      const client = await pool.connect()
      try {
        await client.query('BEGIN')
        const locked = await client.query('SELECT * FROM video_ad_service_orders WHERE id=$1::uuid AND provider_user_id=$2::uuid FOR UPDATE',[orderId,user.id])
        const serviceOrder = locked.rows[0]
        if (!serviceOrder) throw new Error('Outside order not found')
        if (serviceOrder.customer_payment_status !== 'received') throw new Error('Customer payment must be recorded before Studio use')
        if (serviceOrder.project_id) {
          await client.query('ROLLBACK')
          const existing = await pool.query('SELECT * FROM admin_video_ad_projects WHERE id=$1::uuid',[serviceOrder.project_id])
          return NextResponse.json({ success:true, existing:true, serviceOrder:mapVideoServiceOrder(serviceOrder), project:existing.rows[0]?mapVideoAdProject(existing.rows[0]):null })
        }
        const packResult = await client.query('SELECT * FROM video_ad_studio_packages WHERE package_key=$1 AND active=true FOR SHARE',[serviceOrder.package_key])
        const pack = packResult.rows[0]
        if (!pack) throw new Error('This Studio package is no longer available')
        const studioFee = Number(pack.price_flame_coin)
        const walletResult = await client.query('SELECT id,balance_trx FROM wallets WHERE user_id=$1::uuid AND is_primary=true FOR UPDATE',[user.id])
        const wallet = walletResult.rows[0]
        const balance = Number(wallet?.balance_trx || 0)
        if (!wallet || balance < studioFee) {
          await client.query('ROLLBACK')
          return NextResponse.json({ success:false, error:'Insufficient Flame Coin to pay Administration for this Studio use', requiredFlameCoin:studioFee, availableFlameCoin:balance },{status:402})
        }
        await client.query('UPDATE wallets SET balance_trx=balance_trx-$1,updated_at=NOW() WHERE id=$2::uuid',[studioFee,wallet.id])
        const studioResult = await client.query(
          `INSERT INTO video_ad_studio_orders
           (user_id,user_role,package_key,package_name,duration_seconds,price_flame_coin,business_name,subject,objective,audience,notes,assets,status,order_source,service_order_id)
           VALUES($1::uuid,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,'in_production','outside_client',$13::uuid) RETURNING *`,
          [user.id,user.role,pack.package_key,pack.name,pack.duration_seconds,studioFee,String(serviceOrder.business_name||serviceOrder.customer_name),serviceOrder.subject,serviceOrder.objective,serviceOrder.audience,serviceOrder.notes,JSON.stringify(sourceAssets),serviceOrder.id]
        )
        const studioOrder = studioResult.rows[0]
        const projectResult = await client.query(
          `INSERT INTO admin_video_ad_projects(created_by,order_id,title,subject,objective,audience,duration_seconds,aspect_ratio,status,storyboard)
           VALUES($1::uuid,$2::uuid,$3,$4,$5,$6,$7,'9:16','planned',$8::jsonb) RETURNING *`,
          [user.id,studioOrder.id,String(serviceOrder.business_name||serviceOrder.customer_name),serviceOrder.subject,serviceOrder.objective,serviceOrder.audience,Number(pack.duration_seconds),JSON.stringify(storyboard)]
        )
        const project = projectResult.rows[0]
        await client.query('UPDATE video_ad_studio_orders SET project_id=$2::uuid WHERE id=$1::uuid',[studioOrder.id,project.id])
        await client.query("UPDATE video_ad_service_orders SET status='in_production',studio_order_id=$2::uuid,project_id=$3::uuid,updated_at=NOW() WHERE id=$1::uuid",[serviceOrder.id,studioOrder.id,project.id])
        const receipt = receiptNumber()
        await client.query(
          `INSERT INTO weave_receipts(receipt_number,user_id,kind,source,source_id,amount,currency,status,description,metadata)
           VALUES($1,$2::uuid,'purchase','video_ad_studio',$3,$4,'FLAME_COIN','paid',$5,$6::jsonb)`,
          [receipt,user.id,String(studioOrder.id),studioFee,`${pack.name} · Studio use for outside customer order`,JSON.stringify({ packageKey:pack.package_key, serviceOrderId:serviceOrder.id, orderSource:'outside_client' })]
        )
        await client.query('COMMIT')
        return NextResponse.json({ success:true, receiptNumber:receipt, studioFeeFlameCoin:studioFee, balanceFlameCoin:balance-studioFee, serviceOrderId:serviceOrder.id, studioOrder:mapVideoStudioOrder({...studioOrder,project_id:project.id}), project:mapVideoAdProject(project), provider:generated.provider },{status:201})
      } catch (error) {
        await client.query('ROLLBACK').catch(()=>{})
        throw error
      } finally { client.release() }
    }

    if (action === 'deliver_service_order') {
      const orderId = text(body?.orderId,80)
      const result = await pool.query(
        `UPDATE video_ad_service_orders SET status='delivered',updated_at=NOW()
         WHERE id=$1::uuid AND provider_user_id=$2::uuid AND status='ready' AND output_url IS NOT NULL RETURNING *`,
        [orderId,user.id]
      )
      if (!result.rows[0]) return NextResponse.json({ success:false, error:'Only a ready outside video can be marked delivered' },{status:409})
      if (result.rows[0].studio_order_id) await pool.query("UPDATE video_ad_studio_orders SET status='delivered',updated_at=NOW() WHERE id=$1::uuid",[result.rows[0].studio_order_id])
      return NextResponse.json({ success:true, serviceOrder:mapVideoServiceOrder(result.rows[0]) })
    }

    return purchaseOwnVideo(user,body)
  } catch (error:any) {
    console.error('[Video Ad Studio] action failed:', error)
    return NextResponse.json({ success:false, error:error.message || 'Video Studio action could not be completed' }, { status:500 })
  }
}

async function purchaseOwnVideo(user:any, body:any) {
  const pool = getPool()
  const client = await pool.connect()
  try {
    const packageKey = text(body?.packageKey, 80)
    const businessName = text(body?.businessName, 180)
    const subject = text(body?.subject, 1600)
    const objective = text(body?.objective, 1600)
    const audience = text(body?.audience, 900)
    const notes = text(body?.notes, 2000)
    const assets = Array.isArray(body?.assets) ? body.assets.map((item:unknown)=>text(item, 2048)).filter(Boolean).slice(0,12) : []
    if (!packageKey || !businessName || !subject || !objective || !audience) return NextResponse.json({ success:false, error:'Choose a video package and provide the business name, subject, objective and audience' }, { status:400 })

    await client.query('BEGIN')
    const packageResult = await client.query('SELECT * FROM video_ad_studio_packages WHERE package_key=$1 AND active=true FOR SHARE',[packageKey])
    const pack = packageResult.rows[0]
    if (!pack) { await client.query('ROLLBACK'); return NextResponse.json({ success:false, error:'This Video Ad Studio package is not currently available' }, { status:404 }) }
    const price = Number(pack.price_flame_coin)
    const walletResult = await client.query('SELECT id,balance_trx FROM wallets WHERE user_id=$1::uuid AND is_primary=true FOR UPDATE',[user.id])
    const wallet = walletResult.rows[0]
    const balance = Number(wallet?.balance_trx || 0)
    if (!wallet || balance < price) { await client.query('ROLLBACK'); return NextResponse.json({ success:false, error:'Insufficient Flame Coin for this video package', requiredFlameCoin:price, availableFlameCoin:balance }, { status:402 }) }

    await client.query('UPDATE wallets SET balance_trx=balance_trx-$1,updated_at=NOW() WHERE id=$2::uuid', [price, wallet.id])
    const orderResult = await client.query(
      `INSERT INTO video_ad_studio_orders
       (user_id,user_role,package_key,package_name,duration_seconds,price_flame_coin,business_name,subject,objective,audience,notes,assets,status,order_source)
       VALUES($1::uuid,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,'paid','self') RETURNING *`,
      [user.id,user.role,pack.package_key,pack.name,pack.duration_seconds,price,businessName,subject,objective,audience,notes,JSON.stringify(assets)]
    )
    const order = orderResult.rows[0]
    const receipt = receiptNumber()
    await client.query(
      `INSERT INTO weave_receipts(receipt_number,user_id,kind,source,source_id,amount,currency,status,description,metadata)
       VALUES($1,$2::uuid,'purchase','video_ad_studio',$3,$4,'FLAME_COIN','paid',$5,$6::jsonb)`,
      [receipt,user.id,String(order.id),price,`${pack.name} · ${pack.duration_seconds}s Video Ad Studio production`,JSON.stringify({ packageKey, businessName, durationSeconds:Number(pack.duration_seconds), orderSource:'self' })]
    )
    await client.query('COMMIT')
    return NextResponse.json({ success:true, order:mapVideoStudioOrder(order), receiptNumber:receipt, balanceFlameCoin:balance-price }, { status:201 })
  } catch (error:any) {
    await client.query('ROLLBACK').catch(()=>{})
    throw error
  } finally { client.release() }
}
