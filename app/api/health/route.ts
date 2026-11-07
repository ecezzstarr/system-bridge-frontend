import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/db'
import { passwordRecoveryEmailProvider } from '@/lib/password-recovery'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const readiness = request.nextUrl.searchParams.get('ready') === '1'
  let databaseReady: boolean | null = null
  let passwordRecoveryProvider: string | null = null
  if (readiness) {
    let timeout: ReturnType<typeof setTimeout> | undefined
    try {
      const check = async () => {
        const {rows: [row]} = await getPool().query(
          `SELECT to_regclass('users') IS NOT NULL AND to_regclass('sessions') IS NOT NULL
               AND to_regclass('wallets') IS NOT NULL AND to_regclass('ledger_entries') IS NOT NULL
               AND to_regclass('deposits') IS NOT NULL AS ready`,
        )
        const ready = row?.ready === true
        const provider = ready ? await passwordRecoveryEmailProvider() : null
        return {ready,provider}
      }
      const result = await Promise.race([
        check(),
        new Promise<never>((_,reject) => {
          timeout = setTimeout(() => reject(new Error('Readiness deadline exceeded')), 3500)
        }),
      ])
      databaseReady = result.ready
      passwordRecoveryProvider = result.provider
    } catch {
      databaseReady = false
    } finally {
      clearTimeout(timeout)
    }
  }

  const healthy = !readiness || databaseReady === true
  return NextResponse.json({
    status: healthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV,
    releaseSha: process.env.WEAVE_RELEASE_SHA || null,
    databaseReady,
    passwordRecoveryProvider,
    passwordRecoveryDesk: Boolean(process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET),
  }, {status:healthy ? 200 : 503, headers:{'Cache-Control':'no-store, max-age=0'}})
}
