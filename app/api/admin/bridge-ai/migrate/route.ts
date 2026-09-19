import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { sql } from '@/lib/db'

// One-time schema setup for Bridge AI. Hit once after deploy, then ignore.
export async function POST(request: NextRequest) {
  const admin = await getAuthUser(request)
  if (!admin || admin.role !== 'admin') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS bridge_templates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        description TEXT,
        welcome_message TEXT NOT NULL,
        system_prompt TEXT NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'draft',
        version INTEGER NOT NULL DEFAULT 1,
        created_by UUID NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `

    await sql`
      CREATE TABLE IF NOT EXISTS bridge_ais (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        bridge_code VARCHAR(16) NOT NULL UNIQUE,
        bridger_id UUID NOT NULL,
        agent_id UUID,
        template_id UUID NOT NULL REFERENCES bridge_templates(id),
        custom_welcome_message TEXT,
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `

    await sql`
      CREATE TABLE IF NOT EXISTS bridge_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        bridge_id UUID NOT NULL REFERENCES bridge_ais(id),
        visitor_fingerprint TEXT NOT NULL,
        messages JSONB NOT NULL DEFAULT '[]',
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        converted_client_id UUID,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        last_active_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `

    await sql`
      CREATE TABLE IF NOT EXISTS bridge_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        bridge_id UUID NOT NULL REFERENCES bridge_ais(id),
        session_id UUID REFERENCES bridge_sessions(id),
        event_type VARCHAR(30) NOT NULL,
        platform VARCHAR(30),
        metadata JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `

    await sql`CREATE INDEX IF NOT EXISTS idx_bridge_ais_bridger ON bridge_ais(bridger_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_bridge_ais_code ON bridge_ais(bridge_code)`
    await sql`CREATE INDEX IF NOT EXISTS idx_bridge_sessions_bridge ON bridge_sessions(bridge_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_bridge_events_bridge ON bridge_events(bridge_id)`

    return NextResponse.json({ success: true, message: 'Bridge AI schema created' })
  } catch (error: any) {
    console.error('[bridge-ai migrate] error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
