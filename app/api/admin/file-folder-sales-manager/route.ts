import { NextRequest, NextResponse } from 'next/server'

import { getAuthUser } from '@/lib/auth-api'
import {
  getFileFolderSalesManagerSnapshot,
  runFileFolderSalesManager,
  updateFileFolderSalesManagerConfig,
  updateSalesActionStatus,
} from '@/lib/file-folder-sales-manager'

export const dynamic = 'force-dynamic'

async function requireAdmin(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  if (user.role !== 'admin') return { error: NextResponse.json({ error: 'Administration access required' }, { status: 403 }) }
  return { user }
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (auth.error) return auth.error

  try {
    return NextResponse.json(
      { success: true, ...(await getFileFolderSalesManagerSnapshot()) },
      { headers: { 'Cache-Control': 'private, no-store' } },
    )
  } catch (error: any) {
    console.error('[file-folder-sales-manager] snapshot failed', error)
    return NextResponse.json({ error: error?.message || 'Sales manager unavailable' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (auth.error) return auth.error

  try {
    const body = await request.json().catch(() => ({}))
    const action = String(body.action || 'run')

    if (action === 'run') {
      return NextResponse.json({ success: true, result: await runFileFolderSalesManager() })
    }

    if (action === 'complete_action' || action === 'dismiss_action') {
      const actionId = String(body.actionId || '')
      if (!actionId) return NextResponse.json({ error: 'actionId is required' }, { status: 400 })
      const updated = await updateSalesActionStatus(
        actionId,
        action === 'complete_action' ? 'completed' : 'dismissed',
      )
      if (!updated) return NextResponse.json({ error: 'Sales action not found' }, { status: 404 })
      return NextResponse.json({ success: true, action: updated })
    }

    return NextResponse.json({ error: 'Unknown manager action' }, { status: 400 })
  } catch (error: any) {
    console.error('[file-folder-sales-manager] action failed', error)
    return NextResponse.json({ error: error?.message || 'Sales manager action failed' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (auth.error) return auth.error

  try {
    const body = await request.json().catch(() => ({}))
    const config = await updateFileFolderSalesManagerConfig({
      weeklyTarget: body.weeklyTarget,
      enabled: body.enabled,
      echoActive: body.echoActive,
      updatedBy: auth.user.id,
    })
    return NextResponse.json({ success: true, config })
  } catch (error: any) {
    console.error('[file-folder-sales-manager] config failed', error)
    return NextResponse.json({ error: error?.message || 'Unable to update sales manager' }, { status: 500 })
  }
}
