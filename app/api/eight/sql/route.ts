import { NextRequest, NextResponse } from 'next/server'
import { requireWorkshopAuthorization } from '@/lib/workshop-auth'
import { neon } from '@/lib/pg-neon'

// SQL Console API - Execute queries against Neon database
export async function POST(request: NextRequest) {
    const auth = await requireWorkshopAuthorization()
    if (!auth.authorized) return auth.response

  try {
    const { query } = await request.json()

    if (!query || typeof query !== 'string') {
      return NextResponse.json({
        success: false,
        error: 'Query is required',
      }, { status: 400 })
    }

    // Basic SQL injection prevention - block dangerous operations
    const lowerQuery = query.toLowerCase().trim()
    const dangerousKeywords = ['drop database', 'drop schema', 'truncate', 'delete from users where 1', 'delete from wallets where 1']
    
    for (const keyword of dangerousKeywords) {
      if (lowerQuery.includes(keyword)) {
        return NextResponse.json({
          success: false,
          error: `Dangerous operation blocked: ${keyword}`,
        }, { status: 403 })
      }
    }

    const sql = neon(process.env.DATABASE_URL!)
    const rows = await sql(query)

    return NextResponse.json({
      success: true,
      rows: Array.isArray(rows) ? rows : [],
      rowCount: Array.isArray(rows) ? rows.length : 0,
    })
  } catch (error: unknown) {
    console.error('[SQL Console] Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Query execution failed',
    }, { status: 500 })
  }
}
