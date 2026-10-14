import { NextRequest, NextResponse } from 'next/server'
import { requireApiUser } from '@/lib/api-auth'
import {
  listWeaveDeploymentRecords,
  recordWeaveDeploymentMovement,
  WEAVE_DEPLOYMENT_STATUSES,
  type WeaveDeploymentStatus,
} from '@/lib/weave-deployment-records'

function deploymentToken(request: NextRequest) {
  const header = request.headers.get('authorization') || ''
  return header.startsWith('Bearer ') ? header.slice(7).trim() : ''
}

export async function POST(request: NextRequest) {
  try {
    const configured = process.env.WEAVE_DEPLOY_RECORD_TOKEN || ''
    if (!configured) {
      return NextResponse.json({ error: 'Deployment record authority is not configured' }, { status: 503 })
    }
    if (deploymentToken(request) !== configured) {
      return NextResponse.json({ error: 'Deployment record authority denied' }, { status: 401 })
    }

    const body = await request.json()
    const status = String(body.status || '') as WeaveDeploymentStatus
    const releaseSha = String(body.releaseSha || '').trim()
    const previousSha = body.previousSha ? String(body.previousSha).trim() : null

    if (!WEAVE_DEPLOYMENT_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Invalid deployment status' }, { status: 400 })
    }
    if (!/^[0-9a-f]{7,64}$/i.test(releaseSha)) {
      return NextResponse.json({ error: 'A valid release SHA is required' }, { status: 400 })
    }
    if (previousSha && !/^[0-9a-f]{7,64}$/i.test(previousSha)) {
      return NextResponse.json({ error: 'previousSha is invalid' }, { status: 400 })
    }

    const record = await recordWeaveDeploymentMovement({
      status,
      releaseSha,
      previousSha,
      serverKey: body.serverKey ? String(body.serverKey).slice(0, 120) : null,
      source: body.source ? String(body.source).slice(0, 120) : 'selfhost-deploy',
      verification: body.verification ? String(body.verification).slice(0, 4000) : null,
      rollbackPath: body.rollbackPath ? String(body.rollbackPath).slice(0, 4000) : null,
      details: body.details && typeof body.details === 'object' ? body.details : {},
      sovereignId: body.sovereignId ? String(body.sovereignId) : null,
    })

    return NextResponse.json({ success: true, record }, { status: 201 })
  } catch (error: any) {
    console.error('[deployment record POST]', error)
    return NextResponse.json({ error: error?.message || 'Unable to record deployment movement' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireApiUser(request)
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Administration access required' }, { status: 403 })
    }

    const limit = Number(new URL(request.url).searchParams.get('limit') || 50)
    const records = await listWeaveDeploymentRecords(limit)
    return NextResponse.json({ success: true, records }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error: any) {
    console.error('[deployment record GET]', error)
    return NextResponse.json({ error: error?.message || 'Unable to read deployment records' }, { status: 500 })
  }
}
