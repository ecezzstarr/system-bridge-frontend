import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { getPool } from '@/lib/db'
import { ensureVideoAdStudioSchema, listVideoStudioPackages, mapVideoStudioOrder } from '@/lib/video-ad-studio'
import { ensureVideoAdWorkshopSchema, generateVideoAdStoryboard, mapVideoAdProject, type VideoAdScene } from '@/lib/video-ad-workshop'

async function requireAdmin(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user) return { error: NextResponse.json({ success:false, error:'Unauthorized' }, { status:401 }) }
  if (user.role !== 'admin') return { error: NextResponse.json({ success:false, error:'Administration access required' }, { status:403 }) }
  return { user }
}

function assetTypeFromUrl(url:string): 'image' | 'video' {
  return /\.(mp4|webm|mov)(?:$|\?)/i.test(url) ? 'video' : 'image'
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  try {
    await ensureVideoAdStudioSchema()
    await ensureVideoAdWorkshopSchema()
    const pool = getPool()
    const orders = await pool.query(`
      SELECT o.*,u.name AS customer_name,u.email AS customer_email
      FROM video_ad_studio_orders o
      JOIN users u ON u.id=o.user_id
      ORDER BY CASE o.status WHEN 'paid' THEN 0 WHEN 'in_production' THEN 1 WHEN 'ready' THEN 2 ELSE 3 END,o.created_at ASC
      LIMIT 100
    `)
    return NextResponse.json({
      success:true,
      packages:await listVideoStudioPackages(true),
      orders:orders.rows.map((row:any)=>({ ...mapVideoStudioOrder(row), customerName:String(row.customer_name||''), customerEmail:String(row.customer_email||'') })),
    }, { headers:{ 'Cache-Control':'no-store' } })
  } catch (error:any) {
    console.error('[Admin Video Ad Studio] GET failed:', error)
    return NextResponse.json({ success:false, error:error.message || 'Unable to load Studio commerce' }, { status:500 })
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  try {
    await ensureVideoAdStudioSchema()
    const body = await request.json()
    const pool = getPool()
    if (body?.type === 'package') {
      const packageKey = String(body.packageKey || '').slice(0,80)
      const price = Number(body.priceFlameCoin)
      if (!packageKey || !Number.isFinite(price) || price < 0 || price > 1000000) {
        return NextResponse.json({ success:false, error:'Valid package and Flame Coin price are required' }, { status:400 })
      }
      const active = body.active === undefined ? null : Boolean(body.active)
      const result = await pool.query(
        `UPDATE video_ad_studio_packages
         SET price_flame_coin=$2,active=COALESCE($3,active),updated_at=NOW()
         WHERE package_key=$1 RETURNING *`,
        [packageKey,price,active]
      )
      if (!result.rows[0]) return NextResponse.json({ success:false, error:'Video package not found' }, { status:404 })
      return NextResponse.json({ success:true, package:result.rows[0] })
    }
    if (body?.type === 'order-status') {
      const orderId = String(body.orderId || '')
      const status = body.status === 'delivered' ? 'delivered' : body.status === 'ready' ? 'ready' : null
      if (!orderId || !status) return NextResponse.json({ success:false, error:'Valid order status change required' }, { status:400 })
      const result = await pool.query('UPDATE video_ad_studio_orders SET status=$2,updated_at=NOW() WHERE id=$1::uuid RETURNING *',[orderId,status])
      if (!result.rows[0]) return NextResponse.json({ success:false, error:'Studio order not found' }, { status:404 })
      return NextResponse.json({ success:true, order:mapVideoStudioOrder(result.rows[0]) })
    }
    return NextResponse.json({ success:false, error:'Unsupported Studio update' }, { status:400 })
  } catch (error:any) {
    console.error('[Admin Video Ad Studio] PATCH failed:', error)
    return NextResponse.json({ success:false, error:error.message || 'Studio update failed' }, { status:500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  try {
    const body = await request.json()
    if (body?.action !== 'form_order') return NextResponse.json({ success:false, error:'Unsupported Studio action' }, { status:400 })
    const orderId = String(body.orderId || '')
    if (!orderId) return NextResponse.json({ success:false, error:'Order id is required' }, { status:400 })

    await ensureVideoAdStudioSchema()
    await ensureVideoAdWorkshopSchema()
    const pool = getPool()
    const orderResult = await pool.query(`
      SELECT o.*,u.name AS customer_name
      FROM video_ad_studio_orders o
      JOIN users u ON u.id=o.user_id
      WHERE o.id=$1::uuid LIMIT 1
    `,[orderId])
    const order = orderResult.rows[0]
    if (!order) return NextResponse.json({ success:false, error:'Studio order not found' }, { status:404 })
    if (order.project_id) {
      const existing = await pool.query('SELECT * FROM admin_video_ad_projects WHERE id=$1::uuid LIMIT 1',[order.project_id])
      if (existing.rows[0]) return NextResponse.json({ success:true, project:mapVideoAdProject(existing.rows[0]), existing:true })
    }

    const generated = await generateVideoAdStoryboard({
      title:String(order.business_name),
      subject:String(order.subject),
      objective:String(order.objective),
      audience:String(order.audience),
      durationSeconds:Number(order.duration_seconds),
    })
    const assets = Array.isArray(order.assets) ? order.assets.map(String).filter(Boolean) : []
    const storyboard:VideoAdScene[] = generated.scenes.map((scene,index)=>{
      const assetUrl = assets.length ? assets[index % assets.length] : null
      return { ...scene, assetUrl, assetType:assetUrl ? assetTypeFromUrl(assetUrl) : null }
    })
    const projectResult = await pool.query(
      `INSERT INTO admin_video_ad_projects
       (created_by,order_id,title,subject,objective,audience,duration_seconds,aspect_ratio,status,storyboard)
       VALUES($1::uuid,$2::uuid,$3,$4,$5,$6,$7,'9:16','planned',$8::jsonb)
       ON CONFLICT(order_id) WHERE order_id IS NOT NULL DO NOTHING
       RETURNING *`,
      [auth.user.id,orderId,String(order.business_name),String(order.subject),String(order.objective),String(order.audience),Number(order.duration_seconds),JSON.stringify(storyboard)]
    )
    let project = projectResult.rows[0]
    if (!project) {
      const existing = await pool.query('SELECT * FROM admin_video_ad_projects WHERE order_id=$1::uuid LIMIT 1',[orderId])
      project = existing.rows[0]
    }
    await pool.query("UPDATE video_ad_studio_orders SET status='in_production',project_id=$2::uuid,updated_at=NOW() WHERE id=$1::uuid",[orderId,project.id])
    return NextResponse.json({ success:true, project:mapVideoAdProject(project), provider:generated.provider })
  } catch (error:any) {
    console.error('[Admin Video Ad Studio] production formation failed:', error)
    return NextResponse.json({ success:false, error:error.message || 'Could not form paid Studio order' }, { status:500 })
  }
}
