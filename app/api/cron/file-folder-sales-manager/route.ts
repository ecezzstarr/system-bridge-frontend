import { NextRequest, NextResponse } from 'next/server'

import { runFileFolderSalesManager } from '@/lib/file-folder-sales-manager'
import { hasWeaveSchedulerAuthority } from '@/lib/weave-scheduler-auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const authorized = await hasWeaveSchedulerAuthority(request, {
    workflowPath: '.github/workflows/weave-file-folder-sales-manager.yml',
  })
  if (!authorized) return NextResponse.json({ error: 'Unauthorized scheduler' }, { status: 401 })

  try {
    const result = await runFileFolderSalesManager()
    return NextResponse.json({ success: true, result })
  } catch (error: any) {
    console.error('[file-folder-sales-manager cron] failed', error)
    return NextResponse.json({ error: error?.message || 'Sales manager run failed' }, { status: 500 })
  }
}
