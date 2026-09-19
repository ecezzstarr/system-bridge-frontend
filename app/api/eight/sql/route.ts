import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { sql } from '@/lib/db'

// SQL Console API - Execute queries against database
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request)
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (authUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

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

    const rows = await sql(query as any)

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
