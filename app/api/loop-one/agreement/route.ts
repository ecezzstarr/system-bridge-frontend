import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@/lib/pg-neon'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'

const getDb = () => {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL not configured')
  return neon(process.env.DATABASE_URL)
}

const AGREEMENT_VERSION = 'loop-one-v1-2026-09-07'
const ALLOWED_ROLES = ['agent', 'bridger'] as const

type AllowedRole = typeof ALLOWED_ROLES[number]

async function ensureTable(sql: ReturnType<typeof getDb>) {
  await sql`
    CREATE TABLE IF NOT EXISTS loop_one_agreements (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('agent', 'bridger')),
      agreement_version TEXT NOT NULL,
      signed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      ip_address TEXT,
      user_agent TEXT,
      UNIQUE(user_id, agreement_version)
    )
  `
}

async function getIdentity(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (session?.user?.id) {
    const sql = getDb()
    const rows = await sql`SELECT id, role, name, email FROM users WHERE id = ${session.user.id}::uuid AND is_active = true LIMIT 1`
    if (rows[0]) return rows[0]
  }

  // The platform currently also stores the application token in local storage.
  // Accept the same token shape for this route so the agreement gate works with
  // the existing Agent/Bridger authentication flow.
  const auth = request.headers.get('authorization') || ''
  const token = auth.replace(/^Bearer\s+/i, '').trim()
  const match = token.match(/^token_([0-9a-f-]{36})_\d+$/i)
  if (!match) return null

  const sql = getDb()
  const rows = await sql`SELECT id, role, name, email FROM users WHERE id = ${match[1]}::uuid AND is_active = true LIMIT 1`
  return rows[0] || null
}

export async function GET(request: NextRequest) {
  try {
    const identity = await getIdentity(request)
    if (!identity) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const role = identity.role as AllowedRole
    if (!ALLOWED_ROLES.includes(role)) {
      return NextResponse.json({ required: false, signed: true, role: identity.role })
    }

    const sql = getDb()
    await ensureTable(sql)
    const rows = await sql`
      SELECT id, role, agreement_version, signed_at
      FROM loop_one_agreements
      WHERE user_id = ${identity.id}::uuid
        AND agreement_version = ${AGREEMENT_VERSION}
      LIMIT 1
    `

    return NextResponse.json({
      required: true,
      signed: rows.length > 0,
      agreementVersion: AGREEMENT_VERSION,
      role,
      signedAt: rows[0]?.signed_at || null,
    })
  } catch (error) {
    console.error('Loop One agreement status error:', error)
    return NextResponse.json({ error: 'Unable to read Loop One agreement status' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const identity = await getIdentity(request)
    if (!identity) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const role = identity.role as AllowedRole
    if (!ALLOWED_ROLES.includes(role)) {
      return NextResponse.json({ error: 'Loop One agreement is only required for Agents and Bridgers' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    if (body?.agreementVersion !== AGREEMENT_VERSION) {
      return NextResponse.json({ error: 'Agreement version is not current' }, { status: 400 })
    }
    if (body?.accept !== true) {
      return NextResponse.json({ error: 'Agreement must be explicitly accepted' }, { status: 400 })
    }

    const sql = getDb()
    await ensureTable(sql)

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null
    const userAgent = request.headers.get('user-agent') || null

    const result = await sql`
      INSERT INTO loop_one_agreements (
        user_id, role, agreement_version, signed_at, ip_address, user_agent
      ) VALUES (
        ${identity.id}::uuid, ${role}, ${AGREEMENT_VERSION}, NOW(), ${ip}, ${userAgent}
      )
      ON CONFLICT (user_id, agreement_version) DO NOTHING
      RETURNING id, signed_at
    `

    return NextResponse.json({
      success: true,
      signed: true,
      agreementVersion: AGREEMENT_VERSION,
      signedAt: result[0]?.signed_at || null,
    })
  } catch (error) {
    console.error('Loop One agreement signing error:', error)
    return NextResponse.json({ error: 'Unable to record Loop One agreement' }, { status: 500 })
  }
}
