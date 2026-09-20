import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { neon } from '@/lib/pg-neon'

const getDb = () => {

  return neon(process.env.DATABASE_URL)
}

const TYPES = ['thought', 'quote', 'experience', 'lesson', 'event'] as const
type CadenceType = typeof TYPES[number]

async function ensureTable(sql: ReturnType<typeof getDb>) {
  await sql`
    CREATE TABLE IF NOT EXISTS weave_cadences (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      cadence_type VARCHAR(24) NOT NULL DEFAULT 'thought'
        CHECK (cadence_type IN ('thought', 'quote', 'experience', 'lesson', 'event')),
      content TEXT NOT NULL CHECK (char_length(trim(content)) BETWEEN 1 AND 2000),
      context TEXT CHECK (context IS NULL OR char_length(context) <= 1000),
      visibility VARCHAR(16) NOT NULL DEFAULT 'public' CHECK (visibility IN ('public')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS idx_weave_cadences_author ON weave_cadences(author_id, created_at DESC)`
  await sql`CREATE INDEX IF NOT EXISTS idx_weave_cadences_type ON weave_cadences(cadence_type, created_at DESC)`
  await sql`CREATE INDEX IF NOT EXISTS idx_weave_cadences_search ON weave_cadences USING GIN (to_tsvector('simple', content || ' ' || COALESCE(context, '')))`
}

async function getUser(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (session?.user?.id) {
    const rows = await getDb()`
      SELECT id, name, email
      FROM users
      WHERE id = ${session.user.id}::uuid AND is_active = true
      LIMIT 1
    `
    if (rows[0]) return rows[0]
  }

  const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim()
  if (!token || token.length < 32 || token.length > 128) return null

  const rows = await getDb()`
    SELECT u.id, u.name, u.email
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token = ${token} AND s.expires_at > NOW() AND u.is_active = true
    LIMIT 1
  `
  return rows[0] || null
}

export async function GET(request: NextRequest) {
  try {
    const sql = getDb()
    await ensureTable(sql)
    const query = request.nextUrl.searchParams.get('q')?.trim() || ''
    const type = request.nextUrl.searchParams.get('type')?.trim() || ''
    const limit = Math.min(Math.max(Number(request.nextUrl.searchParams.get('limit') || 30), 1), 60)

    const rows = query
      ? await sql`
          SELECT c.id, c.cadence_type, c.content, c.context, c.created_at,
                 c.author_id, COALESCE(u.name, u.email, 'Weave user') AS author_name
          FROM weave_cadences c
          JOIN users u ON u.id = c.author_id
          WHERE c.visibility = 'public'
            AND u.is_active = true
            AND (${type} = '' OR c.cadence_type = ${type})
            AND (
              to_tsvector('simple', c.content || ' ' || COALESCE(c.context, '')) @@ plainto_tsquery('simple', ${query})
              OR c.content ILIKE ${'%' + query + '%'}
              OR COALESCE(c.context, '') ILIKE ${'%' + query + '%'}
            )
          ORDER BY
            ts_rank(to_tsvector('simple', c.content || ' ' || COALESCE(c.context, '')), plainto_tsquery('simple', ${query})) DESC,
            c.created_at DESC
          LIMIT ${limit}
        `
      : await sql`
          SELECT c.id, c.cadence_type, c.content, c.context, c.created_at,
                 c.author_id, COALESCE(u.name, u.email, 'Weave user') AS author_name
          FROM weave_cadences c
          JOIN users u ON u.id = c.author_id
          WHERE c.visibility = 'public' AND u.is_active = true
            AND (${type} = '' OR c.cadence_type = ${type})
          ORDER BY c.created_at DESC
          LIMIT ${limit}
        `

    return NextResponse.json({ cadences: rows })
  } catch (error) {
    console.error('Cadence search error:', error instanceof Error ? error.message : 'unknown error')
    return NextResponse.json({ error: 'Unable to search Weave cadences' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json().catch(() => ({}))
    const content = typeof body.content === 'string' ? body.content.trim() : ''
    const context = typeof body.context === 'string' ? body.context.trim() : ''
    const cadenceType = TYPES.includes(body.cadenceType as CadenceType) ? body.cadenceType as CadenceType : 'thought'

    if (!content || content.length > 2000) {
      return NextResponse.json({ error: 'Cadence must be between 1 and 2000 characters' }, { status: 400 })
    }
    if (context.length > 1000) {
      return NextResponse.json({ error: 'Context must be 1000 characters or fewer' }, { status: 400 })
    }

    const sql = getDb()
    await ensureTable(sql)
    const rows = await sql`
      INSERT INTO weave_cadences (author_id, cadence_type, content, context)
      VALUES (${user.id}::uuid, ${cadenceType}, ${content}, ${context || null})
      RETURNING id, cadence_type, content, context, created_at
    `

    return NextResponse.json({ cadence: { ...rows[0], authorId: user.id, authorName: user.name || user.email || 'Weave user' } }, { status: 201 })
  } catch (error) {
    console.error('Cadence creation error:', error instanceof Error ? error.message : 'unknown error')
    return NextResponse.json({ error: 'Unable to publish cadence' }, { status: 500 })
  }
}
