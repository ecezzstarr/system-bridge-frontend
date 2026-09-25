import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { sql } from '@/lib/db'
import { ensureFileFolderWorldSchema } from '@/lib/client-file-folder-world'

async function requireAdmin(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user || user.role !== 'admin') return null
  return user
}

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request)
  if (!admin) return NextResponse.json({ error: 'Administration only' }, { status: 403 })

  try {
    await ensureFileFolderWorldSchema(sql)
    const items = await sql`
      SELECT item_key,name,category,description,price_flame_coin,published,updated_at
      FROM weave_file_folder_items
      ORDER BY category,price_flame_coin,name
    `
    const blueprints = await sql`
      SELECT blueprint_key,name,district,system_type,description,build_hours,
             required_item_key,required_item_quantity,published,updated_at
      FROM weave_file_folder_blueprints
      ORDER BY district,build_hours,name
    `
    return NextResponse.json({ success: true, items, blueprints }, {
      headers: { 'Cache-Control': 'private, no-store' },
    })
  } catch (error) {
    console.error('[admin/client-build-catalog GET]', error)
    return NextResponse.json({ error: 'Unable to load Client build catalog' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const admin = await requireAdmin(request)
  if (!admin) return NextResponse.json({ error: 'Administration only' }, { status: 403 })

  try {
    await ensureFileFolderWorldSchema(sql)
    const body = await request.json()
    const kind = body.kind === 'blueprint' ? 'blueprint' : body.kind === 'item' ? 'item' : null
    const key = typeof body.key === 'string' ? body.key.trim().slice(0, 80) : ''
    if (!kind || !key) return NextResponse.json({ error: 'Catalog kind and key are required' }, { status: 400 })

    if (kind === 'item') {
      const price = Number(body.priceFlameCoin)
      if (!Number.isFinite(price) || price < 0) {
        return NextResponse.json({ error: 'Valid Flame Coin price required' }, { status: 400 })
      }
      const published = body.published !== false
      const rows = await sql`
        UPDATE weave_file_folder_items
        SET price_flame_coin=${price},published=${published},updated_at=NOW()
        WHERE item_key=${key}
        RETURNING item_key
      `
      if (!rows.length) return NextResponse.json({ error: 'Build item not found' }, { status: 404 })
    } else {
      const hours = Math.max(1, Math.min(24 * 30, Number(body.buildHours) || 1))
      const published = body.published !== false
      const rows = await sql`
        UPDATE weave_file_folder_blueprints
        SET build_hours=${hours},published=${published},updated_at=NOW()
        WHERE blueprint_key=${key}
        RETURNING blueprint_key
      `
      if (!rows.length) return NextResponse.json({ error: 'Blueprint not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[admin/client-build-catalog PATCH]', error)
    return NextResponse.json({ error: 'Unable to update Client build catalog' }, { status: 500 })
  }
}
